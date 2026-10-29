import {uiText} from "./english";
import type {
  Project,
  CashTransaction,
  CashAccount,
  ReserveFund,
} from "./model";
import { projectSchema } from "./model";
import { D, money, csv } from "./engine";

function walletDelta(tx: CashTransaction, walletId: string) {
  if (tx.kind === "income" && tx.wallet_id === walletId) return D(tx.amount);
  if (tx.kind === "expense" && tx.wallet_id === walletId)
    return D(tx.amount).negated();
  if (tx.kind === "transfer")
    return D(tx.to_wallet_id === walletId ? tx.amount : "0").minus(
      tx.from_wallet_id === walletId ? tx.amount : "0",
    );
  return D(0);
}
function fundDelta(tx: CashTransaction, fundId: string) {
  if (tx.kind === "income" && tx.fund_id === fundId) return D(tx.amount);
  if (tx.kind === "expense" && tx.fund_id === fundId)
    return D(tx.amount).negated();
  if (tx.kind === "fund_transfer")
    return D(tx.to_fund_id === fundId ? tx.amount : "0").minus(
      tx.from_fund_id === fundId ? tx.amount : "0",
    );
  return D(0);
}
export function treasuryReport(p: Project, from: string, to: string) {
  const validDate = (value: string) =>
    /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value) &&
    !isNaN(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  if (!validDate(from) || !validDate(to) || from > to)
    throw Error(
      uiText("Укажите корректный диапазон дат","Indicați un interval corect de date",p.settings.language),
    );
  const transactions = p.treasury.transactions.filter((tx) => tx.date <= to);
  const wallets = p.treasury.wallets
    .filter((w) => w.opening_date <= to)
    .map((w) => {
      const earlier = transactions.filter((tx) => tx.date < from),
        current = transactions.filter((tx) => tx.date >= from);
      const opening = D(w.opening_date < from ? w.opening_balance : "0").plus(
        earlier.reduce((s, tx) => s.plus(walletDelta(tx, w.id)), D(0)),
      );
      const movement = current.reduce(
          (s, tx) => s.plus(walletDelta(tx, w.id)),
          D(0),
        ),
        introduced = D(w.opening_date >= from ? w.opening_balance : "0");
      return {
        id: w.id,
        name: w.name,
        kind: w.kind,
        opening: money(opening, p),
        introduced: money(introduced, p),
        movement: money(movement, p),
        closing: money(opening.plus(introduced).plus(movement), p),
      };
    });
  const funds = p.treasury.funds
    .filter((f) => f.opening_date <= to)
    .map((f) => ({
      id: f.id,
      name: f.name,
      balance: money(
        D(f.opening_balance).plus(
          transactions.reduce((s, tx) => s.plus(fundDelta(tx, f.id)), D(0)),
        ),
        p,
      ),
    }));
  const income = transactions
    .filter((tx) => tx.kind === "income" && tx.date >= from)
    .reduce((s, tx) => s.plus(tx.amount), D(0));
  const expense = transactions
    .filter((tx) => tx.kind === "expense" && tx.date >= from)
    .reduce((s, tx) => s.plus(tx.amount), D(0));
  const cash = wallets.reduce((s, w) => s.plus(w.closing), D(0)),
    reserved = funds.reduce((s, f) => s.plus(f.balance), D(0));
  const warnings = [
    ...wallets
      .filter((w) => D(w.closing).lt(0))
      .map((w) => ({ kind: "wallet" as const, name: w.name })),
    ...funds
      .filter((f) => D(f.balance).lt(0))
      .map((f) => ({ kind: "fund" as const, name: f.name })),
    ...(cash.minus(reserved).lt(0)
      ? [{ kind: "unassigned" as const, name: "" }]
      : []),
  ];
  return {
    from,
    to,
    wallets,
    funds,
    warnings,
    income: money(income, p),
    expense: money(expense, p),
    net: money(income.minus(expense), p),
    cash: money(cash, p),
    reserved: money(reserved, p),
    unassigned: money(cash.minus(reserved), p),
    transactions: transactions
      .filter((tx) => tx.date >= from)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
  };
}
export function treasuryItemUsed(
  p: Project,
  key: "wallets" | "funds",
  id: string,
) {
  return p.treasury.transactions.some((tx) =>
    key === "wallets"
      ? ("wallet_id" in tx && tx.wallet_id === id) ||
        (tx.kind === "transfer" &&
          (tx.from_wallet_id === id || tx.to_wallet_id === id))
      : ("fund_id" in tx && tx.fund_id === id) ||
        (tx.kind === "fund_transfer" &&
          (tx.from_fund_id === id || tx.to_fund_id === id)),
  );
}
export function saveTreasuryItem(
  p: Project,
  key: "wallets" | "funds",
  item: CashAccount | ReserveFund,
) {
  const next = structuredClone(p),
    items = next.treasury[key] as (CashAccount | ReserveFund)[],
    index = items.findIndex((x) => x.id === item.id),
    old = items[index],
    lock = p.treasury.locked_through;
  const changedOpening =
    !old ||
    old.opening_date !== item.opening_date ||
    !D(old.opening_balance).eq(item.opening_balance) ||
    ("kind" in old && "kind" in item && old.kind !== item.kind);
  if (
    changedOpening &&
    ((old && treasuryItemUsed(p, key, item.id)) ||
      (lock &&
        (item.opening_date <= lock || (old && old.opening_date <= lock))))
  )
    throw Error(
      uiText("Начальные данные защищены: есть операции или зафиксированная история. Название и активность можно изменить.","Datele inițiale sunt protejate: există operațiuni sau istoric blocat. Denumirea și starea activă pot fi modificate.",p.settings.language),
    );
  if (index < 0) items.push(structuredClone(item));
  else items[index] = structuredClone(item);
  return projectSchema.parse(next);
}
export function setTreasuryLock(p: Project, date: string | null) {
  const next = structuredClone(p);
  next.treasury.locked_through = date;
  return projectSchema.parse(next);
}
export function applyCashTransaction(p: Project, tx: CashTransaction) {
  const old = p.treasury.transactions.find((x) => x.id === tx.id),
    lock = p.treasury.locked_through;
  if (lock && (tx.date <= lock || (old && old.date <= lock)))
    throw Error(
      uiText("Финансовый журнал за эту дату зафиксирован","Registrul financiar pentru această dată este blocat",p.settings.language),
    );
  const next = structuredClone(p),
    index = next.treasury.transactions.findIndex((x) => x.id === tx.id);
  if (index < 0) next.treasury.transactions.push(structuredClone(tx));
  else next.treasury.transactions[index] = structuredClone(tx);
  return projectSchema.parse(next);
}
export function treasuryCSV(p: Project, from: string, to: string) {
  const report = treasuryReport(p, from, to),
    ru = p.settings.language === "ru";
  const labels = {
    income: ru ? "Поступление" : "Încasare",
    expense: ru ? "Расход" : "Cheltuială",
    transfer: ru ? "Перевод между счетами" : "Transfer între conturi",
    fund_transfer: ru ? "Перераспределение фонда" : "Repartizare între fonduri",
  };
  const wallet = (id: string) =>
      p.treasury.wallets.find((w) => w.id === id)?.name || id,
    fund = (id: string) =>
      id
        ? p.treasury.funds.find((f) => f.id === id)?.name || id
        : ru
          ? "Без назначения"
          : "Fără destinație";
  return csv([
    ru
      ? [
          "Дата",
          "Вид",
          "Сумма MDL",
          "Счёт / из счёта",
          "В счёт",
          "Фонд / из фонда",
          "В фонд",
          "Категория",
          "Контрагент",
          "Документ",
          "Примечание",
          "Связанные платежи",
        ]
      : [
          "Data",
          "Tip",
          "Suma MDL",
          "Cont / din cont",
          "În cont",
          "Fond / din fond",
          "În fond",
          "Categorie",
          "Partener",
          "Document",
          "Notă",
          "Plăți asociate",
        ],
    ...report.transactions.map((tx) => [
      tx.date,
      labels[tx.kind],
      tx.amount,
      "wallet_id" in tx
        ? wallet(tx.wallet_id)
        : tx.kind === "transfer"
          ? wallet(tx.from_wallet_id)
          : "",
      tx.kind === "transfer" ? wallet(tx.to_wallet_id) : "",
      "fund_id" in tx
        ? fund(tx.fund_id)
        : tx.kind === "fund_transfer"
          ? fund(tx.from_fund_id)
          : "",
      tx.kind === "fund_transfer" ? fund(tx.to_fund_id) : "",
      "category" in tx ? tx.category : "",
      "counterparty" in tx ? tx.counterparty : "",
      tx.reference,
      tx.notes,
      tx.kind === "income" ? tx.linked_payment_ids.join(", ") : "",
    ]),
  ]);
}
