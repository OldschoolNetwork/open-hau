import {writable,get} from 'svelte/store';
export type InterfacePack={locale:string;base:'ru'|'ro'|'en';messages:Record<string,string>};
export const languageOverrides=writable<InterfacePack>({locale:'ru',base:'ru',messages:{}});
let last='';export function configureLocalization(settings:{language:'ru'|'ro'|'en';translation_locale?:string|null;translations?:Record<string,Record<string,string>>}){const locale=settings.translation_locale||settings.language,messages=settings.translations?.[locale]||{};const signature=JSON.stringify([locale,settings.language,messages]);if(signature!==last){last=signature;languageOverrides.set({locale,base:settings.language,messages});}}
export const currentLanguagePack=()=>get(languageOverrides);
export function translatedName(value:{ru:string;ro:string;en?:string;[key:string]:string|undefined},language:string,pack:InterfacePack=currentLanguagePack()){const locale=language===pack.base?pack.locale:language;return value[locale]||value[language]||value.ro||value.ru;}
export function referenceLabel(value:{name:string;attributes:Record<string,string>}|undefined,language:string,pack:InterfacePack=currentLanguagePack()){if(!value)return '';const locale=language===pack.base?pack.locale:language;return value.attributes['name_'+locale]||value.attributes['name_'+language]||value.name;}
