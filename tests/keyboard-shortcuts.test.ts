import {test} from 'node:test';
import assert from 'node:assert/strict';
import {keyChord,formatKeyBinding} from '../src/keyboard-shortcuts';
const event=(code:string,flags:Partial<KeyboardEvent>={})=>({key:code.replace('Key',''),code,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,...flags}) as KeyboardEvent;
test('Command and Control remain distinct on Mac',()=>{
 assert.equal(keyChord(event('KeyS',{metaKey:true}),true),'Mod+KeyS');
 assert.equal(keyChord(event('KeyS',{ctrlKey:true}),true),'Control+KeyS');
 assert.equal(keyChord(event('KeyS',{ctrlKey:true})),'Mod+KeyS');
 assert.equal(keyChord(event('Tab',{ctrlKey:true})),'Control+Tab');
});
test('Mac shortcut labels use system modifier order and symbols',()=>{
 assert.equal(formatKeyBinding('Mod+Alt+Shift+KeyS',true),'⌥⇧⌘S');
 assert.equal(formatKeyBinding('Control+Alt+Shift+Mod+KeyP',true),'⌃⌥⇧⌘P');
 assert.equal(formatKeyBinding('Control+Tab',true),'⌃⇥');
 assert.equal(formatKeyBinding('Mod+KeyS'),'Ctrl+S');
 assert.equal(formatKeyBinding('',true),'');
});
