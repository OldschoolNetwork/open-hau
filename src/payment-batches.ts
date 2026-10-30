import {uiText} from "./english";
import {projectSchema,uid,today,type Project,type PaymentBatch} from "./model";
import {D} from "./engine";
import {allocatePayment,paymentServiceDebts} from "./payment-allocation";
export function previewBatchRow(p:Project,batch:PaymentBatch,row:PaymentBatch["rows"][number]){
  if(batch.imported){
    const original=p.payment_batches.find(b=>b.id===batch.id)?.rows.find(r=>r.id===row.id)||row;
    const shares=structuredClone(original.historical_shares||p.service_accounting.payments.filter(s=>s.payment_id===original.payment_id).map(({service_id,amount})=>({service_id,amount})));
    if(D(row.amount).isZero())return shares.map(s=>({...s,amount:'0.00'}));
    const delta=D(row.amount).minus(shares.reduce((sum,s)=>sum.plus(s.amount),D(0)));
    if(!delta.isZero()){
      if(!p.services.some(s=>s.id===batch.balancing_service_id))throw Error(uiText('Выберите услугу обслуживания дома для разницы оплаты','Selectați serviciul de deservire a blocului pentru diferență',p.settings.language));
      const maintenance=shares.find(s=>s.service_id===batch.balancing_service_id);
      if(maintenance)maintenance.amount=D(maintenance.amount).plus(delta).toFixed(2);else shares.push({service_id:batch.balancing_service_id,amount:delta.toFixed(2)});
    }
    return shares;
  }
  if(D(row.amount).isZero()){if(row.manual_maintenance!==null&&!D(row.manual_maintenance).isZero())throw Error(uiText('Для нулевой оплаты сумма обслуживания тоже должна быть нулевой','Pentru o plată nulă suma deservirii trebuie să fie nulă',p.settings.language));return [];}
  return allocatePayment(p,paymentServiceDebts(p,row.account_id,batch.billing_through,batch.date),row.amount,batch.balancing_service_id,row.manual_maintenance??undefined);
}
export function savePaymentBatch(p:Project,input:PaymentBatch,post=false){
  const ru=p.settings.language==="ru",fail=(a:string,b:string):never=>{throw Error(ru?a:b);};
  const existing=p.payment_batches.find(b=>b.id===input.id);
  if(existing?.imported&&!input.imported)fail('Сохраните происхождение перенесённого документа','Păstrați originea documentului importat');
  if(existing?.state==="applied"||input.state!=="draft")fail("Проведённый документ доступен только для просмотра","Documentul aplicat poate fi doar vizualizat");
  if(p.closed_periods.includes(input.date.slice(0,7)))fail("Период оплаты закрыт","Perioada plății este închisă");
  const next=structuredClone(p),batch=structuredClone(input);
  if(batch.imported){
    if(!existing?.imported||existing.date!==batch.date||existing.billing_through!==batch.billing_through||existing.rows.length!==batch.rows.length)fail('Изменение структуры или даты перенесённого документа не поддерживается','Modificarea structurii sau datei documentului importat nu este permisă');
    batch.source_snapshot=existing!.source_snapshot;
    for(const row of batch.rows){const old=existing!.rows.find(r=>r.id===row.id);if(!old||old.account_id!==row.account_id)fail('Лицевой счёт перенесённой строки изменён','Contul rândului importat a fost modificat');
      if(D(old!.amount).lt(0)){if(JSON.stringify(row)!==JSON.stringify(old))fail('Перенесённую компенсацию нельзя изменить как обычную оплату','Compensația importată nu poate fi modificată ca o plată obișnuită');continue;}
      if(D(row.amount).lt(0))fail('Укажите неотрицательную оплату','Indicați o plată nenegativă');
      row.historical_shares=previewBatchRow(p,batch,row);row.source_automatic=old!.source_automatic;row.source_advance=old!.source_advance;row.manual_maintenance=null;
    }
  }
  next.payment_batches=next.payment_batches.filter(b=>b.id!==batch.id);next.payment_batches.push(batch);
  // Validate the entire draft before generating any receipts.
  projectSchema.parse(next);
  if(post){
    if(batch.marked_for_deletion)fail("Снимите пометку удаления перед проведением","Eliminați marcajul de ștergere înainte de aplicare");
    if(!batch.rows.some(r=>D(r.amount).gt(0)))fail("Введите хотя бы одну ненулевую оплату","Introduceți cel puțin o plată nenulă");
    for(const row of batch.rows){
      const account=next.accounts.find(a=>a.id===row.account_id)!;
      if(batch.date.slice(0,7)<account.opening_period)fail("Дата оплаты раньше открытия лицевого счёта","Data plății este anterioară deschiderii contului");
      if(D(row.amount).isZero()||batch.imported&&D(row.amount).lt(0))continue;
      const shares=previewBatchRow(next,batch,row);row.payment_id=uid();
      next.payments.push({id:row.payment_id,account_id:row.account_id,payment_date:batch.date,entered_date:today(),amount:row.amount,note:[batch.number,batch.method,batch.comment].filter(Boolean).join(" · "),...(!batch.imported?{allocation_basis:batch.billing_through,allocation_balancing_service_id:batch.balancing_service_id,...(row.manual_maintenance!==null?{allocation_manual_amount:row.manual_maintenance}:{})}:{})});
      next.service_accounting.payments.push(...shares.map(s=>({...s,payment_id:row.payment_id!})));
    }
    batch.state="applied";
    if(batch.balancing_service_id)next.settings.payment_balancing_service_id=batch.balancing_service_id;
  }
  return projectSchema.parse(next);
}

export function unpostPaymentBatch(p:Project,id:string){
 projectSchema.parse(p);
 const batch=p.payment_batches.find(b=>b.id===id),ru=p.settings.language==='ru';

 if(!batch||batch.state!=='applied')throw Error(ru?'Выберите проведённый документ':'Selectați un document aplicat');
 if(p.closed_periods.some(m=>m>=batch.date.slice(0,7)))throw Error(ru?'Документ затрагивает закрытый период':'Documentul afectează o perioadă închisă');
 const ids=new Set(batch.rows.map(r=>r.payment_id).filter((id):id is string=>!!id)),accounts=new Set(batch.rows.filter(r=>r.payment_id).map(r=>r.account_id));
 if(p.treasury.transactions.some(tx=>tx.kind==='income'&&tx.linked_payment_ids.some(id=>ids.has(id))))throw Error(ru?'Оплаты связаны с банковским или кассовым документом':'Plățile sunt legate de un document bancar sau de casă');
 if(p.payments.some(pay=>accounts.has(pay.account_id)&&!ids.has(pay.id)&&pay.payment_date>=batch.date))throw Error(ru?'Сначала отмените более поздние оплаты этих лицевых счетов':'Anulați mai întâi plățile ulterioare pentru aceste conturi');
 const next=structuredClone(p);next.payments=next.payments.filter(pay=>!ids.has(pay.id));next.service_accounting.payments=next.service_accounting.payments.filter(row=>!ids.has(row.payment_id));
 const draft=next.payment_batches.find(b=>b.id===id)!;if(draft.imported){draft.source_snapshot??=JSON.stringify(batch);for(const row of draft.rows)row.historical_shares??=p.service_accounting.payments.filter(s=>s.payment_id===row.payment_id).map(({service_id,amount})=>({service_id,amount}));draft.balancing_service_id||=p.settings.payment_balancing_service_id||'';}draft.state='draft';for(const row of draft.rows)row.payment_id=null;
 return projectSchema.parse(next);
}
export function markPaymentBatch(p:Project,id:string){const next=structuredClone(p),batch=next.payment_batches.find(b=>b.id===id);if(!batch)throw Error('Payment document not found');if(batch.imported)throw Error(uiText('Перенесённый документ нельзя пометить на удаление','Documentul importat nu poate fi marcat pentru ștergere',p.settings.language));if(batch.state==='applied')throw Error(uiText('Сначала отмените проведение документа','Anulați mai întâi aplicarea documentului',p.settings.language));batch.marked_for_deletion=!batch.marked_for_deletion;return projectSchema.parse(next);}
export type PaymentDetailRequest={parentId:string;batch:PaymentBatch;rowId:string;onapply:(amount:string,manual:string|null)=>void};
export function applyPaymentDetail(p:Project,current:PaymentBatch,expected:PaymentBatch,rowId:string,amount:string,manual:string|null){
 const context=(b:PaymentBatch)=>JSON.stringify({date:b.date,through:b.billing_through,balancing:b.balancing_service_id,row:b.rows.find(r=>r.id===rowId)});
 if(current.state!=='draft'||p.payment_batches.find(b=>b.id===current.id)?.state==='applied'||!current.rows.some(r=>r.id===rowId)||context(current)!==context(expected))throw Error(uiText('Строка документа изменилась. Откройте расшифровку заново.','Rândul documentului a fost modificat. Redeschideți repartizarea.',p.settings.language));
 if(!/^\d+(\.\d{1,2})?$/.test(amount)||manual!==null&&!/^-?\d+(\.\d{1,2})?$/.test(manual))throw Error(uiText('Введите суммы с точностью до банов','Introduceți sumele cu precizie de bani',p.settings.language));
 const row={...current.rows.find(r=>r.id===rowId)!,amount,manual_maintenance:manual};const shares=previewBatchRow(p,current,row);if(current.imported){row.historical_shares=shares;row.manual_maintenance=null;}
 return {...current,rows:current.rows.map(r=>r.id===rowId?row:r)};
}
