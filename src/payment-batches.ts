import {uiText} from "./english";
import {projectSchema,uid,today,type Project,type PaymentBatch} from "./model";
import {D} from "./engine";
import {allocatePayment,paymentServiceDebts} from "./payment-allocation";
export function previewBatchRow(p:Project,batch:PaymentBatch,row:PaymentBatch["rows"][number]){
  if(D(row.amount).isZero()){if(row.manual_maintenance!==null&&!D(row.manual_maintenance).isZero())throw Error(uiText('Для нулевой оплаты сумма обслуживания тоже должна быть нулевой','Pentru o plată nulă suma deservirii trebuie să fie nulă',p.settings.language));return [];}
  return allocatePayment(p,paymentServiceDebts(p,row.account_id,batch.billing_through,batch.date),row.amount,batch.balancing_service_id,row.manual_maintenance??undefined);
}
export function savePaymentBatch(p:Project,input:PaymentBatch,post=false){
  const ru=p.settings.language==="ru",fail=(a:string,b:string):never=>{throw Error(ru?a:b);};
  const existing=p.payment_batches.find(b=>b.id===input.id);
  if(input.imported||existing?.state==="applied"||input.state!=="draft")fail("Проведённый документ доступен только для просмотра","Documentul aplicat poate fi doar vizualizat");
  if(p.closed_periods.includes(input.date.slice(0,7)))fail("Период оплаты закрыт","Perioada plății este închisă");
  const next=structuredClone(p),batch=structuredClone(input);
  next.payment_batches=next.payment_batches.filter(b=>b.id!==batch.id);next.payment_batches.push(batch);
  // Validate the entire draft before generating any receipts.
  projectSchema.parse(next);
  if(post){
    if(batch.marked_for_deletion)fail("Снимите пометку удаления перед проведением","Eliminați marcajul de ștergere înainte de aplicare");
    if(!batch.rows.some(r=>D(r.amount).gt(0)))fail("Введите хотя бы одну ненулевую оплату","Introduceți cel puțin o plată nenulă");
    for(const row of batch.rows){
      const account=next.accounts.find(a=>a.id===row.account_id)!;
      if(batch.date.slice(0,7)<account.opening_period)fail("Дата оплаты раньше открытия лицевого счёта","Data plății este anterioară deschiderii contului");
      if(D(row.amount).isZero())continue;
      const shares=previewBatchRow(next,batch,row);row.payment_id=uid();
      next.payments.push({id:row.payment_id,account_id:row.account_id,payment_date:batch.date,entered_date:today(),amount:row.amount,note:[batch.number,batch.method,batch.comment].filter(Boolean).join(" · "),allocation_basis:batch.billing_through,allocation_balancing_service_id:batch.balancing_service_id,...(row.manual_maintenance!==null?{allocation_manual_amount:row.manual_maintenance}:{})});
      next.service_accounting.payments.push(...shares.map(s=>({...s,payment_id:row.payment_id!})));
    }
    batch.state="applied";
    next.settings.payment_balancing_service_id=batch.balancing_service_id;
  }
  return projectSchema.parse(next);
}

export function unpostPaymentBatch(p:Project,id:string){
 projectSchema.parse(p);
 const batch=p.payment_batches.find(b=>b.id===id),ru=p.settings.language==='ru';
 if(batch?.imported)throw Error(ru?'Импортированный документ доступен только для просмотра. Используйте отдельную корректировку.':'Documentul importat poate fi doar vizualizat. Folosiți o ajustare separată.');
 if(!batch||batch.state!=='applied')throw Error(ru?'Выберите проведённый документ':'Selectați un document aplicat');
 if(p.closed_periods.some(m=>m>=batch.date.slice(0,7)))throw Error(ru?'Документ затрагивает закрытый период':'Documentul afectează o perioadă închisă');
 const ids=new Set(batch.rows.map(r=>r.payment_id).filter((id):id is string=>!!id)),accounts=new Set(batch.rows.filter(r=>r.payment_id).map(r=>r.account_id));
 if(p.treasury.transactions.some(tx=>tx.kind==='income'&&tx.linked_payment_ids.some(id=>ids.has(id))))throw Error(ru?'Оплаты связаны с банковским или кассовым документом':'Plățile sunt legate de un document bancar sau de casă');
 if(p.payments.some(pay=>accounts.has(pay.account_id)&&!ids.has(pay.id)&&pay.payment_date>=batch.date))throw Error(ru?'Сначала отмените более поздние оплаты этих лицевых счетов':'Anulați mai întâi plățile ulterioare pentru aceste conturi');
 const next=structuredClone(p);next.payments=next.payments.filter(pay=>!ids.has(pay.id));next.service_accounting.payments=next.service_accounting.payments.filter(row=>!ids.has(row.payment_id));
 const draft=next.payment_batches.find(b=>b.id===id)!;draft.state='draft';for(const row of draft.rows)row.payment_id=null;
 return projectSchema.parse(next);
}
export function markPaymentBatch(p:Project,id:string){const next=structuredClone(p),batch=next.payment_batches.find(b=>b.id===id);if(!batch)throw Error('Payment document not found');if(batch.state==='applied')throw Error(uiText('Сначала отмените проведение документа','Anulați mai întâi aplicarea documentului',p.settings.language));batch.marked_for_deletion=!batch.marked_for_deletion;return projectSchema.parse(next);}
export type PaymentDetailRequest={parentId:string;batch:PaymentBatch;rowId:string;onapply:(amount:string,manual:string|null)=>void};
export function applyPaymentDetail(p:Project,current:PaymentBatch,expected:PaymentBatch,rowId:string,amount:string,manual:string|null){
 const context=(b:PaymentBatch)=>JSON.stringify({date:b.date,through:b.billing_through,balancing:b.balancing_service_id,row:b.rows.find(r=>r.id===rowId)});
 if(current.state!=='draft'||p.payment_batches.find(b=>b.id===current.id)?.state==='applied'||!current.rows.some(r=>r.id===rowId)||context(current)!==context(expected))throw Error(uiText('Строка документа изменилась. Откройте расшифровку заново.','Rândul documentului a fost modificat. Redeschideți repartizarea.',p.settings.language));
 if(!/^\d+(\.\d{1,2})?$/.test(amount)||manual!==null&&!/^-?\d+(\.\d{1,2})?$/.test(manual))throw Error(uiText('Введите суммы с точностью до банов','Introduceți sumele cu precizie de bani',p.settings.language));
 const row={...current.rows.find(r=>r.id===rowId)!,amount,manual_maintenance:manual};previewBatchRow(p,current,row);
 return {...current,rows:current.rows.map(r=>r.id===rowId?row:r)};
}
