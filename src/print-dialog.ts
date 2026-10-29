import {writable} from 'svelte/store';
export const printRequest=writable<{html:string;landscape:boolean;render?:((landscape:boolean)=>string);resolve:(result:boolean)=>void}|null>(null);
export function printDocument(html:string,landscape=false,render?:((landscape:boolean)=>string)){return new Promise<boolean>(resolve=>printRequest.set({html,landscape,render,resolve}));}
