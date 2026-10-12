import * as Plot from './vendor/plot.js';
import {esc} from './evidence.js';
import {graphKey} from './chart-key.js';
import {mountAtlasFilter} from './atlas-filter.js';

const green='#a7c59c',amber='#d5ad75',muted='#a89499',ink='#efe4d6';
const style={background:'transparent',color:muted,fontFamily:'monospace',fontSize:11};
let dataPromise;
export const atlasData=()=>dataPromise??=fetch('atlas-story.json').then(r=>r.json());
const caption=s=>`<figcaption>${s} <a href="atlas-story.json" download>Exact records &amp; source hashes</a>.</figcaption>`;
const short=p=>p.replace('packages/cli/src/','').replace('packages/cli/test/','test/');

export async function mountAtlasFigure(host,kind,alive){
  const d=await atlasData();if(!alive())return ()=>{};
  if(kind==='atlas-filter')return mountAtlasFilter(host,d,alive);
  let frame=0,observer,disposed=false,playing=false;
  host.addEventListener('evidence-pause',stop);
 function stop(){cancelAnimationFrame(frame);playing=false;const b=host.querySelector('[data-atlas-play]');if(b)b.textContent=b.dataset.label;}
  function replay(draw,duration=5000){
    if(playing){stop();return;}stop();playing=true;
    const b=host.querySelector('[data-atlas-play]');b.textContent='Pause replay';const start=performance.now();
    function tick(now){if(disposed||!alive())return;const t=matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(now-start)/duration);draw(t);if(t<1)frame=requestAnimationFrame(tick);else stop();}
    draw(0);frame=requestAnimationFrame(tick);
  }
  const controls=label=>`<div class="figure-controls"><button data-atlas-play data-label="${label}">${label}</button><button data-atlas-end>Show all</button><span>Saved evidence · no query running</span></div>`;
  function watch(el,draw){const paint=()=>{if(!disposed&&alive())draw(Math.max(250,el.clientWidth));};observer=new ResizeObserver(paint);observer.observe(el);paint();}
  if(kind==='atlas-imports'){
    let count=22;
    host.innerHTML=graphKey([['line',green,'Imports · recorded source relationship'],['square',amber,'Named in Jev’s six-item preview'],['square',muted,'Counted, but not named in the preview']])+controls('Replay the 22 imports')+'<div class="atlas-import-map"></div><p class="atlas-readout" aria-live="polite"></p><pre class="atlas-fact-list">'+esc('resource-utils.js\n  defines 5 names\n    '+d.definitions.join('\n    ')+'\n  imports 1 file\n    '+short(d.imports[0]))+'</pre>'+caption('Greenwood #1100 · revision '+d.world.revision+'. All 22 incoming arrows are admitted Imports facts; ImportedBy reads them in reverse. The arrows describe code, not the order of an autonomous search. Source paths are shortened under packages/cli; full paths are available on each label and in the data.');
    const el=host.querySelector('.atlas-import-map');
    function show(){host.querySelectorAll('[data-consumer]').forEach(g=>g.style.opacity=Number(g.dataset.consumer)<count?'1':'.12');host.querySelector('.atlas-readout').textContent=`${count} / 22 importing files shown. The request names the first six and retains the total, 22.`;}
    watch(el,width=>{
      const mobile=width<450,font=mobile?10:11,labelWidth=width*(mobile?.76:.72),edgeStart=labelWidth+8,hub=width-12,maxChars=Math.floor(labelWidth/(font*.61));
      let y=85;const nodes=d.consumers.map((path,i)=>{
        let rest=short(path);const words=[];while(rest.length>maxChars){const slash=rest.lastIndexOf('/',maxChars-1),at=slash>0?slash+1:maxChars;words.push(rest.slice(0,at));rest=rest.slice(at);}words.push(rest);
        const height=Math.max(24,words.length*15+9),mid=y+words.length*7;
        const text=words.map((w,j)=>`<tspan x="0" dy="${j?15:0}">${esc(w)}</tspan>`).join('');
        const node=`<g data-consumer="${i}"><title>${esc(path)} imports ${esc(d.candidate.path)}</title><path d="M${edgeStart},${mid-3} H${hub} V39" stroke="${green}" stroke-opacity=".3" fill="none"/><text x="0" y="${y}" fill="${i<6?amber:muted}" font-size="${font}">${text}</text><text x="${edgeStart-5}" y="${mid+1}" fill="${green}" font-size="11">&gt;</text></g>`;y+=height;return node;
      });
      el.innerHTML=`<svg viewBox="0 0 ${width} ${y+4}" role="img" aria-label="22 actual importing files all point to resource-utils.js" style="font-family:monospace"><text x="${hub}" y="17" fill="${ink}" text-anchor="end" font-size="13">[resource-utils.js]</text><text x="${hub}" y="34" text-anchor="middle" fill="${green}" font-size="12">^</text><text x="0" y="55" fill="${muted}" font-size="10">IMPORTING FILE → SHARED DEPENDENCY</text>${nodes.join('')}</svg>`;show();
    });
    host.querySelector('[data-atlas-play]').onclick=()=>replay(t=>{count=Math.min(22,Math.floor(t*23));show();});host.querySelector('[data-atlas-end]').onclick=()=>{stop();count=22;show();};
  }
  if(kind==='atlas-answers'){
    host.innerHTML=controls('Replay facts → one saved answer')+'<div class="answer-derivation"><div data-answer-step="0"><small>INPUT · 22 different import facts</small><pre>'+esc('bundle.js  ------Imports------> resource-utils.js\ngraph.js   ------Imports------> resource-utils.js\nserve.js   ------Imports------> resource-utils.js\n… 19 more import facts')+'</pre></div><div data-answer-step="1"><small>QUESTION t7 · keep only the imported file</small><pre>'+esc('A ------Imports------> B\n                      [keep B]')+'</pre></div><div data-answer-step="2"><small>ANSWER · one distinct file</small><pre>resource-utils.js</pre><p>All 22 matches return the same name. Keep it once.</p></div><div data-answer-step="3"><small>SAVED TSV ROW · three columns</small><div class="saved-row"><span>t7<small>question</small></span><span>file:…/resource-utils.js<small>answer</small></span><span>file:…/resource-utils.js<small>storage padding</small></span></div></div></div>'+caption('The 22 imports and this exact t7 row are retained in world w49. t7 returns one item; the writer repeats it in a second storage column. This does not mean the helper imports itself. Abbreviated file names above; complete row in the data.');
    function show(n){host.querySelectorAll('[data-answer-step]').forEach(e=>e.style.opacity=Number(e.dataset.answerStep)<=n?'1':'.12');}
    host.querySelector('[data-atlas-play]').onclick=()=>replay(t=>show(Math.min(3,Math.floor(t*4))));host.querySelector('[data-atlas-end]').onclick=()=>{stop();show(3);};show(3);
  }
  if(kind==='atlas-context'){
    const added=d.requests.QS.slice(d.requests.Q.length+1);
    host.innerHTML=controls('Replay candidate → added context')+'<ol class="context-steps"><li data-context-step="0"><h4>Start with Qwen’s candidate 28</h4><pre>'+esc(d.requests.Q)+'</pre></li><li data-context-step="1"><h4>Use its defined names to find saved matches</h4><pre class="context-lookup">'+esc('resource-utils.js\n  --Defines--> checkResourceExists\n                    |\n                    v\n  saved answer: t1, checkResourceExists\n                    |\n                    v\n  keep the question ID: t1')+'</pre><p>The Java helper repeats this lookup for all five names, combines the IDs, and prints a short preview. It does not send the Datalog rules or their full answers.</p></li><li data-context-step="2"><h4>Add this exact text to the question</h4><pre class="context-receipt">'+esc(added)+'</pre></li><li data-context-step="3"><h4>Ask the same model about the same file</h4><div class="context-verdict"><span>Without the added context<br><strong>Unknown</strong> · rank 28</span><span>With the added context<br><strong>Relevant</strong> · rank 10</span></div></li></ol>'+caption('Exact c28 instructions and decisions from the Q and QS request receipts. The issue is supplied separately in the request state. The context writer limits each relationship list to six names, the pattern preview to eight IDs, and structural text to 600 characters. <a href="sources/atlas-lookup.java" download>Actual Java lookup</a>.');
    function show(n){host.querySelectorAll('[data-context-step]').forEach(e=>{e.style.opacity=Number(e.dataset.contextStep)<=n?'1':'.12';});host.dataset.contextStage=String(n);}
    host.querySelector('[data-atlas-play]').onclick=()=>replay(t=>show(Math.min(3,Math.floor(t*4))),6500);host.querySelector('[data-atlas-end]').onclick=()=>{stop();show(3);};show(3);
  }
  if(kind==='atlas-ranks'){
    let at=2,width=700;const stages=['Q','QJ','QS'],points=d.shortlist.flatMap(c=>stages.map((arm,i)=>({path:c.path,stage:i,rank:c[arm],featured:c.path===d.candidate.path})));
    host.innerHTML=graphKey([['line',amber,'resource-utils.js · 28 → 28 → 10'],['line','#5f4652','The other 31 shortlisted files'],['dash',muted,'Top-ten cutoff']])+controls('Replay the saved rankings')+'<div class="figure-plot"></div>'+caption('One line per actual shortlisted file; grey lines preserve the surrounding ranks. Q = Qwen. QJ = Qwen + Jev. QS = Qwen + Atlas context + Jev. Jev with context puts all eight eligible fixing files in the top ten in this case. This comparison does not identify which fact or pattern ID caused the change.');
    const el=host.querySelector('.figure-plot');
    function draw(){const visible=points.filter(r=>r.stage<=at),helper=visible.filter(r=>r.featured);el.replaceChildren(Plot.plot({width,height:330,marginLeft:36,marginRight:35,style,x:{domain:[-.1,2.1],ticks:[0,1,2],tickFormat:i=>stages[i],label:null},y:{domain:[33,0],ticks:[1,10,20,28,32],label:'Rank · up is better',grid:true},marks:[Plot.ruleY([10],{stroke:muted,strokeDasharray:'3 4'}),Plot.line(visible,{x:'stage',y:'rank',z:'path',stroke:r=>r.featured?amber:'#5f4652',strokeOpacity:r=>r.featured?1:.55,strokeWidth:r=>r.featured?2:1}),Plot.dot(visible,{x:'stage',y:'rank',fill:r=>r.featured?amber:'#5f4652',r:r=>r.featured?4:1.8,title:r=>r.path+' · '+stages[r.stage]+' rank '+r.rank}),Plot.text(helper,{x:'stage',y:'rank',text:r=>String(r.rank),fill:amber,dy:-14})]}));}
    watch(el,w=>{width=w;draw();});host.querySelector('[data-atlas-play]').onclick=()=>replay(t=>{const n=Math.min(2,Math.floor(t*3));if(n!==at){at=n;draw();}},3600);host.querySelector('[data-atlas-end]').onclick=()=>{stop();at=2;draw();};
  }
  if(kind==='atlas-row-counts'){
    const rows=[{kind:'One returned item',n:d.totals.one_answer,color:green},{kind:'Two returned items',n:d.totals.two_answers,color:amber}];
    host.innerHTML=graphKey([['square',green,'66 questions return one item'],['square',amber,'6 questions return two items']])+'<div class="figure-plot"></div><p class="atlas-readout">1,406,061 distinct saved rows. 79% contain one returned item, repeated in the second storage column.</p>'+caption('Audit of every retained witness TSV in the 81 eligible source snapshots. Counts are distinct saved rows, not all internal matches, unique files, or confirmed architectures. Items can be files or symbols. Snapshots belong to 22 repository groups.');
    const el=host.querySelector('.figure-plot');watch(el,width=>el.replaceChildren(Plot.plot({width,height:170,marginLeft:width<450?95:135,marginRight:12,style,x:{domain:[0,1200000],ticks:[0,300000,600000,900000,1200000],tickFormat:n=>n===0?'0':n/1e6+'m',label:'Distinct saved answers',grid:true},y:{domain:rows.map(r=>r.kind),tickFormat:s=>width<450?s.replace(' returned',''):s,label:null},marks:[Plot.barX(rows,{x:'n',y:'kind',fill:'color',title:r=>`${r.kind}: ${r.n.toLocaleString()} distinct saved output rows.\n81 worlds / 22 repository groups / 72 evaluated descriptors.\nCounted within descriptor/world pairs; not internal bindings or independent architectures.`,insetTop:13,insetBottom:13}),Plot.text(rows,{x:'n',y:'kind',text:r=>r.n.toLocaleString('en-US'),textAnchor:'end',dx:-6,fill:'#1a1015',fontWeight:600})]})));
  }
  return ()=>{disposed=true;stop();observer?.disconnect();};
}
