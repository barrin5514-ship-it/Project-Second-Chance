import { afterEach, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { Worker as ThreadWorker, WorkerOptions } from 'node:worker_threads';

const observed: {
  worker: ThreadWorker;
  options: WorkerOptions;
  exited: boolean;
}[] = [];

afterEach(async () => {
  await Promise.all(observed.splice(0).map(async (entry) => entry.worker.terminate()));
  vi.restoreAllMocks();
  vi.doUnmock('node:worker_threads');
  vi.resetModules();
});

async function loadWithObservedWorker() {
  vi.resetModules();
  vi.doMock('node:worker_threads', async () => {
    const actual =
      await vi.importActual<typeof import('node:worker_threads')>('node:worker_threads');
    class ObservedWorker extends actual.Worker {
      constructor(path: string | URL, options: WorkerOptions = {}) {
        super(path, options);
        const record = { worker: this as ThreadWorker, options, exited: false };
        observed.push(record);
        this.once('exit', () => {
          record.exited = true;
        });
      }
    }
    return { ...actual, Worker: ObservedWorker };
  });
  return import('./pdfValidation');
}

async function onePagePdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  return Buffer.from(await pdf.save());
}

it('does not settle validation until the worker exit acknowledgement', async () => {
  const module = await loadWithObservedWorker();
  const bytes = await onePagePdf();
  let settledBeforeExit = false;

  await module.validatePdfInWorker(bytes, { timeoutMs: 1 }).catch(() => {
    settledBeforeExit = !observed[0]!.exited;
  });

  await vi.waitFor(() => expect(observed[0]!.worker.threadId).toBe(-1));
  expect(settledBeforeExit).toBe(false);
});

it('configures the live worker with the bounded parser limits', async () => {
  const module = await loadWithObservedWorker();
  const result = await module.validatePdfInWorker(await onePagePdf());
  expect(result.pages).toBe(1);
  expect(observed[0]!.options.resourceLimits).toMatchObject({
    maxOldGenerationSizeMb: 64,
    maxYoungGenerationSizeMb: 16,
    codeRangeSizeMb: 16,
  });
});
