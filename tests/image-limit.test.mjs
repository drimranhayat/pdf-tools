import test from 'node:test';
import assert from 'node:assert/strict';
import {IMAGE_EXPORT_PAGES,validateRasterPages} from '../dist/limits.js';
test('PDF-to-image export accepts 100 pages and rejects 101',()=>{assert.equal(IMAGE_EXPORT_PAGES,100);assert.doesNotThrow(()=>validateRasterPages('to-images',100));assert.throws(()=>validateRasterPages('to-images',101),/100 selected pages/);});
test('compression and grayscale retain their own 50-page limits',()=>{for(const tool of ['compress','grayscale']){assert.doesNotThrow(()=>validateRasterPages(tool,50));assert.throws(()=>validateRasterPages(tool,51),/50 selected pages/);}});
