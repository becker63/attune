// Evidence belongs to the rendered mark. Never consult hidden labels or infer
// observations from chart geometry. One shared popup, including dense SVG plots.
const tip=document.createElement('aside');
tip.id='graph-tooltip';tip.setAttribute('role','dialog');tip.setAttribute('aria-label','Inspect graph evidence');tip.hidden=true;
tip.innerHTML='<div class="evidence-popup-head"><span>Recorded evidence</span><button data-pin>Pin</button><button data-close aria-label="Close evidence">×</button></div><p class="evidence-popup-sentence"></p><pre class="evidence-popup-values"></pre><p class="evidence-popup-context"></p><div class="evidence-popup-sources"></div><div class="evidence-popup-foot"><button data-copy-evidence>Copy observation</button><span>Escape closes · arrows inspect marks</span></div>';
document.body.append(tip);
const nodeRegions='.node-label,.glyph,.pattern-strip a,.witness-worlds button,.atlas-filter-label,[data-reuse-cell],.memo-question,[data-work-part],.pair-task,.gap-field a';
const isGraphMark=el=>el instanceof SVGElement&&!['svg','title'].includes(el.tagName.toLowerCase())&&!el.closest('defs,.graph-key')||el.matches?.(nodeRegions);
let owner=null,pinned=false,leaveTimer,anchor,lastGroup,groupIndex=0,pointer=null,geometry=new WeakMap(),touchUntil=0;
const directTitle=el=>el.querySelector?.(':scope > title')?.textContent;
function retainTitle(el){
 const svgTitle=el.querySelector?.(':scope > title'),native=el.getAttribute?.('title')||svgTitle?.textContent;
 if(native){el.dataset.tooltip=native;el.removeAttribute('title');svgTitle?.remove();}
 return el.dataset?.tooltip;
}
function find(target){
 for(let el=target;el&&el!==document.body;el=el.parentElement){
  if(el.closest?.('#graph-tooltip,.graph-key'))return null;
  if(!isGraphMark(el))continue;
  if(el.dataset?.evidence){try{return {el,...JSON.parse(el.dataset.evidence)};}catch{/* A bad record must not break the page. */}}
  const text=retainTitle(el);
  if(text){
   const [sentence,...rest]=text.split('\n');return {el,sentence,details:rest.join('\n')};
  }
 }
 return null;
}
function sourceLinks(el,explicit){
 const region=el.closest('figure.evidence-figure,figure.inline-graph')||el.closest('figure')||el.closest('.experiment,#runtime-charts,#distribution-section,.field'),links=[];
 explicit=explicit||el.closest('[data-evidence-source]')?.dataset.evidenceSource;
 if(explicit)links.push({href:explicit,text:'Source record / implementation'});
 for(const a of region?.querySelectorAll('figcaption a,.metadata a')||[])links.push({href:a.getAttribute('href'),text:a.textContent});
 if(!links.length){
  const figure=el.closest('[data-figure]')?.dataset.figure;
  const href=el.closest('#trace-duration,#trace-requests')?'trace-timing.json':el.closest('[data-runtime]')?'runtime.json':el.closest('.glyph,.distribution-plot')?'data.json':figure?.startsWith('signature')?'signatures.json':figure?.startsWith('atlas')?'atlas-story.json':figure?.startsWith('datalog')?'datalog.json':figure?.startsWith('benchmark')?'benchmark.json':null;
  if(href)links.push({href,text:'Retained presentation records'});
 }
 return links.filter((l,i)=>l.href&&links.findIndex(x=>x.href===l.href)===i).filter(l=>{try{return ['http:','https:'].includes(new URL(l.href,location.href).protocol);}catch{return false;}}).slice(0,4);
}
function pause(el){
 const region=el.closest('figure,[data-mini]')||el;
 region.dispatchEvent(new CustomEvent('evidence-pause',{bubbles:true}));
 // Earlier replays expose a normal Pause control. Keep their existing semantics.
 const scope=region.closest('.experiment,#runtime-charts')||region;
 for(const b of scope.querySelectorAll('button'))if(/^Pause\b/.test(b.textContent.trim()))b.click();
}
function place(){
 if(tip.hidden)return;
 if(owner?.isConnected)anchor=owner.getBoundingClientRect();
 if(!anchor)return;
 const r=anchor,b=tip.getBoundingClientRect(),gap=10,pad=10;
 // Prefer the right, then the left, then below/above. Never chase the pointer.
 let x=r.right+gap,y=r.top;
 if(pointer&&!pinned){x=pointer.x+18;y=pointer.y+18;}
 if(x+b.width>innerWidth-pad){x=(pointer&&!pinned?pointer.x:r.left)-b.width-gap;if(x<pad){x=r.left;y=r.bottom+gap;if(y+b.height>innerHeight-pad)y=r.top-b.height-gap;}}
 tip.style.left=Math.max(pad,Math.min(innerWidth-b.width-pad,x))+'px';
 tip.style.top=Math.max(pad,Math.min(innerHeight-b.height-pad,y))+'px';
}
function hide(force=false){
 if(pinned&&!force)return;
 clearTimeout(leaveTimer);cancelAnimationFrame(hoverFrame);tip.hidden=true;pinned=false;tip.dataset.pinned='false';
 if(owner?.getAttribute('aria-describedby')===tip.id)owner.removeAttribute('aria-describedby');owner=null;
}
function show(match,lock=false){
 if(!match||(pinned&&match.el!==owner))return;
 clearTimeout(leaveTimer);
 if(owner!==match.el||tip.hidden){
  owner?.removeAttribute('aria-describedby');owner=match.el;anchor=owner.getBoundingClientRect();
  tip.querySelector('.evidence-popup-sentence').textContent=match.sentence;
  tip.querySelector('.evidence-popup-values').textContent=typeof match.details==='string'?match.details:JSON.stringify(match.details??'',null,2);
  const figure=owner.closest('figure.evidence-figure,figure.inline-graph')||owner.closest('figure'),caption=figure?.querySelector('figcaption');
  tip.querySelector('.evidence-popup-context').textContent=caption?.textContent||'';
  tip.querySelector('.evidence-popup-head > span').textContent=match.source?.endsWith('.flix')?'Checked code / fixture':'Observation details';
  const sources=tip.querySelector('.evidence-popup-sources');sources.replaceChildren();
  for(const link of sourceLinks(owner,match.source)){const a=document.createElement('a');a.href=link.href;a.textContent=link.text;a.target='_blank';a.rel='noopener';sources.append(a);}
  tip.querySelector('[data-copy-evidence]').textContent='Copy observation';tip.hidden=false;owner.setAttribute('aria-describedby',tip.id);
  pause(owner);
 }
 pinned=pinned||lock;tip.dataset.pinned=String(pinned);tip.querySelector('[data-pin]').textContent=pinned?'Unpin':'Pin';place();
}
function laterHide(){clearTimeout(leaveTimer);leaveTimer=setTimeout(()=>{if(!tip.matches(':hover')&&!tip.contains(document.activeElement)&&document.activeElement!==owner)hide();},220);}
// A generous magnetic target around each real mark. Geometry only chooses an
// existing observation; it never interpolates a rank, duration or measurement.
function nearby(target,x,y){
 const group=target.closest?.('svg,.atlas-filter-map,.cosmo-stage,.reuse-counts,.witness-worlds,.gap-field');
 if(!group||group.closest('.graph-key'))return null;
 let entries=geometry.get(group);const box=group.getBoundingClientRect();
 if(!entries){entries=marks(group).map(el=>{const r=el.getBoundingClientRect();return {el,x:r.left-box.left+r.width/2,y:r.top-box.top+r.height/2,w:r.width,h:r.height};}).filter(r=>r.w>0&&r.h>0&&r.w<350&&r.h<90);geometry.set(group,entries);}
 let best=null,distance=23*23;
 for(const item of entries){const dx=x-box.left-item.x,dy=y-box.top-item.y,d=dx*dx+dy*dy;if(d<distance){distance=d;best=item.el;}}
 return best?find(best):null;
}
let hoverFrame;
document.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'||pinned||tip.contains(e.target))return;
 cancelAnimationFrame(hoverFrame);const target=e.target,x=e.clientX,y=e.clientY;
 hoverFrame=requestAnimationFrame(()=>{pointer={x,y};const match=find(target)||nearby(target,x,y);if(match)show(match);else laterHide();});
},{passive:true});
// Focusing a distant mark scrolls the page under a stationary mouse. Keep
// that keyboard selection until an actual pointer move chooses another mark.
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch'||tip.contains(e.target)||pinned||pointer===null&&owner===document.activeElement)return;pointer={x:e.clientX,y:e.clientY};const match=find(e.target);if(match)show(match);});
document.addEventListener('pointerout',e=>{if(e.relatedTarget&&tip.contains(e.relatedTarget))clearTimeout(leaveTimer);else laterHide();});
tip.addEventListener('pointerenter',()=>clearTimeout(leaveTimer));tip.addEventListener('pointerleave',laterHide);
// Touch also emits focus before click. Opening a wide mobile popup on focus
// can cover the node and retarget that click to the page. Wait for the click.
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchUntil=performance.now()+800;},{passive:true});
document.addEventListener('focusin',e=>{if(tip.contains(e.target)||performance.now()<touchUntil)return;cancelAnimationFrame(hoverFrame);pointer=null;const m=find(e.target);if(m)show(m);else if(!pinned)hide();});
document.addEventListener('click',e=>{
 touchUntil=0;
 if(tip.contains(e.target))return;
 const m=find(e.target)||nearby(e.target,e.clientX,e.clientY);if(m){if(pinned&&owner!==m.el)hide(true);show(m,true);}else if(!e.target.closest('button,a,input'))hide(true);
});
tip.querySelector('[data-pin]').onclick=()=>{pinned=!pinned;tip.dataset.pinned=String(pinned);tip.querySelector('[data-pin]').textContent=pinned?'Unpin':'Pin';};
tip.querySelector('[data-close]').onclick=()=>hide(true);
tip.querySelector('[data-copy-evidence]').onclick=async()=>{
 const text=[tip.querySelector('.evidence-popup-sentence').textContent,tip.querySelector('.evidence-popup-values').textContent,tip.querySelector('.evidence-popup-context').textContent,...[...tip.querySelectorAll('a')].map(a=>a.href)].filter(Boolean).join('\n\n');
 try{await navigator.clipboard.writeText(text);tip.querySelector('[data-copy-evidence]').textContent='Copied';}catch{tip.querySelector('[data-copy-evidence]').textContent='Select and copy the text';}
};
// A chart has one tab stop, not one per observation. Arrows move that stop.
function marks(group){return [...group.querySelectorAll('title')].map(t=>t.parentElement).concat([...group.querySelectorAll('[data-evidence],[data-tooltip],[title]')]).filter((el,i,a)=>el!==group&&isGraphMark(el)&&a.indexOf(el)===i);}
function prepare(root){
 for(const el of root.querySelectorAll('[title],svg title')){const mark=el.tagName.toLowerCase()==='title'?el.parentElement:el;if(isGraphMark(mark))retainTitle(mark);}
 geometry=new WeakMap();
 for(const svg of root.querySelectorAll('figure svg,[data-mini] svg,.candidate-net,.distribution-plot svg,.reuse-counts,.witness-worlds,.atlas-filter-labels,.graph-labels')){
  const items=marks(svg);if(!items.length)continue;
  items.forEach((el,i)=>{el.setAttribute('tabindex',i===0?'0':'-1');if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',directTitle(el)||el.dataset.tooltip||'Inspect observation');});
  svg.dataset.evidenceGroup='true';
 }

}
let preparing=false,prepareTimer;
new MutationObserver(records=>{
 if(preparing||!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!tip.contains(n))))return;
 clearTimeout(prepareTimer);prepareTimer=setTimeout(()=>{preparing=true;prepare(document.querySelector('#main')||document);preparing=false;},100);
}).observe(document.querySelector('#main')||document.body,{childList:true,subtree:true});
prepare(document.querySelector('#main')||document);
document.addEventListener('keydown',e=>{
 touchUntil=0;
 if(e.key==='Escape'){e.preventDefault();hide(true);return;}
 if(tip.contains(e.target))return;
 const group=e.target.closest?.('[data-evidence-group]');if(!group)return;
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' '].includes(e.key))return;
 const items=marks(group);if(!items.length)return;e.preventDefault();e.stopPropagation();
 if(e.key==='Enter'||e.key===' '){show(find(e.target),true);tip.querySelector('[data-pin]').focus();return;}
 if(lastGroup!==group){lastGroup=group;groupIndex=Math.max(0,items.indexOf(e.target));}
 else groupIndex=Math.max(0,items.indexOf(e.target));
 groupIndex=e.key==='Home'?0:e.key==='End'?items.length-1:(groupIndex+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+items.length)%items.length;
 hide(true);items.forEach((n,i)=>n.setAttribute('tabindex',i===groupIndex?'0':'-1'));items[groupIndex].focus({preventScroll:true});
},true);
addEventListener('scroll',()=>{if(!tip.hidden){if(pinned||owner===document.activeElement)place();else hide();}},{passive:true,capture:true});
addEventListener('resize',()=>{geometry=new WeakMap();place();});addEventListener('hashchange',()=>hide(true));addEventListener('blur',()=>hide());
