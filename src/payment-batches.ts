import {projectSchema,uid,today,type Project,type PaymentBatch} from "./model";
import {D} from "./engine";
import {allocatePayment,paymentServiceDebts} from "./payment-allocation";
export function previewBatchRow(p:Project,batch:PaymentBatch,row:PaymentBatch["rows"][number]){
  if(D(row.amount).isZero())return [];
  return allocatePayment(p,paymentServiceDebts(p,row.account_id,batch.billing_through,batch.date),row.amount,batch.balancing_service_id,row.manual_maintenance??undefined);
}
export function savePaymentBatch(p:Project,input:PaymentBatch,post=false){
  const ru=p.settings.language==="ru",fail=(a:string,b:string):never=>{throw Error(ru?a:b);};
  const existing=p.payment_batches.find(b=>b.id===input.id);
  if(existing?.state==="applied"||input.state!=="draft")fail("Проведённый документ доступен только для просмотра","Documentul aplicat poate fi doar vizualizat");
  if(p.closed_periods.includes(input.date.slice(0,7)))fail("Период оплаты закрыт","Perioada plății este închisă");
  const next=structuredClone(p),batch=structuredClone(input);
  next.payment_batches=next.payment_batches.filter(b=>b.id!==batch.id);next.payment_batches.push(batch);
  // Validate the entire draft before generating any receipts.
  projectSchema.parse(next);
  if(post){
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
