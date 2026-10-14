import {esc} from './evidence.js';
// Presentation of fixed source excerpts and retained facts; no evaluator lives here.
const walks={
 vectors:{title:'Compare, sort, number',source:'rankVectors',kind:'Actual Flix · data flow',steps:[
 ['Compare',180,'<issue vector> + <file vectors>','  ==> cosine similarity for each file','Each file gets a similarity against the same issue vector.'],
 ['Sort',181,'<path, similarity>','  ==> score descending; path breaks ties','The comparator orders larger similarity first and uses the path for an exact tie.'],
 ['Number',181,'<ordered files>','  ==> ranks 1, 2, 3, ...','Number the complete ordered population. This step does not drop files.']
 ]},
 cosine:{title:'Turn two vectors into one score',source:'cosine',kind:'Actual Flix · data flow',steps:[
 ['Lengths',140,'<issue vector>     <file vector>','  ==> norm(issue) * norm(file)','Multiply the two vector lengths.'],
 ['Compare',141,'<dot product> / <length product>','  ==> cosine similarity','Divide the dot product by that product; the zero-length case returns zero.']
 ]},
 calls:{title:'Follow one recorded call path',readable:'atlas-readable',kind:'Readable Flix translation · recorded Greenwood w49 facts',steps:[
 ['Defines',9,'[bundle.js]','  --Defines--> (bundleSsrPages)','The starting file defines bundleSsrPages.'],
 ['Calls',10,'(bundleSsrPages)','  --Calls--> (checkResourceExists)','The SAME function calls checkResourceExists.'],
 ['DefinedIn',11,'(checkResourceExists)','  --DefinedIn--> [resource-utils.js]','The SAME called function is defined in the helper file.']
 ]},
 types:{title:'Check what each step accepts',source:'atomInput',kind:'Actual Flix · type signatures, not repository edges',steps:[
 ['Files',130,'[File] --Defines--> (Symbol)','[File] --Imports--> [File]','Defines and Imports both accept a file. Their outputs differ.'],
 ['Symbols',134,'(Symbol) --Calls--> (Symbol)','(Symbol) --DefinedIn--> [File]','Calls and DefinedIn accept a symbol. An import target is a file, so Imports ; Calls does not type-check.']
 ]},
 anchor:{title:'Reuse matches; choose a starting file',source:'reuse',kind:'Actual Flix · relational data flow',steps:[
 ['Project',912,'<Binding: filled role slots>','  ==> <Output: chosen pair>','Read the descriptor’s output slots from an already matched binding.'],
 ['Anchor',918,'<Output(world, start, result)>','  + <Anchor(world, start)>','Require the SAME world and starting entity in both rows.'],
 ['Return',918,'<matching output + anchor>','  ==> <Task: start, result>','Return the anchored pair. This join does not re-evaluate the structural match.']
 ]},
 promote:{title:'Move Relevant files to the front',source:'promoted',kind:'Actual Flix · stable ordering',steps:[
 ['Key',81,'<candidate + saved judgment>','  ==> (promotion group, original rank)','Relevant gets group 0; every other outcome gets group 1.'],
 ['Sort',84,'<(group, original rank), file>','  ==> Relevant first; preserve order','Sort by group and then original rank. Candidates remain in their original order within each group.'],
 ['Number',85,'<ordered files>','  ==> new rank, file, original rank','Assign positions to the same candidate population. Nothing is added or removed.']
 ]},
 effects:{title:'Keep I/O at the boundary',source:'qwenIO',kind:'Actual Flix · effect boundary',steps:[
 ['Read',63,'[fixture file]','  ==> readText(path) \\ IO','Reading a file is declared as an IO effect.'],
 ['Handle',64,'<FileRead operation>','  ==> FileRead.runWithIO','This handler runs the file-read operation with operating-system I/O.'],
 ['Write',67,'<result text>','  ==> FileWrite.runWithIO ==> [output]','Writing the result also crosses an explicit I/O boundary.']
 ]},
 identity:{title:'Name exactly what can be reused',source:'qwenArtifact',kind:'Actual Flix · artifact identity',steps:[
 ['Kind',183,'<schema = Embedding>','  ==> this payload is a vector artifact','The schema identifies the kind of artifact.'],
 ['Producer',184,'<model revision + recipe>','  ==> producer identity','A new model or recipe has a different producer identity.'],
 ['Input',185,'<exact embedded bytes>','  ==> input SHA','The input hash identifies the bytes that were embedded. Payload values are data, not identity.']
 ]}
};
export function mountCodeWalks(root,h){
 for(const host of root.querySelectorAll('[data-walk]')){
  const config=walks[host.dataset.walk];if(!config)continue;
  const source=config.source?h.small[config.source]:null;
  host.innerHTML=`<h3>${esc(config.title)}</h3><div class="walk-controls" role="group" aria-label="${esc(config.title)}"><button data-walk-step="all" aria-pressed="true">All steps</button>${config.steps.map((s,i)=>`<button data-walk-step="${i}" aria-pressed="false">${i+1}. ${esc(s[0])}</button>`).join('')}<button data-next>Next →</button><button data-copy>Copy ASCII</button></div><pre class="walk-ascii" aria-label="${esc(config.title)} diagram">${config.steps.map((s,i)=>`<span data-segment="${i}">${esc(s[2])}\n${esc(s[3])}</span>`).join('\n    |\n    v\n')}</pre><ol class="walk-explanation">${config.steps.map((s,i)=>`<li data-explain="${i}">${esc(s[4])}</li>`).join('')}</ol><figure class="walk-source"><figcaption>${esc(config.kind)}${source?' · '+esc(source.path)+':'+source.start+'–'+source.end:''}</figcaption>${source?source.html:h.readable[config.readable]}</figure>`;
  let current=-1;
  const select=value=>{current=value;host.dataset.active=String(value);host.querySelectorAll('[data-walk-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.walkStep===(value<0?'all':String(value)))));host.querySelectorAll('[data-segment]').forEach((el,i)=>el.classList.toggle('walk-focus',i===value));host.querySelectorAll('.code-line').forEach(el=>el.classList.toggle('walk-focus',value>=0&&Number(el.dataset.line)===config.steps[value][1]));host.querySelectorAll('[data-explain]').forEach((el,i)=>el.classList.toggle('walk-focus',i===value));};
  host.onclick=async event=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-walk-step'))select(button.dataset.walkStep==='all'?-1:Number(button.dataset.walkStep));if(button.hasAttribute('data-next'))select((current+1)%config.steps.length);if(button.hasAttribute('data-copy')){try{await navigator.clipboard.writeText(host.querySelector('.walk-ascii').textContent);button.textContent='Copied';}catch{button.textContent='Select diagram to copy';}}};
 }
}
