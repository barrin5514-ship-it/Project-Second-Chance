import { createHash } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import type { AuthDependencies } from '../auth/auth';
import {
  MAX_UPLOAD_BYTES,
  PrivateStorageError,
  type PrivateCase,
  type PrivateDocument,
  type PrivateStore,
} from './privateStore';
import { UploadValidationError, validateUpload } from './uploadValidation';

export interface PrivateDependencies {
  router: Router;
}

interface CaseInput {
  label: string;
  jurisdiction: string | null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readCaseInput(body: unknown): CaseInput | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  const label = readString(record['label'])?.trim() ?? '';
  const jurisdictionRaw = record['jurisdiction'];
  const jurisdiction =
    jurisdictionRaw === undefined || jurisdictionRaw === null
      ? null
      : readString(jurisdictionRaw)?.trim() ?? null;
  if (
    label.length === 0 ||
    label.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(label) ||
    (jurisdiction !== null && (jurisdiction.length === 0 || jurisdiction.length > 80)) ||
    (jurisdiction !== null && /[\u0000-\u001f\u007f]/.test(jurisdiction))
  ) {
    return null;
  }
  return { label, jurisdiction };
}

function publicCase(value: PrivateCase): Record<string, unknown> {
  return {
    id: value.id,
    label: value.label,
    jurisdiction: value.jurisdiction,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function publicDocument(value: PrivateDocument): Record<string, unknown> {
  return {
    id: value.id,
    caseId: value.caseId,
    originalName: value.originalName,
    mimeType: value.mimeType,
    size: value.size,
    sha256: value.sha256,
    status: value.status,
    createdAt: value.createdAt,
  };
}

function notFound(res: Response): void {
  res.status(404).json({ error: 'not-found' });
}

function invalid(res: Response): void {
  res.status(400).json({ error: 'invalid-request' });
}

function unavailable(res: Response): void {
  res.status(503).json({ error: 'unavailable' });
}

function ownerOf(req: Request): string | null {
  return typeof req.user?.id === 'string' ? req.user.id : null;
}

function confirmed(body: unknown): boolean {
  return typeof body === 'object' && body !== null && (body as { confirm?: unknown }).confirm === true;
}

function disposition(name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function createPrivateRouter(options: {
  auth: AuthDependencies;
  store: PrivateStore;
}): Router {
  const { auth, store } = options;
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    preservePath: true,
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 1,
      fields: 4,
      parts: 6,
      fieldNameSize: 64,
      fieldSize: 1024,
      headerPairs: 100,
    },
  });

  const readAuth: RequestHandler[] = [auth.requireLoopbackHost, auth.requireAuth];
  const mutateAuth: RequestHandler[] = [
    auth.requireLoopbackHost,
    auth.requireAuth,
    auth.requireExactOrigin,
    auth.csrfProtection,
  ];

  const uploadTimeout: RequestHandler = (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) res.status(408).json({ error: 'invalid-upload' });
    }, 30_000);
    res.once('finish', () => clearTimeout(timer));
    res.once('close', () => clearTimeout(timer));
    next();
  };

  router.get('/api/cases', ...readAuth, (req, res) => {
    const ownerId = ownerOf(req);
    if (ownerId === null) return notFound(res);
    res.status(200).json({ cases: store.listCases(ownerId).map(publicCase) });
  });

  router.post('/api/cases', ...mutateAuth, (req, res) => {
    const ownerId = ownerOf(req);
    const input = readCaseInput(req.body);
    if (ownerId === null || input === null) return invalid(res);
    const created = store.createCase(ownerId, input);
    res.status(201).json({ case: publicCase(created) });
  });

  router.get('/api/cases/:caseId', ...readAuth, (req, res) => {
    const ownerId = ownerOf(req);
    const found = ownerId === null ? null : store.getCase(ownerId, req.params.caseId ?? '');
    if (found === null) return notFound(res);
    res.status(200).json({ case: publicCase(found) });
  });

  router.patch('/api/cases/:caseId', ...mutateAuth, (req, res) => {
    const ownerId = ownerOf(req);
    const input = readCaseInput(req.body);
    if (ownerId === null || input === null) return invalid(res);
    try {
      const updated = store.updateCase(ownerId, req.params.caseId ?? '', input);
      res.status(200).json({ case: publicCase(updated) });
    } catch (error) {
      if (error instanceof PrivateStorageError && error.code === 'not-found') return notFound(res);
      throw error;
    }
  });

  router.delete('/api/cases/:caseId', ...mutateAuth, (req, res) => {
    const ownerId = ownerOf(req);
    if (ownerId === null) return notFound(res);
    if (!confirmed(req.body)) return invalid(res);
    try {
      if (!store.deleteCase(ownerId, req.params.caseId ?? '')) return notFound(res);
      res.status(204).end();
    } catch (error) {
      if (error instanceof PrivateStorageError) return unavailable(res);
      throw error;
    }
  });

  router.post(
    '/api/cases/:caseId/documents',
    ...mutateAuth,
    uploadTimeout,
    upload.single('file'),
    async (req, res, next) => {
      try {
        const ownerId = ownerOf(req);
        if (ownerId === null) return notFound(res);
        if (req.file === undefined) return invalid(res);
        let validated;
        try {
          validated = await validateUpload({
            buffer: req.file.buffer,
            originalName: req.file.originalname,
          });
        } catch (error) {
          if (error instanceof UploadValidationError) {
            return res.status(error.code === 'too-large' ? 413 : 400).json({
              error: error.code === 'too-large' ? 'payload-too-large' : 'invalid-upload',
            });
          }
          return invalid(res);
        }
        if (!auth.isAuthorized(req)) {
          res.setHeader('Cache-Control', 'no-store');
          res.status(401).json({ error: 'unauthenticated' });
          return;
        }
        const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
        const created = store.createDocument(ownerId, req.params.caseId ?? '', {
          originalName: req.file.originalname,
          mimeType: validated.mimeType,
          bytes: req.file.buffer,
          sha256,
        });
        res.status(201).json({ document: publicDocument(created) });
      } catch (error) {
        if (error instanceof PrivateStorageError) {
          if (error.code === 'not-found') return notFound(res);
          if (error.code === 'invalid') return invalid(res);
          return unavailable(res);
        }
        next(error);
      }
    },
  );

  router.get('/api/cases/:caseId/documents', ...readAuth, (req, res) => {
    const ownerId = ownerOf(req);
    if (ownerId === null) return notFound(res);
    try {
      res.status(200).json({
        documents: store.listDocuments(ownerId, req.params.caseId ?? '').map(publicDocument),
      });
    } catch (error) {
      if (error instanceof PrivateStorageError) return notFound(res);
      throw error;
    }
  });

  router.get('/api/cases/:caseId/documents/:documentId', ...readAuth, (req, res) => {
    const ownerId = ownerOf(req);
    const found =
      ownerId === null
        ? null
        : store.getDocument(ownerId, req.params.caseId ?? '', req.params.documentId ?? '');
    if (found === null) return notFound(res);
    res.status(200).json({ document: publicDocument(found) });
  });

  router.get('/api/cases/:caseId/documents/:documentId/download', ...readAuth, (req, res) => {
    const ownerId = ownerOf(req);
    if (ownerId === null || !auth.isAuthorized(req)) return notFound(res);
    try {
      const opened = store.openDocument(
        ownerId,
        req.params.caseId ?? '',
        req.params.documentId ?? '',
      );
      res.setHeader('Content-Type', opened.document.mimeType);
      res.setHeader('Content-Length', String(opened.bytes.length));
      res.setHeader('Content-Disposition', disposition(opened.document.originalName));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(opened.bytes);
    } catch (error) {
      if (error instanceof PrivateStorageError) {
        return error.code === 'not-found' ? notFound(res) : unavailable(res);
      }
      return unavailable(res);
    }
  });

  router.delete(
    '/api/cases/:caseId/documents/:documentId',
    ...mutateAuth,
    (req, res) => {
      const ownerId = ownerOf(req);
      if (ownerId === null) return notFound(res);
      if (!confirmed(req.body)) return invalid(res);
      try {
        if (!store.deleteDocument(ownerId, req.params.caseId ?? '', req.params.documentId ?? '')) {
          return notFound(res);
        }
        res.status(204).end();
      } catch (error) {
        if (error instanceof PrivateStorageError) return unavailable(res);
        throw error;
      }
    },
  );

  router.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        res.status(tooLarge ? 413 : 400).json({
          error: tooLarge ? 'payload-too-large' : 'invalid-upload',
        });
        return;
      }
      if (error instanceof UploadValidationError) {
        res.status(error.code === 'too-large' ? 413 : 400).json({
          error: error.code === 'too-large' ? 'payload-too-large' : 'invalid-upload',
        });
        return;
      }
      if (error instanceof PrivateStorageError) {
        res.status(error.code === 'not-found' ? 404 : error.code === 'invalid' ? 400 : 503).json({
          error:
            error.code === 'not-found'
              ? 'not-found'
              : error.code === 'invalid'
                ? 'invalid-request'
                : 'unavailable',
        });
        return;
      }
      const status =
        typeof error === 'object' && error !== null
          ? (error as { status?: unknown }).status
          : undefined;
      if (status === 403) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      if (status === 413) {
        res.status(413).json({ error: 'payload-too-large' });
        return;
      }
      if (status === 400) {
        res.status(400).json({ error: 'bad-request' });
        return;
      }
      res.status(500).json({ error: 'internal' });
    },
  );

  return router;
}
