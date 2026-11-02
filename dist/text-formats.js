const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
export function rtfEscape(text){let out='';for(let i=0;i<text.length;i++){const n=text.charCodeAt(i);out+=n===10?'\\par\n':n===9?'\\tab ':n===92||n===123||n===125?'\\'+text[i]:n>127?'\\u'+(n>32767?n-65536:n)+'?':n>=32?text[i]:'';}return out;}
export function csvCell(value){let s=String(value);if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function textBytes(text,encoding='utf8',newline='lf',bom='no'){text=String(text).replace(/\r\n?/g,'\n');if(newline==='crlf')text=text.replaceAll('\n','\r\n');if(encoding==='utf16'){const a=new Uint8Array(2+text.length*2),v=new DataView(a.buffer);a.set([255,254]);for(let i=0;i<text.length;i++)v.setUint16(2+i*2,text.charCodeAt(i),true);return a;}const bytes=new TextEncoder().encode(text);return bom==='yes'?new Uint8Array([239,187,191,...bytes]):bytes;}
export async function exportText(pages,format='txt',options={},buildDocx){
 const heading=options.pageHeadings==='yes',separator=options.pageSeparator==='formfeed'?'\n\f\n':'\n\n';const text=pages.map(p=>(heading?'Page '+p.page+'\n\n':'')+p.text).join(separator);
 const mime={txt:'text/plain',md:'text/markdown',html:'text/html',csv:'text/csv',json:'application/json',rtf:'application/rtf',odt:'application/vnd.oasis.opendocument.text',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
 if(!mime[format])throw new Error('Choose a supported text format.');
 if(format==='docx')return {blob:await buildDocx(heading?pages.map(p=>({...p,text:'Page '+p.page+'\n\n'+p.text,paragraphs:undefined})):pages,options),extension:format};
 if(format==='odt'){
  const zip=new window.JSZip();zip.file('mimetype',mime.odt,{compression:'STORE'});
  zip.file('META-INF/manifest.xml','<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="'+mime.odt+'"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>');
  zip.file('content.xml','<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2"><office:body><office:text>'+text.split('\n').map(line=>'<text:p>'+escape(line)+'</text:p>').join('')+'</office:text></office:body></office:document-content>');
  return {blob:await zip.generateAsync({type:'blob',mimeType:mime.odt}),extension:format};
 }
 let body=text;
 if(format==='rtf')body='{\\rtf1\\ansi\\deff0\\uc1{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 '+rtfEscape(text)+'}';
 if(format==='json')body=JSON.stringify({pages:pages.map(p=>({page:p.page,text:p.text}))},null,2);
 if(format==='csv')body='page,text\r\n'+pages.map(p=>p.page+','+csvCell(p.text)).join('\r\n');
 if(format==='md')body=pages.map(p=>(heading?'## Page '+p.page+'\n\n':'')+p.text.replace(/([\\`*_{}\[\]<>])/g,'\\$1')).join('\n\n');
 if(format==='html')body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Converted document text</title><style>body{font:16px/1.8 system-ui;max-width:860px;margin:32px auto;padding:0 24px;color:#20283b}p{white-space:pre-wrap;overflow-wrap:anywhere}section{margin:24px 0}</style></head><body>'+pages.map(p=>'<section>'+(heading?'<h2>Page '+p.page+'</h2>':'')+'<p dir="auto">'+escape(p.text)+'</p></section>').join('')+'</body></html>';
 const encoded=['txt','csv','md'].includes(format)?textBytes(body,options.textEncoding,options.newline,options.bom):new TextEncoder().encode(body);
 return {blob:new Blob([encoded],{type:mime[format]+(['txt','csv','md'].includes(format)&&options.textEncoding==='utf16'?';charset=utf-16le':';charset=utf-8')}),extension:format};
}
