import { fileTypeFromBuffer } from 'file-type';
import { imageSize } from 'image-size';
import { PDFDocument } from 'pdf-lib';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGES = 50;
export const MAX_IMAGE_DIMENSION = 12_000;
export const MAX_IMAGE_PIXELS = 40_000_000;

export class UploadValidationError extends Error {
  constructor(readonly code: 'invalid' | 'too-large') {
    super(code === 'too-large' ? 'payload-too-large' : 'invalid-upload');
    this.name = 'UploadValidationError';
  }
}

export interface ValidatedUpload {
  mimeType: string;
  extension: 'pdf' | 'png' | 'jpg';
  size: number;
}

const ALLOWED = new Map<string, { mimeType: string; extension: 'pdf' | 'png' | 'jpg' }>([
  ['pdf', { mimeType: 'application/pdf', extension: 'pdf' }],
  ['png', { mimeType: 'image/png', extension: 'png' }],
  ['jpg', { mimeType: 'image/jpeg', extension: 'jpg' }],
]);

function validateFilename(name: string): void {
  if (name.length === 0 || name.length > 255) throw new UploadValidationError('invalid');
  if (name !== name.normalize('NFC')) throw new UploadValidationError('invalid');
  if (/[\u0000-\u001f\u007f]/.test(name)) throw new UploadValidationError('invalid');
  if (/[\\/]/.test(name)) throw new UploadValidationError('invalid');
  if (/^[A-Za-z]:/.test(name) || name.startsWith('\\\\')) throw new UploadValidationError('invalid');
  if (name === '.' || name === '..' || name.includes('..')) throw new UploadValidationError('invalid');
  if (name.endsWith('.') || name.endsWith(' ')) throw new UploadValidationError('invalid');
}

export async function validateUpload(input: {
  buffer: Buffer;
  originalName: string;
}): Promise<ValidatedUpload> {
  if (input.buffer.length > MAX_UPLOAD_BYTES) throw new UploadValidationError('too-large');
  validateFilename(input.originalName);

  let detected: Awaited<ReturnType<typeof fileTypeFromBuffer>>;
  try {
    detected = await fileTypeFromBuffer(input.buffer);
  } catch {
    throw new UploadValidationError('invalid');
  }
  if (detected === undefined) throw new UploadValidationError('invalid');
  const allowed = ALLOWED.get(detected.ext);
  if (allowed === undefined || detected.mime !== allowed.mimeType) {
    throw new UploadValidationError('invalid');
  }

  try {
    if (allowed.extension === 'pdf') {
      const document = await PDFDocument.load(input.buffer, {
        ignoreEncryption: false,
        updateMetadata: false,
      });
      if (document.isEncrypted) throw new UploadValidationError('invalid');
      const pages = document.getPageCount();
      if (pages < 1 || pages > MAX_PDF_PAGES) throw new UploadValidationError('invalid');
    } else {
      const dimensions = imageSize(input.buffer);
      const width = dimensions.width ?? 0;
      const height = dimensions.height ?? 0;
      if (
        width <= 0 ||
        height <= 0 ||
        width > MAX_IMAGE_DIMENSION ||
        height > MAX_IMAGE_DIMENSION ||
        width * height > MAX_IMAGE_PIXELS
      ) {
        throw new UploadValidationError('invalid');
      }
    }
  } catch (error) {
    if (error instanceof UploadValidationError) throw error;
    throw new UploadValidationError('invalid');
  }

  return {
    mimeType: allowed.mimeType,
    extension: allowed.extension,
    size: input.buffer.length,
  };
}
