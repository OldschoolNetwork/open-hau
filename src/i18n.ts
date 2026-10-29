import {currentLanguagePack,type InterfacePack} from "./localization";
import {english} from './english';
export type Language="ru"|"ro"|"en";
export const translator=(language:Language,pack:InterfacePack=currentLanguagePack())=>(ru:string,ro:string,en?:string)=>pack.base===language&&pack.messages[ru]?pack.messages[ru]:language==='ru'?ru:language==='ro'?ro:en||english(ru);
