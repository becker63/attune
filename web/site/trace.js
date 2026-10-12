import {mountCodeWalks} from './code-walks.js';
import * as Plot from './vendor/plot.js';
import {esc} from './evidence.js';
import {mountInlineGraphs} from './inline-graphs.js';
export async function traceView(main,isCurrent=()=>true){
 const [html,d,relationships,h]=await Promise.all([fetch('trace.html').then(r=>r.text()),fetch('live-trace.json').then(r=>r.json()),fetch('relationships.json').then(r=>r.json()),fetch('highlighted.json').then(r=>r.json())]);
 if(!isCurrent())return ()=>{};
 const rankList=(rows,key)=>'<ol class="trace-ranks">'+rows.slice(0,10).map(r=>`<li><code>${esc(r.path)}</code>${key?`<span class="metadata">${r.score.toFixed(2)}</span>`:''}</li>`).join('')+'</ol>';
 const bm=d.bm25[0];
 const success=d.timing.events.filter(e=>e.exit_code===undefined||e.exit_code===0);
 const selected=['BM25 index','BM25 search','Qwen acquisition','Flix Qwen ranking','Atlas metadata assembly','Jev judgments'].map(name=>success.findLast(e=>e.name===name)).filter(Boolean);
 const elapsed=e=>(e.end_ms-e.start_ms)/1000;
 const rankRows=()=>d.gold.map(g=>`<tr><td><code>${esc(g.path)}</code></td><td>${g.BM25}${g.BM25>10?' · missed':''}</td><td>${g.Q}${g.Q>10?' · missed':''}</td><td>Unavailable</td></tr>`).join('');
 const slots={
 TraceIdentity:`<p class="metadata">Greenwood #1100 · ${esc(d.revision)}<br>Recorded ${esc(d.timing.started)} · <a href="live-trace.json" download>Trace data &amp; hashes</a></p>`,
 TraceIssue:`<blockquote>${esc(d.query.split('\n')[0])}</blockquote>`,
 TraceRanks:`<div class="runtime-pair"><section><h3>BM25 · actual top ten</h3>${rankList(d.bm25,true)}</section><section><h3>Qwen · fresh top ten</h3>${rankList(d.qwen,false)}</section></div>`,
 TraceMechanics:`<div class="runtime-pair"><section><h3>Words explain a score</h3><p><code>${esc(bm.path)}</code></p><table><thead><tr><th>Term</th><th>In file</th><th>Files</th><th>Contribution</th></tr></thead><tbody>${bm.terms.map(t=>`<tr><td>${esc(t.term)}</td><td>${t.tf}</td><td>${t.df}/393</td><td>${t.score.toFixed(2)}</td></tr>`).join('')}</tbody></table><p class="metadata">Eight largest term contributions; other matching terms also contribute to the score.</p></section><section><h3>Facts explain a connection</h3><figure class="inline-graph" data-mini="calls"></figure><p>The returned helper is BM25 rank <strong>${d.helper.BM25}</strong> and fresh Qwen rank <strong>${d.helper.Q}</strong>. Reachable does not mean relevant.</p></section></div>`,
 TraceQuestion:`<pre class="prepared-question">${esc(d.requests.QS.questions.c1.instructions.replaceAll('\\n','\n'))}</pre><p class="metadata">Exact fresh QS question c1. Template IDs are retained matches, not newly inferred semantic classifications.</p>`,
 TraceJudgment:`<p class="trace-status"><strong>Jev: not run.</strong> The configured OPENROUTER_JEV_KEY is unavailable. No fresh QJ or QS ranking is shown. The prepared request is real; a judgment has not been obtained.</p>`,
 TraceTiming:`<figure id="trace-duration"></figure><table><thead><tr><th>Executed stage</th><th>Measured wall time</th></tr></thead><tbody>${selected.map(e=>`<tr><td>${esc(e.name)}</td><td>${elapsed(e).toFixed(3)} s</td></tr>`).join('')}</tbody></table><p>${d.acquisition.requests} fresh embedding requests · ${d.acquisition.unique_inputs} distinct inputs · $${d.acquisition.cost_usd.toFixed(8)} reported acquisition cost.</p><figure id="trace-requests"></figure><p class="metadata">Actual request-duration sequence; the SDK trace has no per-request start timestamps. This is not a provider compute-only measurement.</p>`,
 TraceReveal:`<button id="trace-reveal" aria-expanded="false">Reveal historical fixing files</button><div id="trace-gold" hidden><p>Top-ten recovery: BM25 ${d.gold.filter(g=>g.BM25<=10).length}/8; fresh Qwen ${d.gold.filter(g=>g.Q<=10).length}/8. Neither recovers all eight. Jev remains unmeasured.</p><div class="table-scroll"><table><thead><tr><th>Eligible fixing path</th><th>BM25</th><th>Fresh Q</th><th>Fresh QS</th></tr></thead><tbody>${rankRows()}</tbody></table></div><p>The helper's historical Q rank was 28; the fresh run ranks it 24. Model identity alone does not guarantee identical vectors or ranks across hosted runs.</p></div>`
 };
 main.innerHTML='<article class="trace-page">'+html.replace(/<!--(Trace\w+)-->/g,(_,name)=>slots[name]||'')+'</article>';
 window.scrollTo(0,0);
 main.querySelector('#trace-reveal').onclick=e=>{const shown=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!shown));e.currentTarget.textContent=shown?'Reveal historical fixing files':'Hide historical fixing files';main.querySelector('#trace-gold').hidden=shown;};
 mountCodeWalks(main,h);
 const disposeGraphs=mountInlineGraphs(main,{id:d.task,repository:'ProjectEvergreen/greenwood',revision:d.revision,world:'recorded Greenwood source'},{paths:[]},relationships[d.task]);
 const draw=()=>{
 const style={background:'transparent',color:'#b9a5a7',fontFamily:'monospace'};
 const el=main.querySelector('#trace-duration');const points=selected.map(e=>({name:e.name,seconds:elapsed(e),start:e.start_ms,end:e.end_ms}));
 el.replaceChildren(Plot.plot({width:Math.max(280,el.clientWidth),height:230,marginLeft:160,marginRight:40,style,x:{label:'Stage wall seconds (linear scale)',domain:[0,Math.max(...points.map(p=>p.seconds))*1.08],grid:true},y:{label:null,domain:points.map(p=>p.name)},marks:[Plot.ruleY(points,{y:'name',x1:0,x2:'seconds',stroke:d=>d.name.startsWith('BM25')?'#b0cfa4':'#dcb77e',strokeWidth:7,title:r=>`${r.name}: ${r.seconds.toFixed(3)} seconds wall time.\nStart ${new Date(r.start).toISOString()}\nEnd ${new Date(r.end).toISOString()}\nRecorded ${d.timing.started}; stage timer, not provider latency.\nJev was not executed in this recording.`}),Plot.dot(points,{y:'name',x:'seconds',r:2,fill:'#f1e9d9',title:r=>`${r.name} · ${r.seconds.toFixed(3)} seconds elapsed; recorded stage timer.`})]}));
 const rq=main.querySelector('#trace-requests');rq.replaceChildren(Plot.plot({width:Math.max(280,rq.clientWidth),height:200,marginLeft:42,style,x:{label:'Fresh Qwen request order',ticks:d.attempts.length},y:{label:'Request seconds',zero:true,grid:true},marks:[Plot.line(d.attempts,{x:'attempt',y:r=>r.latency_ms/1000,stroke:'#dcb77e'}),Plot.dot(d.attempts,{x:'attempt',y:r=>r.latency_ms/1000,fill:'#dcb77e',title:r=>`Recorded Qwen request ${r.attempt}: ${r.latency_ms} ms\n${r.inputs} inputs. Provider request duration, not GPU compute time.\nPer-request start/end timestamps unavailable. Run ${d.timing.started}.`})]}));
 };
 const observer=new ResizeObserver(draw);observer.observe(main.querySelector('.trace-page'));draw();
 return ()=>{observer.disconnect();disposeGraphs();};
}
