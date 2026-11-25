import { crc32 } from 'node:zlib';
import { fileTypeFromBuffer } from 'file-type';
import { imageSize } from 'image-size';
import { validatePdfInWorker } from './pdfValidation';

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

interface AllowedType {
  mimeType: string;
  extension: 'pdf' | 'png' | 'jpg';
  /** Filename endings that may be used for this content on download. */
  suffixes: readonly string[];
}

const ALLOWED = new Map<string, AllowedType>([
  ['pdf', { mimeType: 'application/pdf', extension: 'pdf', suffixes: ['.pdf'] }],
  ['png', { mimeType: 'image/png', extension: 'png', suffixes: ['.png'] }],
  ['jpg', { mimeType: 'image/jpeg', extension: 'jpg', suffixes: ['.jpg', '.jpeg'] }],
]);

const PDF_WHITESPACE = new Set([0x09, 0x0a, 0x0c, 0x0d, 0x20]);

function hasOnlyPdfTrailingWhitespace(buffer: Buffer): boolean {
  const marker = Buffer.from('%%EOF');
  const index = buffer.lastIndexOf(marker);
  if (index < 0) return false;
  for (const byte of buffer.subarray(index + marker.length)) {
    if (byte !== 0x00 && !PDF_WHITESPACE.has(byte)) return false;
  }
  return true;
}
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// The parsers below only read headers (images) or recover from damage (PDF), so
// these checks reject truncated files. They are not a full decode.

/** Every chunk through IEND is present with a matching checksum. */
function isCompletePng(buffer: Buffer): boolean {
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return false;
  let offset = PNG_SIGNATURE.length;
  let sawImageData = false;
  while (offset + 12 <= buffer.length) {
    const end = offset + 12 + buffer.readUInt32BE(offset);
    if (end > buffer.length) return false;
    if (crc32(buffer.subarray(offset + 4, end - 4)) !== buffer.readUInt32BE(end - 4)) return false;
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (offset === PNG_SIGNATURE.length && type !== 'IHDR') return false;
    if (type === 'IDAT') sawImageData = true;
    if (type === 'IEND') return sawImageData;
    offset = end;
  }
  return false;
}

/** A frame header, at least one scan and the end-of-image marker are present. */
function isCompleteJpeg(buffer: Buffer): boolean {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return false;
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;
  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) return false;
    const marker = buffer[offset + 1] ?? 0;
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0xd9) return sawFrame && sawScan; // trailing camera data is allowed
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (offset + 4 > buffer.length) return false;
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) return false;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) sawFrame = true;
    offset += 2 + length;
    if (marker === 0xda) {
      sawScan = true;
      // Skip compressed data up to the next marker that is not byte stuffing,
      // a fill byte or a restart marker.
      while (offset + 1 < buffer.length) {
        const next = buffer[offset + 1] ?? 0;
        const isMarker = next !== 0x00 && next !== 0xff && !(next >= 0xd0 && next <= 0xd7);
        if (buffer[offset] === 0xff && isMarker) break;
        offset += 1;
      }
    }
  }
  return false;
}

function validateFilename(name: string): void {
  if (name.length === 0 || name.length > 255) throw new UploadValidationError('invalid');
  if (name !== name.normalize('NFC')) throw new UploadValidationError('invalid');
  if (/[\u0000-\u001f\u007f-\u009f]/.test(name)) throw new UploadValidationError('invalid');
  // Direction overrides can make "gpj.exe" display as "exe.jpg".
  if (/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(name)) {
    throw new UploadValidationError('invalid');
  }
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
  const lowerName = input.originalName.toLowerCase();
  if (!allowed.suffixes.some((suffix) => lowerName.endsWith(suffix))) {
    throw new UploadValidationError('invalid');
  }

  try {
    if (allowed.extension === 'pdf') {
      if (!hasOnlyPdfTrailingWhitespace(input.buffer)) {
        throw new UploadValidationError('invalid');
      }
      const result = await validatePdfInWorker(input.buffer);
      if (result.pages < 1 || result.pages > MAX_PDF_PAGES) {
        throw new UploadValidationError('invalid');
      }
    } else {
      const complete = allowed.extension === 'png' ? isCompletePng : isCompleteJpeg;
      if (!complete(input.buffer)) throw new UploadValidationError('invalid');
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
