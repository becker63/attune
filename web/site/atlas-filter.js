import {esc} from './evidence.js';
import {graphKey} from './chart-key.js';

const ink='#efe4d6',green='#a7c59c',amber='#d5ad75',pink='#ce879b',dim='#49313b';
const short=p=>p.replace('packages/cli/src/','').replace('packages/cli/test/','test/');
let library;

// A presentation of one saved neighborhood. Filtering here changes the picture,
// not the research output, candidate ranking, or the admitted relationships.
export async function mountAtlasFilter(host,d,alive){
  const helper=d.candidate.path;
  const nodes=[...d.consumers.map((path,i)=>({id:path,path,kind:'file',role:'consumer',i})),
    {id:helper,path:helper,kind:'file',role:'helper'},
    {id:d.imports[0],path:d.imports[0],kind:'file',role:'dependency'},
    ...d.definitions.map((path,i)=>({id:'symbol:'+path,path,kind:'symbol',role:'name',i}))];
  const edges=[...d.consumers.map((path,i)=>({source:path,target:helper,relation:'Imports',preview:i<6})),
    {source:helper,target:d.imports[0],relation:'Imports'},
    ...d.definitions.map(path=>({source:helper,target:'symbol:'+path,relation:'Defines'}))];
  const steps=[
    {title:'Start around this file',count:28,query:'nearby facts',body:'The picture contains 28 recorded facts: 22 files import the helper, the helper imports one file, and it defines five names. This is a selected neighborhood, not the whole repository.'},
    {title:'Keep Imports relationships',count:23,query:'relation = Imports',body:'We are asking about dependencies between files. Keep the 23 Imports arrows. The five arrows to declared names no longer answer this question.'},
    {title:'Keep arrows pointing here',count:22,query:'relation = Imports\ntarget   = resource-utils.js',body:'Keep only imports whose target is resource-utils.js. The helper’s own outgoing import is removed. The remaining 22 sources answer “which files use this helper?” Atlas calls this reverse lookup ImportedBy.'},
    {title:'Send six names and the count',count:6,query:'count = 22\npreview = first 6 source paths',body:'The request keeps the total, 22, but names only six files. This is a fixed text limit, not a second relevance judgment. The other 16 relationships still exist in Atlas.'}
  ];
  let step=0,graph,disposed=false,frame=0,fitFrame=0,playing=false,geometry=[];
  const kept=e=>step===0||(e.relation==='Imports'&&(step===1||(e.target===helper&&(step===2||e.preview))));
  const lit=n=>n.role==='helper'||edges.some(e=>kept(e)&&(e.source===n.id||e.target===n.id));
  const color=n=>!lit(n)?dim:n.role==='helper'?ink:n.kind==='symbol'?pink:step===3?amber:green;
  host.innerHTML='<p class="atlas-focus"><span>Qwen’s candidate 28</span><strong>[lib/resource-utils.js]</strong></p>'+
    graphKey([['line',green,'Imports: file → file'],['line',pink,'Defines: file → name'],['line',dim,'Removed by this filter; still recorded']])+
    '<div class="figure-controls"><button data-filter-play>Replay the filters</button><button data-filter-reset>Start again</button></div>'+
    '<div class="atlas-filter-steps" role="group" aria-label="Successive evidence filters">'+steps.map((s,i)=>`<button data-filter-step="${i}" aria-pressed="${i===0}"><span>${i+1}. ${esc(s.title)}</span><b>${s.count}</b></button>`).join('')+'</div>'+
    '<p class="atlas-map-key">[file] ------&gt; [dependency] &nbsp; · &nbsp; (declared name)<br>22 importing files; one dependency and five declared names. Select any mark for its exact name.</p><div class="atlas-filter-map"><div class="atlas-filter-canvas"></div><svg class="atlas-filter-fallback" aria-hidden="true"></svg><div class="atlas-filter-labels"></div></div>'+
    '<p class="atlas-filter-inspect" aria-live="polite">Select a file or name to read its exact path and connection.</p><div class="atlas-filter-explanation"><pre class="atlas-filter-query"></pre><p class="atlas-filter-sentence" aria-live="polite"></p></div>'+
    '<div class="atlas-filter-answer"><p class="atlas-filter-result"></p><ol></ol></div>'+
    '<figcaption>29 items / 28 admitted facts in Greenwood w49. Positions stay fixed as facts are selected. This replays the meaning of a lookup, not runtime events or model reasoning. Solid arrows always retain their source direction. <a href="atlas-story.json" download>Exact facts, request and pinned revision</a>.</figcaption>';
  const canvas=host.querySelector('.atlas-filter-canvas'),labels=host.querySelector('.atlas-filter-labels'),fallback=host.querySelector('.atlas-filter-fallback');
  labels.innerHTML=nodes.map((n,i)=>`<button class="atlas-filter-label" data-filter-node="${i}" aria-label="${esc(n.kind+': '+n.path)}" title="${esc(n.role==='consumer'?n.path+' imports '+helper:n.role==='dependency'?helper+' imports '+n.path:n.role==='name'?helper+' defines '+n.path:n.path+': 22 incoming imports; one outgoing import; five definitions')}">${n.kind==='symbol'?'('+esc(n.path)+')':'['+esc(short(n.path))+']'}</button>`).join('');
  function inspect(n){host.querySelector('.atlas-filter-inspect').textContent=n.role==='helper'?n.path+' — Qwen rank 28; 22 incoming imports, one outgoing import, five defined names.':n.role==='consumer'?n.path+' imports '+helper:n.role==='dependency'?helper+' imports '+n.path:helper+' defines '+n.path;}
  labels.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>inspect(nodes[i]));
  function layout(){
    const mobile=canvas.clientWidth<500;
    for(const n of nodes){
      if(mobile){
        if(n.role==='consumer'&&n.i<6){n.x=100;n.y=80+n.i*130;}
        else if(n.role==='consumer'){n.x=250+(n.i%2)*80;n.y=80+Math.floor((n.i-6)/2)*90;}
        else if(n.role==='helper'){n.x=510;n.y=430;}
        else if(n.role==='dependency'){n.x=100;n.y=1040;}
        else {n.x=280+(n.i%3)*110;n.y=900+Math.floor(n.i/3)*110;}
      }else{
        if(n.role==='consumer'&&n.i<6){n.x=120;n.y=80+n.i*115;}
        else if(n.role==='consumer'){n.x=350+(n.i%2)*35;n.y=65+Math.floor((n.i-6)/2)*90;}
        else if(n.role==='helper'){n.x=620;n.y=390;}
        else if(n.role==='dependency'){n.x=990;n.y=90;}
        else {n.x=990;n.y=280+n.i*98;}
      }
    }
    for(const n of nodes)n.y=1200-n.y;
    geometry=nodes.map(n=>[n.x,n.y]);
    if(graph){graph.setData(nodes.map(n=>({...n})),edges.map(e=>({...e})),false);fit();}
    positionLabels();
  }
  function fit(){graph.cosmos.fitView(0,.15);graph.step();}
  function point(n){
    if(graph)return graph.spaceToScreenPosition([n.x,n.y]);
    const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),w=canvas.clientWidth,h=canvas.clientHeight;
    return [22+(n.x-Math.min(...xs))/(Math.max(...xs)-Math.min(...xs))*(w-44),35+(n.y-Math.min(...ys))/(Math.max(...ys)-Math.min(...ys))*(h-70)];
  }
  function positionLabels(){
    const mobile=canvas.clientWidth<500;
    nodes.forEach((n,i)=>{const b=labels.children[i],p=point(n);if(!p)return;
      const minimal=n.role==='consumer'&&n.i>=6||mobile&&n.role==='name';
      b.textContent=n.kind==='symbol'?'('+n.path+')':'['+(mobile?(n.role==='helper'?'resource-utils.js':n.path.split('/').at(-1)):short(n.path))+']';
      b.classList.toggle('node-dot',minimal);b.classList.toggle('muted',!lit(n));
      b.style.left=p[0]+'px';
      b.style.top=Math.max(26,Math.min(canvas.clientHeight-20,p[1]))+'px';b.style.color=color(n);
      b.setAttribute('aria-pressed',String(lit(n)));
    });
    if(!graph){
      const pts=new Map(nodes.map(n=>[n.id,point(n)]));fallback.setAttribute('viewBox',`0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
      fallback.innerHTML='<defs><marker id="atlas-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#a7c59c"/></marker></defs>'+edges.map(e=>{const a=pts.get(e.source),b=pts.get(e.target);return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${!kept(e)?dim:e.relation==='Defines'?pink:green}" stroke-width="${kept(e)?1.4:.6}" marker-end="url(#atlas-arrow)"><title>${esc(e.source+' '+e.relation+' '+e.target)}</title></line>`;}).join('')+nodes.map(n=>{const p=pts.get(n.id);return `<circle cx="${p[0]}" cy="${p[1]}" r="${n.role==='helper'?5:3}" fill="${color(n)}"><title>${esc(n.kind+': '+n.path)}</title></circle>`;}).join('');
    }
  }
  function draw(){
    host.dataset.filterStep=String(step);host.dataset.filterCount=String(edges.filter(kept).length);host.dataset.graphPositions=JSON.stringify(geometry);
    host.querySelectorAll('[data-filter-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.filterStep)===step)));
    host.querySelector('.atlas-filter-query').textContent=steps[step].query;
    host.querySelector('.atlas-filter-sentence').textContent=steps[step].body;
    const answer=host.querySelector('.atlas-filter-answer');answer.hidden=step<2;
    host.querySelector('.atlas-filter-result').textContent=step===3?'22 matching files; these six names enter the preview.':'22 matching files. The first six in the retained ordering are:';
    answer.querySelector('ol').innerHTML=d.consumers.slice(0,6).map(p=>`<li>${esc(short(p))}</li>`).join('');
    if(graph){graph.setConfig(configuration());graph.setData(nodes.map(n=>({...n})),edges.map(e=>({...e,selected:kept(e)})),false);}positionLabels();
  }
  host.addEventListener('evidence-pause',stop);
 function stop(){cancelAnimationFrame(frame);playing=false;host.querySelector('[data-filter-play]').textContent='Replay the filters';}
  host.querySelectorAll('[data-filter-step]').forEach(b=>b.onclick=()=>{stop();step=Number(b.dataset.filterStep);draw();});
  host.querySelector('[data-filter-reset]').onclick=()=>{stop();step=0;draw();};
  host.querySelector('[data-filter-play]').onclick=()=>{
    if(playing){stop();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){step=3;draw();return;}
    playing=true;host.querySelector('[data-filter-play]').textContent='Pause replay';const start=performance.now();step=0;draw();
    function tick(now){if(disposed||!alive())return;const next=Math.max(0,Math.min(3,Math.floor((now-start)/2200)));if(next!==step){step=next;draw();}if(now-start<8800)frame=requestAnimationFrame(tick);else stop();}frame=requestAnimationFrame(tick);
  };
  layout();draw();
  library??=import('./vendor/cosmograph.js');
  const configuration=()=>({disableSimulation:true,disableZoom:true,backgroundColor:'#140e11',nodeSize:n=>n.role==='helper'?7:4,nodeColor:color,linkColor:e=>!kept(e)?dim:e.relation==='Defines'?pink:step===3?amber:green,linkWidth:e=>kept(e)?1.5:.45,linkArrows:true,linkVisibilityMinTransparency:1,showDynamicLabels:false,showHoveredNodeLabel:false,showLabelsFor:[],fitViewOnInit:false,scaleNodesOnZoom:false,onZoom:positionLabels,onZoomEnd:positionLabels,onClick:n=>{if(n)inspect(n);}});
  library.then(({Cosmograph})=>{
    if(disposed||!alive())return;
    try{graph=new Cosmograph(canvas,configuration());host.dataset.renderer='cosmograph';fallback.setAttribute('hidden','');layout();draw();fitFrame=requestAnimationFrame(()=>{if(graph)fit();positionLabels();});}
    catch{graph?.remove();graph=null;host.dataset.renderer='svg';fallback.removeAttribute('hidden');layout();draw();}
  }).catch(()=>{if(!disposed){host.dataset.renderer='svg';fallback.removeAttribute('hidden');layout();draw();}});
  const observer=new ResizeObserver(()=>{if(!disposed&&alive())layout();});observer.observe(canvas);
  return ()=>{disposed=true;stop();cancelAnimationFrame(fitFrame);observer.disconnect();graph?.remove();};
}
