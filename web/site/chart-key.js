import {esc} from './evidence.js';

// Keep the legend's geometry identical to the marks it explains.
export function graphKey(entries){
 const marks={
  dot:'<circle cx="12" cy="8" r="4" fill="currentColor"/>',
  ring:'<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  line:'<path d="M1 8H23" stroke="currentColor" stroke-width="2"/>',
  dash:'<path d="M1 8H23" stroke="currentColor" stroke-dasharray="3 3"/>',
  square:'<path d="M5 2H19V14H5Z" fill="currentColor"/>',
  diamond:'<path d="M12 2L18 8L12 14L6 8Z" fill="currentColor"/>',
 };
 return '<ul class="graph-key" aria-label="Graph key">'+entries.map(([mark,color,label])=>`<li><svg viewBox="0 0 24 16" width="24" height="16" aria-hidden="true" style="color:${esc(color)}">${marks[mark]||`<text x="12" y="12" text-anchor="middle" fill="currentColor">${esc(mark)}</text>`}</svg><span>${esc(label)}</span></li>`).join('')+'</ul>';
}
