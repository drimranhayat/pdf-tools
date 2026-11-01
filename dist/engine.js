import { processAdvanced, readDocx, buildTextExport } from './advanced.js';
import * as pdfjs from './vendor/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
const pdfOptions = {
  cMapUrl: new URL('./vendor/cmaps/', import.meta.url).href,
  cMapPacked: true,
  standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href,
  wasmUrl: new URL('./vendor/wasm/', import.meta.url).href,
  isEvalSupported: false,
};
export const readableSize = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
export function parsePages(value, total, fallbackAll = false) {
  if (!value.trim()) {
    if (fallbackAll) return Array.from({ length: total }, (_, index) => index);
    throw new Error('Enter at least one page or page range.');
  }
  const result = [];
  for (const part of value.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Use page numbers and ranges, for example 1-3, 5, 7.');
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < start || end > total) throw new Error(`Page ranges must be between 1 and ${total}, with the smaller number first.`);
    for (let number = start; number <= end; number++) {
      if (result.includes(number - 1)) throw new Error('A page is listed more than once. Remove overlapping ranges.');
      result.push(number - 1);
    }
  }
  return result;
}
export async function inspectFile(file, imageMode, docxMode = false) {
  if (file.size > 50 * 1048576) throw new Error(`${file.name}: files must be 50 MB or smaller.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (docxMode) {
    if (!file.name.toLowerCase().endsWith('.docx')) throw new Error('Choose a DOCX file. Legacy DOC is not supported.');
    const text = await readDocx(bytes);
    return { file, bytes, pages: 1, text };
  }
  if (imageMode) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose JPG, PNG, or WebP images.');
    let image;
    try { image = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { throw new Error(`${file.name}: this image could not be opened.`); }
    const { width, height } = image;
    image.close();
    if (width * height > 40_000_000) throw new Error('Images must be under 40 megapixels.');
    return { file, bytes, pages: 1, width, height };
  }
  try {
    const doc = await window.PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
    if (!doc.getPageCount()) throw new Error('This PDF has no pages.');
    if (doc.getPageCount() > 200) throw new Error('Please choose a PDF with 200 pages or fewer.');
    return { file, bytes, pages: doc.getPageCount(), metadata: { title: doc.getTitle() || '', author: doc.getAuthor() || '', subject: doc.getSubject() || '', keywords: doc.getKeywords() || '' } };
  } catch (error) {
    if (error.message?.includes('200 pages') || error.message?.includes('no pages')) throw error;
    throw new Error(`${file.name}: unable to open this PDF. It may be encrypted or damaged. Use an unprotected, valid PDF.`);
  }
}
export async function sampleFiles(images = false) {
  if (images) {
    const canvas = document.createElement('canvas');
    canvas.width = 1000; canvas.height = 700;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eae5fb'; ctx.fillRect(0, 0, 1000, 700);
    ctx.fillStyle = '#6554d9'; ctx.fillRect(65, 70, 90, 12);
    ctx.font = 'bold 62px sans-serif'; ctx.fillText('A little simpler.', 65, 200);
    ctx.fillStyle = '#9180c9'; ctx.font = '30px sans-serif'; ctx.fillText('An image ready to become a PDF.', 65, 270);
    ctx.fillStyle = '#c4b7ec'; ctx.beginPath(); ctx.arc(770, 500, 190, 0, 7); ctx.fill();
    return [await new Promise(resolve => canvas.toBlob(blob => resolve(new File([blob], 'sample-image.png', { type: 'image/png' })), 'image/png'))];
  }
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const output = [];
  for (let document = 0; document < 2; document++) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (let index = 0; index < (document === 0 ? 3 : 2); index++) {
      const page = pdf.addPage([595, 842]);
      page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(.98, .97, 1) });
      page.drawRectangle({ x: 50, y: 750, width: 45, height: 6, color: rgb(.4, .33, .85) });
      page.drawText(document === 0 ? 'The everyday document' : 'A fresh perspective', { x: 50, y: 695, size: 27, font, color: rgb(.24, .2, .34) });
      page.drawText(`Sample document ${document + 1} - page ${index + 1}`, { x: 50, y: 650, size: 14, font, color: rgb(.55, .48, .65) });
      page.drawText('A simple PDF to help you explore your tools.', { x: 50, y: 610, size: 12, font });
      page.drawText('Merge, split, rotate, organize, and make it your own.', { x: 50, y: 587, size: 12, font });
      for (let line = 0; line < 8; line++) page.drawRectangle({ x: 50, y: 510 - line * 24, width: line % 3 === 0 ? 340 : 480, height: 5, color: rgb(.87, .84, .93) });
      page.drawText(String(index + 1), { x: 290, y: 40, size: 10, font });
    }
    output.push(new File([await pdf.save()], `sample-${document + 1}.pdf`, { type: 'application/pdf' }));
  }
  return output;
}
const openPdf = item => pdfjs.getDocument({ data: item.bytes.slice(), ...pdfOptions }).promise;
const savePdf = async pdf => new Blob([await pdf.save()], { type: 'application/pdf' });
const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This page could not be encoded.')), type, quality));
async function renderPage(page, dpi, grayscale = false) {
  const original = page.getViewport({ scale: 1 });
  const scale = Math.min(dpi / 72, 3500 / Math.max(original.width, original.height), Math.sqrt(12_000_000 / (original.width * original.height)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext('2d', { willReadFrequently: grayscale });
  await page.render({ canvasContext: ctx, canvas, viewport, background: 'rgb(255,255,255)' }).promise;
  if (grayscale) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = Math.round(.2126 * pixels.data[i] + .7152 * pixels.data[i + 1] + .0722 * pixels.data[i + 2]);
      pixels.data[i] = gray; pixels.data[i + 1] = gray; pixels.data[i + 2] = gray;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return canvas;
}
export async function processTool(tool, items, values, progress) {
  if (['crop','resize','add-text','signature','flatten','metadata','from-word','duplicate'].includes(tool)) return processAdvanced(tool, items, values, progress, parsePages);
  const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib;
  const name = items[0].file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 90) || 'document';
  const result = (blob, filename, detail) => ({ blob, filename, detail });
  const load = item => PDFDocument.load(item.bytes, { updateMetadata: false });
  const copySelected = async (source, indices) => {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(source, indices);
    pages.forEach(page => out.addPage(page));
    return out;
  };
  if (tool === 'merge') {
    if (items.length < 2) throw new Error('Choose at least two PDFs to merge.');
    if (items.reduce((total, item) => total + item.pages, 0) > 500) throw new Error('Merge up to 500 pages per operation.');
    const out = await PDFDocument.create();
    for (let index = 0; index < items.length; index++) {
      progress(`Adding document ${index + 1} of ${items.length}…`);
      const source = await load(items[index]);
      const pages = await out.copyPages(source, source.getPageIndices());
      pages.forEach(page => out.addPage(page));
    }
    return result(await savePdf(out), 'merged-document.pdf', `${items.length} documents combined into ${out.getPageCount()} pages.`);
  }
  if (tool === 'images') {
    const out = await PDFDocument.create();
    for (let index = 0; index < items.length; index++) {
      progress(`Converting image ${index + 1} of ${items.length}…`);
      const image = await createImageBitmap(items[index].file, { imageOrientation: 'from-image' });
      try {
        const factor = Math.min(1, 4000 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * factor); canvas.height = Math.round(image.height * factor);
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const picture = await out.embedJpg(await (await canvasBlob(canvas, 'image/jpeg', .92)).arrayBuffer());
        const margin = Number(values.margin);
        const landscape = values.orientation === 'landscape' || (values.orientation === 'auto' && picture.width > picture.height);
        const dimensions = values.paper === 'fit' ? [picture.width * .75 + margin * 2, picture.height * .75 + margin * 2] : landscape ? [842, 595] : [595, 842];
        const page = out.addPage(dimensions);
        const fit = Math.min((dimensions[0] - margin * 2) / picture.width, (dimensions[1] - margin * 2) / picture.height);
        const w = picture.width * fit; const h = picture.height * fit;
        page.drawImage(picture, { x: (dimensions[0] - w) / 2, y: (dimensions[1] - h) / 2, width: w, height: h });
      } finally { image.close(); }
    }
    return result(await savePdf(out), 'images-to-pdf.pdf', `${items.length} images converted into a single PDF.`);
  }
  if (['compress', 'to-images', 'text', 'grayscale', 'to-word', 'to-html', 'to-markdown'].includes(tool)) {
    const document = await openPdf(items[0]);
    try {
      const selected = parsePages(values.pages || '', document.numPages, true);
      const textMode = ['text', 'to-word', 'to-html', 'to-markdown'].includes(tool);
      if (!textMode && selected.length > 50) throw new Error('Image-based tools support up to 50 selected pages per operation. Enter a smaller page range.');
      if (textMode) {
        const chunks = [];
        const textPages = [];
        let count = 0;
        for (const pageIndex of selected) {
          progress(`Reading page ${pageIndex + 1}…`);
          const page = await document.getPage(pageIndex + 1);
          const content = await page.getTextContent();
          let text = '';
          for (const part of content.items) {
            if ('str' in part) text += part.str + (part.hasEOL ? '\n' : ' ');
          }
          count += text.trim().length;
          chunks.push(`--- Page ${pageIndex + 1} ---\n${text.trim()}`);
          textPages.push({ page: pageIndex + 1, text: text.trim() });
        }
        if (!count) throw new Error('No selectable text was found. This may be a scanned PDF; OCR is not included in this tool.');
        if (tool !== 'text') {
          const exported = await buildTextExport(textPages, tool, name);
          return result(exported.blob, `${name}.${exported.extension}`, `${selected.length} pages exported as editable text. Original layout, images, and tables are not preserved. No OCR is performed.`);
        }
        return result(new Blob([chunks.join('\n\n')], { type: 'text/plain;charset=utf-8' }), `${name}-text.txt`, `Selectable text extracted from ${selected.length} pages. Reading order depends on the PDF.`);
      }
      const zip = tool === 'to-images' ? new window.JSZip() : null;
      const out = ['compress', 'grayscale'].includes(tool) ? await PDFDocument.create() : null;
      const preset = { small: [90, .48], balanced: [120, .68], detail: [144, .84] }[values.compression] || [120, .68];
      let onlyBlob;
      const processingOrder = ['compress', 'grayscale'].includes(tool)
        ? Array.from({ length: document.numPages }, (_, index) => index)
        : selected;
      const unchangedSource = ['compress', 'grayscale'].includes(tool) && selected.length < document.numPages
        ? await load(items[0]) : null;
      for (let index = 0; index < processingOrder.length; index++) {
        const pageIndex = processingOrder[index];
        if (unchangedSource && !selected.includes(pageIndex)) {
          const [copied] = await out.copyPages(unchangedSource, [pageIndex]);
          out.addPage(copied);
          continue;
        }
        progress(`Rendering page ${index + 1} of ${processingOrder.length}…`);
        const page = await document.getPage(pageIndex + 1);
        const canvas = await renderPage(page, tool === 'compress' ? preset[0] : Number(values.dpi), tool === 'grayscale');
        const mime = tool === 'compress' || tool === 'grayscale' || values.imageFormat === 'jpg' ? 'image/jpeg' : 'image/png';
        const blob = await canvasBlob(canvas, mime, tool === 'compress' ? preset[1] : .9);
        if (zip) {
          onlyBlob = blob;
          zip.file(`${name}-page-${pageIndex + 1}.${values.imageFormat}`, await blob.arrayBuffer());
        } else {
          const view = page.getViewport({ scale: 1 });
          const embedded = await out.embedJpg(await blob.arrayBuffer());
          const target = out.addPage([view.width, view.height]);
          target.drawImage(embedded, { x: 0, y: 0, width: view.width, height: view.height });
        }
        canvas.width = 1; canvas.height = 1;
        page.cleanup();
      }
      if (zip) {
        if (selected.length === 1) return result(onlyBlob, `${name}-page-${selected[0] + 1}.${values.imageFormat}`, 'One page converted to an image.');
        return result(await zip.generateAsync({ type: 'blob' }), `${name}-images.zip`, `${selected.length} images packaged in one ZIP.`);
      }
      const blob = await savePdf(out);
      if (tool === 'grayscale') return result(blob, `${name}-grayscale.pdf`, `${selected.length} pages converted to grayscale images; all ${document.numPages} pages retained. Selectable text and interactive features on rebuilt pages are removed.`);
      const saved = 1 - blob.size / items[0].file.size;
      return result(blob, `${name}-compressed.pdf`, `${selected.length} ${selected.length === 1 ? 'page' : 'pages'} rebuilt as images; all ${document.numPages} pages retained. ${saved > 0 ? `${Math.floor(saved * 1000) / 10}% smaller.` : 'This result is larger than the original; try a smaller preset or keep the original.'} Selectable text and interactive features are removed.`);
    } finally { await document.destroy(); }
  }
  const source = await load(items[0]);
  const total = source.getPageCount();
  if (tool === 'split') {
    const ranges = values.splitMode === 'each' ? Array.from({ length: total }, (_, i) => [i]) : values.ranges.split('\n').filter(line => line.trim()).map(line => parsePages(line, total));
    if (!ranges.length) throw new Error('Enter one range per line.');
    if (ranges.length > 100) throw new Error('Split into up to 100 output PDFs at a time.');
    const zip = new window.JSZip();
    let onlyBlob;
    for (let index = 0; index < ranges.length; index++) {
      progress(`Creating part ${index + 1} of ${ranges.length}…`);
      const out = await copySelected(source, ranges[index]);
      onlyBlob = await savePdf(out);
      zip.file(`${name}-part-${index + 1}.pdf`, await onlyBlob.arrayBuffer());
    }
    return ranges.length === 1 ? result(onlyBlob, `${name}-split.pdf`, `${ranges[0].length} pages extracted.`) : result(await zip.generateAsync({ type: 'blob' }), `${name}-split.zip`, `${ranges.length} separate PDFs in one ZIP.`);
  }
  if (['extract', 'remove', 'organize'].includes(tool)) {
    let indices = parsePages(tool === 'organize' ? values.order : values.pages, total);
    if (tool === 'remove') indices = source.getPageIndices().filter(index => !indices.includes(index));
    if (!indices.length) throw new Error('Keep at least one page in your PDF.');
    const out = await copySelected(source, indices);
    return result(await savePdf(out), `${name}-${tool}.pdf`, `${indices.length} pages saved in your selected order.`);
  }
  const indices = parsePages(values.pages || '', total, true);
  if (tool === 'rotate') {
    for (const index of indices) {
      const page = source.getPage(index);
      page.setRotation(degrees((page.getRotation().angle + Number(values.angle)) % 360));
    }
  }
  if (tool === 'numbers') {
    const font = await source.embedFont(StandardFonts.Helvetica);
    for (let count = 0; count < indices.length; count++) {
      const page = source.getPage(indices[count]);
      const text = String(Number(values.start) + count);
      const fontSize = Number(values.fontSize) || 11;
      const width = font.widthOfTextAtSize(text, fontSize);
      const x = values.position.endsWith('left') ? 24 : values.position.endsWith('right') ? page.getWidth() - width - 24 : (page.getWidth() - width) / 2;
      page.drawText(text, { x, y: values.position.startsWith('top') ? page.getHeight() - 30 : 20, size: fontSize, font, color: rgb(.3, .3, .36) });
    }
  }
  if (tool === 'watermark') {
    const text = values.watermark.trim();
    if (!text) throw new Error('Enter watermark text.');
    if (text.length > 100) throw new Error('Keep the watermark to 100 characters or fewer.');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 90px Arial, sans-serif';
    canvas.width = Math.min(5000, Math.ceil(ctx.measureText(text).width) + 80); canvas.height = 150;
    ctx.font = 'bold 90px Arial, sans-serif'; ctx.fillStyle = values.color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (/[\u0600-\u06ff]/.test(text)) ctx.direction = 'rtl';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
    const stamp = await source.embedPng(await (await canvasBlob(canvas, 'image/png')).arrayBuffer());
    for (const index of indices) {
      const page = source.getPage(index);
      const width = page.getWidth() * .72; const height = width * stamp.height / stamp.width;
      const angle = values.direction === 'diagonal' ? 35 : 0;
      const rad = angle * Math.PI / 180;
      const x = page.getWidth() / 2 - Math.cos(rad) * width / 2 + Math.sin(rad) * height / 2;
      const y = page.getHeight() / 2 - Math.sin(rad) * width / 2 - Math.cos(rad) * height / 2;
      page.drawImage(stamp, { x, y, width, height, opacity: Number(values.opacity), rotate: degrees(angle) });
    }
  }
  return result(await savePdf(source), `${name}-${tool}.pdf`, `${indices.length} pages updated. Original files are unchanged.`);
}
