import {writable} from 'svelte/store';
export const defaultKeyBindings:Record<string,string>={'file:save':'Mod+KeyS','file:open':'Mod+KeyO','window:close':'Mod+KeyW','window:next':'Control+Tab',manual:'F1'};
export const keyBindings=writable<Record<string,string>>({...defaultKeyBindings});
export function loadKeyBindings(){try{const saved=JSON.parse(localStorage.getItem('openhau-key-bindings')||'null');if(saved&&typeof saved==='object')keyBindings.set(Object.fromEntries(Object.entries(saved).filter((row):row is [string,string]=>typeof row[1]==='string')));}catch{}}
export function saveKeyBindings(bindings:Record<string,string>){keyBindings.set(bindings);localStorage.setItem('openhau-key-bindings',JSON.stringify(bindings));}
export function keyChord(e:KeyboardEvent){if(['Control','Shift','Alt','Meta'].includes(e.key))return '';const modifiers=[];if(e.ctrlKey||e.metaKey)modifiers.push(e.code==='Tab'?'Control':'Mod');if(e.altKey)modifiers.push('Alt');if(e.shiftKey)modifiers.push('Shift');return [...modifiers,e.code].join('+');}
