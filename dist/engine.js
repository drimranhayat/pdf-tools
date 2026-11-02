import {validatePdfPages,PDF_OUTPUT_PAGES,validateRasterPages} from './limits.js';
import {encodeImage,processPixels,numberIn,paperDimensions,selectedPreset,roman} from './export-formats.js';
import {exportText} from './text-formats.js';
import { cleanText, reconstructPage, wordDocument, recognizePages, imageCanvas, pdfCanvas, textDownload } from './word-ocr.js';
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
    if (!['image/jpeg','image/png','image/webp','image/bmp','image/gif','image/avif','image/x-icon','image/vnd.microsoft.icon'].includes(file.type)) throw new Error('Choose a browser-readable JPG, PNG, WebP, BMP, GIF, AVIF or ICO image. GIF and ICO inputs use one decoded frame.');
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
    validatePdfPages(doc.getPageCount());
    return { file, bytes, pages: doc.getPageCount(), metadata: { title: doc.getTitle() || '', author: doc.getAuthor() || '', subject: doc.getSubject() || '', keywords: doc.getKeywords() || '',creator:doc.getCreator()||'',producer:doc.getProducer()||'' } };
  } catch (error) {
    if (error.code==='PDF_PAGE_LIMIT' || error.message?.includes('no pages')) throw error;
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
async function renderPage(page, dpi, grayscale = false, values = {}) {
  const rotation=(page.rotate+Number(values.renderRotation||0))%360;
  const original = page.getViewport({ scale: 1,rotation });
  const scale = Math.min(dpi / 72, numberIn(values.maxEdge,256,6000,'Maximum edge',3500) / Math.max(original.width, original.height), Math.sqrt(12_000_000 / (original.width * original.height)));
  const viewport = page.getViewport({ scale,rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext('2d', { willReadFrequently: grayscale });
  await page.render({ canvasContext: ctx, canvas, viewport, background: values.backgroundMode==='transparent'&&['png','webp','svg'].includes(values.imageFormat)?'rgba(0,0,0,0)':values.backgroundMode==='color'?values.background:'rgb(255,255,255)' }).promise;
  processPixels(canvas,values.colorMode||(grayscale?'grayscale':'color'),Number(values.threshold??128));
  return canvas;
}
export async function processTool(tool,items,values,progress,signal){
  values={...values};
  if(values.pagePreset&&values.pagePreset!=='custom'){
    values.pages=selectedPreset(values.pagePreset,items[0].pages);
    if(!values.pages)throw new Error('This page selection contains no pages.');
  }
  const result=await processToolCore(tool,items,values,progress,signal);
  if(values.outputName?.trim()){
    const clean=values.outputName.trim().replace(/\.[a-z0-9]{1,8}$/i,'').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/^[. ]+|[. ]+$/g,'').slice(0,100);
    if(clean)result.filename=clean+result.filename.slice(result.filename.lastIndexOf('.'));
  }
  return result;
}
async function processToolCore(tool, items, values, progress, signal) {
  if (['crop','resize','add-text','signature','flatten','metadata','from-word','duplicate'].includes(tool)) return processAdvanced(tool, items, values, progress, parsePages);
  const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib;
  const name = items[0].file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 90) || 'document';
  const result = (blob, filename, detail) => ({ blob, filename, detail });
  if (['image-ocr','pdf-ocr','to-word'].includes(tool)) {
    let doc;
    try {
      if (tool !== 'image-ocr') doc = await openPdf(items[0]);
      const selected = doc ? parsePages(values.pages || '', doc.numPages, true) : items.map((_,i)=>i);
      if(tool==='to-word') {
        const mode=values.wordFormat&&values.wordFormat!=='docx'?'clean':['clean','layout','appearance'].includes(values.wordMode)?values.wordMode:'clean';
        if(selected.length>(mode==='appearance'?20:100))throw new Error(`Choose at most ${mode==='appearance'?20:100} pages for this Word mode.`);
        const pages=[];
        for(const index of selected){
          progress(`Reconstructing Word page ${index+1}…`);
          const page=await doc.getPage(index+1);const view=page.getViewport({scale:1});
          if(mode==='appearance'){
            const canvas=await pdfCanvas(page,numberIn(values.wordDpi,72,300,'Word render DPI',144));
            try{const image=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Cannot create page image.')),'image/png'));pages.push({page:index+1,width:view.width,height:view.height,image});}finally{canvas.width=canvas.height=1;}
          } else pages.push({page:index+1,...reconstructPage(await page.getTextContent(),view,mode)});
          page.cleanup();
        }
        if(mode!=='appearance'&&!pages.some(p=>p.text.trim()))throw new Error('No selectable text found. Use Scanned PDF to Text (OCR), or choose Preserve appearance.');
        const format=['docx','rtf','odt','txt'].includes(values.wordFormat)?values.wordFormat:'docx';
        if(mode==='appearance'&&format!=='docx')throw new Error('Appearance mode requires DOCX output. Choose an editable mode for text formats.');
        const blob=format==='docx'?await wordDocument(pages,values):(await exportText(pages,format,values,wordDocument)).blob;
        return {...result(blob,`${name}.${format}`,mode==='appearance'?'Page appearance preserved as images in Word. Text is not editable.':'Editable Word created with reconstructed paragraphs, font sizes, alignment and page boundaries. Complex tables, columns, images and exact layout may differ.'), ...(mode==='clean'&&format==='docx'?{previewText:pages.map(p=>p.text).join('\n\n'),format:'docx',previewNote:'Editing this preview saves a clean text-only Word document; choose the main download to keep reconstructed formatting.'}:{})};
      }
      if(selected.length>10)throw new Error('OCR supports up to 10 images or selected PDF pages at a time. Choose fewer pages.');
      const rotation=Number(values.ocrRotation)||0;
      const sources=selected.map(index=>async()=>doc?pdfCanvas(await doc.getPage(index+1),numberIn(values.ocrDpi,72,300,'OCR DPI',180),rotation):imageCanvas(items[index].file,rotation));
      const recognized=await recognizePages(sources,values,progress,signal);
      const format=['txt','docx','rtf','odt','html','md','json','csv'].includes(values.output)?values.output:'txt';
      const blob=(await exportText(recognized.pages.map((p,i)=>({...p,page:selected[i]+1})),format,values,wordDocument)).blob;
      return {...result(blob,`${name}-ocr.${format}`,`Recognized ${selected.length} ${doc?(selected.length===1?'page':'pages'):(selected.length===1?'image':'images')}. Review all text, names and numbers. OCR does not preserve the original layout; Urdu Nastaleeq, handwriting and poor scans can be inaccurate.`),previewText:recognized.text,format,previewNote:'Correct the recognized text below, then save your edited version. Confidence is an engine estimate, not an accuracy score.',confidences:recognized.pages.map((p,i)=>`Page ${selected[i]+1}: ${p.confidence}%`)};
    } finally { if(doc)await doc.destroy(); }
  }

  const hexColor=hex=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
  const load = item => PDFDocument.load(item.bytes, { updateMetadata: false });
  const copySelected = async (source, indices) => {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(source, indices);
    pages.forEach(page => out.addPage(page));
    return out;
  };
  if (tool === 'merge') {
    if (items.length < 2) throw new Error('Choose at least two PDFs to merge.');
    if (items.reduce((total, item) => total + item.pages, 0) > PDF_OUTPUT_PAGES) throw new Error('Merge up to 2,000 pages per operation.');
    const out = await PDFDocument.create();
    if(values.mergeOrder==='name'||values.mergeOrder==='reverse-name')items=[...items].sort((a,b)=>a.file.name.localeCompare(b.file.name,undefined,{numeric:true})*(values.mergeOrder==='reverse-name'?-1:1));
    for (let index = 0; index < items.length; index++) {
      progress(`Adding document ${index + 1} of ${items.length}…`);
      const source = await load(items[index]);
      const indices=source.getPageIndices().filter(i=>values.mergePages==='odd'?i%2===0:values.mergePages==='even'?i%2===1:true);
      const pages = await out.copyPages(source, indices);
      pages.forEach(page => out.addPage(page));
      if(values.mergeSeparator==='blank'&&index<items.length-1)out.addPage([source.getPage(0).getWidth(),source.getPage(0).getHeight()]);
    }
    if(!out.getPageCount())throw new Error('No pages matched the merge filter.');
    if(out.getPageCount()>PDF_OUTPUT_PAGES)throw new Error('Including blank separators, merge output must stay within 2,000 pages.');
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
        const ctx = canvas.getContext('2d'); ctx.fillStyle = values.background||'#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const picture=values.embedFormat==='png'?await out.embedPng(await(await canvasBlob(canvas,'image/png')).arrayBuffer()):await out.embedJpg(await(await canvasBlob(canvas,'image/jpeg',numberIn(values.quality,1,100,'JPEG quality',92)/100)).arrayBuffer());
        const margin = numberIn(values.margin,0,144,'Margin',24);
        const landscape = values.orientation === 'landscape' || (values.orientation === 'auto' && picture.width > picture.height);
        const dimensions=values.paper==='fit'?[picture.width*72/numberIn(values.imageDpi,36,600,'Image DPI',96)+margin*2,picture.height*72/numberIn(values.imageDpi,36,600,'Image DPI',96)+margin*2]:paperDimensions(values,[picture.width,picture.height]);
        if(dimensions.some(n=>n<=margin*2+10))throw new Error('Margins leave too little room on this paper size.');

        const page = out.addPage(dimensions);
        const hex=values.background||'#ffffff';page.drawRectangle({x:0,y:0,width:dimensions[0],height:dimensions[1],color:rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255)});
        const fit = (values.fitMode==='cover'?Math.max:Math.min)((dimensions[0] - margin * 2) / picture.width, (dimensions[1] - margin * 2) / picture.height);
        const w=values.fitMode==='stretch'?dimensions[0]-margin*2:picture.width*fit;const h=values.fitMode==='stretch'?dimensions[1]-margin*2:picture.height*fit;
        page.drawImage(picture, { x: (dimensions[0] - w) / 2, y: (dimensions[1] - h) / 2, width: w, height: h });
      } finally { image.close(); }
    }
    if(values.imagePackaging==='each'){const zip=new window.JSZip();for(let i=0;i<out.getPageCount();i++){const one=await PDFDocument.create();const[p]=await one.copyPages(out,[i]);one.addPage(p);zip.file(`image-${i+1}.pdf`,await one.save());}return result(await zip.generateAsync({type:'blob'}),'images-to-pdf.zip',`${items.length} separate PDFs in a ZIP.`);}
    return result(await savePdf(out), 'images-to-pdf.pdf', `${items.length} images converted into a single PDF.`);
  }
  if (['compress', 'to-images', 'text', 'grayscale', 'to-word', 'to-html', 'to-markdown'].includes(tool)) {
    const document = await openPdf(items[0]);
    try {
      const selected = parsePages(values.pages || '', document.numPages, true);
      const textMode = ['text', 'to-word', 'to-html', 'to-markdown'].includes(tool);
      if(!textMode)validateRasterPages(tool,selected.length);
      if (textMode) {
        const chunks = [];
        const textPages = [];
        let count = 0;
        for (const pageIndex of selected) {
          progress(`Reading page ${pageIndex + 1}…`);
          const page = await document.getPage(pageIndex + 1);
          const content = await page.getTextContent();
          let text=reconstructPage(content,page.getViewport({scale:1}),values.cleanup==='paragraphs'?'clean':'layout').text;
          if(values.cleanup==='paragraphs')text=cleanText(text);
          count += text.trim().length;
          chunks.push(`--- Page ${pageIndex + 1} ---\n${text.trim()}`);
          textPages.push({ page: pageIndex + 1, text: text.trim() });
        }
        if (!count) throw new Error('No selectable text was found. This may be a scanned PDF; OCR is not included in this tool.');
        const format=values.textFormat||(tool==='to-html'?'html':tool==='to-markdown'?'md':'txt');
        const exported=await exportText(textPages,format,values,wordDocument);
        return result(exported.blob,`${name}.${exported.extension}`,`${selected.length} pages exported as ${format.toUpperCase()}. Text only; original layout and images are not retained.`);
      }
      const zip = tool === 'to-images' ? new window.JSZip() : null;
      const out = ['compress', 'grayscale'].includes(tool) ? await PDFDocument.create() : null;
      const preset=values.compression==='custom'?[numberIn(values.customDpi,36,300,'DPI',120),numberIn(values.quality,1,100,'Quality',68)/100]:({tiny:[72,.35],small:[90,.48],balanced:[120,.68],detail:[144,.84],print:[200,.9]}[values.compression]||[120,.68]);
      let outputBytes=0;
      let onlyBlob,singleName;
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
        const dpi=tool==='compress'?preset[0]:values.dpi==='custom'?numberIn(values.customDpi,36,600,'DPI',144):numberIn(values.dpi,36,600,'DPI',144);
        const canvas=await renderPage(page,dpi,tool==='grayscale',values);
        const blob=zip?await encodeImage(canvas,values.imageFormat||'jpg',numberIn(values.quality,1,100,'Quality',90)/100,dpi):await canvasBlob(canvas,'image/jpeg',tool==='compress'?preset[1]:numberIn(values.quality,1,100,'Quality',90)/100);
        outputBytes+=blob.size;if(outputBytes>180*1048576)throw new Error('Output exceeds 180 MB. Use fewer pages, a lower resolution or a compressed format.');
        if (zip) {
          onlyBlob = blob;
          const suffix=values.pageNaming==='padded'?String(pageIndex+1).padStart(3,'0'):String(pageIndex+1);
          singleName=`${values.pageNaming==='number'?'':name+'-page-'}${suffix}.${values.imageFormat}`;
          zip.file(singleName,await blob.arrayBuffer());
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
        if (selected.length === 1&&values.packageMode!=='zip') return result(onlyBlob, singleName, 'One page rendered. Resolution may be capped for memory; SVG embeds a raster image and ICO is a thumbnail.');
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
    let ranges;
    if(values.splitMode==='every'){const size=numberIn(values.splitEvery,1,2000,'Pages per part',2);if(!Number.isInteger(size))throw new Error('Use a whole number of pages per part.');ranges=Array.from({length:Math.ceil(total/size)},(_,n)=>source.getPageIndices().slice(n*size,(n+1)*size));}
    else if(values.splitMode==='odd-even')ranges=[source.getPageIndices().filter(i=>i%2===0),source.getPageIndices().filter(i=>i%2===1)].filter(a=>a.length);
    else ranges=values.splitMode==='each'?Array.from({length:total},(_,i)=>[i]):(values.ranges||'').split('\n').filter(line=>line.trim()).map(line=>parsePages(line,total));
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
    return ranges.length === 1&&values.packageMode!=='zip' ? result(onlyBlob, `${name}-split.pdf`, `${ranges[0].length} pages extracted.`) : result(await zip.generateAsync({ type: 'blob' }), `${name}-split.zip`, `${ranges.length} separate PDFs in one ZIP.`);
  }
  if (['extract', 'remove', 'organize'].includes(tool)) {
    let order=values.order;
    if(tool==='organize'&&values.orderMode!=='custom'){const all=source.getPageIndices();order=(values.orderMode==='reverse'?all.reverse():values.orderMode==='odd-first'?[...all.filter(i=>i%2===0),...all.filter(i=>i%2===1)]:values.orderMode==='even-first'?[...all.filter(i=>i%2===1),...all.filter(i=>i%2===0)]:all).map(i=>i+1).join(',');}
    let indices=parsePages(tool==='organize'?order:(values.pages||''),total,tool==='extract');
    if(values.selectedOrder==='reverse')indices.reverse();
    if(tool==='extract'&&values.extractMode==='each'){const zip=new window.JSZip();for(const i of indices){const doc=await copySelected(source,[i]);zip.file(`${name}-page-${i+1}.pdf`,await doc.save());}return result(await zip.generateAsync({type:'blob'}),`${name}-pages.zip`,`${indices.length} individual PDFs.`);}
    if (tool === 'remove') indices = source.getPageIndices().filter(index => !indices.includes(index));
    if (!indices.length) throw new Error('Keep at least one page in your PDF.');
    const out = await copySelected(source, indices);
    return result(await savePdf(out), `${name}-${tool}.pdf`, `${indices.length} pages saved in your selected order.`);
  }
  const indices = parsePages(values.pages || '', total, true);
  if (tool === 'rotate') {
    for (const index of indices) {
      const page = source.getPage(index);
      page.setRotation(degrees(((values.rotationMode==='absolute'?0:page.getRotation().angle)+Number(values.angle))%360));
    }
  }
  if (tool === 'numbers') {
    const font=await source.embedFont(StandardFonts[values.numberFont]||StandardFonts.Helvetica);
    for (let count = 0; count < indices.length; count++) {
      const page = source.getPage(indices[count]);
      const n=Number(values.start)+count,last=Number(values.start)+indices.length-1;const value=values.numeralStyle==='roman'?roman(n):values.numeralStyle==='roman-lower'?roman(n).toLowerCase():String(n);const final=values.numeralStyle==='roman'?roman(last):values.numeralStyle==='roman-lower'?roman(last).toLowerCase():String(last);
      const template={n:'{n}',page:'Page {n}',fraction:'{n} / {total}','page-total':'Page {n} of {total}'}[values.numberTemplate]||(values.numberCustom||'{n}');
      const text=template.replaceAll('{n}',value).replaceAll('{total}',final);if(!/^[\x20-\x7e]*$/.test(text))throw new Error('Custom number templates support ASCII characters only.');
      const fontSize=numberIn(values.fontSize,6,72,'Font size',11),edge=numberIn(values.numberMargin,6,100,'Edge offset',24);
      const width = font.widthOfTextAtSize(text, fontSize);
      const x = values.position.endsWith('left') ? edge : values.position.endsWith('right') ? page.getWidth() - width - edge : (page.getWidth() - width) / 2;
      page.drawText(text, { x, y: values.position.startsWith('top') ? page.getHeight()-edge-fontSize : edge, size:fontSize,font,color:hexColor(values.numberColor||'#4d4d5c') });
    }
  }
  if (tool === 'watermark') {
    const text = values.watermark.trim();
    if (!text) throw new Error('Enter watermark text.');
    if (text.length > 100) throw new Error('Keep the watermark to 100 characters or fewer.');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font=`${values.stampWeight||'bold'} 90px ${values.stampFont||'Arial'}, sans-serif`;
    canvas.width = Math.min(5000, Math.ceil(ctx.measureText(text).width) + 80); canvas.height = 150;
    ctx.font=`${values.stampWeight||'bold'} 90px ${values.stampFont||'Arial'}, sans-serif`; ctx.fillStyle = values.color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (/[\u0600-\u06ff]/.test(text)) ctx.direction = 'rtl';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
    const stamp = await source.embedPng(await (await canvasBlob(canvas, 'image/png')).arrayBuffer());
    for (const index of indices) {
      const page = source.getPage(index);
      const width=page.getWidth()*(values.stampPattern==='grid'?.25:numberIn(values.stampWidth,10,100,'Stamp width',72)/100);const height=width*stamp.height/stamp.width;
      const angle=values.direction==='custom'?numberIn(values.watermarkAngle,-180,180,'Angle',35):values.direction==='vertical'?90:values.direction==='diagonal'?35:0;
      const rad = angle * Math.PI / 180;
      const centers=values.stampPattern==='grid'?[.2,.5,.8].flatMap(x=>[.2,.5,.8].map(y=>[page.getWidth()*x,page.getHeight()*y])):[[values.stampPosition?.endsWith('left')?width/2+20:values.stampPosition?.endsWith('right')?page.getWidth()-width/2-20:page.getWidth()/2,values.stampPosition?.startsWith('top')?page.getHeight()-height/2-30:values.stampPosition?.startsWith('bottom')?height/2+30:page.getHeight()/2]];
      for(const[cx,cy]of centers){const x=cx-Math.cos(rad)*width/2+Math.sin(rad)*height/2,y=cy-Math.sin(rad)*width/2-Math.cos(rad)*height/2;page.drawImage(stamp,{x,y,width,height,opacity:numberIn(values.watermarkOpacity,1,100,'Opacity',25)/100,rotate:degrees(angle)});}

    }
  }
  return result(await savePdf(source), `${name}-${tool}.pdf`, `${indices.length} pages updated. Original files are unchanged.`);
}
