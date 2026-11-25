import { parentPort, workerData } from 'node:worker_threads';
import { PDFDocument } from 'pdf-lib';

try {
  const bytes = workerData?.bytes;
  if (!(bytes instanceof Uint8Array)) throw new Error('invalid worker input');
  const document = await PDFDocument.load(Buffer.from(bytes), {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  if (document.isEncrypted) throw new Error('encrypted');
  parentPort?.postMessage({ ok: true, pages: document.getPageCount() });
} catch {
  parentPort?.postMessage({ ok: false });
}
