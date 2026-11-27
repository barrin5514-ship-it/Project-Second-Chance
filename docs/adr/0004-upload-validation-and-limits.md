# ADR-0004 — Private document upload validation and limits

- Status: **proposed by the builder (DeepSeek)** for E1-S2. Limits/allowlist are implementation proposals requiring independent/owner review; no cloud malware scanner or paid service.
- Binding: FR-06; NFR-03/07/19; AD-08/09. No OCR/extraction/preview in this slice.

## Decisions

### D1 — Transport and parser

- `multer@2.5.0` memory storage for one file per request, mounted only on the authenticated upload route after auth/origin/CSRF checks.
- Limits: one file; 5 MiB file; at most 4 text fields; 6 total parts; field name 64 bytes; field value 1,024 bytes; 100 header pairs; request timeout 30 seconds. A 408 ends the response but does not pretend the underlying parser/validation has stopped; its concurrency slot remains held until that work terminates or is bounded by the PDF worker deadline.
- No user filename/path is used for storage. A second file or unexpected part is rejected. Multipart errors map to generic 400/413 JSON; no parser stack/raw body echo.

### D2 — Content allowlist

- Detect content with `file-type@22.3.0` from bytes. Allow only:
  - PDF (`application/pdf`);
  - PNG (`image/png`);
  - JPEG (`image/jpeg`).
- Browser MIME and declared `Content-Type` are ignored; the type detected from bytes is authoritative and is the type stored and served.
- The filename extension must match the detected type (`.pdf`, `.png`, `.jpg`/`.jpeg`, any letter case). The original name is reused on download, so a mismatch such as `.html` or `.exe` is rejected (spec `UPLOAD_BAD`). *Review change, 2026-11-24.*
- Structural validation:
  - PDF: require a final `%%EOF`, with only PDF whitespace/NUL after it. This rejects appending junk or a partial appended revision while accepting normal trailing whitespace. Then parse in the bounded worker: reject encrypted, corrupt or unparsable; require 1–50 pages; no JavaScript/embedded-file extraction or rendering. Residual: a file cut exactly at an earlier valid incremental-save boundary is byte-identical to that valid earlier file and cannot be detected without an expected hash/length; this limitation needs owner acceptance.
  - PNG: require every chunk through `IEND`, starting with `IHDR`, with matching CRCs and at least one `IDAT`. JPEG: require a frame header, a scan and the end-of-image marker; trailing bytes are allowed. `image-size` reads headers only, so these reject truncated files. They are not a pixel decode.
  - PNG/JPEG via `image-size@2.1.0`: require positive dimensions, each dimension ≤12,000 px, total pixels ≤40,000,000.
- Filenames are decoded as UTF-8. C1 controls and bidirectional-override characters are rejected.
- Case ownership is checked before the multipart body is parsed. Malformed multipart bodies return `invalid-upload`. Nothing is published after the 408 upload window, a client disconnect, or loss of the stored session.
- Filename safety (even though it is not a storage path): reject empty/over-255, NUL/control chars, CR/LF, `/`, `\`, `..`, absolute/drive/UNC forms, trailing dot/space, and names whose basename differs. Reject rather than silently rewrite.
- PDF parsing runs in a `worker_threads` worker with `maxOldGenerationSizeMb=64` and a 3-second wall-clock deadline; the worker is terminated on timeout/OOM. The main event loop remains available to health/other users and a timed-out validation is rejected. This is resource isolation, not malware scanning.
- Encrypted PDFs, unsupported formats, truncated/corrupt files, spoofed MIME/extension, image bombs and parser errors are rejected with a generic validation failure.
- Active content is not rendered or executed; downloads are `Content-Disposition: attachment` with `nosniff` and `no-store`. No inline preview.
- Structural validation is not an antivirus guarantee. A future malware scanner requires separate review; none is claimed here.

### D3 — Quotas

- Per account: 100 live cases, 100 live documents total. Persisted cases (including error/deleting states awaiting cleanup) count; documents count unless they are in the transient pending upload state. Failed uploads that never allocated a row do not consume quota.
- Per case: 50 live documents.
- Per user: **2 concurrent uploads** (proposed, pending owner approval). A third concurrent upload receives generic `429 {error:"too-many-uploads"}` with `Retry-After: 1`; the slot represents actual parsing/validation work and is released only when that work terminates, including the PDF worker's exit acknowledgement, not merely when the response finishes or the client disconnects. The counter is in-memory and per-process, so this is a local-demo guard rather than a distributed lock.
- These are counted before publication as a best-effort check; the local single-process demo does not claim serializable quota enforcement under concurrent uploads. A future hosted/multi-process design needs a stronger quota lock.
- Oversized/multiple/part-overflow requests are rejected before encryption/publication.

### D4 — Error and logging policy

- Generic client responses: `invalid-upload`, `payload-too-large`, `not-found`, `unavailable`, `invalid-request`.
- Quota refusals currently use the generic `invalid-request` path; this can give field/file-format advice instead of naming the reached quota. That is a documented usability residual; no stronger quota protocol is approved.
- No original filename, content, hash, detected MIME, parser message, key, nonce, path or stack in logs/errors. Tests capture responses and assert canaries are absent.
- Upload cancellation/failure leaves no plaintext temp file; encryption happens before any staged write.

## Consequences

- 5 MiB and the page/pixel caps are explicit local-demo choices, not product-wide permanent policy.
- `pdf-lib`/`image-size` are structural parsers, not sandboxed malware analysis; size caps bound resource use but do not prove safety of every crafted file.
- PNG CRC verification uses `node:zlib.crc32`, which requires Node **22.2+**; the project engine is `>=22.2.0`.
- No extraction, OCR, preview, replacement/move, sharing, bulk export or automatic malware scan is added.
