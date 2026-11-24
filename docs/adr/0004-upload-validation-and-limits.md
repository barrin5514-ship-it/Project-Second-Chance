# ADR-0004 — Private document upload validation and limits

- Status: **proposed by the builder (DeepSeek)** for E1-S2. Limits/allowlist are implementation proposals requiring independent/owner review; no cloud malware scanner or paid service.
- Binding: FR-06; NFR-03/07/19; AD-08/09. No OCR/extraction/preview in this slice.

## Decisions

### D1 — Transport and parser

- `multer@2.5.0` memory storage for one file per request, mounted only on the authenticated upload route after auth/origin/CSRF checks.
- Limits: one file; 5 MiB file; at most 4 text fields; 6 total parts; field name 64 bytes; field value 1,024 bytes; 100 header pairs; request timeout 30 seconds.
- No user filename/path is used for storage. A second file or unexpected part is rejected. Multipart errors map to generic 400/413 JSON; no parser stack/raw body echo.

### D2 — Content allowlist

- Detect content with `file-type@22.3.0` from bytes. Allow only:
  - PDF (`application/pdf`);
  - PNG (`image/png`);
  - JPEG (`image/jpeg`).
- Browser MIME, extension and declared `Content-Type` are not trusted. Extension/MIME mismatches do not grant acceptance; the detected type is authoritative.
- Structural validation:
  - PDF via `pdf-lib@1.17.1`: reject encrypted, corrupt or unparsable; require 1–50 pages; no JavaScript/embedded-file extraction or rendering.
  - PNG/JPEG via `image-size@2.1.0`: require positive dimensions, each dimension ≤12,000 px, total pixels ≤40,000,000.
- Filename safety (even though it is not a storage path): reject empty/over-255, NUL/control chars, CR/LF, `/`, `\`, `..`, absolute/drive/UNC forms, trailing dot/space, and names whose basename differs. Reject rather than silently rewrite.
- Encrypted PDFs, unsupported formats, truncated/corrupt files, spoofed MIME/extension, image bombs and parser errors are rejected with a generic validation failure.
- Active content is not rendered or executed; downloads are `Content-Disposition: attachment` with `nosniff` and `no-store`. No inline preview.
- Structural validation is not an antivirus guarantee. A future malware scanner requires separate review; none is claimed here.

### D3 — Quotas

- Per account: 100 live cases, 100 live documents total.
- Per case: 50 live documents.
- These are counted before publication in a best-effort transaction; the local single-process demo does not claim serializable quota enforcement under concurrent uploads. A future hosted/multi-process design needs a stronger quota lock.
- Oversized/multiple/part-overflow requests are rejected before encryption/publication.

### D4 — Error and logging policy

- Generic client responses: `invalid-upload`, `payload-too-large`, `not-found`, `unavailable`, `invalid-request`.
- No original filename, content, hash, detected MIME, parser message, key, nonce, path or stack in logs/errors. Tests capture responses and assert canaries are absent.
- Upload cancellation/failure leaves no plaintext temp file; encryption happens before any staged write.

## Consequences

- 5 MiB and the page/pixel caps are explicit local-demo choices, not product-wide permanent policy.
- `pdf-lib`/`image-size` are structural parsers, not sandboxed malware analysis; size caps bound resource use but do not prove safety of every crafted file.
- No extraction, OCR, preview, replacement/move, sharing, bulk export or automatic malware scan is added.
