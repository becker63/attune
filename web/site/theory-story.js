export function mountStory(root) {
 if(!root)return;
 const scenes=[
 ['We have a starting point.','bundle.js','Qwen rank 1. We have found the bundling stage.'],
 ['Find the helper it imports.','bundle.js\n    |\n    | Imports\n    v\nresource-utils.js','One admitted import connects the build stage to its shared resource helper.'],
 ['Find another file using that helper.','bundle.js                 graph.js\n    |                         |\n    | Imports                 | Imports\n    +------------+------------+\n                 v\n         resource-utils.js','Follow ImportedBy from the helper to graph.js. Both build stages use the same helper.']
 ];
 let step=0;
 root.innerHTML=`<div class="story-buttons">${['1 · Start','2 · Find the helper','3 · Find another user'].map((s,i)=>`<button data-scene="${i}">${s}</button>`).join('')}</div><div class="story-scene" aria-live="polite"><h3></h3><pre></pre><p></p></div><p class="metadata">Solid arrows are admitted Imports facts. Reading an arrow backward uses ImportedBy. This illustrates a saved match, not a new search.</p>`;
 function draw(){root.dataset.scene=step;root.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',i===step));const [title,diagram,caption]=scenes[step];root.querySelector('h3').textContent=title;root.querySelector('pre').textContent=diagram;root.querySelector('.story-scene p').textContent=caption;}
 root.addEventListener('click',e=>{const b=e.target.closest('[data-scene]');if(b){step=+b.dataset.scene;draw();}});draw();
}
