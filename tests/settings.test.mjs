import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {expandedOptions} from '../dist/tool-settings.js';import {toolSeo} from '../dist/seo-data.js';
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');const fields=app.slice(app.indexOf('const field ='),app.indexOf('function renderOptions()'));
const helpers=vm.runInNewContext(fields+'\n({field,textField,selectField,pagesField})');
global.document={createElement:()=>({toDataURL:type=>`data:${type==='image/avif'?'image/png':type};base64,`})};
test('all 26 tools render unique labelled setting controls and an output filename',()=>{assert.equal(Object.keys(toolSeo).length,26);for(const id of Object.keys(toolSeo)){const html=expandedOptions(id,helpers,'');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,id);assert.ok(ids.includes('outputName'),id);for(const name of [...html.matchAll(/\bname="([^"]+)"/g)].map(m=>m[1]))assert.ok(html.includes('for="'+name+'"'),id+':'+name);assert.ok(ids.length>=2,id);}});
