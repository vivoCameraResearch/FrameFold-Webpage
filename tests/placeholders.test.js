import test from 'node:test';
import assert from 'node:assert/strict';
import {withPlaceholderVideos} from '../dist/placeholders.js';
import {galleries} from '../dist/content.js';

test('placeholder playback retains cases and prompts without changing source metadata',()=>{
 const before=structuredClone(galleries), displayed=withPlaceholderVideos(galleries);
 assert.deepEqual(galleries,before);
 for(const key of Object.keys(galleries)){
  assert.equal(displayed[key].length,galleries[key].length);
  displayed[key].forEach((c,i)=>{
   assert.equal(c.id,galleries[key][i].id);
   assert.equal(c.prompt,galleries[key][i].prompt);
   assert.equal(c.duration,29.625);
   assert.ok(c.media.every(m=>m.src));
   assert.ok((c.chapters||[]).every(t=>t<c.duration));
  });
 }
});
test('real media groups never mix with placeholder footage and placeholders can be disabled',()=>{
 const c=structuredClone(galleries.comparison[0]);c.media[0].src='real.mp4';
 assert.equal(withPlaceholderVideos({comparison:[c]}).comparison[0],c);
 assert.equal(withPlaceholderVideos(galleries,{enabled:false}),galleries);
});
