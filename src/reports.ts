import {reportRange,monthChargeEvents,chargeEventIndex} from './report-dates';
import {accountOpenInMonth} from './account-lifecycle';
import type { Project } from "./model";
import { add, D, money, monthNext, statement, csv } from "./engine";

export type AccountReportRow = {
  account_id: string;
  number: string;
  payer: string;
  active: boolean;
  opening: string;
  charges: string;
  adjustments: string;
  paid: string;
  closing: string;
  warnings: string[];
};
export function accountBalanceReport(p: Project, from: string, to: string,attentionOnly=false,postedOnly=false) {
  const eventIndex=chargeEventIndex(p);const range=reportRange(from,to);from=range.fromMonth;to=range.toMonth;
  const months: string[] = [];
  for (let month = from; month <= to; month = monthNext(month)) {
    if (months.length >= 1200) throw Error("Report range exceeds 100 years");
    months.push(month);
  }
  const rows: AccountReportRow[] = p.accounts
    .filter((a) => a.opening_period <= to)
    .map((a) => {
      let opening = from < a.opening_period ? money(a.opening_balance,p) : statement(p, a, from).opening;
      let charges = D(0),
        adjustments = D(0),
        paid = D(0);
      const warnings = new Set<string>();
      for (const month of months) {
        if (month < a.opening_period) continue;
        const s = statement(p, a, month);
        const preserved = p.snapshots.some(
          (x) => x.account_id === a.id && x.period === month,
        );
        if ((accountOpenInMonth(a,month) || preserved)&&(!postedOnly||preserved)) {
          charges = charges.plus(add(s.lines.map((l) => l.amount)));
          for (const warning of s.warnings)
            warnings.add(`${month}: ${warning}`);
        } else if (month < p.settings.period&&!postedOnly) {
          warnings.add(
            `${month}: ${p.settings.language === "ru" ? "у закрытого счёта нет сохранённого начисления" : "contul închis nu are un calcul păstrat"}`,
          );
        }
        adjustments = adjustments.plus(s.adjustment);
        paid = paid.plus(s.paid);
        if (s.gaps.length)
          warnings.add(
            `${month}: ${p.settings.language === "ru" ? "пропущена закрытая история" : "istoricul închis lipsește"} ${s.gaps.join(", ")}`,
          );
      }
      // Move only dated boundary transactions; complete-month results remain unchanged.
      for(const month of [...new Set([from,to])]){
        if(month<a.opening_period)continue;
        for(const event of monthChargeEvents(p,a,month,postedOnly,eventIndex)){
          const before=event.date<range.fromDate,after=event.date>range.toDate;
          if(!before&&!after)continue;
          if(event.kind==='charge')charges=charges.minus(event.amount);else adjustments=adjustments.minus(event.amount);
          if(before)opening=money(D(opening).plus(event.amount),p);
        }
      }
      for(const payment of p.payments.filter(pay=>pay.account_id===a.id&&pay.payment_date>=from+'-01'&&pay.payment_date<monthNext(to)+'-01')){
        if(payment.payment_date<range.fromDate){opening=money(D(opening).minus(payment.amount),p);paid=paid.minus(payment.amount);}
        else if(payment.payment_date>range.toDate)paid=paid.minus(payment.amount);
      }
      return {
        account_id: a.id,
        number: a.number,
        payer: a.payer_name,
        active: a.active,
        opening,
        charges: money(charges, p),
        adjustments: money(adjustments, p),
        paid: money(paid, p),
        closing: money(
          D(opening).plus(charges).plus(adjustments).minus(paid),
          p,
        ),
        warnings: [...warnings],
      };
    }).filter(row=>!attentionOnly||row.warnings.length>0);
  const totals = Object.fromEntries(
    ["opening", "charges", "adjustments", "paid", "closing"].map((key) => [
      key,
      money(
        add(rows.map((r) => r[key as keyof AccountReportRow] as string)),
        p,
      ),
    ]),
  ) as Record<
    "opening" | "charges" | "adjustments" | "paid" | "closing",
    string
  >;
  return {
    from,
    to,
    rows,
    totals,
    incomplete: rows.some((r) => r.warnings.length > 0),
  };
}

export function accountReportCSV(p: Project, from: string, to: string,attentionOnly=false) {
  const r = accountBalanceReport(p, from, to,attentionOnly);
  const headers =
    p.settings.language === "ru"
      ? [
          "Счёт",
          "Плательщик",
          "Остаток на начало",
          "Начислено",
          "Корректировки",
          "Оплачено",
          "Остаток на конец",
          "Проверка",
        ]
      : [
          "Cont",
          "Plătitor",
          "Sold inițial",
          "Calculat",
          "Ajustări",
          "Achitat",
          "Sold final",
          "Verificare",
        ];
  return csv([
    headers,
    ...r.rows.map((x) => [
      x.number,
      x.payer,
      x.opening,
      x.charges,
      x.adjustments,
      x.paid,
      x.closing,
      x.warnings.join("; "),
    ]),
  ]);
}
