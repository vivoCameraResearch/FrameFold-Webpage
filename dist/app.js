import {galleries,methods,results,longResults} from './content.js';
import {VideoGroup,formatTime} from './player.js';
import {withPlaceholderVideos} from './placeholders.js';
const displayedGalleries=withPlaceholderVideos(galleries);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const announce=s=>document.querySelector('#announcement').textContent=s;
// Each visible comparison row stays synchronized. Section controls govern all rows.
const plusMethodKeys=new Set(['framefold','fade','deep']);
function videoCard(c,m,showLabel=false,hideLabel=false){
 const label=`${plusMethodKeys.has(m.method)?'+ ':''}${methods[m.method]}`;
 return `<figure class="film-card ${m.method==='framefold'?'film-ours':''}">${hideLabel?'':showLabel?`<figcaption>${label}</figcaption>`:`<figcaption class="mobile-film-label">${label}</figcaption>`}<div class="film-surface">${m.src?`<video playsinline muted preload="none" data-src="${escape(m.src)}" ${m.poster?`poster="${escape(m.poster)}"`:''} aria-label="${methods[m.method]} — ${escape(c.title)}"></video>`:'<div class="film-empty">Video to be added</div><video hidden></video>'}<button class="film-expand" aria-label="Expand ${methods[m.method]} — ${escape(c.title)}" ${!m.src?'disabled':''}>⛶</button></div></figure>`;
}
function filmSection(root,cases,{showcase=false,long=false,label,hideLabels=false}={}){
 const rows=cases;
 root.classList.add('film-section');
 root.innerHTML=`<div class="film-columns" style="--film-columns:${rows[0].media.length}">${rows[0].media.map(m=>`<span class="${m.method==='framefold'?'method-ours':''}">${plusMethodKeys.has(m.method)?'+ ':''}${methods[m.method]}</span>`).join('')}</div><div class="${showcase?'film-showcase':'film-rows'}">${rows.map(c=>`<div class="film-row" style="--film-columns:${c.media.length}" aria-label="${escape(c.title)}">${c.media.map(m=>videoCard(c,m,showcase,true)).join('')}</div>`).join('')}</div><div class="film-controls"><button class="film-play" aria-label="Play ${escape(label)}">▶ Play</button><button class="film-restart" aria-label="Restart ${escape(label)}">↺ Restart</button><div class="film-speeds" role="group" aria-label="${escape(label)} playback speed">${[1,2,4,8].map(r=>`<button data-rate="${r}" aria-pressed="${r===2}">${r}×</button>`).join('')}</div></div>${long?`<div class="film-timeline"><input type="range" min="0" max="${rows[0].duration}" step="0.1" value="0" aria-label="Long video playback position"><span class="film-time">00:00 / ${formatTime(rows[0].duration)}</span></div>`:''}<p class="film-error" role="status" hidden></p>`;
 const play=root.querySelector('.film-play'),restart=root.querySelector('.film-restart'),error=root.querySelector('.film-error');

 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let manualPaused=reduced.matches,rate=2;
 const entries=[];
 const update=()=>{
  const playing=entries.some(e=>e.group.wanted);
  play.textContent=playing?'Ⅱ Pause':'▶ Play';play.setAttribute('aria-label',`${playing?'Pause':'Play'} ${label}`);
 };
 const reconcile=()=>{for(const e of entries){
  if(e.visible&&!manualPaused&&!document.hidden&&!e.failed){if(!e.group.wanted)void e.group.play();}
  else if(e.group.wanted)e.group.pause();
 }update();};
 const slider=root.querySelector('input[type="range"]');
 root.querySelectorAll('.film-row').forEach((row,i)=>{
  const c=rows[i],videos=[...row.querySelectorAll('video')],entry={row,visible:false,failed:false,group:null};
  entry.group=new VideoGroup(videos,{duration:c.duration,loop:true,exclusive:false,onTime:t=>{
   if(slider){slider.value=t;slider.setAttribute('aria-valuetext',formatTime(c.startTime+t));root.querySelector('.film-time').textContent=`${formatTime(c.startTime+t)} / ${formatTime(c.startTime+c.duration)}`;}
  },onState:(state,message)=>{
   if(state==='error'){entry.failed=true;error.textContent=message+' Press Play to retry.';error.hidden=false;}
   update();
  }});
  entry.group.setRate(rate);
  entries.push(entry);
  row.querySelectorAll('.film-expand').forEach((button,j)=>button.onclick=async()=>{
   try{const card=button.closest('.film-card');if(card.requestFullscreen)await card.requestFullscreen();else if(videos[j].webkitEnterFullscreen){await entry.group.ready(videos[j]);videos[j].webkitEnterFullscreen();}}
   catch{announce('Full-screen viewing is unavailable on this browser.');}
  });
 });
 play.disabled=!entries.some(e=>e.group.available());
 if(restart)restart.disabled=play.disabled;
 const visibility=new IntersectionObserver(changes=>{
  for(const change of changes){const e=entries.find(e=>e.row===change.target);e.visible=change.isIntersecting&&change.intersectionRatio>=.15;}
  reconcile();
 },{threshold:[0,.15]});
 // Load a first frame near the viewport, without downloading every video on entry.
 const preload=new IntersectionObserver(changes=>{
  for(const change of changes){if(!change.isIntersecting)continue;const e=entries.find(e=>e.row===change.target);preload.unobserve(e.row);
   if(e.group.available())Promise.all(e.group.videos.map(v=>e.group.ready(v))).catch(err=>{if(!e.group.disposed)e.group.fail(err.message);});
  }
 },{rootMargin:'300px'});
 entries.forEach(e=>{visibility.observe(e.row);preload.observe(e.row);});
 play.onclick=()=>{
  manualPaused=entries.some(e=>e.group.wanted);
  if(!manualPaused){error.hidden=true;for(const e of entries){if(e.failed){e.failed=false;for(const v of e.group.videos){v.removeAttribute('src');v.load();}}}}
  reconcile();
 };
 if(restart)restart.onclick=async()=>{
  manualPaused=false;error.hidden=true;
  for(const e of entries){e.failed=false;if(e.group.available())await e.group.seek(0);}
  reconcile();
 };
 root.querySelectorAll('[data-rate]').forEach(button=>button.onclick=()=>{
  rate=Number(button.dataset.rate);entries.forEach(e=>e.group.setRate(rate));
  root.querySelectorAll('[data-rate]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 });
 if(slider){
  const e=entries[0];let resumeAfterSeek=false;
  slider.disabled=!e.group.available();
  slider.addEventListener('input',()=>{resumeAfterSeek=resumeAfterSeek||e.group.wanted;manualPaused=true;e.group.pause();root.querySelector('.film-time').textContent=`${formatTime(cases[0].startTime+Number(slider.value))} / ${formatTime(cases[0].startTime+cases[0].duration)}`;});
  slider.addEventListener('change',async()=>{await e.group.seek(Number(slider.value));manualPaused=!resumeAfterSeek;resumeAfterSeek=false;reconcile();});
 }
  document.addEventListener('visibilitychange',reconcile);
  const reducedHandler=()=>{if(reduced.matches){manualPaused=true;reconcile();}};
  reduced.addEventListener('change',reducedHandler);
  root._teardown=()=>{
   visibility.disconnect();preload.disconnect();
   entries.forEach(e=>e.group.destroy());
   document.removeEventListener('visibilitychange',reconcile);
   reduced.removeEventListener('change',reducedHandler);
  };
 }


document.querySelector('#remaining-sections').innerHTML=`
<section id="motivation" class="section"><div class="section-heading"><h2>Motivation</h2></div><figure class="pipeline-figure"><img src="assets/motivation.png" width="1728" height="419" loading="lazy" decoding="async" alt="Motivation figure illustrating why response-guided KV cache consolidation is needed for long video generation."></figure><p class="section-intro">Different spatial queries rely on different historical content, so a shared Top-K ranking can discard information important to some queries. This motivates consolidating adjacent history into shared representations that aim to preserve what different queries retrieve.</p></section>
<section id="method" class="section"><div class="section-heading"><h2>Method</h2></div>
<figure class="pipeline-figure"><a href="assets/framefold-pipeline.pdf" target="_blank" rel="noopener" aria-label="Open the FrameFold pipeline as a full-resolution PDF"><img src="assets/framefold-pipeline.png" width="2600" height="919" loading="lazy" decoding="async" alt="FrameFold pipeline: on KV cache overflow, score adjacent historical pairs using recent query responses, merge the pair with the least distortion, and repeat until the cache fits its budget. Representative keys use temporal-span weights and values use closed-form response fitting."></a></figure><p class="section-intro">When the cache exceeds its budget, FrameFold merges adjacent historical KV entries while preserving complete spatial grids. Using recent queries as probes, it fits value-merging coefficients in closed form and selects the merge with the lowest conditional-response distortion.</p></section>
<section id="comparison" class="section"><div class="section-heading"><h2>Qualitative Comparisons</h2></div><div id="comparison-player"></div></section>
<section id="results" class="section"><div class="section-heading"><h2>Quantitative Results</h2></div><div class="results-toolbar"><h3>Main comparison</h3><label>Configuration <select id="result-config" aria-label="Results configuration">${Object.keys(results).map(k=>`<option ${k==='Self Forcing · 60s'?'selected':''}>${k}</option>`).join('')}</select></label></div><div class="table-scroll" tabindex="0" role="region" aria-label="Main experiment results"><table><thead><tr><th scope="col">Method</th><th scope="col">Subject<br>consistency</th><th scope="col">Background<br>consistency</th><th scope="col">Motion<br>smoothness</th><th scope="col">Dynamic<br>degree</th><th scope="col">Aesthetic<br>quality</th><th scope="col">Imaging<br>quality</th></tr></thead><tbody id="results-body"></tbody></table></div>
 <div class="long-results"><div class="chart-container"><div class="chart-heading"><h3>Imaging quality over eight minutes</h3><span>Table 4 · Self Forcing · 24 prompts</span></div><div id="long-chart"></div><div class="chart-legend">${longResults.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div><p class="chart-note">Nested prefixes of the same continuous rollout. Duration is shown on a logarithmic scale.</p><details><summary>View chart data</summary><div class="table-scroll"><table><caption>Imaging quality by rollout duration</caption><thead><tr><th>Method</th>${[30,60,120,240,480].map(t=>`<th>${t}s</th>`).join('')}</tr></thead><tbody>${longResults.map(s=>`<tr><th scope="row">${s.name}</th>${s.values.map(v=>`<td>${v.toFixed(2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></div></div></section>
 <section id="citation" class="section"><div class="section-heading"><h2>Citation</h2></div><div class="citation-block"><pre id="bibtex-text">@article{framefold2026,
  title   = {Response-Guided KV Cache Consolidation for Autoregressive Long Video Generation},
  author  = {Liu, Muyu and Liu, Mingming and Gu, Hong and Zhang, Yuyao and Lu, Qin},
  journal = {Under review},
  year    = {2026}
}</pre><button class="copy-bibtex" type="button" aria-label="Copy BibTeX citation">Copy</button></div></section>`;

const showcasePanels={selfforcing:displayedGalleries.showcase,causalforcing:displayedGalleries.showcaseCausal};
const showcaseRoot=document.querySelector('#showcase-player');
const renderShowcasePanel=key=>{
  if(showcaseRoot._teardown)showcaseRoot._teardown();
  showcaseRoot.innerHTML='';showcaseRoot.classList.remove('film-section');
  filmSection(showcaseRoot,showcasePanels[key],{showcase:true,label:`${key==='selfforcing'?'Self Forcing':'Causal Forcing'} showcase videos`});
};
renderShowcasePanel('selfforcing');
document.querySelectorAll('.showcase-tabs [data-panel]').forEach(tab=>tab.onclick=()=>{
  if(tab.getAttribute('aria-selected')==='true')return;
  document.querySelectorAll('.showcase-tabs [data-panel]').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));
  renderShowcasePanel(tab.dataset.panel);
});
const comparisonRoot=document.querySelector('#comparison-player');
for(const backbone of [...new Set(displayedGalleries.comparison.map(c=>c.backbone))]){
 const section=document.createElement('section');section.className='backbone-section';
 section.innerHTML=`<h3>${escape(backbone)}</h3><div class="backbone-videos"></div>`;comparisonRoot.append(section);
 filmSection(section.querySelector('.backbone-videos'),[displayedGalleries.comparison.find(c=>c.backbone===backbone)],{label:`${backbone} comparisons`});
}
const plusMethods=new Set(['Deep Forcing','FadeMem','FrameFold']);
const updateResults=()=>{const rows=results[document.querySelector('#result-config').value];document.querySelector('#results-body').innerHTML=rows.map(row=>`<tr class="${row[0]==='FrameFold'?'highlight':''}"><th scope="row">${plusMethods.has(row[0])?'+ ':''}${row[0]}${row[0]==='FrameFold'?' <span class="ours-tag">Ours</span>':''}</th>${row.slice(1).map((v,i)=>`<td>${v===Math.max(...rows.map(r=>r[i+1]))?`<strong>${v.toFixed(2)}</strong>`:v.toFixed(2)}</td>`).join('')}</tr>`).join('');};
document.querySelector('#result-config').onchange=updateResults;updateResults();
const x=i=>58+i*124,y=v=>205-(v-65)*22;
document.querySelector('#long-chart').innerHTML=`<svg viewBox="0 0 590 250" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Imaging quality from 30 to 480 seconds</title><desc id="chart-desc">FrameFold declines from 72.31 to 71.29, FadeMem from 71.77 to 69.68, and Deep Forcing from 69.50 to 65.86. Exact values follow in the chart data table.</desc>${[66,68,70,72].map(v=>`<line x1="58" y1="${y(v)}" x2="554" y2="${y(v)}" stroke="#e2e8f1"/><text x="40" y="${y(v)+5}" text-anchor="end">${v}</text>`).join('')}${[30,60,120,240,480].map((t,i)=>`<text x="${x(i)}" y="232" text-anchor="middle">${t}s</text>`).join('')}${longResults.map((s,j)=>`<polyline points="${s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${j===0?3:2}" ${j?'stroke-dasharray="6 4"':''}/>${s.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}"/>`).join('')}`).join('')}</svg>`;
const copyBibtexButton=document.querySelector('.copy-bibtex');
if(copyBibtexButton){
  copyBibtexButton.onclick=async()=>{
    const text=document.querySelector('#bibtex-text').textContent;
    try{await navigator.clipboard.writeText(text);}
    catch{const range=document.createRange();range.selectNodeContents(document.querySelector('#bibtex-text'));const sel=getSelection();sel.removeAllRanges();sel.addRange(range);document.execCommand('copy');sel.removeAllRanges();}
    copyBibtexButton.textContent='Copied';copyBibtexButton.dataset.copied='true';
    setTimeout(()=>{copyBibtexButton.textContent='Copy';delete copyBibtexButton.dataset.copied;},2000);
  };
}