import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {cleanText,reconstructPage,wordDocument} from '../dist/word-ocr.js';
const context={module:{exports:{}},exports:{},setImmediate,clearImmediate,setTimeout,clearTimeout,TextEncoder,Uint8Array,ArrayBuffer,Blob};
vm.runInNewContext(fs.readFileSync(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'),context);
global.window={JSZip:context.module.exports};
const view={width:600,height:800,transform:[1,0,0,-1,0,800]};
const item=(str,x,y,size=12)=>({str,transform:[size,0,0,size,x,800-y],width:str.length*size*.45,height:size,fontName:'Arial'});
test('reconstructs a heading and joins wrapped paragraph lines without losing XML-sensitive text',()=>{
 const p=reconstructPage({items:[item('REPORT & <NOTES>',50,50,22),item('First line of a paragraph',50,100),item('continued on this line.',50,116),item('A separate paragraph.',50,160)]},view,'clean');
 assert.equal(p.paragraphs.length,3);assert.equal(p.paragraphs[0].heading,true);assert.match(p.paragraphs[1].runs.map(r=>r.text).join(''),/paragraph continued/);
});
test('preserves wide column gaps as tabs and Arabic RTL direction',()=>{
 const p=reconstructPage({items:[item('Left',50,100),item('Right',300,100),item('مرحبا بالعالم',300,140)]},view,'layout');
 assert.match(p.text,/Left\tRight/);assert.equal(p.paragraphs[1].rtl,true);
});
test('cleanup joins soft wraps while keeping paragraph breaks and optional line mode',()=>{
 assert.equal(cleanText('Hyphen-\nated text\nwraps.\n\nNext paragraph.'),'Hyphenated text wraps.\n\nNext paragraph.');
 assert.equal(cleanText('one\ntwo','lines'),'one\ntwo');
});
test('DOCX includes escaped editable content, RTL, page sizing and no synthetic page headings',async()=>{
 const blob=await wordDocument([{text:'<title> & notes\nمرحبا بالعالم',width:600,height:800},{text:'Second page'}]);
 const zip=await window.JSZip.loadAsync(await blob.arrayBuffer());
 const xml=await zip.file('word/document.xml').async('string');
 assert.match(xml,/&lt;title&gt; &amp; notes/);assert.match(xml,/<w:bidi\/>/);assert.match(xml,/<w:rtl\/>/);assert.equal((xml.match(/<w:sectPr>/g)||[]).length,2);assert.doesNotMatch(xml,/>Page 1</);
});
test('appearance DOCX embeds images and package relationship rather than claiming editable text',async()=>{
 const blob=await wordDocument([{page:1,width:600,height:800,image:new Blob([new Uint8Array([137,80,78,71])])}]);
 const zip=await window.JSZip.loadAsync(await blob.arrayBuffer());
 assert.ok(zip.file('word/media/page0.png'));assert.match(await zip.file('word/document.xml').async('string'),/r:embed="img0"/);assert.match(await zip.file('word/_rels/document.xml.rels').async('string'),/media\/page0.png/);
});
