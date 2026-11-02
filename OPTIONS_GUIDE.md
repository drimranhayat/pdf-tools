# Expanded options — version 1.3

All 26 tools have been reviewed. The supported output formats are real encodings; an unsupported browser encoder is never relabelled as another format. Common settings stay visible, specialist settings are grouped under Advanced options, and each tool has an optional output filename. Irrelevant conditional fields are hidden. No server, paid API or new document-upload service is introduced.

## Formats

PDF to Images: JPG, PNG, WebP, BMP, TIFF, GIF, SVG, ICO and PPM. AVIF is offered only if a native encoder is detected. WebP is also capability-checked. SVG embeds a PNG page image; it is not reconstructed vector artwork. GIF is a single frame with a 256-color palette. TIFF is uncompressed, single-page RGB, with selected pages delivered as individual TIFF files inside a ZIP. BMP and PPM are uncompressed. ICO embeds a PNG thumbnail no larger than 256 pixels on the long edge. Transparency is supported only for PNG, WebP and SVG. Requested DPI can be reduced by the long-edge and 12-megapixel safety caps; PNG/JPEG browser metadata does not necessarily use the requested print DPI. BMP/TIFF include resolution metadata.

Text and OCR exports: TXT, DOCX, RTF, ODT, HTML, Markdown, JSON and CSV. These preserve recognized or extracted text, not the original page layout. CSV has page and text columns and prefixes potential spreadsheet formulas with an apostrophe. TXT, CSV and Markdown support UTF-8 or UTF-16LE, optional UTF-8 BOM, and LF or CRLF line endings. HTML is escaped; no source document scripts are run. JSON preserves page identifiers. DOCX and ODT are proper document containers, not renamed text files. PDF to Word separately offers DOCX, RTF, ODT and TXT; appearance preservation is DOCX only.

## Review of all tools

| Tool | Available settings |
|---|---|
| Merge PDF | Manual or filename order; all/odd/even pages per file; blank separator pages; filename |
| Split PDF | Individual pages; custom ranges; every N pages; odd/even groups; automatic or forced ZIP; filename |
| Compress PDF | Five presets or custom DPI and JPEG quality; color/grayscale/threshold; page presets/ranges; filename |
| Images to PDF | Image-sized pages or 11 standard sizes plus custom; orientation; margins; fit/fill/stretch; JPEG/PNG embedding; JPEG quality; background; image DPI; combined or separate PDFs in ZIP; filename |
| PDF to Images | Nine formats, conditional AVIF; ten resolution choices including custom; quality; color/grayscale/threshold; rotation; background; dimension cap; page selection; ZIP packaging; filename pattern; output filename |
| Rotate PDF | Relative or absolute rotation; 0/90/180/270 degrees; page presets/ranges; filename |
| Organize PDF | Custom order; reverse; odd-first; even-first; filename |
| Extract Pages | Combined PDF or individual PDFs in ZIP; selected or reversed order; page presets/ranges; filename |
| Remove Pages | Custom or odd/even/first/last selection; filename; removing every page is rejected |
| Watermark PDF | Text; direction or custom angle; opacity; color; stamp width; five positions; single or 3×3 pattern; font family/weight; page selection; filename |
| Page Numbers | Start; five templates including custom; decimal or Roman; six positions; font family/size; color; edge offset; page selection; filename |
| PDF to Text | Eight formats; cleanup; page selection; page headings; text encoding/BOM/line endings; filename |
| Crop PDF | Trim or restore media-box view; mm/pt/in units; four margins; page selection; filename |
| Resize PDF Pages | Eleven standard sizes plus custom; orientation; margins; fit/fill/stretch; page selection; filename |
| Grayscale PDF | DPI/custom DPI; grayscale or threshold; threshold value; JPEG quality; page selection; filename |
| Add Text | Text; position; width; font family/style; opacity; color; rotation; page selection; filename |
| Sign PDF | Drawn or typed visual signature; typed name; position/width; ink color; stroke width; opacity; rotation; page selection; filename |
| Flatten PDF Forms | Existing or regenerated appearances; filename; all fields are flattened |
| PDF Metadata | Edit/clear common properties; title/author/subject/keywords/creator/producer; keep/remove XMP; filename |
| PDF to Word | DOCX/RTF/ODT/TXT; clean/line/appearance modes; font/size/spacing; source boundaries or continuous text; appearance DPI; page selection; filename |
| Word to PDF | Standard/custom paper; orientation; margins; font size/family; line spacing; text color; filename |
| PDF to HTML | Eight text formats; cleanup; page selection; headings; text encoding controls for applicable formats; filename |
| PDF to Markdown | Eight text formats; cleanup; page selection; headings; text encoding controls for applicable formats; filename |
| Duplicate Pages | 1–20 additional copies; insert before/after originals or append at end; page selection; filename |
| Image to Text OCR | Eight outputs; seven language selections/combinations; five layout modes; three cleanup modes; rotation; grayscale/threshold; contrast; character whitelist; applicable text encoding settings; filename |
| Scanned PDF to Text | Same OCR options; page presets/ranges; four target PDF render DPI choices; filename |

## Limits retained

Up to 50 MB per input, 100 MB total, and 2,000 pages per source PDF. Merge and duplicate outputs stay within 2,000 pages. Splitting produces at most 100 PDFs. PDF to Images allows 100 selected pages; compression and grayscale allow 50 selected pages, a 12-megapixel cap and a 180 MB accumulated output cap. OCR allows 10 images or selected pages, one worker at a time. Word appearance mode allows 20 pages; editable Word modes allow 100. Roman numbers must stay within 1–3999. Custom numbering templates use ASCII. These caps protect the visitor’s device; they do not guarantee every device has enough memory.

Cropping, metadata editing, text overlays and watermarks are not secure redaction. Drawn or typed signatures are visual, not certificate-based digital signatures. Image-based compression, grayscale and Word-to-PDF can remove selectable text or interactive features. Preserve originals and inspect outputs.

## Deploy

Replace the repository files, including the new export-formats.js, text-formats.js and tool-settings.js modules, and push. Keep Cloudflare Pages settings unchanged: npm run build, output dist, NODE_VERSION=22, SITE_URL=https://pdf-tools.drimranhayat.com. Existing tool URLs and Search Console configuration are retained. No new service credentials are needed.

## Large PDF update

PDF inputs now accept up to 2,000 pages, subject to the existing 50 MB per-file limit. Merge and duplicate outputs also allow 2,000 pages. Split by groups of up to 2,000 pages; the maximum remains 100 output PDF parts per run. Large inputs can be opened in image/OCR tools, but only the selected processing range is allowed: 100 image-export pages (50 for compression/grayscale), 10 OCR pages, 20 Word page-image pages or 100 editable Word pages per run. These are separate limits. For large books, select a small range, save it, then repeat. A desktop browser is preferable; page count alone does not predict memory use.
