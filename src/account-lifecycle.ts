import {projectSchema,type Project,type Account} from './model';
import {monthlyPersons,setAccountMonthlyPersons} from './occupancy';
export type AccountDocument=Project['account_documents'][number];
export function accountOpenInMonth(a:Account,month:string){return a.opening_period<=month&&(a.closing_date?month<=a.closing_date.slice(0,7):a.active);}
export function accountServicesInMonth(a:Account,month:string){return [...(a.service_history||[])].filter(h=>h.effective_from<=month).sort((a,b)=>b.effective_from.localeCompare(a.effective_from))[0]?.service_ids||a.service_ids;}
export function saveAccountDocument(p:Project,input:AccountDocument,post=false){
 const t=(ru:string,ro:string)=>p.settings.language==='ru'?ru:ro;
 const prior=p.account_documents.find(d=>d.id===input.id);if(prior?.state==='applied'||input.state!=='draft')throw Error(t('Проведённый документ доступен только для просмотра.','Documentul aplicat poate fi doar vizualizat.'));
 const next=structuredClone(p),doc=structuredClone(input),month=doc.date.slice(0,7),existing=next.accounts.find(a=>a.id===doc.account.id);
 if(post){
  if(p.closed_periods.some(m=>m>=month))throw Error(t('Дата документа затрагивает закрытый период.','Data documentului afectează o perioadă închisă.'));
  if(doc.kind==='open'){
   if(existing)throw Error(t('Лицевой счёт уже существует.','Contul personal există deja.'));
   if(next.accounts.some(a=>a.number===doc.account.number))throw Error(t('Номер лицевого счёта уже используется.','Numărul contului este deja utilizat.'));
   doc.account={...doc.account,opening_period:month,opening_date:doc.date,closing_date:null,active:true};next.accounts.push(doc.account);
  }else{
   if(!existing)throw Error(t('Лицевой счёт не найден.','Contul personal nu a fost găsit.'));
   doc.before=structuredClone(existing);
   if(month<existing.opening_period)throw Error(t('Дата документа раньше открытия счёта.','Data documentului precedă deschiderea contului.'));
   if(doc.kind==='close'){
    if(existing.closing_date||!existing.active)throw Error(t('Лицевой счёт уже закрыт.','Contul personal este deja închis.'));
    existing.closing_date=doc.date;existing.active=false;
   }else if(doc.kind==='services'){
    if(doc.date.slice(8)!=='01')throw Error(t('Изменение услуг применяется с первого числа месяца.','Modificarea serviciilor se aplică din prima zi a lunii.'));
    const history=existing.service_history||[{effective_from:existing.opening_period,service_ids:[...existing.service_ids]}];
    existing.service_history=[...history.filter(h=>h.effective_from!==month),{effective_from:month,service_ids:[...doc.account.service_ids]}].sort((a,b)=>a.effective_from.localeCompare(b.effective_from));
    existing.service_ids=[...existing.service_history[existing.service_history.length-1].service_ids];
   }else if(doc.kind==='opening-balance'){
    if(next.payments.some(r=>r.account_id===existing.id)||next.snapshots.some(r=>r.account_id===existing.id)||next.service_accounting.opening.some(r=>r.account_id===existing.id))throw Error(t('Начальный остаток нельзя менять после появления движений. Используйте корректировку.','Soldul inițial nu poate fi schimbat după apariția mișcărilor. Folosiți o ajustare.'));
    existing.opening_balance=doc.account.opening_balance;
   }else{
    for(const key of ['payer_name','address','apartments','total_area_m2','registered_residents','notes','custom_fields'] as const)(existing as unknown as Record<string,unknown>)[key]=structuredClone(doc.account[key]);
    if(monthlyPersons(p,doc.before,month).persons!==doc.account.waste_charge_persons)next.monthly_occupancy=setAccountMonthlyPersons(next,existing.id,month,doc.account.waste_charge_persons).monthly_occupancy;
   }
  }
  doc.state='applied';
 }
 next.account_documents=[...next.account_documents.filter(d=>d.id!==doc.id),doc];return projectSchema.parse(next);
}
