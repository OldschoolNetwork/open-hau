import {writable} from "svelte/store";
export type NotificationPreferences={enabled:boolean;sound:boolean;seconds:number;animation:boolean};
export const notificationDefaults:NotificationPreferences={enabled:true,sound:true,seconds:6,animation:true};
export const notificationPreferences=writable<NotificationPreferences>({...notificationDefaults});
export function loadNotificationPreferences(){try{const x=JSON.parse(localStorage.getItem("openhau-notifications")||"null");if(x&&typeof x.enabled==="boolean"&&typeof x.sound==="boolean"&&typeof x.animation==="boolean"&&[3,6,10,15].includes(x.seconds))notificationPreferences.set(x);}catch{}}
export function saveNotificationPreferences(value:NotificationPreferences){notificationPreferences.set(value);localStorage.setItem("openhau-notifications",JSON.stringify(value));}
