# Image export limit update — version 1.3.1

PDF to Images now accepts 100 selected pages per run. The 180 MB accumulated output budget and per-page resolution caps remain unchanged. Compression and grayscale remain at 50 pages; OCR remains at 10. Boundary tests verify 100 acceptance and 101 rejection for image export and preserve the other tools’ limits.

# Large PDF limit update — version 1.3

Input, merge-output and duplicate-output limits are now 2,000 pages. File-size and heavy-operation limits remain unchanged. Regression checks include actual 2,000-page PDFs, acceptance at the limit, rejection at 2,001 pages, page-range extraction, whole-document rotation and a 2,000-page merge. These use lightweight generated pages, not a guarantee for image-heavy books or every phone.

# Verification — version 1.2

- npm test: 12 passing test entries, including a file containing 13 real-PDF option scenarios. Coverage includes all 26 setting forms, page presets, paper dimensions, page counts/order, cropping/reset, resize, merge separators, grouping, numbering, metadata, binary formats, Unicode/encoding, CSV safety, text containers and existing Word reconstruction.
- Independent Pillow decoding opened generated BMP, TIFF and GIF fixtures, checked dimensions and RGB pixels. GIF is palette-quantized as documented.
- Browser PDF-to-Images generated all nine advertised formats: JPG, PNG, WebP, BMP, TIFF, GIF, SVG, ICO and PPM. AVIF was correctly absent because this browser did not expose its encoder. The native blob MIME is checked before returning native image formats.
- Browser combined odd-page selection, 90-degree render rotation, black-and-white pixels, transparent PNG background selection, padded archive names and an output filename; it returned a two-image ZIP.
- Browser PDF-to-Text generated TXT, RTF, ODT and JSON outputs. All eight serializers were also tested independently.
- Browser Images-to-PDF with Letter/fit settings, typed visual-signature processing, and Word-to-PDF with Letter/16-point text produced PDF results. OCR with single-block layout produced an editable preview and RTF output.
- Generated SEO pages retain the same production domain and 31 sitemap URLs. Asset audit checks remain in place; OCR assets and immutable paths did not change.

The tests are representative, not every permutation of every setting. Browser UI checks verify file-generation result states; native Word/LibreOffice rendering and new physical-device tests were not performed in this update. Previous OCR quality and production load-test limits remain applicable. No GitHub push, DNS change or production deployment is performed by this ZIP update.

# Earlier verification — version 1.1

## Automated checks
- npm test: five passing tests covering paragraph reconstruction, heading detection, tab-separated gaps, RTL text, line cleanup, escaped DOCX XML, section sizing and image relationships.
- python3 scripts/audit-seo.py: 31 pages, unique canonical URLs, titles, descriptions, schema, local scripts, lowercase slugs and exact sitemap coverage.
- python3 scripts/audit-assets.py: bundled OCR hashes and language gzip integrity, non-conflicting immutable cache rules, no server Worker, and all assets below 25 MiB.
- JavaScript syntax checks pass for application, processing, OCR and generator modules.

## Browser checks
- Homepage and OCR category filter: the OCR filter shows exactly two tools.
- Image OCR recognized the built-in English sample; TXT and DOCX results were created.
- Image-only PDF fixture recognized PRIVATE OCR TEST and its body text.
- Arabic and Urdu models loaded and produced text. The simple Urdu fixture contained recognition mistakes; Arabic omitted a line. These checks establish working integration, not high accuracy. Output requires review and correction.
- Editable preview accepted corrections; Save edited Word displayed its completion state. The browser download-event capture timed out, so downloaded bytes were not independently opened in Word. DOCX packaging and XML were tested separately.
- Copy fallback selected the text and displayed keyboard-copy instructions on the HTTP preview. Production HTTPS clipboard permission behavior was not tested.
- Cancel OCR restored controls and displayed OCR cancelled.
- PDF to Word clean mode created a 3-page sample DOCX with reconstructed text. Appearance mode created a page-image DOCX and clearly labeled it non-editable.
- Phone (390 px) homepage and tablet (768 px) workspace inspected using constrained preview frames; desktop layout inspected in the cloud browser. No physical-device test performed.

## Limits
No deployed Cloudflare load test or production cache-header test was performed. The included static architecture and versioned asset caching prepare the site for growth but do not guarantee a traffic capacity. Complex documents, exact editable Office layouts, unusual fonts and damaged PDFs require further compatibility testing. There is no searchable PDF output, handwriting guarantee, server-side OCR, payment system or advertising integration.

Search Console still needs your account-issued verification token. The production domain remains https://pdf-tools.drimranhayat.com. This package updates the repository export; it does not push to a GitHub account or deploy to Cloudflare automatically.
