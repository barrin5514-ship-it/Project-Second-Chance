import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

export const PDF_VALIDATION_TIMEOUT_MS = 3_000;
export const PDF_WORKER_MEMORY_MB = 64;

export class PdfValidationError extends Error {
  constructor(readonly reason: 'invalid' | 'timeout' | 'unavailable') {
    super(reason === 'timeout' ? 'pdf-validation-timeout' : 'invalid-upload');
    this.name = 'PdfValidationError';
  }
}

export interface PdfValidationResult {
  pages: number;
}

/** Parse a PDF in a memory-capped worker with a hard wall-clock deadline. */
export async function validatePdfInWorker(
  buffer: Buffer,
  options: { timeoutMs?: number } = {},
): Promise<PdfValidationResult> {
  const timeoutMs = options.timeoutMs ?? PDF_VALIDATION_TIMEOUT_MS;
  const workerPath = new URL('./pdfValidationWorker.mjs', import.meta.url);

  return new Promise<PdfValidationResult>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const worker = new Worker(fileURLToPath(workerPath), {
      workerData: { bytes: new Uint8Array(buffer) },
      resourceLimits: {
        maxOldGenerationSizeMb: PDF_WORKER_MEMORY_MB,
        maxYoungGenerationSizeMb: 16,
        codeRangeSizeMb: 16,
      },
    });

    const finish = (error: PdfValidationError | null, result?: PdfValidationResult): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      // Await the exit acknowledgement before settling. The upload slot is
      // released when this promise settles, so it must represent real work end.
      void worker
        .terminate()
        .catch(() => undefined)
        .then(() => {
          if (error !== null) reject(error);
          else if (result !== undefined) resolve(result);
          else reject(new PdfValidationError('unavailable'));
        });
    };

    timer = setTimeout(() => finish(new PdfValidationError('timeout')), timeoutMs);
    worker.once('message', (value: unknown) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        (value as { ok?: unknown }).ok === true &&
        typeof (value as { pages?: unknown }).pages === 'number'
      ) {
        finish(null, { pages: (value as { pages: number }).pages });
        return;
      }
      finish(new PdfValidationError('invalid'));
    });
    worker.once('error', () => finish(new PdfValidationError('invalid')));
    worker.once('exit', () => {
      if (!settled) finish(new PdfValidationError('invalid'));
    });
  });
}
