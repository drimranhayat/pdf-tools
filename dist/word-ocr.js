import {exportText} from './text-formats.js';
import {processPixels,numberIn} from './export-formats.js';
// Local document reconstruction and OCR. No document leaves the browser.
const xml = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rtl = text => (text.match(/[\u0600-\u06ff]/g)||[]).length > (text.match(/[a-zA-Z]/g)||[]).length;
export function cleanText(text, mode='paragraphs') {
  if(mode==='raw')return String(text).replace(/\r\n?/g,'\n').trim();
  const normalized=String(text).replace(/\r\n?/g,'\n').replace(/[\u00a0\u200b]/g,' ').replace(/[^\S\n]+/g,' ').replace(/ *\n */g,'\n').trim();
  if(mode==='lines') return normalized;
  return normalized.split(/\n\s*\n/).map(p=>p.replace(/([a-z])-\n(?=[a-z])/g,'$1').replace(/([^\n])\n(?=\S)/g,'$1 ')).join('\n\n');
}
export function reconstructPage(content, viewport, mode='layout') {
  const items=content.items.filter(i=>i.str?.trim()).map(i=>{
    // PDF.js viewport matrix maps PDF coordinates to visual coordinates, including rotation.
    const a=viewport.transform,b=i.transform;
    const x=a[0]*b[4]+a[2]*b[5]+a[4], y=a[1]*b[4]+a[3]*b[5]+a[5];
    const font=Math.max(6,Math.min(72,Math.hypot(b[2],b[3])||i.height||11));
    const family=content.styles?.[i.fontName]?.fontFamily||'';
    return {text:i.str,x,y,width:i.width,font,bold:/bold|black|heavy/i.test(i.fontName+' '+family),italic:/italic|oblique/i.test(i.fontName+' '+family),dir:i.dir};
  }).sort((a,b)=>a.y-b.y||a.x-b.x);
  const lines=[];
  for(const i of items){let line=lines.findLast(l=>Math.abs(l.y-i.y)<Math.max(2,Math.min(l.font,i.font)*.3));if(!line){line={y:i.y,font:i.font,items:[]};lines.push(line);}line.items.push(i);line.font=Math.max(line.font,i.font);}
  const base=items.map(i=>i.font).sort((a,b)=>a-b)[Math.floor(items.length/2)]||11;
  const left=Math.min(...items.map(i=>i.x),36);
  let paragraphs=lines.map(l=>{
    const direction=rtl(l.items.map(i=>i.text).join(''));
    l.items.sort((a,b)=>direction?b.x-a.x:a.x-b.x);
    const runs=[];
    l.items.forEach((i,n)=>{if(n){const prev=l.items[n-1];const gap=direction?prev.x-i.x-i.width:i.x-prev.x-prev.width;runs.push({text:gap>base*2.3?'\t':gap>base*.12?' ':''});}runs.push(i);});
    const min=Math.min(...l.items.map(i=>i.x)),max=Math.max(...l.items.map(i=>i.x+i.width));
    const centered=Math.abs((min+max)/2-viewport.width/2)<12 && max-min<viewport.width*.78;
    return {runs,font:l.font,y:l.y,rtl:direction,align:centered?'center':direction?'right':'left',indent:Math.max(0,(min-left)*20),heading:l.font>base*1.25};
  });
  if(mode==='clean') {
    const merged=[];
    for(const p of paragraphs){const prev=merged.at(-1);const text=p.runs.map(r=>r.text).join('');
      // Keep large gaps, headings, list items, columns and alignment changes separate.
      if(prev&&!p.heading&&!prev.heading&&p.y-prev.lastY<base*1.7&&p.align===prev.align&&Math.abs(p.indent-prev.indent)<base*20&&!text.match(/^\s*(?:[•▪●]|\d+[.)])\s/)&&!text.includes('\t')&&!prev.runs.some(r=>r.text.includes('\t'))){prev.runs.push({text:' '},...p.runs);prev.lastY=p.y;}
      else merged.push({...p,lastY:p.y});
    } paragraphs=merged;
  }
  return {width:viewport.width,height:viewport.height,paragraphs,text:paragraphs.map(p=>p.runs.map(r=>r.text).join('')).join('\n\n')};
}
const para = (p,options={}) => `<w:p><w:pPr>${p.rtl?'<w:bidi/>':''}<w:jc w:val="${p.align|| (p.rtl?'right':'left')}"/><w:spacing w:after="${p.heading?180:80}" w:line="${Math.round(numberIn(options.wordSpacing,1,2,'Line spacing',1.1)*240)}" w:lineRule="auto"/>${p.indent?`<w:ind w:left="${Math.min(6000,Math.round(p.indent))}"/>`:''}${p.heading?'<w:keepNext/>':''}</w:pPr>${p.runs.map(r=>`<w:r><w:rPr><w:rFonts w:ascii="${xml(['Arial','Calibri','Times New Roman'].includes(options.wordFont)?options.wordFont:'Arial')}" w:hAnsi="${xml(['Arial','Calibri','Times New Roman'].includes(options.wordFont)?options.wordFont:'Arial')}" w:cs="Arial"/>${r.bold||p.heading?'<w:b/><w:bCs/>':''}${r.italic?'<w:i/>':''}${p.rtl?'<w:rtl/>':''}<w:sz w:val="${Math.round((Number(options.wordSize)||r.font||p.font||11)*2)}"/><w:szCs w:val="${Math.round((Number(options.wordSize)||r.font||p.font||11)*2)}"/></w:rPr>${r.text.split('\t').map((t,n)=>(n?'<w:tab/>':'')+`<w:t xml:space="preserve">${xml(t)}</w:t>`).join('')}</w:r>`).join('')}</w:p>`;
export async function wordDocument(pages,options={}) {
  if(options.wordBreaks==='flow'&&pages.every(p=>!p.image))pages=[{...pages[0],paragraphs:pages.flatMap(p=>p.paragraphs||p.text.split('\n').map(text=>({runs:[{text}],rtl:rtl(text)})))}];
  const zip=new window.JSZip();
  zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="doc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const rels=[];let body='';
  for(let n=0;n<pages.length;n++){
    const p=pages[n];const width=Math.min(14400,Math.round((p.width||595)*20)),height=Math.min(20000,Math.round((p.height||842)*20));
    if(p.image){
      zip.file(`word/media/page${n}.png`,await p.image.arrayBuffer());rels.push(`<Relationship Id="img${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${n}.png"/>`);
      const cx=(width-720)*635,cy=Math.round(cx*(p.height/p.width));
      body+=`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="auto"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n+1}" name="Page ${p.page||n+1}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n+1}" name="Page image"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="img${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    }else body+=(p.paragraphs||p.text.split(/\n/).map(text=>({runs:[{text}],rtl:rtl(text)}))).map(p=>para(p,options)).join('');
    const section=`<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${width}" w:h="${height}"/><w:pgMar w:top="${p.image?360:720}" w:right="${p.image?360:720}" w:bottom="${p.image?360:720}" w:left="${p.image?360:720}"/></w:sectPr>`;
    body+=n===pages.length-1?section:`<w:p><w:pPr>${section}</w:pPr></w:p>`;
  }
  zip.file('word/_rels/document.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
  zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
export async function textDownload(text,format='txt'){return (await exportText([{page:1,text}],format,{},wordDocument)).blob;}
let loader;
async function ocrLibrary(){
  if(window.Tesseract)return window.Tesseract;
  if(!loader)loader=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/ocr/v1/tesseract.min.js';s.onload=()=>resolve(window.Tesseract);s.onerror=()=>{s.remove();loader=null;reject(new Error('OCR files could not load. Check your connection and retry.'));};document.head.append(s);});
  return loader;
}
export async function recognizePages(sources, values, progress, signal){
  const T=await ocrLibrary();if(signal?.aborted)throw new Error('OCR cancelled.');
  const lang=['eng','urd','ara','eng+urd','eng+ara','urd+ara','eng+urd+ara'].includes(values.language)?values.language:'eng';
  let worker, label='Loading OCR engine';
  let rejectAbort;const aborted=new Promise((_,reject)=>{rejectAbort=reject;});
  const abort=()=>rejectAbort(new Error('OCR cancelled.'));signal?.addEventListener('abort',abort,{once:true});
  try{
    const initializing=T.createWorker(lang,1,{workerPath:new URL('/vendor/ocr/v1/worker.min.js',location.origin).href,corePath:new URL('/vendor/ocr/v1/',location.origin).href,langPath:new URL('/vendor/ocr/v1/lang/',location.origin).href,workerBlobURL:false,cacheMethod:'none',logger:m=>{if(!signal?.aborted)progress(`${label} · ${Math.round((m.progress||0)*100)}%`);}});
    initializing.then(w=>{if(signal?.aborted)w.terminate();},()=>{});
    worker=await Promise.race([initializing,aborted]);
    if(signal?.aborted)throw new Error('OCR cancelled.');
    await worker.setParameters({tessedit_pageseg_mode:({auto:'3',column:'4',block:'6',line:'7',sparse:'11'}[values.segmentation]||'3'),preserve_interword_spaces:'1',tessedit_char_whitelist:values.characterMode==='digits'?'0123456789.,:/-+%':values.characterMode==='custom'?(values.whitelist||''):''});
    const pages=[];
    for(let i=0;i<sources.length;i++){
      if(signal?.aborted)throw new Error('OCR cancelled.');
      label=`Recognizing ${i+1} of ${sources.length}`;
      const canvas=await sources[i]();
      try{processPixels(canvas,values.ocrColor||'color',numberIn(values.threshold,0,255,'Threshold',128),numberIn(values.contrast,-100,100,'Contrast',0));const {data}=await Promise.race([worker.recognize(canvas),aborted]);pages.push({page:i+1,text:cleanText(data.text,values.cleanup||'paragraphs'),confidence:Math.round(data.confidence)});}finally{canvas.width=canvas.height=1;}
    }
    const text=pages.map(p=>p.text).join('\n\n');if(!text.trim())throw new Error('No text was recognized. Try a clearer, upright image or a different language.');
    return {text,pages};
  }catch(error){if(signal?.aborted)throw new Error('OCR cancelled.');throw error;}finally{signal?.removeEventListener('abort',abort);if(worker)await worker.terminate();}
}
export async function imageCanvas(file,rotation=0){
  const image=await createImageBitmap(file,{imageOrientation:'from-image'});
  try{const scale=Math.min(2,2400/Math.max(image.width,image.height));const w=Math.round(image.width*scale),h=Math.round(image.height*scale);const swap=rotation===90||rotation===270;const c=document.createElement('canvas');c.width=swap?h:w;c.height=swap?w:h;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(image,-w/2,-h/2,w,h);return c;}finally{image.close();}
}
export async function pdfCanvas(page, dpi=144,rotation=0){
  let view=page.getViewport({scale:dpi/72,rotation:(page.rotate+rotation)%360});const cap=Math.min(1,2600/Math.max(view.width,view.height));if(cap<1)view=page.getViewport({scale:dpi/72*cap,rotation:(page.rotate+rotation)%360});
  const c=document.createElement('canvas');c.width=Math.ceil(view.width);c.height=Math.ceil(view.height);await page.render({canvasContext:c.getContext('2d'),viewport:view,background:'rgb(255,255,255)'}).promise;return c;
}
