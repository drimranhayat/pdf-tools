import { toolSeo } from './seo-data.js';
import { advancedTools, buildTextExport } from './advanced.js';
import { inspectFile, sampleFiles, processTool, readableSize, parsePages } from './engine.js';
const icons = {
  merge: '<path d="M5 3h6v7H5zM15 3h6v7h-6zM10 17h6v7h-6zM8 10v3h5v4M18 10v3h-5"/>',
  split: '<path d="M9 2h8l4 4v10H9zM17 2v5h4M4 11v5h5M4 16v7M2 21l2 2 2-2M18 16v7M16 21l2 2 2-2"/>',
  compress: '<path d="M6 3h9l4 4v16H6zM15 3v5h5M9 11l4 3 4-3M13 10v4M9 20l4-3 4 3M13 17v4"/>',
  images: '<rect x="2" y="6" width="15" height="15" rx="2"/><circle cx="7" cy="11" r="1.5"/><path d="m3 18 5-4 4 3 3-2 2 2M19 3h5v16M20 10h4"/>',
  'to-images': '<path d="M3 2h9l4 4v9H3zM12 2v5h4"/><rect x="10" y="13" width="14" height="11" rx="2"/><path d="m11 21 4-4 4 3 3-2M6 17v5h4"/>',
  rotate: '<path d="M8 5h9l4 4v14H8zM17 5v5h5M4 14a8 8 0 0 1 4-12M2 5l6-3-1 6"/>',
  organize: '<rect x="2" y="3" width="8" height="10" rx="1"/><rect x="15" y="3" width="8" height="10" rx="1"/><path d="M3 18h18M6 15l-3 3 3 3M18 15l3 3-3 3"/>',
  extract: '<path d="M4 4h10v14H4zM10 8h10v15H10M16 3h7M20 0l3 3-3 3"/>',
  remove: '<path d="M6 3h10l4 4v17H6zM16 3v5h5M10 13l6 6M16 13l-6 6"/>',
  watermark: '<path d="M6 2h10l4 4v16H6zM16 2v5h5M2 19l18-10M8 19h9"/><path d="m2 13 3 7 3-9 3 6"/>',
  numbers: '<path d="M6 3h10l4 4v16H6zM16 3v5h5M10 13l3-2v8M10 19h6"/>',
  text: '<path d="M4 3h13l4 4v15H4zM16 3v5h5M8 12h9M8 16h9M8 20h5"/>',
};
const icon = id => `<svg viewBox="0 0 26 27" aria-hidden="true">${icons[id] || icons.text}</svg>`;
const tools = [
  { id: 'merge', name: 'Merge PDF', category: 'organize', color: '#df8c73', tint: '#fcf0ea', description: 'Bring multiple PDFs together. One file, just the way you want it.', popular: true, action: 'Merge PDFs' },
  { id: 'split', name: 'Split PDF', category: 'organize', color: '#ddac66', tint: '#fdf5e7', description: 'A few pages or a whole section. Take only what you need.', action: 'Split PDF' },
  { id: 'compress', name: 'Compress PDF', category: 'optimize', color: '#85aa8b', tint: '#edf5ee', description: 'Make image-heavy PDFs lighter and easier to share.', popular: true, action: 'Compress PDF' },
  { id: 'images', name: 'Images to PDF', category: 'convert', color: '#83a1c1', tint: '#edf3fb', description: 'Turn JPG, PNG, and WebP images into one tidy PDF.', action: 'Convert to PDF' },
  { id: 'to-images', name: 'PDF to Images', category: 'convert', color: '#a293d2', tint: '#f2edfc', description: 'Save your PDF pages as crisp JPG or PNG images.', action: 'Convert to images' },
  { id: 'rotate', name: 'Rotate PDF', category: 'edit', color: '#df9b83', tint: '#fbf0eb', description: 'Sideways pages? Get everything facing the right way.', action: 'Rotate pages' },
  { id: 'organize', name: 'Organize PDF', category: 'organize', color: '#7caaa6', tint: '#ecf5f3', description: 'Reorder your pages and create a better document flow.', action: 'Organize pages' },
  { id: 'extract', name: 'Extract Pages', category: 'organize', color: '#a6b27d', tint: '#f2f5e9', description: 'Give selected pages a PDF of their very own.', action: 'Extract pages' },
  { id: 'remove', name: 'Remove Pages', category: 'organize', color: '#ce8b9e', tint: '#faedf1', description: 'Leave the unnecessary pages behind. Keep what matters.', action: 'Remove pages' },
  { id: 'watermark', name: 'Watermark PDF', category: 'edit', color: '#82aac1', tint: '#edf5fa', description: 'Add a personal touch, a label, or a confidential stamp.', action: 'Add watermark' },
  { id: 'numbers', name: 'Page Numbers', category: 'edit', color: '#b19aca', tint: '#f6effa', description: 'Keep every page in order with simple page numbering.', action: 'Add page numbers' },
  { id: 'text', name: 'PDF to Text', category: 'convert', color: '#c5a073', tint: '#faf3e9', description: 'Pull selectable text out of a PDF and into a text file.', action: 'Extract text' },
];
tools.push(...advancedTools);
document.querySelector('[data-filter="all"] span').textContent = String(tools.length);
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const state = { filter: 'all', search: '', tool: null, files: [], busy: false, result: null, resultUrl: null };
function renderGrid() {
  const visible = tools.filter(tool => (state.filter === 'all' || tool.category === state.filter) && `${tool.name} ${tool.description}`.toLowerCase().includes(state.search.toLowerCase()));
  $('#tool-grid').innerHTML = visible.map(tool => `<a class="tool-card" href="${toolSeo[tool.id].path}" data-tool="${tool.id}" style="--color:${tool.color};--tint:${tool.tint}"><span class="card-icon">${icon(tool.id)}</span>${tool.popular ? '<span class="popular">POPULAR</span>' : ''}<span class="card-arrow">↗</span><span class="card-title-row"><h3>${tool.name}</h3></span><p>${tool.description}</p></a>`).join('');
  $('#no-results').hidden = visible.length > 0;
}
const field = (label, name, input, help = '') => `<div class="field"><label for="${name}">${label}</label>${input}${help ? `<small>${help}</small>` : ''}</div>`;
const textField = (label, name, value = '', help = '', extra = '') => field(label, name, `<input id="${name}" name="${name}" value="${value}" ${extra}>`, help);
const selectField = (label, name, options) => field(label, name, `<select id="${name}" name="${name}">${options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>`);
const pagesField = (required = false) => textField(required ? 'Pages to select' : 'Pages (optional)', 'pages', '', required ? 'Example: 1-3, 5. Page numbers start at 1.' : 'Leave blank for all pages. Example: 1-3, 5.', 'placeholder="1-3, 5"');
function renderOptions() {
  const id = state.tool.id;
  let html = '';
  const notes = {
    merge: 'Use the arrows beside your files to choose their order. Up to 20 PDFs, 100 MB total, and 500 combined pages.',
    split: 'Multiple output files are packaged in a ZIP. Each source PDF can have up to 200 pages; split into up to 100 parts.',
    compress: 'Selected pages are rebuilt as images; other pages are retained. Selectable text, links, and forms on rebuilt pages are removed. Document signatures are invalidated. It may not reduce an already optimized PDF. Up to 50 selected pages.',
    images: 'Images are placed on separate PDF pages in the order shown. Transparent areas become white. Images are limited to 4,000 pixels on the long edge.',
    'to-images': 'Pages are rendered as images. Multiple pages download as a ZIP. Up to 50 selected pages; output resolution is capped for device memory.',
    rotate: 'Rotation is added to the current page orientation. Blank page selection applies it to the whole document.',
    organize: 'Enter every page you want to keep in its new order, for example 3, 1, 2. Pages not listed are left out.',
    extract: 'Selected pages are copied into a new PDF. The original stays unchanged.',
    remove: 'Enter the pages to leave out. At least one page must remain in the result.',
    watermark: 'Adds a visible text overlay. This is a visual label, not encryption or secure redaction.',
    numbers: 'Numbers are drawn at the bottom of each selected page, in document coordinates. Existing content is not moved.',
    text: 'Extracts existing selectable text into a TXT file. Scanned images need OCR, which is not included. Reading order may vary.',
  };
  if (id === 'merge') html = '<p class="empty-option">Add at least two PDFs, arrange their order, and bring them together.</p>';
  if (id === 'split') html = selectField('Split method', 'splitMode', [['each','One PDF per page'],['ranges','Custom page ranges']]) + field('Custom ranges', 'ranges', '<textarea id="ranges" name="ranges" placeholder="1-3\n4-6"></textarea>', 'For custom mode, enter one output PDF per line. Example: 1-3 on the first line, 4-6 on the next.');
  if (id === 'compress') html = selectField('Compression level', 'compression', [['balanced','Balanced · 120 DPI'],['small','Smaller file · 90 DPI'],['detail','More detail · 144 DPI']]) + pagesField();
  if (id === 'images') html = selectField('Page size', 'paper', [['a4','A4'],['fit','Fit each image']]) + selectField('Orientation', 'orientation', [['auto','Automatic'],['portrait','Portrait'],['landscape','Landscape']]) + selectField('Page margin', 'margin', [['24','Small margin'],['0','No margin'],['40','Wide margin']]);
  if (id === 'to-images') html = selectField('Image format', 'imageFormat', [['jpg','JPG · Smaller files'],['png','PNG · Lossless images']]) + selectField('Resolution', 'dpi', [['144','144 DPI · Detailed'],['72','72 DPI · Compact'],['216','216 DPI · High detail']]) + pagesField();
  if (id === 'rotate') html = selectField('Rotate clockwise', 'angle', [['90','90°'],['180','180°'],['270','270°']]) + pagesField();
  if (id === 'organize') html = textField('New page order', 'order', '', 'Use page numbers in your preferred order. You can also use ranges. No duplicate pages.', 'placeholder="3, 1, 2"');
  if (id === 'extract' || id === 'remove') html = pagesField(true);
  if (id === 'watermark') html = textField('Watermark text', 'watermark', 'CONFIDENTIAL', 'Up to 100 characters. Arabic and other scripts use your device fonts.', 'maxlength="100"') + selectField('Direction', 'direction', [['diagonal','Diagonal'],['horizontal','Horizontal']]) + selectField('Opacity', 'opacity', [['0.25','25% · Subtle'],['0.5','50% · Visible'],['0.75','75% · Strong']]) + field('Text color', 'color', '<input type="color" id="color" name="color" value="#786a9a">') + pagesField();
  if (id === 'numbers') html = textField('Start numbering at', 'start', '1', '', 'type="number" min="1" max="100000"') + selectField('Position', 'position', [['center','Bottom center'],['left','Bottom left'],['right','Bottom right'],['top-center','Top center'],['top-left','Top left'],['top-right','Top right']]) + selectField('Font size','fontSize',[['11','11 pt'],['9','9 pt'],['14','14 pt'],['18','18 pt']]) + pagesField();
  if (['text','to-word','to-html','to-markdown'].includes(id)) html = pagesField();
  if (id === 'from-word') html = '<p class="empty-option">Choose a DOCX file. Its text becomes a simple, reflowed PDF with a clean white page.</p>';
  if (id === 'grayscale') html = selectField('Resolution','dpi',[['120','120 DPI · Balanced'],['72','72 DPI · Compact'],['144','144 DPI · Detailed']]) + pagesField();
  if (id === 'crop') html = ['left','right','top','bottom'].map(side => textField(side[0].toUpperCase()+side.slice(1)+' margin (mm)',side,'10','', 'type="number" min="0" max="254" step="1"')).join('') + pagesField();
  if (id === 'resize') html = selectField('Paper size','paper',[['a4','A4'],['a5','A5'],['letter','US Letter'],['legal','US Legal']]) + selectField('Orientation','orientation',[['auto','Automatic'],['portrait','Portrait'],['landscape','Landscape']]) + selectField('Margin','margin',[['0','No margin'],['24','Small margin'],['40','Wide margin']]) + pagesField();
  if (id === 'duplicate') html = textField('Additional copies per selected page','copies','1','Copies appear immediately after their original page.','type="number" min="1" max="10"') + pagesField();
  if (id === 'flatten') html = '<p class="empty-option">Filled form fields are turned into fixed content using their existing appearances. All fields are processed.</p>';
  if (id === 'metadata') html = selectField('Document properties','metadataMode',[['edit','Edit properties'],['remove','Clear properties and XMP metadata']]) + textField('Title','title') + textField('Author','author') + textField('Subject','subject') + textField('Keywords','keywords','','Separate keywords with commas.');
  if (id === 'add-text' || id === 'signature') {
    html = id === 'add-text' ? textField('Text to add','overlayText','','Single-line overlay, up to 160 characters.','maxlength="160"') + field('Text color','color','<input id="color" name="color" type="color" value="#252b43">') : '<div class="field"><label for="signature-canvas">Draw your signature</label><canvas id="signature-canvas" width="1000" height="300" aria-label="Signature drawing area"></canvas><button class="text-button" id="clear-signature" type="button">Clear drawing</button></div>';
    html += textField('Left position (%)','x','10','', 'type="number" min="0" max="90"') + textField('Top position (%)','y',id === 'signature' ? '75' : '10','Positions are measured from the top-left of the page.','type="number" min="0" max="90"') + textField('Width (% of page)','width',id === 'signature' ? '35' : '70','','type="number" min="10" max="100"') + pagesField();
  }
  const extraNotes = {
    crop:'Cropping changes the visible page box. Hidden content is still in the file and can be recovered. Never use cropping to redact sensitive data.',
    resize:'Selected pages are fitted to new paper dimensions; others are retained. Form controls, links, and existing page-rotation behavior may change. Review the result.',
    grayscale:'Selected pages are rebuilt as grayscale images. Others are retained. Selectable text, links, forms, and signatures on rendered pages are lost.',
    'add-text':'Adds a visible single-line text overlay. It does not edit or replace existing text. Appearance and shaping use your device fonts.',
    signature:'A hand-drawn visual signature, not a certificate-based digital signature or identity verification. Review placement before sharing.',
    flatten:'Flattening uses the current field appearance. It does not preserve interactive fields or existing signatures. Check the filled values in the result.',
    metadata:'Clears or edits common document properties and optional XMP metadata. It is not a complete privacy scrub or secure redaction. Dates are reset to the Unix epoch when clearing.',
    'to-word':'Basic text-only DOCX export. Original formatting, layout, tables, images and scanned text are not converted. No OCR.',
    'from-word':'Basic DOCX text conversion. Original fonts, layout, tables, graphics and selectable text are not retained. Legacy DOC and image-only DOCX files are unsupported.',
    'to-html':'Basic text-only HTML export. Text is escaped for safety. Original layout, images and tables are not retained.',
    'to-markdown':'Exports existing text with page headings. This does not reconstruct tables or document structure. No OCR.',
    duplicate:'Selected pages are repeated in place, directly after each original. Up to 10 additional copies, with a maximum of 500 output pages.'
  };
  Object.assign(notes, extraNotes);
  $('#tool-options').innerHTML = html;
  $('#operation-note').textContent = notes[id];
  $('#process').innerHTML = `${state.tool.action} <span>→</span>`;
  if (id === 'signature') setupSignature();
}
function clearResult() {
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.result = null; state.resultUrl = null;
  $('#result').hidden = true; $('#result').innerHTML = '';
}
function message(text, error = false) {
  $('#work-message').textContent = text;
  $('#work-message').className = `work-message${error ? ' error' : ''}`;
  $('#work-message').hidden = !text;
}
function showTool(id) {
  if (state.busy) return;
  const tool = tools.find(tool => tool.id === id);
  if (!tool) { showHome(); return; }
  state.tool = tool; state.files = [];
  clearResult(); message('');
  $('#home').hidden = true; $('#workspace').hidden = false;
  $('#workspace-title').innerHTML = `<span class="work-icon" style="--color:${tool.color};--tint:${tool.tint}">${icon(id)}</span><h1>${tool.name}</h1><p>${tool.description}</p>`;
  const imageMode = id === 'images';
  const docxMode = id === 'from-word';
  $('#file-input').accept = docxMode ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : imageMode ? 'image/jpeg,image/png,image/webp' : '.pdf,application/pdf';
  $('#file-input').multiple = id === 'merge' || imageMode;
  $('#drop-title').textContent = docxMode ? 'Choose a DOCX document' : imageMode ? 'Choose your images' : id === 'merge' ? 'Choose PDF files' : 'Choose a PDF file';
  $('#drop-description').textContent = 'or drag and drop them here';
  $('#file-hint').textContent = `${docxMode ? 'DOCX files · Text conversion' : imageMode ? 'JPG, PNG & WebP' : 'PDF files'} · Up to 50 MB each · ${id === 'merge' || imageMode ? '20 files, 100 MB total' : docxMode ? 'One DOCX file' : 'One PDF, up to 200 pages'}`;
  $('#drop-icon').innerHTML = icon(id);
  renderOptions(); renderFiles();
  document.title = toolSeo[id].title + ' | PDF Tools';
  window.scrollTo(0, 0);
}
function showHome() {
  if (state.busy) return;
  clearResult(); state.files = []; state.tool = null;
  $('#home').hidden = false; $('#workspace').hidden = true;
  document.title = 'PDF Tools — 24 Free Tools to Merge, Split & Convert PDF';
}
function navigate(id = '') { if (state.busy) return; location.assign(id ? toolSeo[id].path : '/'); }
function route() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('tool/')) { const legacy = toolSeo[hash.slice(5)]; if (legacy) location.replace(legacy.path); else showHome(); }
  else if (document.body.dataset.tool && !state.tool) showTool(document.body.dataset.tool);
  else if (state.tool && !document.body.dataset.tool) showHome();
}
function renderFiles() {
  $('#file-count').textContent = String(state.files.length);
  $('#drop-area').hidden = state.files.length > 0;
  $('#files-list').innerHTML = state.files.map((item, index) => `<div class="file-row"><span class="file-symbol">${state.tool.id === 'images' ? 'IMG' : state.tool.id === 'from-word' ? 'DOCX' : 'PDF'}</span><span class="file-info"><strong title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</strong><small>${readableSize(item.file.size)} · ${state.tool.id === 'from-word' ? `${item.text.length.toLocaleString()} text characters` : state.tool.id === 'images' ? `${item.width} × ${item.height} px` : `${item.pages} ${item.pages === 1 ? 'page' : 'pages'}`}</small></span><span class="file-actions">${state.files.length > 1 ? `<button data-move="${index}" data-direction="-1" aria-label="Move file ${index + 1} up" ${index === 0 ? 'disabled' : ''}>↑</button><button data-move="${index}" data-direction="1" aria-label="Move file ${index + 1} down" ${index === state.files.length - 1 ? 'disabled' : ''}>↓</button>` : ''}<button data-remove="${index}" aria-label="Remove file ${index + 1}">×</button></span></div>`).join('');
  $('#clear-files').hidden = !state.files.length;
  $('#add-files').hidden = !state.files.length || !['merge','images'].includes(state.tool.id) || state.files.length >= 20;
  $('#process').disabled = !state.files.length || (state.tool.id === 'merge' && state.files.length < 2);
  $('.sample-row').hidden = state.files.length > 0;
  const total = state.files[0]?.pages || 0;
  $('#page-preview').innerHTML = !['images','from-word'].includes(state.tool.id) && total ? `<p class="preview-caption">Document overview · ${total} pages</p>${Array.from({length:Math.min(12,total)},(_,i)=>`<span class="page-tile">${icon('text')}<span>Page ${i+1}</span></span>`).join('')}${total > 12 ? `<span class="page-tile">+${total-12}<span>more</span></span>` : ''}` : '';
}
function setBusy(busy) {
  state.busy = busy;
  $('#workspace').classList.toggle('working', busy);
  $('#workspace').querySelectorAll('button,input,select,textarea').forEach(control => { control.disabled = busy; });
  if (!busy) renderFiles();
}
async function addFiles(files) {
  if (state.busy || !files.length) return;
  clearResult(); message(''); setBusy(true);
  const errors = [];
  try {
    const multiple = ['merge', 'images'].includes(state.tool.id);
    const room = multiple ? 20 - state.files.length : 1;
    if (!multiple && state.files.length) throw new Error('Remove the current file before choosing a replacement.');
    let total = state.files.reduce((n, item) => n + item.file.size, 0);
    for (const file of files.slice(0, room)) {
      if (total + file.size > 100 * 1048576) { errors.push('Use up to 100 MB of files in one operation.'); continue; }
      try {
        const item = await inspectFile(file, state.tool.id === 'images', state.tool.id === 'from-word');
        state.files.push(item); total += file.size;
        if (state.tool.id === 'metadata' && item.metadata) for (const [key,value] of Object.entries(item.metadata)) { const field = document.getElementById(key); if (field) field.value = value; }
      } catch (error) { errors.push(error.message); }
    }
    if (files.length > room) errors.push(`This tool accepts ${multiple ? 'up to 20 files' : 'one PDF at a time'}.`);
  } catch (error) { errors.push(error.message); }
  finally { setBusy(false); message(errors.join(' '), errors.length > 0); }
}
async function process() {
  if (state.busy || !state.files.length) return;
  clearResult(); message('');
  const values = Object.fromEntries([...$('#tool-options').querySelectorAll('[name]')].map(field => [field.name, field.value]));
  if (state.tool.id === 'numbers' && (!Number.isInteger(Number(values.start)) || Number(values.start) < 1 || Number(values.start) > 100000)) { message('Start numbering with a whole number between 1 and 100,000.', true); return; }
  if (['add-text','signature'].includes(state.tool.id) && ['x','y','width'].some(key => !Number.isFinite(Number(values[key])) || Number(values[key]) < (key === 'width' ? 10 : 0) || Number(values[key]) > (key === 'width' ? 100 : 90))) { message('Use positions from 0 to 90% and a width from 10 to 100%.', true); return; }
  setBusy(true);
  $('#process').innerHTML = '<span class="progress-inline"></span> Working on your files…';
  try {
    const result = await processTool(state.tool.id, state.files, values, text => message(text));
    state.result = result; state.resultUrl = URL.createObjectURL(result.blob);
    $('#result').innerHTML = `<span class="result-check">✓</span><div><h2>All done. That was simple.</h2><p>${escapeHtml(result.detail)}</p><div class="result-meta">${escapeHtml(result.filename)} · ${readableSize(result.blob.size)}</div></div><a class="primary" href="${state.resultUrl}" download="${escapeHtml(result.filename)}">Download ${result.filename.endsWith('.zip') ? 'ZIP' : result.filename.endsWith('.txt') ? 'text' : result.filename.endsWith('.docx') ? 'Word document' : result.filename.endsWith('.html') ? 'HTML' : result.filename.endsWith('.md') ? 'Markdown' : result.filename.endsWith('.pdf') ? 'PDF' : 'image'} <span>↓</span></a>`;
    $('#result').hidden = false;
    message('Your file is ready. Download it before leaving this tool.');
    $('#result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) { message(error.message || 'Something went wrong. Try a smaller or different file.', true); }
  finally { setBusy(false); $('#process').innerHTML = `${state.tool.action} <span>→</span>`; }
}
function setupSignature() {
  const canvas = $('#signature-canvas');
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#252b43'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let drawing = false;
  const point = event => { const rect = canvas.getBoundingClientRect(); return [(event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height]; };
  canvas.addEventListener('pointerdown',event=>{ if(state.busy)return; drawing=true;canvas.setPointerCapture(event.pointerId);const [x,y]=point(event);ctx.beginPath();ctx.moveTo(x,y);event.preventDefault(); });
  canvas.addEventListener('pointermove',event=>{if(!drawing)return;const [x,y]=point(event);ctx.lineTo(x,y);ctx.stroke();canvas.dataset.signed='true';clearResult();});
  canvas.addEventListener('pointerup',()=>{drawing=false;});
  canvas.addEventListener('pointercancel',()=>{drawing=false;});
  $('#clear-signature').addEventListener('click',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);delete canvas.dataset.signed;clearResult();});
}
function dialog(kind) {
  const content = kind === 'privacy' ? `<h2>Your files stay yours.</h2><p>These PDF tools process documents in your browser. Selected documents and generated outputs are not uploaded to a processing server, and the app has no document database, accounts, advertising SDKs, or analytics.</p><p>Files remain in working memory while you use a tool. Switching tools, clearing files, or closing the page releases the app's references. Files you download remain wherever you save them.</p><p>The hosting service receives normal website requests and connection information. Browser and operating-system behavior is outside the app's control. If you choose a cloud provider in a device file picker, that provider handles any transfer under its own terms.</p><h3>A note about sensitive documents</h3><p>Editing a PDF can invalidate signatures or change interactive features. Keep your original. A watermark is not secure redaction or encryption.</p>` : `<h2>Useful tools. Honest limits.</h2><p>PDF Tools is an independent, browser-based document toolkit. It is not affiliated with iLovePDF or other PDF services.</p><ul><li>24 working tools. No account or document upload required.</li><li>Up to 50 MB per file and 100 MB total. PDF inputs support up to 200 pages each.</li><li>Merge up to 500 pages. Image-based conversion and compression support up to 50 selected pages.</li><li>Image-based compression removes selectable text, links, forms, and digital signatures. It can make some PDFs larger.</li><li>Text extraction reads existing text; it does not perform OCR.</li><li>Password protection/removal, Full-fidelity Office document conversion, secure redaction, OCR, and collaborative signing are not included.</li><li>Performance depends on your device. Keep originals and review the output before relying on it.</li></ul>`;
  $('#dialog-content').innerHTML = content;
  $('#info-dialog').showModal();
}
$('#tool-grid').addEventListener('click', event => { const button = event.target.closest('[data-tool]'); if (button && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); navigate(button.dataset.tool); } });
$('.filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]'); if (!button) return;
  state.filter = button.dataset.filter;
  $('.filters').querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button)); renderGrid();
});
$('#search').addEventListener('input', event => { state.search = event.target.value; renderGrid(); });
$('#reset-search').addEventListener('click', () => { state.filter = 'all'; state.search = ''; $('#search').value = ''; $('.filters button').click(); });
$('#back-home').addEventListener('click', () => navigate());
$('#choose-files').addEventListener('click', () => $('#file-input').click());
$('#add-files').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', event => { const files = Array.from(event.target.files); event.target.value = ''; addFiles(files); });
$('#drop-area').addEventListener('dragover', event => { event.preventDefault(); if (!state.busy) $('#drop-area').classList.add('over'); });
$('#drop-area').addEventListener('dragleave', () => $('#drop-area').classList.remove('over'));
$('#drop-area').addEventListener('drop', event => { event.preventDefault(); $('#drop-area').classList.remove('over'); addFiles(Array.from(event.dataTransfer.files)); });
$('#files-list').addEventListener('click', event => {
  if (state.busy) return;
  const remove = event.target.closest('[data-remove]');
  const move = event.target.closest('[data-move]');
  if (remove) state.files.splice(Number(remove.dataset.remove), 1);
  if (move) {
    const index = Number(move.dataset.move); const target = index + Number(move.dataset.direction);
    if (target >= 0 && target < state.files.length) [state.files[index], state.files[target]] = [state.files[target], state.files[index]];
  }
  clearResult(); message(''); renderFiles();
});
$('#clear-files').addEventListener('click', () => { state.files = []; clearResult(); message('Files cleared. Your originals are unchanged.'); renderFiles(); });
$('#use-sample').addEventListener('click', async () => {
  if (state.busy) return;
  setBusy(true);
  try {
    const files = state.tool.id === 'from-word'
      ? [new File([(await buildTextExport([{page:1,text:'A simple Word document.\nThis text becomes a clean PDF.'}], 'to-word','sample')).blob], 'sample-document.docx', {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})]
      : await sampleFiles(state.tool.id === 'images');
    setBusy(false);
    await addFiles(state.tool.id === 'merge' || state.tool.id === 'images' ? files : files.slice(0,1));
  } catch (error) { setBusy(false); message(error.message, true); }
});
$('#tool-options').addEventListener('input', () => { clearResult(); message(''); });
$('#process').addEventListener('click', process);
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => dialog(button.dataset.dialog)));
$('.dialog-close').addEventListener('click', () => $('#info-dialog').close());
$('#info-dialog').addEventListener('click', event => { if (event.target === $('#info-dialog')) $('#info-dialog').close(); });
window.addEventListener('hashchange', route);
window.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !state.tool && !$('#info-dialog').open) { event.preventDefault(); $('#search').focus(); } });
window.addEventListener('beforeunload', () => { if (state.resultUrl) URL.revokeObjectURL(state.resultUrl); });
renderGrid(); route();
