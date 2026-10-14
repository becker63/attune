import {esc} from './evidence.js';
import {graphKey} from './chart-key.js';
const ink='#efe4d6',muted='#a89499',amber='#d5ad75',pink='#ce879b',green='#a7c59c';
const duration=s=>s<60?s.toFixed(1)+' s':Math.floor(s/60)+'m '+Math.round(s%60)+'s';

export async function mountGritDistribution(host,alive){
  const d=await fetch('grit-timings.json').then(r=>r.json());if(!alive())return ()=>{};
  const s=d.stats;let width=700,threshold=s.max,frame=0,playing=false,disposed=false;
  host.innerHTML=graphKey([['dot',green,'One recorded process'],['dot',pink,'Beyond the upper whisker'],['line',ink,'Median: half finish on each side'],['diamond',amber,'Mean: total process time ÷ 90']])+
    `<p class="grit-summary">Median <strong>${duration(s.median)}</strong> · mean <strong>${duration(s.mean)}</strong> · longest <strong>${duration(s.max)}</strong></p>`+
    '<div class="figure-controls"><button data-grit-play>Replay the duration threshold</button><button data-grit-end>Show all</button></div><div class="grit-distribution-plot"></div><p class="grit-distribution-readout" aria-live="polite"></p>'+
    `<p class="figure-key">Box = the middle half of recorded durations. The line inside is the median; the diamond is the mean. Whiskers reach the most extreme observed values within 1.5 box-widths of the box. ${s.outliers} points lie beyond the upper whisker.</p>`+
    '<figcaption>90 recorded remote process intervals, each counted once. Upper panel: all durations. Lower panel: the same measurements enlarged to ten minutes. Vertical dot offsets only separate marks. Two actions, w41 and w84, have no recorded process interval and are excluded, not plotted at zero. Replay is a duration threshold, not a concurrent run. <a href="grit-timings.json" download>All points, quantile rule and source hashes</a>.</figcaption>';
  const el=host.querySelector('.grit-distribution-plot');
  host.addEventListener('evidence-pause',stop);
 function stop(){cancelAnimationFrame(frame);playing=false;host.querySelector('[data-grit-play]').textContent='Replay the duration threshold';}
  function draw(){
    const left=15,right=width-20;
    const text=(x,y,body,color=muted,anchor='start',size=11)=>`<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-size="${size}">${esc(body)}</text>`;
    const panel=(origin,max,title,ticks)=>{
      const x=t=>left+(right-left)*t/max,boxY=origin+118,axisY=origin+151;
      let svg=text(left,origin+13,title,ink);
      for(const t of ticks)svg+=`<line x1="${x(t)}" x2="${x(t)}" y1="${origin+32}" y2="${axisY}" stroke="#48303b" stroke-opacity=".5"/>`+text(x(t),axisY+18,t===0?'0':t/60+'m',muted,t===0?'start':t===max?'end':'middle');
      for(const [i,r] of d.rows.entries())if(r.seconds<=max){
        const fill=r.outlier?pink:green;
        svg+=`<circle data-grit-point="${r.world}" cx="${x(r.seconds)}" cy="${origin+52+(i%8)*5}" r="2.7" fill="${fill}" opacity="${r.seconds<=threshold?1:.12}"><title>${esc(r.world+' · '+(r.repository||'repository unknown')+' · '+r.seconds.toFixed(3)+' seconds'+(r.outlier?' · upper-tail outlier':''))}</title></circle>`;
      }
      svg+=`<line x1="${x(s.lower_whisker)}" x2="${x(s.upper_whisker)}" y1="${boxY}" y2="${boxY}" stroke="${muted}"/>`;
      for(const v of [s.lower_whisker,s.upper_whisker])svg+=`<path d="M${x(v)} ${boxY-6}v12" stroke="${muted}"/>`;
      svg+=`<rect x="${x(s.q1)}" y="${boxY-11}" width="${x(s.q3)-x(s.q1)}" height="22" fill="#243023" stroke="${green}"/><path d="M${x(s.median)} ${boxY-11}v22" stroke="${ink}" stroke-width="2"/><path d="M${x(s.mean)} ${boxY-6}l6 6 -6 6 -6 -6Z" fill="${amber}"><title>Mean ${s.mean.toFixed(3)} seconds</title></path>`;
      if(threshold<max)svg+=`<line x1="${x(threshold)}" x2="${x(threshold)}" y1="${origin+32}" y2="${axisY}" stroke="${amber}" stroke-dasharray="2 4"/>`;
      if(max>600){const r=d.rows.at(-1);svg+=text(x(r.seconds),origin+36,`${r.world} · ${duration(r.seconds)}`,pink,'end');}
      else svg+=text(right,origin+35,`${d.rows.filter(r=>r.seconds>max).length} longer intervals off this scale →`,muted,'end',10);
      return svg;
    };
    el.innerHTML=`<svg viewBox="0 0 ${width} 397" role="img" aria-label="90 measured extraction processes. Median 93.8 seconds, mean 344.6 seconds, maximum 2548.7 seconds. 11 upper outliers; two missing process intervals are excluded." style="font-family:monospace">${panel(0,2700,'All 90 intervals · 0–45 minutes',[0,600,1200,1800,2400,2700])}${panel(211,600,'Enlarge the first ten minutes',[0,120,240,360,480,600])}</svg>`;
    host.querySelector('.grit-distribution-readout').textContent=`${d.rows.filter(r=>r.seconds<=threshold).length}/90 took no longer than ${duration(threshold)}. The mean is ${(s.mean/s.median).toFixed(1)}× the median; the longest interval is ${(s.max/s.median).toFixed(1)}× the median.`;
    host.dataset.gritCount=String(d.rows.length);host.dataset.gritOutliers=String(s.outliers);
  }
  const observer=new ResizeObserver(()=>{if(!disposed&&alive()){width=Math.max(260,el.clientWidth);draw();}});observer.observe(el);width=Math.max(260,el.clientWidth);draw();
  host.querySelector('[data-grit-play]').onclick=()=>{if(playing){stop();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){threshold=s.max;draw();return;}playing=true;host.querySelector('[data-grit-play]').textContent='Pause replay';const start=performance.now();function tick(now){if(disposed||!alive())return;const t=Math.min(1,(now-start)/6000);threshold=t*s.max;draw();if(t<1)frame=requestAnimationFrame(tick);else stop();}frame=requestAnimationFrame(tick);};
  host.querySelector('[data-grit-end]').onclick=()=>{stop();threshold=s.max;draw();};
  return ()=>{disposed=true;stop();observer.disconnect();};
}
