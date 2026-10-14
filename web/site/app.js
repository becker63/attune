import './tooltips.js';
import {discoveryView} from './discovery.js';
import {mountCodeWalks} from './code-walks.js';
import {traceView} from './trace.js';
import {runtimeView} from './runtime.js';
import { mountInlineGraphs } from './inline-graphs.js';
import { atlasLesson } from './atlas-lesson.js';
import { connectionStory } from './connection-story.js';
import { sourceEvidence, connections, theorySection, provenance, patternNames } from './evidence.js';
import { mountDistribution } from './distribution.js';
import { mountStory } from './theory-story.js';
import { mountGraph } from './step-graph.js';
const main = document.querySelector('#main');
const arms = ['Q', 'QJ', 'QS'];
const names = { Q: 'Qwen', QJ: 'Qwen + Jev', QS: 'Qwen + Atlas + Jev' };
const status = { '#': ['complete', 'all required files'], '+': ['partial', 'some required files'], '.': ['miss', 'no required files'] };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const cards = {
  greenwood: {
    id:'projectevergreen__greenwood-1100', label:'Greenwood #1100', title:'Five build files import the same resource helper.',
    text:'The bundling stage is already Qwen’s first result. Its shared resource utility is much farther down the list. With structural metadata, Jev marks that utility Relevant and promotes it into the top ten.',
    readout:'resource-utils.js\nQ 28  →  QJ 28  →  QS 10',
    takeaway:'All eight eligible required files are recovered at top 10 under QS. Q and QJ both remain incomplete.',
    diagram:[
      '  packages/cli/src/', '',
      '  lifecycles/bundle.js -----+',
      '                            |',
      '  lifecycles/compile.js ----+',
      '                            |',
      '  lifecycles/graph.js ------+------> lib/resource-utils.js',
      '                            |',
      '  lifecycles/prerender.js --+',
      '                            |',
      '  commands/build.js --------+', '',
      '              Imports / File -> File', '',
      '  utility rank     Q        QJ        QS',
      '                  28        28        10',
      '  complete @10     +         +         #',
    ].join('\n'),
    source:'Admitted Imports in w49. Five real consumers shown; this is a selected neighborhood, not every importer.',
    note:'The structural condition supplied metadata to Jev. The study does not identify a causal winning operator; these lines are evidence, not an animated search.'
  },
  obsidian: {
    id:'obsidian-tasks-group__obsidian-tasks-1006', label:'Obsidian Tasks #1006', title:'Task.ts is first, but two field files drop out of the top ten.',
    text:'A refactor spans task handling and several field implementations. Task.ts reaches rank one, while two required fields lose their top-ten positions under the structural condition.',
    readout:'DescriptionField.ts  QJ 4 → QS 24\nTextField.ts         QJ 6 → QS 28',
    takeaway:'Task.ts is rank 1 in both QJ and QS. Neither arm recovers all eight required files at top 10.',
    diagram:[
      '  src/Query/Filter/', '',
      '  DescriptionField.ts ------> TextField.ts',
      '          |                        |',
      '          +------> Task.ts <-------+',
      '                   QJ / QS',
      '                    1 / 1', '',
      '  required field          QJ         QS',
      '  DescriptionField.ts      4         24  outside',
      '  TextField.ts             6         28  outside', '',
      '  complete @10             +          +',
    ].join('\n'),
    source:'Admitted Imports in w34. Task.ts is src/Task.ts; the two field files are in src/Query/Filter/.',
    note:'Both field judgments change from Relevant to NotRelevant. A successful first result does not mean the full change has been localized.'
  },
  got: {
    id:'sindresorhus__got-2043', label:'Got #2043', title:'The code imports .js; the file on disk ends in .ts.',
    text:'The TypeScript request implementation imports “./response.js”. The retained target is response.ts. This suffix boundary leaves the source dependency out of Atlas’s admitted Imports relation.',
    readout:'response.ts      Q 1 → QJ 1\ncore/index.ts    Q 6 → QJ 2',
    takeaway:'Both eligible files are already in Qwen’s top ten. Jev moves the request implementation to rank 2; QS keeps the same ranks.',
    diagram:[
      '  source/core/', '',
      '  index.ts .................> response.ts',
      '             source import', '',
      '        written:  "./response.js"',
      '        present:  response.ts',
      '                  ^',
      '             suffix boundary', '',
      '  admitted Imports relation: absent', '',
      '  gold ranks       Q        QJ        QS',
      '  response.ts      1         1         1',
      '  index.ts         6         2         2',
    ].join('\n'),
    source:'Source-confirmed import: source/core/index.ts:24, w72. No admitted import edge is drawn.',
    note:'Missing is not unresolved: this edge is confirmed in source and absent from the admitted relation. Learned retrieval succeeds despite that visibility limit.'
  }
};
const smallDiagram=t=>t.id===cards.greenwood.id?[
 'bundle.js -------+', 'compile.js ------+', 'graph.js --------+--> resource-utils.js', 'prerender.js ----+', 'build.js --------+', '', 'Five files import the same helper.'
].join('\n'):t.id===cards.obsidian.id?[
 'DescriptionField.ts --> TextField.ts', '        |                    |', '        +----> Task.ts <------+', '', 'All three arrows are recorded imports.'
].join('\n'):t.id===cards.got.id?[
 'index.ts ......> response.ts', '', 'Written import: "./response.js"', 'Source-confirmed; no admitted Imports edge.'
].join('\n'):'';
let tasks, fixes, highlighted, relationships, caseLayout, chapters, mechanisms, context, evidenceLoading, selected=null, arm='Q', disposeGraph, disposeInline, disposeDistribution, caseSlots, chapter='start', resultArm='QS', routeSerial=0, fieldScroll=0, mechanismCase='projectevergreen__greenwood-1100';
const stages=['start','connections','source','results','theory'];
const stageNames=['Find a starting file','Follow connections','Read the code','Compare results','Why this stays small'];
const taskById=id=>tasks.find(t=>t.id===id);
function peerOverview() {
 return `<section class="peer-overview"><h2>Take one case apart.</h2><div class="guided-links">${Object.entries(cards).map(([key,c])=>`<a href="#case/${c.id}/start"><strong>${escape(c.label)}</strong><span>${key==='greenwood'?'A shared helper enters the top ten.':key==='obsidian'?'Rank one conceals missing files.':'Retrieval works without an import edge.'}</span>Read the case →</a>`).join('')}</div><p><a class="peer-link" href="#patterns">Compare the 12 source-confirmed patterns across repositories →</a></p></section>`;
}
function patternsView(pattern) {
 const valid=Object.keys(patternNames).includes(pattern), counts=Object.keys(patternNames).map(p=>({pattern:p,repos:new Set(tasks.filter(t=>t.patterns.includes(p)).map(t=>t.repository)).size})).sort((a,b)=>b.repos-a.repos||a.pattern.localeCompare(b.pattern));
 const matches=valid?tasks.filter(t=>t.patterns.includes(pattern)):[];
 main.innerHTML=`<section class="patterns-page discovery-page"><p class="source-link"><a href="#patterns">← Patterns and repository signatures</a></p><h1>${valid?escape(patternNames[pattern]):'Different repositories reuse small ideas.'}</h1><p class="intro">28 issues were inspected in source. These counts describe confirmed examples, not how common a pattern is in all code. The other 57 issues remain unclassified.</p><div class="pattern-navigation">${counts.map(p=>`<a href="#patterns/${p.pattern}" aria-current="${pattern===p.pattern?'page':'false'}">${escape(patternNames[p.pattern])}<span>${p.repos} repositories</span></a>`).join('')}</div>${valid?`<h2>${matches.length} inspected issues across ${new Set(matches.map(t=>t.repository)).size} repositories</h2><div class="pattern-cases">${matches.map(t=>{const a=fixes[t.id].annotations.find(a=>a.pattern===pattern);return `<article><h3><a href="#case/${t.id}/source">${escape(t.group)} #${t.number} →</a></h3><p>${escape(a.role)}</p><pre class="pattern-diagram">${escape(a.paths.split(';').join('\n'))}</pre><p class="metadata">Participating source files, not inferred arrows.</p><p>Fixing files in top 10: ${arms.map(x=>`${x} ${count(fixes[t.id],x)}/${t.required}`).join(' · ')}</p><a class="peer-link" href="#case/${t.id}/source">Read the code and its recorded connections →</a></article>`;}).join('')}</div>`:'<p>Choose a pattern to compare its actual source examples and localization results. The issue field is not filtered or rearranged.</p>'}</section>`;
}
const armButtons=()=>`<div class="arms" aria-label="Choose the result shown in the field">${arms.map(a=>`<button data-arm="${a}" aria-pressed="${a===arm}">${names[a]}</button>`).join('')}</div>`;
async function loadEvidence() {
  if(!evidenceLoading) evidenceLoading=Promise.all(['fixes.json','highlighted.json','relationships.json','case-layout.html','chapters.json','mechanisms.json'].map(async file=>{const r=await fetch(file);if(!r.ok)throw Error(file);return file.endsWith('.html')?r.text():r.json();})).then(([f,h,r,l,c,m])=>{fixes=f;highlighted=h;relationships=r;caseLayout=l;chapters=c;mechanisms=m;}).catch(e=>{evidenceLoading=null;throw e;});
  return evidenceLoading;
}
function summary() {
  return ['#','+','.'].map(g=>`${tasks.filter(t=>t.outcomes[arm]===g).length} ${g==='#'?'all files found':g==='+'?'some found':'none found'}`).join(' / ');
}
function field() {
  const groups=[...new Set(tasks.map(t=>t.repository))].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
  main.innerHTML=`<section id="distribution-section"></section><section id="field-section"><h1>A relevant file is not the whole fix.</h1>
    <p class="intro">85 historical issues. Each mark answers: did the first ten suggestions include none, some, or all required files?<br>The small number is the historical issue ID, not a rank. Select a mark to read the case.</p>
    <div class="toolbar">${armButtons()}<span class="arm-note">Q = original order. QJ and QS separately judge its first 32 files; QS includes Atlas clues.</span></div>
    <div class="legend"><span><b class="complete">#</b>All fixing files in top 10</span><span><b class="partial">+</b>Some in top 10</span><span><b class="miss">.</b>None in top 10</span></div>
    <div class="field" aria-label="85 issues grouped by repository">${groups.map(repo=>`<div class="repo"><span class="repo-name" title="${escape(repo)}">${escape(repo.split('/')[1])}</span><div class="glyphs">${tasks.filter(t=>t.repository===repo).map(t=>`<button class="glyph ${status[t.outcomes[arm]][0]}" data-task="${t.id}" title="${escape(t.repository)} #${t.number} · ${escape(t.title)}&#10;${escape(names[arm])}: ${status[t.outcomes[arm]][1]} in the first ten.&#10;${t.required} eligible required files; ${t.candidates} candidates. Historical replay, not a new invocation." aria-label="${escape(repo)} issue ${t.number}: ${status[t.outcomes[arm]][1]} at top 10"><span>${t.outcomes[arm]}</span><small>${t.number}</small></button>`).join('')}</div></div>`).join('')}</div>
    <p id="field-hint">Select a mark to open its source and recorded results.</p>
    <div class="field-bottom"><span id="field-summary" aria-live="polite">${summary()}</span><button data-copy="field">Copy field</button></div>
    ${peerOverview()}</section><section id="case-panel" aria-label="Selected issue"></section>`;
  disposeDistribution=mountDistribution(document.querySelector("#distribution-section"),tasks,context);
}
function updateField(old=arm) {
  main.querySelectorAll('[data-arm]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.arm===arm));
  main.querySelectorAll('button[data-task]').forEach(b=>{
    const t=taskById(b.dataset.task),g=t.outcomes[arm];
    b.querySelector('span').textContent=g;
    b.className=`glyph ${status[g][0]} ${selected===t.id?'selected':''} ${t.outcomes[old]!==g?'changed':''}`;
    b.setAttribute('aria-pressed',String(selected===t.id));
    b.setAttribute('title',`${t.repository} #${t.number} · ${t.title}\n${names[arm]}: ${status[g][1]} in the first ten.\n${t.required} required files; ${t.candidates} candidates. Historical replay.`);
    b.setAttribute('aria-label',`${t.repository} issue ${t.number}: ${status[g][1]} at top 10`);
  });
  document.querySelector('#field-summary').textContent=summary();
}
const count=(f,a)=>f.paths.filter(g=>g.ranks[a]<=10).length;
const judgment=v=>({Relevant:'Relevant',NotRelevant:'Not relevant',Unknown:'Unknown'}[v] || 'Not recorded');
function caseView() {
  const t=taskById(selected),f=fixes[t.id],featured=Object.values(cards).find(c=>c.id===t.id);
  const panel=document.querySelector('#case-panel');
  disposeGraph?.();disposeGraph=null;
  panel.dataset.task=t.id;
  const slots={
    CaseHeader:`<div class="case-bar"><a href="#field">← All issues</a><span>${escape(t.group)} #${t.number}</span><div><button data-step="-1" aria-label="Previous issue">← issue</button><button data-step="1" aria-label="Next issue">issue →</button></div></div>
      <div class="case-heading"><h2 id="case-title" tabindex="-1">${escape(t.title)}</h2><p class="metadata">${t.candidates} candidate files · ${t.required} required files · ${t.inspected?'Source inspected':'Not inspected'}</p><p class="metadata source-identity">${escape(t.repository)} · ${t.world} · ${t.revision}</p></div>`,
    Graph:`<section id="graph-section"><h3 id="graph-stage-title">A fixed map, one question at a time</h3><p id="graph-stage-explanation" class="muted"></p><div id="step-graph"></div></section>`,
    CaseExplanation:featured?`<div class="case-explanation"><h3>${escape(featured.title)}</h3><p>${escape(featured.takeaway)}</p><pre class="pattern-diagram">${escape(smallDiagram(t))}</pre><p class="metadata">${escape(featured.source)} ${escape(featured.note)}</p></div>`:'',
    FixFiles:`<section id="files-section"><h3>Files changed by the fix</h3><p class="muted">Rank 1 is first; rank 28 has 27 files before it. Positions 1–10 count as recovered. Larger numbers mean missed at this cutoff, even when the file exists farther down the list. QJ and QS separately reorder the original Q ranking.</p>
      <div class="table-scroll"><table class="fix-table"><thead><tr><th>File</th>${arms.map(a=>`<th>${a}</th>`).join('')}</tr></thead><tbody>${f.paths.map(g=>`<tr><td><button class="file-link" data-file="${escape(g.path)}">${escape(g.path)}</button><span class="status">Jev: ${judgment(f.decisions.QJ[g.path])} → ${judgment(f.decisions.QS[g.path])}</span></td>${arms.map(a=>`<td class="rank ${g.ranks[a]<=10?'complete':'miss'}">${g.ranks[a]}<span class="status">${g.ranks[a]<=10?'found':'missed'}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="metadata">The benchmark counts existing source files changed by the fix. Tests and new files are excluded. Model judgments and rank changes are observations, not explanations of the model’s reasoning.</p></section>`,
    SourceCode:sourceEvidence(t,f,highlighted,tasks),
    Theory:theorySection(t,f,highlighted),
    Predictions:`<section id="predictions-section" class="case-section"><h2>The first ten predictions</h2><p>Green paths were changed by the historical fix. These are the actual saved lists.</p><div class="prediction-columns">${arms.map(a=>`<section><h3>${names[a]}</h3><ol class="predictions">${(t.predictions[a]||[]).map(p=>`<li class="${f.paths.some(g=>g.path===p)?'complete':''}">${escape(p)}</li>`).join('')}</ol></section>`).join('')}</div></section>`,
    Provenance:provenance(f)+`<p class="back-link"><a href="#field">↑ Choose another issue from the field</a></p>`
  };
  caseSlots=slots;
  slots.JourneyNav=`<nav class="journey-tabs" aria-label="Case steps">${stages.map((s,i)=>`<a href="#case/${t.id}/${s}" data-stage="${s}"><span>${i+1}</span> ${stageNames[i]}</a>`).join('')}</nav>`;
  slots.Recovery=`<div class="recovery-chart"><h3>Fixing files recovered at top 10</h3>${arms.map(a=>`<div data-recovery="${a}"><span>${a}</span><progress max="${t.required}" value="${count(f,a)}"></progress><span>${count(f,a)} / ${t.required}</span></div>`).join('')}<p class="metadata">Same historical issue, three saved runs. QS includes Jev.</p></div>`;
  slots.StageContent='';slots.JourneyFooter='<div class="journey-footer"></div>';
  document.querySelector('#case-sidebar').innerHTML=`<p>${escape(t.group)} #${t.number}</p>`+slots.JourneyNav;
  panel.innerHTML=caseLayout.replace(/<!--(\w+)-->/g,(_,name)=>slots[name]||'');
  disposeGraph=mountGraph(document.querySelector('#step-graph'),t,f,relationships[t.id]);
}
function renderChapter() {
 const t=taskById(selected),f=fixes[t.id],featured=Object.values(cards).find(c=>c.id===t.id),i=stages.indexOf(chapter), graph=document.querySelector('#step-graph');
 const lead=t.predictions.Q[0], two=relationships[t.id].compositions.find(c=>c.name==='Imports;ImportedBy');
 const sourceCase=caseSlots.SourceCode;
 const facts={
  StartFacts:`<div class="starting-file"><span>Qwen’s first result</span><strong>${escape(lead)}</strong><p>${t.candidates} candidate files → one place to start reading</p></div><p>Qwen’s top ten contain <strong>${count(f,'Q')} of ${t.required}</strong> required files. ${count(f,'Q')===t.required?'That already covers this eligible fix.':'There is still code to find.'}</p>`,
  ConnectionFacts:connectionStory(t,f,relationships[t.id],highlighted),
  SourceFacts:sourceCase,
  ResultFacts:`<figure class="inline-graph" data-mini="ranks"></figure><div class="result-switch" aria-label="Saved result">${arms.map(a=>`<button data-result-arm="${a}" aria-pressed="${a===resultArm}">${names[a]}</button>`).join('')}</div><p class="chapter-takeaway">${featured?escape(featured.takeaway):`Required files in the first ten: Q ${count(f,'Q')}/${t.required}; QJ ${count(f,'QJ')}/${t.required}; QS ${count(f,'QS')}/${t.required}.`}</p>${caseSlots.FixFiles}<details><summary>Read the actual top-ten predictions</summary>${caseSlots.Predictions}</details>`,
  TheoryFacts:`<p><strong>For this historical case:</strong> ${relationships[t.id].compositions.length?`the census retained ${relationships[t.id].compositions.length} verified composition(s). Those saved matches are evidence of connectivity, not a new query executed by this page.`:'no verified composition was retained. The implementation above explains a capability; it does not establish a structural match for this case.'}</p>`
 };
 const page=document.querySelector('#chapter');disposeInline?.();page.innerHTML=stages.map((stage,n)=>`<section class="reading-section" id="reading-${stage}" data-reading="${stage}">${chapters[stage].replace(/<!--(\w+)-->/g,(_,name)=>facts[name]||'')}</section>`).join('');expandReading(page);mountCodeWalks(page,highlighted);disposeInline=mountInlineGraphs(page,t,f,relationships[t.id]);
 document.querySelectorAll('[data-stage]').forEach(a=>a.setAttribute('aria-current',a.dataset.stage===chapter?'step':'false'));
 document.querySelector('#graph-stage-title').textContent=stageNames[i];
 document.querySelector('#graph-stage-explanation').textContent={start:'Only Qwen’s first file is bright. Positions stay fixed as you move through the case.',connections:'Recorded arrows appear between the same files. Choose a connection to read it in isolation.',source:'The source-inspected participants are bright. An annotation explains what their code does.',results:`${names[resultArm]}: required files found in the top ten are bright; misses remain visible and dim.`,theory:'A saved composition is isolated when available. No new query or inference runs.'}[chapter];
 graph.setScene(chapter,resultArm);
 main.querySelectorAll('[data-recovery]').forEach(x=>x.classList.toggle('active',x.dataset.recovery===(chapter==='start'?'Q':resultArm)));
 document.querySelector('.journey-footer').innerHTML='<a href="#field">← All issues</a><a href="#patterns">Compare shared patterns →</a>';
 requestAnimationFrame(()=>document.querySelector('#reading-'+chapter)?.scrollIntoView({block:'start'}));
}
function expandReading(root) {
 // Keep only the bulky full prediction lists as an optional appendix.
 root.querySelectorAll('details').forEach(details=>{

  const section=document.createElement('section'),summary=details.querySelector(':scope > summary');
  section.className='reading-evidence';
  if(summary){const title=document.createElement('h4');title.textContent=summary.textContent;summary.remove();section.append(title);}
  section.append(...details.childNodes);details.replaceWith(section);
 });

}
function mechanismView(view,id) {
 const t=taskById(id)||taskById(mechanismCase),f=fixes[t.id],featured=Object.values(cards).find(c=>c.id===t.id);
 mechanismCase=t.id;
 if(document.querySelector('#mechanism-map')?.dataset.task!==t.id){
  disposeGraph?.();
  main.innerHTML=`<section class="mechanism-page"><div class="mechanism-heading"><h1 id="mechanism-title" tabindex="-1"></h1><div class="example-links">${Object.values(cards).map(c=>`<button data-example="${c.id}" aria-pressed="${c.id===t.id}">${escape(c.label)}</button>`).join('')}</div></div><article id="chapter" tabindex="-1"></article><section class="optional-map"><h3>The recorded neighborhood</h3><div class="journey-map" id="mechanism-map" data-task="${t.id}"><h3 id="mechanism-map-title"></h3><p id="mechanism-map-note" class="muted"></p><div id="step-graph"></div></div></section><p class="metadata source-identity">${escape(t.repository)} · ${t.world} · ${t.revision}</p><div class="mechanism-footer"></div></section>`;
  disposeGraph=mountGraph(document.querySelector('#step-graph'),t,f,relationships[t.id]);
 }
 main.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{location.hash=`${view}/${b.dataset.example}`;});
 const arm=view==='prior'?'Q':view==='jev'?'QJ':'QS', title={prior:'Qwen finds a starting point.',atlas:'How Atlas turns code into context.',jev:'Jev judges a short list.'}[view];
 document.querySelector('#mechanism-title').textContent=title;
 document.querySelector('#mechanism-map-title').textContent=view==='prior'?'Qwen’s first file lights up':view==='atlas'?'The same files, with recorded connections':'The same map, showing Qwen + Jev recovery';
 document.querySelector('#mechanism-map-note').textContent=view==='prior'?`First: ${t.predictions.Q[0]}`:view==='atlas'?(featured?.title||'Only recorded relationships are shown.'):'Bright fixing files are in QJ’s top ten. Their actual ranks appear under their names.';
 const ranks=`<div class="table-scroll"><table class="fix-table"><thead><tr><th>Required file</th><th>Q</th><th>QJ</th><th>QS</th></tr></thead><tbody>${f.paths.map(g=>`<tr><td>${escape(g.path)}${view==='jev'?`<span class="status">Jev without structure: ${judgment(f.decisions.QJ[g.path])}<br>With structure: ${judgment(f.decisions.QS[g.path])}</span>`:''}</td>${arms.map(a=>`<td class="${g.ranks[a]<=10?'complete':'miss'}">${g.ranks[a]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 const diagram=view==='atlas'?`<pre class="pattern-diagram">${escape(smallDiagram(t)||'No composed source diagram retained.')}</pre>`:'';
 const outcome=`<p class="example-result"><strong>${count(f,arm)} of ${t.required}</strong> required files are in the top ten for this example (${arm}).</p>`;
 const evidence=`${diagram}${outcome}<details><summary>${view==='atlas'?'Ranks and the interpretation limit':'Show required files and exact ranks'}</summary>${ranks}<p class="metadata">${escape(featured?.note||'Saved results do not establish a causal mechanism.')}</p></details>${view==='atlas'?`<details><summary>One actual Flix rule, translated</summary>${highlighted.theoryHTML.match(/<figure class="source-window">[\s\S]*?<\/figure>/)?.[0]||''}<p>Keep a matched pair when its starting point is the chosen anchor. Both facts must come from the same source snapshot. This current-source rule explains matching, not Jev’s historical reasoning.</p></details>`:''}`;
 document.querySelector('#chapter').innerHTML=mechanisms[view].replace('<!--MechanismEvidence-->',view==='atlas'?atlasLesson(t,f,relationships[t.id],highlighted):evidence);
 expandReading(document.querySelector('#chapter'));mountCodeWalks(document.querySelector('#chapter'),highlighted);disposeInline?.();disposeInline=mountInlineGraphs(document.querySelector('#chapter'),t,f,relationships[t.id]);
 document.querySelector('.mechanism-page').dataset.mechanism=view;
 document.querySelector('#chapter').scrollTop=0;
 document.querySelector('#step-graph').setScene(view==='prior'?'start':view==='atlas'?'connections':'results',arm);
 document.querySelector('.mechanism-footer').innerHTML=`<a href="#case/${t.id}/start">Walk through this issue →</a><span>${['prior','atlas','jev'].map(v=>`<a href="#${v}/${t.id}" aria-current="${v===view?'page':'false'}">${{prior:'Qwen prior',atlas:'Atlas structure',jev:'Jev judgment'}[v]}</a>`).join('')}</span>`;
 document.querySelectorAll('[data-nav]').forEach(a=>{if(['prior','atlas','jev'].includes(a.dataset.nav))a.href=`#${a.dataset.nav}/${t.id}`;});
 document.querySelector('#mechanism-title').focus({preventScroll:true});
}
async function route() {
 disposeInline?.();disposeInline=null;
 const serial=++routeSerial, parts=location.hash.slice(1).split('/'),view=parts[0]||'overview',id=parts[1];
 if(document.querySelector('#distribution-section'))fieldScroll=window.scrollY;
 const isCase=['case','issue','postcards'].includes(view), next=cards[id]?.id||id;
 if(isCase && !taskById(next)){location.hash='field';return;}
 document.querySelectorAll('[data-nav]').forEach(a=>a.setAttribute('aria-current',a.dataset.nav===(isCase?'case':view)?'page':'false'));
 document.querySelector('#sidebar').classList.remove('open');document.querySelector('#nav-toggle').setAttribute('aria-expanded','false');
 if(!isCase)document.querySelector('#case-sidebar').innerHTML='';
 document.body.classList.toggle('case-route',isCase||['prior','atlas','jev'].includes(view));
 if(isCase){
  chapter=stages.includes(parts[2])?parts[2]:'start';
  try {await loadEvidence();}catch{main.innerHTML='<p>Could not load local evidence. Refresh to retry.</p>';return;}
  if(serial!==routeSerial)return;
  if(selected!==next||!document.querySelector('#step-graph')){
   disposeDistribution?.();disposeDistribution=null;disposeGraph?.();disposeGraph=null;selected=next;
   main.innerHTML='<section id="case-panel" aria-label="Selected issue"></section>';caseView();window.scrollTo(0,0);
  }
  renderChapter();
 }else if(['prior','atlas','jev'].includes(view)){
  await loadEvidence();if(serial!==routeSerial)return;disposeDistribution?.();disposeDistribution=null;selected=null;mechanismView(view,id);window.scrollTo(0,0);
 }else{
  disposeGraph?.();disposeGraph=null;disposeDistribution?.();disposeDistribution=null;selected=null;
  if(['overview','benchmark','retrieval','effects','extraction','relationships','localization','history'].includes(view)){
   const cleanup=await discoveryView(main,view,()=>serial===routeSerial);if(serial!==routeSerial){cleanup?.();return;}disposeInline=cleanup;if(view==='benchmark'&&parts[1])document.getElementById('benchmark-'+parts[1])?.scrollIntoView();
  }else if(view==='runtime'){
   const cleanup=await runtimeView(main,()=>serial===routeSerial);if(serial!==routeSerial){cleanup?.();return;}disposeInline=cleanup;if(view==='benchmark'&&parts[1])document.getElementById('benchmark-'+parts[1])?.scrollIntoView();
  }else if(view==='trace'){
   const cleanup=await traceView(main,()=>serial===routeSerial);if(serial!==routeSerial){cleanup?.();return;}disposeInline=cleanup;if(view==='benchmark'&&parts[1])document.getElementById('benchmark-'+parts[1])?.scrollIntoView();
  }else if(view==='patterns'){
   await loadEvidence();if(serial!==routeSerial)return;if(id){patternsView(id);window.scrollTo(0,0);}else{const cleanup=await discoveryView(main,'architecture',()=>serial===routeSerial);if(serial!==routeSerial){cleanup?.();return;}disposeInline=cleanup;}
  }else{field();updateField();window.scrollTo(0,fieldScroll);}
 }
}
main.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.task) location.hash=`case/${b.dataset.task}/start`;
  if(b.dataset.resultArm){resultArm=b.dataset.resultArm;renderChapter();}
  if(b.dataset.file) {document.querySelector('.optional-map').scrollIntoView({block:'start'});document.querySelector('#step-graph').selectFile(b.dataset.file);main.querySelectorAll('[data-file]').forEach(x=>x.classList.toggle('active',x===b));}
  if(b.dataset.arm) {const old=arm;arm=b.dataset.arm;updateField(old);}
  if(b.dataset.step) {const i=tasks.findIndex(t=>t.id===selected);location.hash=`case/${tasks[(i+Number(b.dataset.step)+tasks.length)%tasks.length].id}/${chapter}`;}
  if(b.dataset.copy==='field') {
    const text=names[arm]+' / top 10\n'+[...new Set(tasks.map(t=>t.repository))].sort().map(r=>r.padEnd(45)+' '+tasks.filter(t=>t.repository===r).map(t=>t.outcomes[arm]).join(' ')).join('\n');
    try {await navigator.clipboard.writeText(text);b.textContent='Copied';}catch {b.textContent='Select text to copy';}
  }
});
function hint(e) {const b=e.target.closest('button[data-task]');if(!b)return;const t=taskById(b.dataset.task);document.querySelector('#field-hint').textContent=`${t.repository} #${t.number} — ${t.title}`;}
main.addEventListener('pointerover',hint);main.addEventListener('focusin',hint);
document.querySelector('#nav-toggle').onclick=()=>{const open=document.querySelector('#sidebar').classList.toggle('open');document.querySelector('#nav-toggle').setAttribute('aria-expanded',String(open));};
let scrollPending=false;
window.addEventListener('scroll',()=>{
 if(scrollPending||!selected)return;scrollPending=true;
 requestAnimationFrame(()=>{scrollPending=false;const sections=[...document.querySelectorAll('[data-reading]')];const active=sections.filter(s=>s.getBoundingClientRect().top<=160).at(-1)||sections[0];if(!active)return;
 document.querySelectorAll('[data-stage]').forEach(a=>a.setAttribute('aria-current',a.dataset.stage===active.dataset.reading?'step':'false'));
 });
},{passive:true});
window.addEventListener('hashchange',()=>route());
try {const [r,c]=await Promise.all([fetch('data.json'),fetch('context.json')]);if(!r.ok||!c.ok)throw Error();tasks=await r.json();context=await c.json();route();loadEvidence().catch(()=>{});}
catch {main.innerHTML='<p>Could not load the local data. Refresh to retry.</p>';}
