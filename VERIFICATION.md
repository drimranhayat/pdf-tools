# Verification

## Completed

- JavaScript syntax checks for app.js, engine.js and advanced.js.
- Core PDF output checks: merge page count; split ZIP contents; extraction; removal; rejection of removing every page; selective page rotation; organization; numbering; page-range validation and overlapping-range rejection.
- Advanced PDF output checks: duplication count, selective crop boxes, invalid crop rejection, selective A4 resizing (including blank pages), metadata edit/clear, form flattening, rejection of flattening a non-form, drawn signature embedding, text overlay and watermark PDF serialization.
- Generated Word document opened with python-docx and preserved text; HTML export escaped script content.
- Live browser checks: sample generation, reordering, merge (two PDFs into five pages), PDF-to-JPG (three images as ZIP), invalid page range with recovery, image-based compression and honest larger-output message, DOCX input and PDF output, PDF-to-Word text output, search and tool counts.
- Dashboard visual inspection in the cloud browser. Responsive CSS includes mobile layouts; no physical-device test was performed.

## Limits

Checks use generated fixtures, not an exhaustive PDF corpus. Real-world fonts, unusual encodings, interactive fields, signatures, rotated/cropped page combinations and damaged files need further compatibility testing. Full-fidelity Office conversion and OCR are not implemented. No accounts, billing, advertising or external processing services are integrated.

## SEO update

- Generated 24 static tool pages and four public information pages, in addition to the homepage.
- All 29 pages have unique canonical URLs, one title, one description, valid structured data and resolvable local script assets.
- Sitemap coverage exactly matches canonical page URLs; robots.txt permits crawling.
- Regex checks validate lowercase hyphenated slugs and reject tool-fragment links in generated HTML.
- Tool navigation now uses normal URLs; legacy hash links redirect to their matching tool page.
- Live browser opened /merge-pdf/ directly, initialized the tool, and displayed its instructions, related links, limitations and information-page links.
- Search Console verification, query filters inside the Google account, indexing and AdSense are not activated by this source update. Account-issued verification/publisher codes are required.
