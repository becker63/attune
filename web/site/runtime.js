import {mountWorkFigures} from './work.js';
import {mountCodeWalks} from './code-walks.js';
import * as Plot from './vendor/plot.js';
export async function runtimeView(main,isCurrent=()=>true){
 const [html,data,h]=await Promise.all([fetch('runtime.html').then(r=>r.text()),fetch('runtime.json').then(r=>r.json()),fetch('highlighted.json').then(r=>r.json())]);
 if(!isCurrent())return ()=>{};
 main.innerHTML='<article class="runtime-page">'+html+'</article>';
 window.scrollTo(0,0);
 mountCodeWalks(main,h);
 const workCleanup=await mountWorkFigures(main,isCurrent);if(!isCurrent()){workCleanup?.();return ()=>{};}
 const host=main.querySelector('#runtime-charts');
 host.innerHTML='<div class="figure-controls"><button data-requests-play>Replay the recorded requests</button><button data-requests-end>Show all</button><output>351 / 351 requests</output></div><div class="runtime-pair"><section><h3>Cold acquisition</h3><p>351 requests · 26.4 minutes summed latency</p><figure data-runtime="cold"></figure></section><section><h3>Warm replay</h3><p>0 requests · local wall time unmeasured</p><pre class="pattern-diagram">[same input identity]\n        |\n        v\n[saved vectors]\n        |\n        v\n[local ranking]\n\nNo provider request series exists.\nNothing was sent.</pre></section></div><p class="timing-note">Each dot is one retained request. Replay reveals requests in recorded order at a compressed presentation speed. It is not a timestamped end-to-end timeline.</p><h3>Where the waiting accumulates</h3><figure data-runtime="sum"></figure><p class="metadata">Source: acquisition-cold.json, acquisition-warm.json and attempts-cold.tsv in the retained attune-qwen-fixtures cache. Exact hashes: <a href="runtime.json">presentation data and provenance</a>.</p>';
 let sum=0;const points=data.attempts.map(r=>({...r,seconds:r.latency_ms/1000,minutes:(sum+=r.latency_ms)/60000}));
 let count=351,frame=0,playing=false;
 const draw=()=>{for(const kind of ['cold','sum']){const el=host.querySelector(`[data-runtime="${kind}"]`);el.replaceChildren(Plot.plot({width:Math.max(250,el.clientWidth),height:230,marginLeft:45,style:{background:'transparent',color:'#b9a5a7',fontFamily:'monospace'},x:{label:'Request order',domain:[1,351]},y:{label:kind==='cold'?'Request seconds':'Summed request minutes',grid:true,zero:true},marks:kind==='cold'?[Plot.dot(points.filter((p,i)=>i<count),{x:'attempt',y:'seconds',fill:'#dcb77e',r:2,title:d=>`Request ${d.attempt}: ${d.seconds}s, ${d.inputs} inputs`})]:[Plot.line(points.filter((p,i)=>i<count),{x:'attempt',y:'minutes',stroke:'#b0cfa4'}),Plot.dot(points.filter((p,i)=>i<count),{x:'attempt',y:'minutes',r:1.8,fill:'#b0cfa4',title:d=>`Through request ${d.attempt}: ${d.minutes.toFixed(4)} summed minutes. Request duration ${d.seconds.toFixed(3)} s; ${d.inputs} inputs. Not elapsed wall time.`})]}));}};
 const observer=new ResizeObserver(draw);observer.observe(host);draw();
 host.addEventListener('evidence-pause',stop);
 function stop(){cancelAnimationFrame(frame);playing=false;host.querySelector('[data-requests-play]').textContent='Replay the recorded requests';}
 function update(n){count=n;draw();host.querySelector('output').textContent=n+' / 351 requests · '+(n?points[n-1].minutes.toFixed(2):'0')+' summed minutes';}
 host.querySelector('[data-requests-play]').onclick=()=>{if(playing){stop();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){update(351);return;}playing=true;host.querySelector('[data-requests-play]').textContent='Pause replay';const start=performance.now(),from=count===351?0:count;function tick(now){update(Math.max(0,Math.min(351,Math.floor(from+(now-start)/20))));if(count<351)frame=requestAnimationFrame(tick);else stop();}frame=requestAnimationFrame(tick);};
 host.querySelector('[data-requests-end]').onclick=()=>{stop();update(351);};return ()=>{observer.disconnect();stop();workCleanup?.();};
}
