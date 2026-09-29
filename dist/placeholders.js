// Temporary development footage. Source and replacement steps: website/README.md.
export const PLACEHOLDER_VIDEO = {
 enabled:true,
 src:'assets/preview/longlive-rag-demo.mp4#t=0.1',
 duration:29.625,
 chapters:[0,10,20,25]
};

export function withPlaceholderVideos(galleries,config=PLACEHOLDER_VIDEO) {
 if(!config.enabled)return galleries;
 return Object.fromEntries(Object.entries(galleries).map(([section,cases])=>[
  section,cases.map(c=>c.media.some(m=>m.src)?c:{
   ...c,placeholder:true,duration:config.duration,startTime:0,
   ...(c.chapters?{chapters:config.chapters}:{}),
   media:c.media.map(m=>({...m,src:config.src,poster:null}))
  })
 ]));
}
