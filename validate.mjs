import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {galleries,methods,results} from './dist/content.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'dist');
let pending=0;
for(const [section,cases] of Object.entries(galleries)){
 const ids=new Set();
 for(const c of cases){
  assert.ok(!ids.has(c.id),`Duplicate ${section} case ${c.id}`);ids.add(c.id);
  assert.ok(c.duration>0&&c.budget>0&&c.startTime>=0,`Invalid metadata: ${c.id}`);
  assert.ok(c.prompt||c.promptExcerpt,`Missing prompt: ${c.id}`);
  for(const m of c.media){assert.ok(methods[m.method]);for(const key of ['src','poster']){if(!m[key]){if(key==='src')pending++;continue;}if(/^https:\/\//.test(m[key]))continue;assert.ok(!/^[a-z]+:/i.test(m[key]),'Media must be HTTPS or a relative path');assert.ok(existsSync(resolve(root,m[key])),`Missing asset ${m[key]}`);}}
  for(const t of c.chapters||[])assert.ok(t>=0&&t<c.duration,`Invalid chapter ${t}`);
 }
}
for(const rows of Object.values(results))for(const row of rows){assert.equal(row.length,7);assert.ok(row.slice(1).every(v=>Number.isFinite(v)&&v>=0&&v<=100));}
const html=readFileSync(resolve(root,'index.html'),'utf8');
for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(/^(#|data:|https?:)/.test(url))continue;assert.ok(existsSync(resolve(root,url.split('#')[0])),`Missing page asset ${url}`);}
console.log(`Configuration and local assets valid. ${pending} video slots pending; this is a local layout preview.`);
