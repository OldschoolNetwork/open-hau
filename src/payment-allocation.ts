import type {Project} from "./model";
import {D, money, monthNext} from "./engine";
import {serviceBalanceReport,UNALLOCATED_SERVICE} from "./service-reports";

export type PaymentShare={service_id:string;amount:string};
export function previousPaymentMonth(date:string){const [y,m]=date.slice(0,7).split("-").map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`;}

/** Debt through an explicit billing month, less payments received through the payment date. */
export function paymentServiceDebts(p:Project,accountId:string,through:string,date:string,excludePaymentId=""){
  const ru=p.settings.language==="ru";
  const account=p.accounts.find(a=>a.id===accountId);
  if(!account)throw Error(ru?"Лицевой счёт не найден":"Contul personal nu a fost găsit");
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(through)||through>date.slice(0,7))throw Error(ru?"Укажите месяц долга не позднее месяца оплаты":"Indicați luna datoriei cel târziu în luna plății");
  // Reports are read-only; do not duplicate a large imported archive for every receipt.
  const copy={...p,accounts:p.accounts.filter(a=>a.id===accountId),payments:p.payments.filter(pay=>pay.account_id===accountId&&pay.id!==excludePaymentId&&pay.payment_date<=date)};
  const report=serviceBalanceReport(copy,account.opening_period,through<account.opening_period?account.opening_period:through);
  if(through>=account.opening_period&&report.incomplete)throw Error(ru?"Проверьте историю и начисления выбранного периода перед распределением оплаты":"Verificați istoricul și calculele perioadei înainte de repartizarea plății");
  const rows=new Map(report.rows.map(r=>[r.service_id,D(through<account.opening_period?r.opening:r.closing)]));
  // The report ends at the billing month; later receipts already reduce the debt available now.
  const later=copy.payments.filter(pay=>pay.payment_date>=monthNext(through)+"-01");
  for(const pay of later){
    const shares=p.service_accounting.payments.filter(s=>s.payment_id===pay.id);
    let total=D(0);for(const share of shares){rows.set(share.service_id,(rows.get(share.service_id)||D(0)).minus(share.amount));total=total.plus(share.amount);}
    const remainder=D(pay.amount).minus(total);
    if(!remainder.isZero())rows.set(UNALLOCATED_SERVICE,(rows.get(UNALLOCATED_SERVICE)||D(0)).minus(remainder));
  }
  if(!(rows.get(UNALLOCATED_SERVICE)||D(0)).isZero())throw Error(ru?"Сначала распределите начальные остатки, прежние оплаты и корректировки по услугам":"Repartizați mai întâi soldurile inițiale, plățile anterioare și ajustările pe servicii");
  return [...rows].filter(([sid])=>sid!==UNALLOCATED_SERVICE).map(([service_id,debt])=>({service_id,debt:money(debt,p)}));
}

/** Integer minor units and largest remainders keep the split exact, including one-cent payments. */
export function allocatePayment(p:Project,debts:{service_id:string;debt:string}[],amount:string,balancingServiceId:string,manualBalancing?:string):PaymentShare[]{
  const ru=p.settings.language==="ru";
  const fail=(a:string,b:string):never=>{throw Error(ru?a:b);};
  if(!/^\d+(\.\d{1,2})?$/.test(amount))fail("Укажите неотрицательную оплату с точностью до банов","Indicați o plată nenegativă cu precizie de bani");
  if(!p.services.some(s=>s.id===balancingServiceId))fail("Выберите услугу обслуживания дома для разницы оплаты","Selectați serviciul de deservire a blocului pentru diferență");
  const total=D(amount).times(100),positive=debts.map(d=>({service_id:d.service_id,cents:D(d.debt).gt(0)?D(d.debt).times(100):D(0)}));
  if(new Set(positive.map(d=>d.service_id)).size!==positive.length)throw Error("Duplicate payment allocation services");
  const debtTotal=positive.reduce((s,d)=>s.plus(d.cents),D(0));
  let maintenance=manualBalancing===undefined?null:D(manualBalancing).times(100);
  if(maintenance&&!maintenance.isInteger())fail("Укажите сумму обслуживания с точностью до банов","Indicați suma deservirii cu precizie de bani");
  const targets=maintenance===null?positive:positive.filter(d=>d.service_id!==balancingServiceId);
  const targetDebt=targets.reduce((s,d)=>s.plus(d.cents),D(0));
  const available=maintenance===null?(total.lt(debtTotal)?total:debtTotal):total.minus(maintenance);
  if(available.lt(0)||available.gt(targetDebt))fail("Сумма обслуживания оставляет недопустимую оплату остальных услуг","Suma deservirii lasă o plată nevalidă pentru celelalte servicii");
  const split=targets.map(d=>{const exact=targetDebt.isZero()?D(0):available.times(d.cents).div(targetDebt);return {...d,cents:exact.floor(),remainder:exact.minus(exact.floor())};});
  let remaining=available.minus(split.reduce((s,d)=>s.plus(d.cents),D(0))).toNumber();
  const order=[...split].sort((a,b)=>b.remainder.comparedTo(a.remainder)||a.service_id.localeCompare(b.service_id));
  for(const row of order){if(remaining--<=0)break;row.cents=row.cents.plus(1);}
  const result=new Map(split.map(d=>[d.service_id,d.cents]));
  if(maintenance===null)result.set(balancingServiceId,(result.get(balancingServiceId)||D(0)).plus(total.minus(available)));
  else result.set(balancingServiceId,maintenance);
  return [...result].map(([service_id,cents])=>({service_id,amount:cents.div(100).toFixed(2)}));
}
