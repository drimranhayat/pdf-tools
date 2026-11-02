import {fileURLToPath} from 'node:url';import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
try {
const root=fileURLToPath(new URL('..',import.meta.url));
const sandbox={setTimeout,clearTimeout,setImmediate,clearImmediate,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,Blob,console,Array,Date,Map,Set};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(root+'/dist/vendor/pdf-lib.min.js','utf8'),sandbox);vm.runInContext(fs.readFileSync(root+'/dist/vendor/jszip.min.js','utf8'),sandbox);
global.window={PDFLib:sandbox.PDFLib,JSZip:sandbox.JSZip};global.DOMMatrix=class{};
const {processTool}=await import(new URL('../dist/engine.js',import.meta.url));const{PDFDocument,degrees,rgb}=window.PDFLib;
async function input(name,count=4){const pdf=await PDFDocument.create();for(let n=0;n<count;n++){const p=pdf.addPage([300+n*10,400]);p.drawRectangle({x:20,y:20,width:100,height:100,color:rgb(1,0,0)});if(n===0)p.setRotation(degrees(90));}const bytes=await pdf.save();return{file:new File([bytes],name,{type:'application/pdf'}),bytes,pages:count};}
const source=await input('source.pdf');const run=(tool,v={},items=[source])=>processTool(tool,items,v,()=>{});const open=async r=>PDFDocument.load(new Uint8Array(await r.blob.arrayBuffer()));
let r=await run('rotate',{angle:'0',rotationMode:'absolute',pagePreset:'first',outputName:'renamed.pdf'});assert.equal(r.filename,'renamed.pdf');assert.equal((await open(r)).getPage(0).getRotation().angle,0);
r=await run('organize',{orderMode:'reverse'});assert.equal((await open(r)).getPage(0).getWidth(),330);
r=await run('extract',{pagePreset:'even',extractMode:'each'});assert.equal(Object.values((await window.JSZip.loadAsync(await r.blob.arrayBuffer())).files).filter(f=>!f.dir).length,2);
r=await run('split',{splitMode:'every',splitEvery:'3'});assert.equal(Object.values((await window.JSZip.loadAsync(await r.blob.arrayBuffer())).files).filter(f=>!f.dir).length,2);
r=await run('split',{splitMode:'odd-even'});assert.equal(Object.values((await window.JSZip.loadAsync(await r.blob.arrayBuffer())).files).filter(f=>!f.dir).length,2);
r=await run('duplicate',{copies:'2',insertCopies:'end',pages:'1'});assert.equal((await open(r)).getPageCount(),6);assert.equal((await open(r)).getPage(5).getWidth(),300);
r=await run('duplicate',{copies:'1',insertCopies:'before',pages:'2'});assert.equal((await open(r)).getPage(1).getWidth(),310);assert.equal((await open(r)).getPage(2).getWidth(),310);
r=await run('crop',{left:'10',right:'10',top:'10',bottom:'10',cropUnit:'pt',pages:'1'});assert.equal((await open(r)).getPage(0).getCropBox().width,280);
r=await run('crop',{cropMode:'reset',pages:'1'});assert.equal((await open(r)).getPage(0).getCropBox().width,300);
r=await run('resize',{paper:'custom',paperWidth:'100',paperHeight:'200',orientation:'portrait',margin:'10',fitMode:'stretch',pages:'2'});assert.ok(Math.abs((await open(r)).getPage(1).getWidth()-283.46456)<.001);
r=await run('merge',{mergePages:'odd',mergeSeparator:'blank',mergeOrder:'name'},[source,await input('another.pdf',2)]);assert.equal((await open(r)).getPageCount(),4);
r=await run('numbers',{start:'5',numberTemplate:'page-total',numeralStyle:'roman',numberFont:'Courier',fontSize:'14',position:'top-right',numberMargin:'20',pages:'1-2'});assert.equal((await open(r)).getPageCount(),4);
r=await run('metadata',{metadataMode:'edit',title:'New title',creator:'Test creator',producer:'Producer',xmpMode:'remove'});assert.equal((await open(r)).getCreator(),'Test creator');
console.log('Passed 13 PDF option scenarios: real PDF page counts, order, boxes, sizes, metadata, numbering and ZIP entries.');

}catch(error){console.error(error.message);process.exitCode=1;}
