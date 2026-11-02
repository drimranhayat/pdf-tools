# Updated export choices

Version 1.2 adds eight text/OCR formats and extended controls. See OPTIONS_GUIDE.md for the current full list, format limits and deployment instructions.

# Word conversion and private OCR

## PDF to Word
- Clean editable paragraphs reconstruct lines and group likely paragraph continuations.
- Editable line formatting retains approximate font sizes, detectable emphasis, alignment, gaps and page boundaries. Large gaps become tabs; true tables and complex columns are not reconstructed.
- Preserve appearance embeds rendered page images in DOCX. Appearance stays close to the source; text is not editable. Limited to 20 selected pages; editable modes support 100 pages.
- Clean mode has an editable text preview. Saving edits produces a clean text-only DOCX; the original formatted download remains available.

## OCR
Image to Text and Scanned PDF to Text support English, Urdu, Arabic, English + Urdu, English + Arabic, Urdu + Arabic, and all three languages together. Choose automatic layout or a single text block, rotate inputs in 90-degree steps, keep line breaks or join wrapped lines, and save TXT, DOCX, RTF, ODT, HTML, Markdown, JSON or CSV. Review and edit the output, copy it, or save the corrected version. Up to 10 images or selected PDF pages per run. Use Cancel OCR to stop recognition.

Documents are never uploaded to an OCR API. Tesseract.js 6.0.1, Tesseract.js-core 6.0.0 and fast language models are bundled locally in dist/vendor/ocr/v1. No API key or paid service is required. The engine and selected language models load on demand from your website. Caching of OCR language data in IndexedDB is disabled; the browser may cache static website assets normally. No document result is persisted by the app.

OCR is best effort. Clear upright printed pages work better than blur, handwriting or Nastaleeq. Correct names, dates, numbers, punctuation and paragraph breaks manually. Language selection does not guarantee recognition quality. This release does not create searchable PDF files or promise exact editable Word layout. Image rendering is capped to protect device memory.

## Cloudflare deployment
Keep the existing build settings: npm run build; output dist; NODE_VERSION=22; SITE_URL=https://pdf-tools.drimranhayat.com. Upload all vendor files, including the language .gz files. Do not configure HTTP Content-Encoding: gzip for the .traineddata.gz assets: the OCR engine decompresses the bytes itself. No server-side OCR function is needed.

The two new canonical routes are /image-to-text/ and /scanned-pdf-to-text/. The generated sitemap now has 31 URLs. Existing tool URLs remain stable.

## Third-party sources
- https://github.com/naptha/tesseract.js (Apache-2.0)
- https://github.com/naptha/tesseract.js-core (Apache-2.0)
- https://github.com/naptha/tessdata/tree/gh-pages/4.0.0_fast (language files)

See dist/vendor/ocr/v1 for notices and scripts/ocr-assets.json for exact versions and file hashes.
