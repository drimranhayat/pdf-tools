export const advancedTools = [
  { id:'crop', name:'Crop PDF', category:'edit', color:'#b19aca', tint:'#f6effa', description:'Trim page margins for a cleaner, more focused document.', action:'Crop pages' },
  { id:'resize', name:'Resize PDF Pages', category:'organize', color:'#7caaa6', tint:'#ecf5f3', description:'Fit pages to A4, A5, Letter, or Legal paper sizes.', action:'Resize pages' },
  { id:'grayscale', name:'Grayscale PDF', category:'optimize', color:'#8f9aa9', tint:'#f0f2f5', description:'Convert selected pages to black and white for printing.', action:'Convert to grayscale' },
  { id:'add-text', name:'Add Text to PDF', category:'edit', color:'#c5a073', tint:'#faf3e9', description:'Place a text note, heading, or label on selected pages.', action:'Add text' },
  { id:'signature', name:'Sign PDF', category:'edit', color:'#a293d2', tint:'#f2edfc', description:'Draw your signature and place it on your document.', action:'Add signature' },
  { id:'flatten', name:'Flatten PDF Forms', category:'edit', color:'#85aa8b', tint:'#edf5ee', description:'Turn filled form fields into fixed page content.', action:'Flatten form fields' },
  { id:'metadata', name:'PDF Metadata', category:'edit', color:'#82aac1', tint:'#edf5fa', description:'Update or clear document title, author, and properties.', action:'Update metadata' },
  { id:'to-word', name:'PDF to Word', category:'convert', color:'#83a1c1', tint:'#edf3fb', description:'Export selectable text to a basic editable Word document.', action:'Convert to Word' },
  { id:'from-word', name:'Word to PDF', category:'convert', color:'#83a1c1', tint:'#edf3fb', description:'Turn text from a DOCX file into a clean, simple PDF.', action:'Convert to PDF' },
  { id:'to-html', name:'PDF to HTML', category:'convert', color:'#df9b83', tint:'#fbf0eb', description:'Save selectable PDF text as a simple HTML document.', action:'Convert to HTML' },
  { id:'to-markdown', name:'PDF to Markdown', category:'convert', color:'#a6b27d', tint:'#f2f5e9', description:'Bring PDF text into a lightweight Markdown file.', action:'Convert to Markdown' },
  { id:'duplicate', name:'Duplicate PDF Pages', category:'organize', color:'#ce8b9e', tint:'#faedf1', description:'Repeat selected pages without changing your original.', action:'Duplicate pages' },
];
const escaped = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const encode = text => new TextEncoder().encode(text);
const blobCanvas = (canvas,type='image/png',quality=.9) => new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to create this image.')),type,quality));
const pdfBlob = async doc => new Blob([await doc.save()],{type:'application/pdf'});
export async function readDocx(bytes) {
  const zip = await window.JSZip.loadAsync(bytes);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('Choose a valid DOCX document. Legacy DOC files are not supported.');
  if (entry._data?.uncompressedSize > 8_000_000) throw new Error('This DOCX text is too large. Try a shorter document.');
  const xml = await entry.async('string');
  if (xml.length > 8_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('This DOCX contains unsupported XML.');
  const doc = new DOMParser().parseFromString(xml,'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Unable to read this DOCX document.');
  const paragraphs = Array.from(doc.getElementsByTagNameNS('*','p')).map(p=>Array.from(p.getElementsByTagNameNS('*','t')).map(t=>t.textContent).join('')).filter(Boolean);
  const text = paragraphs.join('\n\n');
  if (!text.trim()) throw new Error('No readable document text was found. Image-only DOCX files are not supported.');
  if (text.length > 300000) throw new Error('Use a DOCX with fewer than 300,000 text characters.');
  return text;
}
export async function buildTextExport(pages,type,name) {
  if (type === 'to-html') {
    const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escaped(name)+'</title><style>body{font:16px/1.8 system-ui;max-width:850px;margin:40px auto;padding:0 24px;color:#262838}section{margin:36px 0;border-top:1px solid #ddd;padding-top:20px}p{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>'+escaped(name)+'</h1>'+pages.map(p=>'<section><h2>Page '+p.page+'</h2><p dir="auto">'+escaped(p.text)+'</p></section>').join('')+'</html>';
    return {blob:new Blob([html],{type:'text/html;charset=utf-8'}),extension:'html'};
  }
  if (type === 'to-markdown') {
    const text = pages.map(p=>'## Page '+p.page+'\n\n'+p.text.replace(/([\\`*_{}\[\]<>])/g,'\\$1')).join('\n\n');
    return {blob:new Blob([text],{type:'text/markdown;charset=utf-8'}),extension:'md'};
  }
  const zip = new window.JSZip();
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const body = pages.map((page,index)=>`${index ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : ''}<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Page ${page.page}</w:t></w:r></w:p>`+page.text.split('\n').map(line=>`<w:p><w:r><w:t xml:space="preserve">${escaped(line.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''))}</w:t></w:r></w:p>`).join('')).join('');
  zip.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>');
  return {blob:await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),extension:'docx'};
}
export async function textToPdf(text,progress) {
  const { PDFDocument } = window.PDFLib;
  const out = await PDFDocument.create();
  let canvas,ctx,y;
  const newCanvas=()=>{
    canvas=document.createElement('canvas'); canvas.width=1600;canvas.height=2263;
    ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1600,2263);
    ctx.fillStyle='#252b43';ctx.font='30px Arial,sans-serif';ctx.textBaseline='top'; y=100;
  };
  const savePage=async()=>{
    if(out.getPageCount()>=100) throw new Error('This conversion exceeds 100 pages. Try a shorter document.');
    const picture=await out.embedPng(await(await blobCanvas(canvas)).arrayBuffer());
    const page=out.addPage([595,842]); page.drawImage(picture,{x:0,y:0,width:595,height:842});
    progress('Creating PDF page '+out.getPageCount()+'…');
  };
  newCanvas();
  for(const paragraph of text.split('\n')) {
    const rtl=/[\u0600-\u06ff]/.test(paragraph);
    ctx.direction=rtl?'rtl':'ltr';ctx.textAlign=rtl?'right':'left';
    const words=paragraph.split(/\s+/);let line='';
    const lines=[];
    for(const word of words){
      if(ctx.measureText(line+' '+word).width>1400 && line){lines.push(line);line=word;}else line+=(line?' ':'')+word;
    }
    lines.push(line);
    for(const part of lines){
      if(y>2120){await savePage();newCanvas();ctx.direction=rtl?'rtl':'ltr';ctx.textAlign=rtl?'right':'left';}
      ctx.fillText(part,rtl?1500:100,y,1400);y+=44;
    }
    y+=16;
  }
  await savePage();return pdfBlob(out);
}
export async function processAdvanced(tool,items,values,progress,parsePages) {
  const { PDFDocument, PDFName, degrees }=window.PDFLib;
  const name=items[0].file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,90)||'document';
  const result=(blob,detail)=>({blob,filename:`${name}-${tool}.pdf`,detail});
  if(tool==='from-word')return result(await textToPdf(items[0].text,progress),'DOCX text converted to a simple image-based PDF. Original layout, tables, images, and selectable text are not preserved.');
  const source=await PDFDocument.load(items[0].bytes,{updateMetadata:false});
  const selected=parsePages(values.pages||'',source.getPageCount(),true);
  if(tool==='flatten') {
    const form=source.getForm();const fields=form.getFields();
    if(!fields.length)throw new Error('This PDF has no interactive form fields to flatten.');
    form.flatten({updateFieldAppearances:false});
    return result(await pdfBlob(source),`${fields.length} form fields flattened using their existing appearances. Check the output before sharing.`);
  }
  if(tool==='metadata') {
    if(values.metadataMode==='remove') {
      source.setTitle('');source.setAuthor('');source.setSubject('');source.setKeywords([]);source.setCreator('');source.setProducer('');
      source.setCreationDate(new Date(0));source.setModificationDate(new Date(0));
      source.catalog.delete(PDFName.of('Metadata'));
    }else{
      source.setTitle(values.title||'');source.setAuthor(values.author||'');source.setSubject(values.subject||'');source.setKeywords((values.keywords||'').split(',').map(s=>s.trim()).filter(Boolean));
    }
    return result(await pdfBlob(source),'Document properties updated. This does not remove visible information, attachments, annotations, or hidden page content.');
  }
  if(tool==='duplicate') {
    const copies=Number(values.copies);
    if(!Number.isInteger(copies)||copies<1||copies>10)throw new Error('Choose 1 to 10 additional copies.');
    if(source.getPageCount()+selected.length*copies>500)throw new Error('Keep the result within 500 pages.');
    const out=await PDFDocument.create();
    for(const i of source.getPageIndices()){
      const [page]=await out.copyPages(source,[i]);out.addPage(page);
      if(selected.includes(i))for(let j=0;j<copies;j++){const [copy]=await out.copyPages(source,[i]);out.addPage(copy);}
    }
    return result(await pdfBlob(out),`${selected.length*copies} extra pages inserted after their originals; ${out.getPageCount()} pages total.`);
  }
  if(tool==='resize') {
    const sizes={a4:[595.28,841.89],a5:[419.53,595.28],letter:[612,792],legal:[612,1008]};
    const base=sizes[values.paper];const margin=Number(values.margin);
    const out=await PDFDocument.create();
    for(const index of source.getPageIndices()){
      if(!selected.includes(index)){const [page]=await out.copyPages(source,[index]);out.addPage(page);continue;}
      const page=source.getPage(index);
      if (!page.node.get(PDFName.of('Contents'))) {
        const landscape = values.orientation === 'landscape' || (values.orientation === 'auto' && page.getWidth() > page.getHeight());
        out.addPage(landscape ? [base[1], base[0]] : base);
        continue;
      }
      const embedded=await out.embedPage(page);
      const landscape=values.orientation==='landscape'||(values.orientation==='auto'&&page.getWidth()>page.getHeight());
      const [w,h]=landscape?[base[1],base[0]]:base;
      const target=out.addPage([w,h]);
      const factor=Math.min((w-margin*2)/embedded.width,(h-margin*2)/embedded.height);
      const width=embedded.width*factor,height=embedded.height*factor;
      target.drawPage(embedded,{x:(w-width)/2,y:(h-height)/2,width,height});
    }
    return result(await pdfBlob(out),`${selected.length} pages fitted to the selected paper size. Form controls, links and rotation semantics may change.`);
  }
  if(tool==='crop') {
    const margins=['left','right','top','bottom'].map(key=>Number(values[key])*72/25.4);
    if(margins.some(value=>!Number.isFinite(value)||value<0||value>720))throw new Error('Use margins between 0 and 254 mm.');
    for(const index of selected){
      const page=source.getPage(index);const box=page.getCropBox();
      const [left,right,top,bottom]=margins;
      const width=box.width-left-right,height=box.height-top-bottom;
      if(width<20||height<20)throw new Error('These margins would remove almost the whole page. Use smaller margins.');
      page.setCropBox(box.x+left,box.y+bottom,width,height);
    }
    return result(await pdfBlob(source),`${selected.length} page crop boxes changed. Cropped content remains recoverable; this is not redaction.`);
  }
  if(tool==='add-text'||tool==='signature') {
    let png;
    if(tool==='signature'){
      const canvas=document.querySelector('#signature-canvas');
      if(!canvas?.dataset.signed)throw new Error('Draw a signature in the signature box first.');
      png=await source.embedPng(await(await blobCanvas(canvas)).arrayBuffer());
    }else{
      const text=values.overlayText.trim();if(!text)throw new Error('Enter the text you want to add.');
      const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=240;
      const ctx=canvas.getContext('2d');ctx.font='72px Arial,sans-serif';ctx.fillStyle=values.color;ctx.textBaseline='middle';
      if(/[\u0600-\u06ff]/.test(text)){ctx.direction='rtl';ctx.textAlign='right';ctx.fillText(text,2360,120,2320);}else ctx.fillText(text,40,120,2320);
      png=await source.embedPng(await(await blobCanvas(canvas)).arrayBuffer());
    }
    for(const index of selected){
      const page=source.getPage(index);const width=page.getWidth()*Number(values.width)/100;const height=width*png.height/png.width;
      const left=Number(values.x)/100*page.getWidth();const top=Number(values.y)/100*page.getHeight();
      page.drawImage(png,{x:Math.max(0,Math.min(left,page.getWidth()-width)),y:Math.max(0,page.getHeight()-top-height),width,height});
    }
    return result(await pdfBlob(source),`${tool==='signature'?'Drawn signature':'Text overlay'} added to ${selected.length} pages. ${tool==='signature'?'This is a visual signature, not a certificate-based digital signature.':'Existing text is unchanged.'}`);
  }
  throw new Error('This operation is not available.');
}
