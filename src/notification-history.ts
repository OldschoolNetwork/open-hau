import {writable} from 'svelte/store';
export const notificationHistory=writable<{id:string;text:string;error:boolean;date:number}[]>([]);
export function rememberNotification(text:string,error:boolean){notificationHistory.update(rows=>[{id:crypto.randomUUID(),text,error,date:Date.now()},...rows].slice(0,100));}
