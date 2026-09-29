export const formatTime = seconds => `${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,seconds)%60).toString().padStart(2,'0')}`;
export const clampTime = (time, duration) => Math.max(0,Math.min(Number(time)||0,duration));
export const drifted = (leader,follower,tolerance=.12) => Math.abs(leader-follower)>tolerance;

/** One controller per gallery; only user-selected media are assigned a src. */
export class VideoGroup {
 static groups=new Set();
 constructor(videos,{duration,onState,onTime,loop=false,exclusive=true}){
  this.videos=videos;this.duration=duration;this.onState=onState;this.onTime=onTime;
  this.loop=loop;this.exclusive=exclusive;
  this.rate=1;this.time=0;this.wanted=false;this.disposed=false;this.epoch=0;this.activeIndex=null;this.cleanup=[];
  VideoGroup.groups.add(this);
  const listen=(v,event,fn)=>{v.addEventListener(event,fn);this.cleanup.push(()=>v.removeEventListener(event,fn));};
  for(const v of videos){
   v.muted=true;v.playsInline=true;v.preload='none';
   listen(v,'error',()=>{if(!v.dataset.src)return;this.fail('Video could not be loaded. Check the file or connection, then retry.');});
   listen(v,'waiting',()=>{if(this.wanted&&this.active().includes(v)){this.stopVideos();this.onState('buffering');}});
   listen(v,'ended',()=>{if(this.active().includes(v)){
    if(this.loop){if(this.wanted)void this.seek(0);return;}
    this.pause();this.time=this.duration;this.onTime(this.time);this.onState('ended');
   }});
  }
  this.timer=setInterval(()=>this.tick(),250);
 }
 active(){return this.activeIndex===null?this.videos:[this.videos[this.activeIndex]];}
 available(){return this.active().every(v=>Boolean(v.dataset.src));}
 stopVideos(){this.videos.forEach(v=>v.pause());}
 fail(message){this.wanted=false;++this.epoch;this.stopVideos();this.onState('error',message);}
 pause(){this.wanted=false;++this.epoch;this.stopVideos();if(!this.disposed)this.onState('paused');}
 async ready(v){
  if(!v.dataset.src)throw Error('Video asset pending.');
  if(!v.getAttribute('src')){v.src=v.dataset.src;v.load();}
  if(v.readyState>=1){this.checkDuration(v);return;}
  await new Promise((resolve,reject)=>{
   const done=(err)=>{clearTimeout(timeout);v.removeEventListener('loadedmetadata',ok);v.removeEventListener('error',bad);err?reject(err):resolve();};
   const ok=()=>done();const bad=()=>done(Error('Video could not be loaded.'));
   const timeout=setTimeout(()=>done(Error('Video loading timed out. Please retry.')),15000);
   v.addEventListener('loadedmetadata',ok,{once:true});v.addEventListener('error',bad,{once:true});
  });
  this.checkDuration(v);
 }
 checkDuration(v){if(!Number.isFinite(v.duration)||Math.abs(v.duration-this.duration)>.5)throw Error('Video duration does not match this case. Please check the media configuration.');}
 async play(){
  if(!this.available())return;
  if(this.exclusive)for(const g of VideoGroup.groups)if(g!==this)g.pause();
  this.wanted=true;const epoch=++this.epoch;this.onState('loading');
  try{
   await Promise.all(this.active().map(v=>this.ready(v)));
   if(this.disposed||epoch!==this.epoch)return;
   if(this.time>=this.duration-.1)this.time=0;
   for(const v of this.active()){v.currentTime=this.time;v.playbackRate=this.rate;}
   await this.resume(epoch);
  }catch(e){if(epoch===this.epoch&&!this.disposed)this.fail(e.message);}
 }
 async resume(epoch=this.epoch){
  if(this.resuming||!this.wanted||this.disposed)return;
  this.resuming=true;
  try{await Promise.all(this.active().map(v=>v.play()));if(epoch!==this.epoch||!this.wanted||this.disposed){this.stopVideos();return;}this.onState('playing');}
  catch(e){if(epoch===this.epoch&&!this.disposed){
   // Holding the group during buffering may interrupt a pending play() request.
   // Let tick() resume when every active video is ready instead of showing an error.
   if(e.name==='AbortError'&&this.wanted)this.onState('buffering');
   else this.fail(e.name==='NotAllowedError'?'Playback was blocked. Press play to try again.':e.message);
  }}
  finally{this.resuming=false;}
 }
 async seek(time){
  const resume=this.wanted;this.pause();this.time=clampTime(time,this.duration);this.onTime(this.time);const epoch=this.epoch;
  if(!this.available())return;
  this.onState('loading');
  try{await Promise.all(this.active().map(v=>this.ready(v)));if(epoch!==this.epoch||this.disposed)return;
   for(const v of this.active())v.currentTime=this.time;
   this.onState('paused');if(resume)await this.play();
  }catch(e){if(epoch===this.epoch&&!this.disposed)this.fail(e.message);}
 }
 setRate(rate){this.rate=rate;this.videos.forEach(v=>{v.playbackRate=rate;});}
 async setActive(index){const wasPlaying=this.wanted;this.pause();this.activeIndex=index;if(this.available()){await this.seek(this.time);if(wasPlaying)await this.play();}}
 retry(){this.pause();for(const v of this.videos){v.removeAttribute('src');v.load();}return this.play();}
 tick(){
  if(!this.wanted||this.disposed)return;
  const active=this.active();
  if(active.some(v=>v.readyState<3||v.seeking)){this.stopVideos();this.onState('buffering');return;}
  if(active.every(v=>v.paused)){this.resume();return;}
  const leader=active[0];this.time=leader.currentTime;this.onTime(this.time);
  for(const v of active.slice(1))if(drifted(leader.currentTime,v.currentTime))v.currentTime=leader.currentTime;
 }
 destroy(){this.disposed=true;this.pause();clearInterval(this.timer);this.cleanup.forEach(fn=>fn());this.videos.forEach(v=>{v.removeAttribute('src');v.load();});VideoGroup.groups.delete(this);}
}
