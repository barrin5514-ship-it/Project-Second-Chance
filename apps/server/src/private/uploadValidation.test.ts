import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  validateUpload,
} from './uploadValidation';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const JPEG_1X1 = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==',
  'base64',
);

async function pdf(pages = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage();
  return Buffer.from(await doc.save());
}

async function expectInvalid(input: { buffer: Buffer; originalName: string }): Promise<void> {
  await expect(validateUpload(input)).rejects.toBeInstanceOf(UploadValidationError);
}

describe('upload validation', () => {
  it('accepts a real one-page PDF and reports its detected type', async () => {
    const result = await validateUpload({ buffer: await pdf(1), originalName: 'fictional.pdf' });
    expect(result).toMatchObject({ mimeType: 'application/pdf', extension: 'pdf' });
  });

  it('accepts a real PNG and JPEG and reports content-detected types', async () => {
    await expect(
      validateUpload({ buffer: PNG_1X1, originalName: 'fictional.png' }),
    ).resolves.toMatchObject({ mimeType: 'image/png' });
    await expect(
      validateUpload({ buffer: JPEG_1X1, originalName: 'fictional.jpg' }),
    ).resolves.toMatchObject({ mimeType: 'image/jpeg' });
  });

  it('rejects spoofed extension/MIME content', async () => {
    await expectInvalid({ buffer: Buffer.from('not a pdf'), originalName: 'fake.pdf' });
    await expectInvalid({ buffer: Buffer.from('<html>no</html>'), originalName: 'fake.png' });
  });

  it('rejects corrupt and encrypted-looking PDFs', async () => {
    await expectInvalid({
      buffer: Buffer.from('%PDF-1.7\nnot a document'),
      originalName: 'corrupt.pdf',
    });
    await expectInvalid({
      buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<< /Encrypt 2 0 R >>\nendobj\n%%EOF'),
      originalName: 'encrypted.pdf',
    });
  });

  it('rejects files over the 5 MiB cap before parsing', async () => {
    await expectInvalid({
      buffer: Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0x41),
      originalName: 'oversize.pdf',
    });
  });

  it('rejects PDFs over the page cap', async () => {
    await expectInvalid({ buffer: await pdf(51), originalName: 'pages.pdf' });
  });

  it('rejects images over the dimension/pixel cap', async () => {
    const hugePng = Buffer.from(PNG_1X1);
    hugePng.writeUInt32BE(20_000, 16);
    hugePng.writeUInt32BE(20_000, 20);
    await expectInvalid({ buffer: hugePng, originalName: 'huge.png' });
  });

  it('rejects unsafe filename forms even though filenames never determine storage paths', async () => {
    for (const name of [
      '',
      '../escape.pdf',
      '..\\escape.pdf',
      '/absolute.pdf',
      'C:\\drive.pdf',
      'line\r\nbreak.pdf',
      'nul\0byte.pdf',
      'trailing. ',
      'directory/file.pdf',
      'directory\\file.pdf',
    ]) {
      await expectInvalid({ buffer: PNG_1X1, originalName: name });
    }
  });

  it('does not echo filename/content/parser details in the error', async () => {
    try {
      await validateUpload({ buffer: Buffer.from('not a pdf'), originalName: '../secret-name.pdf' });
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(UploadValidationError);
      expect(String(error)).not.toMatch(/secret-name|not a pdf|node_modules/i);
    }
  });
});
