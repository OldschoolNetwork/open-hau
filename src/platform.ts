import {writable} from 'svelte/store';
import {loadMacSymbols} from './macos-symbols';
export const platform = writable('windows');
export function setPlatform(value:string){
  platform.set(value);
  document.documentElement.dataset.platform=value;
  if(value==='macos')void loadMacSymbols();
}
