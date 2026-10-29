import {referenceLabel,translatedName} from './localization';
import {uiText} from "./english";
import {projectSchema,uid,type Project} from "./model";
import type {ReferenceKind,CatalogField} from "./catalog-definitions";
export type ReferenceRecord=NonNullable<Project["reference_catalogs"][ReferenceKind]>[number];
export function referenceRows(p:Project,kind:ReferenceKind){return p.reference_catalogs[kind]||[];}
export function referenceOptions(p:Project,reference:CatalogField["reference"]){if(reference==="accounts")return p.accounts.map(a=>({id:a.id,name:a.number+" · "+a.payer_name}));if(reference==="services")return p.services.map(s=>({id:s.id,name:translatedName(s.name,p.settings.language)}));return reference?referenceRows(p,reference).map(r=>({id:r.id,name:referenceLabel(r,p.settings.language)+(r.active?"":" · "+(uiText("архив","arhivă",p.settings.language)))})):[];}
export function newReferenceRecord(p:Project,kind:ReferenceKind):ReferenceRecord{return {id:uid(),code:String(referenceRows(p,kind).length+1),name:"",active:true,marked_for_deletion:false,notes:"",attributes:{}};}
export function saveReferenceRecord(p:Project,kind:ReferenceKind,row:ReferenceRecord){const rows=referenceRows(p,kind),duplicate=rows.find(r=>r.id!==row.id&&row.code&&r.code===row.code);if(duplicate)throw Error(uiText("В этом справочнике уже существует запись с таким кодом","Există deja o înregistrare cu acest cod în catalog",p.settings.language));return projectSchema.parse({...p,reference_catalogs:{...p.reference_catalogs,[kind]:rows.some(r=>r.id===row.id)?rows.map(r=>r.id===row.id?row:r):[...rows,row]}});}
