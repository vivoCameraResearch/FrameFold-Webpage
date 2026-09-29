import test from 'node:test';
import assert from 'node:assert/strict';
import {VideoGroup,formatTime,clampTime,drifted} from '../dist/player.js';

class Video extends EventTarget {
 constructor({src='test.mp4',duration=60}={}){super();this.dataset={src};this.duration=duration;this.readyState=4;this.currentTime=0;this.paused=true;this.seeking=false;this.attrs={};}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 load(){}
 getAttribute(key){return this.attrs[key]??null;}
 removeAttribute(key){delete this.attrs[key];}
 set src(value){this.attrs.src=value;}
}
function setup(t,videos=[new Video(),new Video()],duration=60){const states=[];const g=new VideoGroup(videos,{duration,onState:(...s)=>states.push(s),onTime:()=>{}});t.after(()=>g.destroy());return {g,videos,states};}
test('visible rows can play concurrently when exclusivity is disabled',async t=>{
 const a=setup(t),b=setup(t);a.g.exclusive=false;b.g.exclusive=false;
 await a.g.play();await b.g.play();assert.equal(a.g.wanted,true);assert.equal(b.g.wanted,true);
});
test('looping restarts the whole row together at the selected speed',async t=>{
 const {g,videos}=setup(t);g.loop=true;g.setRate(4);await g.play();
 videos.forEach(v=>v.currentTime=60);videos[0].dispatchEvent(new Event('ended'));videos[1].dispatchEvent(new Event('ended'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(g.time,0);assert.equal(g.wanted,true);
 for(const v of videos){assert.equal(v.currentTime,0);assert.equal(v.playbackRate,4);assert.equal(v.paused,false);}
});
test('generation timestamps and time bounds',()=>{assert.equal(formatTime(450),'07:30');assert.equal(formatTime(480),'08:00');assert.equal(clampTime(700,480),480);assert.equal(clampTime(-3,480),0);});
test('missing assets never pretend to play',async t=>{const {g,videos}=setup(t,[new Video({src:''})]);await g.play();assert.equal(g.wanted,false);assert.equal(videos[0].paused,true);});
test('one speed and seek apply to all videos',async t=>{const {g,videos}=setup(t);g.setRate(4);await g.seek(25);await g.play();for(const v of videos){assert.equal(v.currentTime,25);assert.equal(v.playbackRate,4);assert.equal(v.paused,false);}});
test('starting another group pauses the previous group',async t=>{const a=setup(t),b=setup(t);await a.g.play();await b.g.play();assert.equal(a.g.wanted,false);assert.ok(a.videos.every(v=>v.paused));assert.equal(b.g.wanted,true);});
test('waiting in one video pauses the group and resumes when ready',async t=>{const {g,videos}=setup(t);await g.play();videos[1].readyState=2;videos[1].dispatchEvent(new Event('waiting'));assert.ok(videos.every(v=>v.paused));g.tick();assert.ok(videos.every(v=>v.paused));videos[1].readyState=4;g.tick();await Promise.resolve();assert.ok(videos.every(v=>!v.paused));});
test('drift correction leaves small differences alone',t=>{const {g,videos}=setup(t);g.wanted=true;videos.forEach(v=>v.paused=false);videos[0].currentTime=10;videos[1].currentTime=9.5;g.tick();assert.equal(videos[1].currentTime,10);assert.equal(drifted(10,9.95),false);});
test('mobile method changes preserve time and speed',async t=>{const {g,videos}=setup(t);g.setRate(2);await g.seek(30);await g.play();await g.setActive(1);assert.equal(g.time,30);assert.equal(videos[1].currentTime,30);assert.equal(videos[1].playbackRate,2);assert.equal(videos[0].paused,true);assert.equal(videos[1].paused,false);});
test('duration mismatch is reported rather than silently trimmed',async t=>{const {g,states}=setup(t,[new Video({duration:55})]);await g.play();assert.equal(g.wanted,false);assert.equal(states.at(-1)[0],'error');assert.match(states.at(-1)[1],/duration/);});
test('destroy removes synchronization timer and registry entry',t=>{const {g}=setup(t);g.destroy();assert.equal(VideoGroup.groups.has(g),false);assert.equal(g.disposed,true);});
test('a late play result cannot restart a paused group',async t=>{const v=new Video();let release;v.play=()=>new Promise(resolve=>{release=()=>{v.paused=false;resolve();};});const {g}=setup(t,[v]);const started=g.play();await Promise.resolve();await Promise.resolve();g.pause();release();await started;assert.equal(v.paused,true);assert.equal(g.wanted,false);});
test('buffering can interrupt play without becoming a terminal error',async t=>{
 const v=new Video();let first=true;
 v.play=()=>{if(first){first=false;v.readyState=2;v.dispatchEvent(new Event('waiting'));return Promise.reject(new DOMException('Interrupted by pause','AbortError'));}v.paused=false;return Promise.resolve();};
 const {g,states}=setup(t,[v]);await g.play();
 assert.equal(g.wanted,true);assert.equal(states.at(-1)[0],'buffering');
 v.readyState=4;g.tick();await Promise.resolve();await Promise.resolve();
 assert.equal(v.paused,false);assert.ok(states.every(s=>s[0]!=='error'));
});
