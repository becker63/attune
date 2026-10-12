import {mountSignatureReading} from './signature-reading.js';
import {mountRouteReading} from './route-reading.js';
import * as Plot from './vendor/plot.js';
import {esc,patternNames} from './evidence.js';
import {graphKey} from './chart-key.js';
const green='#a7c59c',amber='#d5ad75',muted='#a89499';
const style={background:'transparent',color:muted,fontFamily:'monospace',fontSize:10};
const plainDefinitions={
 'api-barrel':'One entry file exposes names implemented in other files: the public interface, or API.',
 'ast-visitor':'Treat parsed code as a tree. Visit different kinds of nodes with different functions.',
 'configuration-policy':'A setting or supplied function chooses what a shared operation will do.',
 'dependency-injection':'Give an operation the service it needs, instead of having it construct that service.',
 'event-subscription':'One part announces an event; functions registered by other parts respond to it.',
 'external-adapter':'Translate between the program’s own interface and another system’s interface.',
 'generated-boundary':'A source program produces more source code. The generator and its output have different roles.',
 'hook-registry':'Store named functions in a collection so another part of the program can find and call them.',
 'initialization-protocol':'Set things up in a required order before the main behavior can run.',
 'plugin-chain':'Pass a value through separately registered extensions, one after another.',
 'shared-utility':'Several files call the same reusable implementation of a small operation.',
 'transformation-pipeline':'Convert data through ordered stages, each taking the preceding stage’s result.'
};
let dataPromise;
const caption=s=>`<figcaption>${s} <a href="signatures.json" download>Retained measurements &amp; exact source identities</a>.</figcaption>`;

export async function mountSignatureFigure(host,kind,alive){
 if(['signature-middle','signature-properties','signature-babel-work','signature-history-changes'].includes(kind)||kind.startsWith('signature-case-'))return mountSignatureReading(host,kind,alive);
  let frame=0,observer,disposed=false;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stop=()=>cancelAnimationFrame(frame);
  function replay(draw){stop();const start=performance.now();function tick(now){if(disposed||!alive())return;const t=reduced()?1:Math.min(1,(now-start)/5600);draw(t);if(t<1)frame=requestAnimationFrame(tick);}draw(0);frame=requestAnimationFrame(tick);}
  function watch(el,draw){const paint=()=>{if(!disposed&&alive())draw();};observer=new ResizeObserver(paint);observer.observe(el);paint();}
  if(kind==='signature-route'||kind==='signature-cache')return mountRouteReading(host,kind,alive);
  if(kind==='pattern-catalog'){
    const tasks=await fetch('data.json').then(r=>r.json());if(!alive())return ()=>{};
    const repositories=[...new Set(tasks.map(t=>t.repository))].sort();
    const patterns=Object.keys(patternNames).map(id=>({id,repos:new Set(tasks.filter(t=>t.patterns.includes(id)).map(t=>t.repository))})).sort((a,b)=>b.repos.size-a.repos.size||a.id.localeCompare(b.id));
    host.innerHTML=graphKey([['square',green,'Source-confirmed in this repository'],['square','#3b2832','No confirmed instance in this sample']])+'<p class="figure-key">Select a row to open its source examples. Each row has the same 22 repository positions; counts reflect independent repositories.</p><div class="pattern-index">'+patterns.map(p=>`<a href="#patterns/${p.id}" class="pattern-entry"><span class="pattern-entry-title">${esc(patternNames[p.id])}<span aria-hidden="true">↗</span></span><span class="pattern-entry-description">${esc(plainDefinitions[p.id])}</span><span class="pattern-strip" aria-label="Confirmed in ${p.repos.size} of 22 repositories">${repositories.map(repo=>`<i class="${p.repos.has(repo)?'confirmed':''}" title="${esc(repo)}: ${p.repos.has(repo)?'source-confirmed':'not established in the inspected sample'}"></i>`).join('')}</span><span class="pattern-open">${p.repos.size} ${p.repos.size===1?'repository':'repositories'} · Open evidence →</span></a>`).join('')+'</div><figcaption>Localization census: 40 confirmed instances in 12 categories, from 28 inspected issues. The other 57 issues remain unclassified. An empty position does not prove absence. <a href="guide.json" download>Definitions and evidence limits</a>.</figcaption>';
    return ()=>{};
  }
  dataPromise??=fetch('signatures.json').then(r=>r.json());const d=await dataPromise;if(!alive())return ()=>{};
  if(kind==='signature-curves'){
    let depth=7;const repos=[...d.repositories].sort((a,b)=>a.file_extinction-b.file_extinction);
    host.innerHTML=graphKey([['line',green,'Start from a file'],['line',amber,'Start from a named code item']])+'<div class="figure-controls"><button data-signature-play>Replay steps 1 → 7</button><button data-signature-end>Show all steps</button><output aria-live="polite">Seven steps</output></div><div class="signature-grid">'+repos.map(r=>`<section><h4>${esc(r.repository)} <small>${r.snapshot_count} ${r.snapshot_count===1?'version':'versions'}</small></h4><div data-signature-repo="${esc(r.repository)}"></div></section>`).join('')+'</div>'+caption('78 frozen versions / 11 repositories / 16 starting points per version. Every faint line is one measured version and starting-point type; all panels use the same scales. Sorted by median file-start empty-result fraction. Fixed six-relation questions, up to seven steps. No issue, embeddings, judgment model or fix labels. This is descriptive separation, not a trained repository classifier.');
    function draw(){for(const r of repos){const el=host.querySelector(`[data-signature-repo="${r.repository}"]`),rows=d.curves.filter(c=>c.repository===r.repository&&c.depth<=depth);el.replaceChildren(Plot.plot({width:Math.max(250,el.clientWidth),height:220,marginLeft:37,marginRight:14,marginTop:30,style,x:{domain:[1,7],ticks:[1,3,5,7],tickFormat:n=>String(n),label:'Steps followed'},y:{domain:[0,1],ticks:[0,.5,1],tickFormat:n=>Math.round(n*100)+'%',label:'Routes with ≥1 endpoint',grid:true},marks:[Plot.line(rows,{x:'depth',y:'value',z:r=>r.snapshot_id+r.seed_domain,stroke:r=>r.seed_domain==='file'?green:amber,strokeOpacity:.5}),Plot.dot(rows,{x:'depth',y:'value',fill:r=>r.seed_domain==='file'?green:amber,r:1.4,title:r=>`${r.repository} @ ${r.base_revision}\n${r.seed_domain} start, depth ${r.depth}: ${(r.value*100).toFixed(2)}% with ≥1 endpoint\n${Math.round(r.value*r.sample_count)} / ${r.sample_count} route answers nonempty; the endpoint count within an answer is not the score`})]}));}host.querySelector('output').textContent='Through '+depth+' recorded steps';}
    watch(host.querySelector('.signature-grid'),draw);host.querySelector('[data-signature-play]').onclick=()=>replay(t=>{const n=Math.min(7,1+Math.floor(t*7));if(n!==depth){depth=n;draw();}});host.querySelector('[data-signature-end]').onclick=()=>{stop();depth=7;draw();};
  }
  if(kind==='signature-history'){
    let fraction=1;const groups=['attune','attuneflix'].map(repository=>({repository,rows:d.history.filter(r=>r.repository===repository).sort((a,b)=>a.date.localeCompare(b.date)).map((r,i)=>({...r,i}))}));
    host.innerHTML=graphKey([['dot',green,'Measured checkpoint'],['line',muted,'Connects selected checkpoints; gaps are unmeasured']])+'<div class="figure-controls"><button data-history-play>Replay both histories</button><button data-history-end>Show all checkpoints</button></div><div class="history-grid">'+groups.map(g=>`<section><h4>${g.repository==='attune'?'Attune · the rewrite':'AttuneFlix · the older project'} <small>${g.rows.length} checkpoints</small></h4><div data-history="${g.repository}" data-measure="files"></div><div data-history="${g.repository}" data-measure="reach"></div></section>`).join('')+'</div><p class="history-inspect" aria-live="polite">Hover a point for its exact revision and recorded source change.</p>'+caption('Separate historical study: 24 Attune and 6 AttuneFlix checkpoints, 1,573,920 route results. Common Flix/Java/Starlark source slice, fixed queries and 16 selected starting points per checkpoint. Horizontal spacing is checkpoint order, not elapsed time. The two projects are separate histories; unselected revisions are not interpolated measurements.');
    function draw(){for(const group of groups)for(const measure of ['files','reach']){const el=host.querySelector(`[data-history="${group.repository}"][data-measure="${measure}"]`),rows=group.rows.slice(0,Math.ceil(group.rows.length*fraction)),value=r=>measure==='files'?r.population.file_count:r.work_topology.depth7_reach;el.replaceChildren(Plot.plot({width:Math.max(250,el.clientWidth),height:210,marginLeft:40,marginRight:18,style,x:{domain:[0,group.rows.length-1],ticks:[0,Math.floor((group.rows.length-1)/2),group.rows.length-1],tickFormat:n=>group.rows[n].revision.slice(0,6),label:'Selected revisions · oldest → newest'},y:{domain:measure==='files'?[0,Math.max(...group.rows.map(value))*1.08]:[0,1],tickFormat:measure==='reach'?n=>Math.round(n*100)+'%':undefined,label:measure==='files'?'Admitted source files':'Files reached within 7 steps',grid:true},marks:[Plot.line(rows,{x:'i',y:value,stroke:muted}),Plot.dot(rows,{x:'i',y:value,fill:green,r:3,title:r=>`${r.repository} @ ${r.revision}\n${r.date}\n${r.description}\n${r.population.file_count} files; ${(r.work_topology.depth7_reach*100).toFixed(2)}% mean cumulative file reach`})]}));}}
    watch(host.querySelector('.history-grid'),draw);host.querySelector('[data-history-play]').onclick=()=>replay(t=>{fraction=t;draw();});host.querySelector('[data-history-end]').onclick=()=>{stop();fraction=1;draw();};
    host.querySelector('.history-grid').onpointerover=e=>{const title=e.target.querySelector?.('title')?.textContent;if(title)host.querySelector('.history-inspect').textContent=title;};
  }
  if(kind==='signature-reuse'){
    const order=[...d.repositories].sort((a,b)=>a.physical_compression-b.physical_compression).map(r=>r.repository);
    host.innerHTML=graphKey([['dot',green,'One file starting point'],['ring',amber,'One named-code starting point']])+'<div class="figure-plot"></div>'+caption('1,248 retained starting-point executions across the 78 historical snapshots. Horizontal position = logical routes / actual relationship evaluations. This ratio measures avoided computation, not a wall-time speedup. Empty sets can create especially large reuse. Each point retains its source revision and starting name.');
    const el=host.querySelector('.figure-plot');watch(el,()=>el.replaceChildren(Plot.plot({width:Math.max(250,el.clientWidth),height:420,marginLeft:95,marginRight:18,style,x:{type:'log',domain:[.2,4000],ticks:[1,10,100,1000],tickFormat:n=>n+'×',label:'Routes per actual evaluation · logarithmic scale',grid:true},y:{domain:order,tickFormat:s=>s.split('/').pop(),label:null},marks:[Plot.dot(d.physical,{x:'logical_per_physical_evaluation',y:'repository',fill:r=>r.seed_domain==='file'?green:'#1a1015',stroke:r=>r.seed_domain==='file'?green:amber,fillOpacity:.35,strokeOpacity:.45,r:2.2,title:r=>`${r.repository} @ ${r.base_revision}\n${r.seed_identity}\n${r.logical_routes} routes / ${r.physical_transition_evaluations} evaluations = ${r.logical_per_physical_evaluation.toFixed(2)}×`})]})));
  }
  return ()=>{disposed=true;stop();observer?.disconnect();};
}
