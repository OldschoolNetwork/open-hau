import type {Project} from './model';import type {BalanceFilter} from './balance-view';
export const reportFilterFields=['account','property','property-type','service','type','provider'] as const;
export const emptyReportFilters=():BalanceFilter[]=>reportFilterFields.map(field=>({field,enabled:false,operator:'eq',values:[]}));
export function reportFilterData(p:Project){const ru=p.settings.language==='ru';const reference=(kind:'properties'|'property-types')=>(p.reference_catalogs[kind]||[]).map(r=>({id:r.id,code:r.code,name:r.name}));
 const types=[...new Set(p.services.map(s=>s.service_type||(ru?'Без вида услуги':'Fără tip de serviciu')))];
 const providers=[...new Set(p.services.map(s=>s.provider||'').filter(Boolean))];
 return {labels:ru?['Лицевой счёт','Объект учёта','Вид объекта учёта','Услуга','Вид услуги','Контрагент']:['Cont personal','Obiect','Tip de obiect','Serviciu','Tip serviciu','Partener'],items:[p.accounts.map(a=>({id:a.id,code:a.number,name:a.payer_name,address:a.address})),reference('properties'),reference('property-types'),p.services.map(s=>({id:s.id,code:String(s.report_order??''),name:s.name[p.settings.language]})),types.map(type=>({id:type,code:'',name:p.reference_catalogs['service-types']?.find(r=>r.id===type)?.name||type})),providers.map(provider=>({id:provider,code:'',name:p.reference_catalogs.counterparties?.find(r=>r.id===provider)?.name||provider}))]};
}
export function matchesReportSelection(p:Project,accountId:string,serviceId:string,filters:BalanceFilter[]){
 const a=p.accounts.find(a=>a.id===accountId),s=p.services.find(s=>s.id===serviceId),property=a?.property_id||a?.custom_fields.property_id||'',object=p.reference_catalogs.properties?.find(r=>r.id===property);
 return filters.filter(f=>f.enabled&&f.values.length).every(f=>{const value=f.field==='account'?accountId:f.field==='property'?property:f.field==='property-type'?object?.attributes.type_id||'':f.field==='service'?serviceId:f.field==='provider'?s?.provider||'':s?.service_type||(p.settings.language==='ru'?'Без вида услуги':'Fără tip de serviciu');const includes=f.operator==='eq'||f.operator==='ne'?f.values[0]===value:f.values.includes(value);return f.operator==='ne'||f.operator==='not-in'?!includes:includes;});
}
