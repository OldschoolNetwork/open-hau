<script lang="ts">
 import {languageOverrides} from "./localization";
  import {displayDate,displayPeriod} from "./date-format";
  import { translator } from "./i18n";
  import { ZodError } from "zod";
  import {
    uid,
    today,
    type Project,
    type CashAccount,
    type ReserveFund,
    type CashTransaction,
  } from "./model";
  import { D, money } from "./engine";
  import {
    applyCashTransaction,
    saveTreasuryItem,
    setTreasuryLock,
    treasuryItemUsed,
    treasuryReport,
    treasuryCSV,
  } from "./treasury";
  import { issueText } from "./validation-language";
  import { exportText, ask } from "./storage";
  export let project: Project;
  export let onapply: (next: Project) => void;
  let error = "",
    draft: CashTransaction | null = null,
    itemDraft: CashAccount | ReserveFund | null = null,
    itemKind: "wallets" | "funds" = "wallets",
    lockDate = "",
    linkPeriod = project.settings.period;
  $: tr = translator(project.settings.language,$languageOverrides);
  $: operationLabels = {
      income: tr("Поступление", "Încasare"),
      expense: tr("Расход", "Cheltuială"),
      transfer: tr("Между банком и кассой", "Între bancă și casă"),
      fund_transfer: tr("Распределение по фондам", "Repartizare între fonduri"),
    };
  $: month = project.settings.period;
  $: from = month + "-01";
  $: to =
    month +
    "-" +
    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  $: report = treasuryReport(project, from, to);
  $: itemLocked =
    !!itemDraft &&
    !!project.treasury[itemKind].find((x) => x.id === itemDraft?.id) &&
    (treasuryItemUsed(project, itemKind, itemDraft.id) ||
      (!!project.treasury.locked_through &&
        itemDraft.opening_date <= project.treasury.locked_through));
  $: linkedIds = new Set(
    project.treasury.transactions
      .filter((tx) => tx.kind === "income" && tx.id !== draft?.id)
      .flatMap((tx) => (tx.kind === "income" ? tx.linked_payment_ids : [])),
  );
  $: selectedLinks = draft?.kind === "income" ? draft.linked_payment_ids : [];
  $: paymentOptions = project.payments.filter(
    (pay) =>
      !linkedIds.has(pay.id) &&
      (pay.payment_date.startsWith(linkPeriod) ||
        selectedLinks.includes(pay.id)),
  );
  $: selectedAmount = money(
    project.payments
      .filter((pay) => selectedLinks.includes(pay.id))
      .reduce((sum, pay) => sum.plus(pay.amount), D(0)),
    project,
  );
  const walletName = (id: string) =>
    project.treasury.wallets.find((w) => w.id === id)?.name || id;
  const fundName = (id: string) =>
    id
      ? project.treasury.funds.find((f) => f.id === id)?.name || id
      : tr("Без назначения", "Fără destinație");
  function fail(e: unknown) {
    error =
      e instanceof ZodError
        ? e.issues
            .slice(0, 4)
            .map((i) => issueText(i, project.settings.language))
            .join("; ")
        : e instanceof Error
          ? e.message
          : String(e);
  }
  function newItem(key: "wallets" | "funds", item?: CashAccount | ReserveFund) {
    itemKind = key;
    error = "";
    itemDraft = item
      ? structuredClone(item)
      : {
          id: uid(),
          name: "",
          opening_date: from,
          opening_balance: "0.00",
          active: true,
          ...(key === "wallets" ? { kind: "bank" as const } : {}),
        };
  }
  function saveItem() {
    try {
      if (itemDraft) {
        onapply(saveTreasuryItem(project, itemKind, itemDraft));
        itemDraft = null;
        error = "";
      }
    } catch (e) {
      fail(e);
    }
  }
  function newTransaction(kind: CashTransaction["kind"]) {
    error = "";
    const common = {
      id: uid(),
      date: today().startsWith(month) ? today() : from,
      amount: "0.00",
      reference: "",
      notes: "",
    };
    const wallets = project.treasury.wallets.filter((w) => w.active);
    if (kind === "income")
      draft = {
        ...common,
        kind,
        wallet_id: wallets[0]?.id || "",
        fund_id: "",
        category: "",
        counterparty: "",
        linked_payment_ids: [],
      };
    if (kind === "expense")
      draft = {
        ...common,
        kind,
        wallet_id: wallets[0]?.id || "",
        fund_id: "",
        category: "",
        counterparty: "",
      };
    if (kind === "transfer")
      draft = {
        ...common,
        kind,
        from_wallet_id: wallets[0]?.id || "",
        to_wallet_id: wallets[1]?.id || "",
      };
    if (kind === "fund_transfer")
      draft = {
        ...common,
        kind,
        from_fund_id: "",
        to_fund_id: project.treasury.funds.find((f) => f.active)?.id || "",
      };
  }
  function saveTransaction() {
    try {
      if (draft) {
        onapply(applyCashTransaction(project, draft));
        draft = null;
        error = "";
      }
    } catch (e) {
      fail(e);
    }
  }
  async function lock(value: string | null) {
    try {
      if (
        await ask(
          value
            ? tr(
                "Зафиксировать финансовые операции по указанную дату включительно?",
                "Blocați operațiunile financiare până la data indicată inclusiv?",
              )
            : tr(
                "Снять фиксацию финансового журнала для исправлений?",
                "Deblocați registrul financiar pentru corectări?",
              ),
        )
      ) {
        onapply(setTreasuryLock(project, value));
        error = "";
      }
    } catch (e) {
      fail(e);
    }
  }
  async function download() {
    try {
      await exportText(
        `OpenHaU-cashbook-${month}.csv`,
        treasuryCSV(project, from, to),
        "csv",
      );
      error = "";
    } catch (e) {
      fail(e);
    }
  }
</script>

<p class="quiet-note">
  {tr(
    "Деньги организации учитываются отдельно от начислений и долгов жильцов. Остатки банка, кассы и фондов вводятся по подтверждённым данным. Связь с оплатами жильцов задаётся вручную и не создаёт повторную оплату.",
    "Banii organizației se evidențiază separat de sumele calculate și datoriile locatarilor. Soldurile băncii, casei și fondurilor se introduc pe baza datelor confirmate. Asocierea cu plățile locatarilor se face manual și nu creează o plată duplicată.",
  )}
</p>
{#if error}<p class="alert error" role="alert">{error}</p>{/if}
<div class="treasury-summary">
  <article class="panel">
    <h3>{tr("Банк и касса", "Bancă și casă")}</h3>
    <strong>{report.cash} MDL</strong>
    <p>{tr("Остаток на конец месяца", "Sold la sfârșitul lunii")}</p>
  </article>
  <article class="panel">
    <h3>{tr("Резервные фонды", "Fonduri de rezervă")}</h3>
    <strong>{report.reserved} MDL</strong>
    <p>{tr("Входят в деньги организации", "Incluse în banii organizației")}</p>
  </article>
  <article class="panel">
    <h3>{tr("Без назначения", "Fără destinație")}</h3>
    <strong>{report.unassigned} MDL</strong>
    <p>{tr("Банк и касса минус фонды", "Bancă și casă minus fonduri")}</p>
  </article>
</div>
{#each report.warnings as warning}<p class="alert error">
    {warning.kind === "unassigned"
      ? tr(
          "Сумма фондов превышает фактический остаток денег. Проверьте начальные остатки и назначения операций.",
          "Suma fondurilor depășește soldul efectiv al banilor. Verificați soldurile inițiale și destinațiile operațiunilor.",
        )
      : tr("Отрицательный остаток: ", "Sold negativ: ") + warning.name}
  </p>{/each}
<article class="panel">
  <div class="panel-heading">
    <h2>{tr("Банк, касса и фонды", "Bancă, casă și fonduri")}</h2>
    <div class="actions">
      <button class="button secondary small" onclick={() => newItem("wallets")}
        >{tr("Добавить банк / кассу", "Adăugare bancă / casă")}</button
      ><button class="button secondary small" onclick={() => newItem("funds")}
        >{tr("Добавить фонд", "Adăugare fond")}</button
      >
    </div>
  </div>
  {#if itemDraft}<form
      onsubmit={(e) => {
        e.preventDefault();
        saveItem();
      }}
    >
      <h3>
        {itemKind === "wallets"
          ? tr("Банк / касса", "Bancă / casă")
          : tr("Резервный фонд", "Fond de rezervă")}
      </h3>
      <div class="fields">
        <label
          >{tr("Название", "Denumire")}<input
            bind:value={itemDraft.name}
            required
          /></label
        >
        {#if "kind" in itemDraft}<label
            >{tr("Тип", "Tip")}<select
              bind:value={itemDraft.kind}
              disabled={itemLocked}
              ><option value="bank">{tr("Банк", "Bancă")}</option><option
                value="cash">{tr("Касса", "Casă")}</option
              ></select
            ></label
          >{/if}
        <label
          >{tr("Дата начального остатка", "Data soldului inițial")}<input
            type="date"
            bind:value={itemDraft.opening_date}
            disabled={itemLocked}
            required
          /></label
        ><label
          >{tr("Начальный остаток, MDL", "Sold inițial, MDL")}<input
            bind:value={itemDraft.opening_balance}
            disabled={itemLocked}
            required
          /></label
        >
      </div>
      <label class="check-row"
        ><input type="checkbox" bind:checked={itemDraft.active} />{tr(
          "Активен",
          "Activ",
        )}</label
      >
      {#if itemLocked}<p class="quiet-note">
          {tr(
            "Начальные данные защищены: есть операции или зафиксированная история.",
            "Datele inițiale sunt protejate: există operațiuni sau istoric blocat.",
          )}
        </p>{/if}
      <div class="actions">
        <button class="button" type="submit"
          >{tr("Применить", "Aplicare")}</button
        ><button
          class="text-button"
          type="button"
          onclick={() => (itemDraft = null)}>{tr("Отмена", "Anulare")}</button
        >
      </div>
    </form>{/if}
  <div class="table-wrap">
    <table>
      <thead
        ><tr
          ><th>{tr("Банк / касса", "Bancă / casă")}</th><th
            >{tr("На начало месяца", "La începutul lunii")}</th
          ><th
            >{tr(
              "Введено начальных остатков",
              "Solduri inițiale introduse",
            )}</th
          ><th>{tr("Движение", "Mișcare")}</th><th
            >{tr("На конец месяца", "La sfârșitul lunii")}</th
          ><th></th></tr
        ></thead
      ><tbody>
        {#each project.treasury.wallets as wallet}{@const row =
            report.wallets.find((w) => w.id === wallet.id)}<tr
            ><td
              >{wallet.name}<small
                >{wallet.kind === "bank"
                  ? tr("Банк", "Bancă")
                  : tr("Касса", "Casă")} · {wallet.active
                  ? tr("Активен", "Activ")
                  : tr("Архив", "Arhivă")}</small
              ></td
            ><td class="num">{row?.opening ?? "—"}</td><td class="num"
              >{row?.introduced ?? "—"}</td
            ><td class="num">{row?.movement ?? "—"}</td><td class="num"
              >{row?.closing ?? "—"}</td
            ><td
              ><button
                class="text-button"
                onclick={() => newItem("wallets", wallet)}
                >{tr("Изменить", "Modificare")}</button
              ></td
            ></tr
          >{:else}<tr
            ><td colspan="6"
              >{tr(
                "Банк и касса ещё не добавлены.",
                "Banca și casa nu au fost adăugate.",
              )}</td
            ></tr
          >{/each}
      </tbody>
    </table>
  </div>
  <div class="table-wrap">
    <table>
      <thead
        ><tr
          ><th>{tr("Фонд", "Fond")}</th><th
            >{tr(
              "Остаток на конец месяца, MDL",
              "Sold la sfârșitul lunii, MDL",
            )}</th
          ><th></th></tr
        ></thead
      ><tbody>
        {#each project.treasury.funds as fund}<tr
            ><td
              >{fund.name}<small
                >{fund.active
                  ? tr("Активен", "Activ")
                  : tr("Архив", "Arhivă")}</small
              ></td
            ><td class="num"
              >{report.funds.find((f) => f.id === fund.id)?.balance ?? "—"}</td
            ><td
              ><button
                class="text-button"
                onclick={() => newItem("funds", fund)}
                >{tr("Изменить", "Modificare")}</button
              ></td
            ></tr
          >{:else}<tr
            ><td colspan="3"
              >{tr(
                "Фонды ещё не добавлены.",
                "Fondurile nu au fost adăugate.",
              )}</td
            ></tr
          >{/each}
      </tbody>
    </table>
  </div>
</article>
<article class="panel">
  <div class="panel-heading">
    <div>
      <h2>{tr("Финансовый журнал", "Registru financiar")} · {month}</h2>
      <p>
        {tr("Поступления", "Încasări")}: {report.income} MDL · {tr(
          "Расходы",
          "Cheltuieli",
        )}: {report.expense} MDL · {tr("Разница", "Diferență")}: {report.net} MDL
      </p>
    </div>
    <button class="button secondary small" onclick={download}
      >{tr("Экспорт операций CSV", "Export operațiuni CSV")}</button
    >
  </div>
  <div class="actions">
    {#each ["income", "expense", "transfer", "fund_transfer"] as kind}<button
        class="button secondary small"
        onclick={() => newTransaction(kind as CashTransaction["kind"])}
        >{operationLabels[kind as CashTransaction["kind"]]}</button
      >{/each}
  </div>
  {#if draft}<form
      onsubmit={(e) => {
        e.preventDefault();
        saveTransaction();
      }}
    >
      <h3>{operationLabels[draft.kind]}</h3>
      <div class="fields">
        <label
          >{tr("Дата операции", "Data operațiunii")}<input
            type="date"
            bind:value={draft.date}
            required
          /></label
        ><label
          >{tr("Сумма, MDL", "Suma, MDL")}<input
            bind:value={draft.amount}
            required
          /></label
        >
        {#if draft.kind === "income" || draft.kind === "expense"}
          <label
            >{tr("Банк / касса", "Bancă / casă")}<select
              bind:value={draft.wallet_id}
              >{#each project.treasury.wallets.filter((w) => w.active || ("wallet_id" in draft! && w.id === draft!.wallet_id)) as wallet}<option
                  value={wallet.id}>{wallet.name}</option
                >{/each}</select
            ></label
          >
          <label
            >{tr("Назначение фонда", "Destinația fondului")}<select
              bind:value={draft.fund_id}
              ><option value=""
                >{tr("Без назначения", "Fără destinație")}</option
              >{#each project.treasury.funds as fund}<option value={fund.id}
                  >{fund.name}</option
                >{/each}</select
            ></label
          >
          <label
            >{tr("Категория", "Categorie")}<input
              bind:value={draft.category}
              required
            /></label
          ><label
            >{tr("Контрагент", "Partener")}<input
              bind:value={draft.counterparty}
            /></label
          >
        {:else if draft.kind === "transfer"}
          <label
            >{tr("Из банка / кассы", "Din bancă / casă")}<select
              bind:value={draft.from_wallet_id}
              >{#each project.treasury.wallets as wallet}<option
                  value={wallet.id}>{wallet.name}</option
                >{/each}</select
            ></label
          ><label
            >{tr("В банк / кассу", "În bancă / casă")}<select
              bind:value={draft.to_wallet_id}
              >{#each project.treasury.wallets as wallet}<option
                  value={wallet.id}>{wallet.name}</option
                >{/each}</select
            ></label
          >
        {:else}
          <label
            >{tr("Из фонда", "Din fond")}<select bind:value={draft.from_fund_id}
              ><option value=""
                >{tr("Без назначения", "Fără destinație")}</option
              >{#each project.treasury.funds as fund}<option value={fund.id}
                  >{fund.name}</option
                >{/each}</select
            ></label
          ><label
            >{tr("В фонд", "În fond")}<select bind:value={draft.to_fund_id}
              ><option value=""
                >{tr("Без назначения", "Fără destinație")}</option
              >{#each project.treasury.funds as fund}<option value={fund.id}
                  >{fund.name}</option
                >{/each}</select
            ></label
          >
        {/if}
        <label
          >{tr("Номер документа / ссылка", "Număr document / referință")}<input
            bind:value={draft.reference}
          /></label
        >
      </div>
      <label
        >{tr("Примечание", "Notă")}<textarea bind:value={draft.notes}
        ></textarea></label
      >
      {#if draft.kind === "income"}<details>
          <summary
            >{tr(
              "Связать с существующими оплатами жильцов",
              "Asociere cu plățile existente ale locatarilor",
            )}</summary
          >
          <p class="quiet-note">
            {tr(
              "Связь необязательна. Сумма выбранных оплат должна точно совпадать с поступлением. Уже связанные оплаты исключены.",
              "Asocierea este opțională. Suma plăților selectate trebuie să corespundă exact încasării. Plățile deja asociate sunt excluse.",
            )}
          </p>
          <label
            >{tr("Месяц оплат", "Luna plăților")}<input
              type="month"
              bind:value={linkPeriod}
            /></label
          ><label
            >{tr("Оплаты жильцов", "Plățile locatarilor")}<select
              multiple
              size="5"
              bind:value={draft.linked_payment_ids}
              >{#each paymentOptions as pay}<option value={pay.id}
                  >{displayDate(pay.payment_date,project)} · {project.accounts.find(
                    (a) => a.id === pay.account_id,
                  )?.number} · {pay.amount} MDL · {pay.note}</option
                >{/each}</select
            ></label
          >
          <p>
            {tr("Выбрано на сумму", "Suma selectată")}: {selectedAmount} MDL
          </p>
        </details>{/if}
      <div class="actions">
        <button class="button" type="submit"
          >{tr("Применить операцию", "Aplicare operațiune")}</button
        ><button
          class="text-button"
          type="button"
          onclick={() => (draft = null)}>{tr("Отмена", "Anulare")}</button
        >
      </div>
    </form>{/if}
  <div class="table-wrap">
    <table>
      <thead
        ><tr
          ><th>{tr("Дата", "Data")}</th><th
            >{tr("Операция / категория", "Operațiune / categorie")}</th
          ><th>{tr("Банк, касса / фонд", "Bancă, casă / fond")}</th><th
            >{tr("Документ / контрагент", "Document / partener")}</th
          ><th class="num">MDL</th><th></th></tr
        ></thead
      ><tbody>
        {#each report.transactions as tx}<tr
            ><td>{displayDate(tx.date,project)}</td><td
              >{operationLabels[tx.kind]}<small
                >{"category" in tx ? tx.category : ""}</small
              ></td
            ><td
              >{"wallet_id" in tx
                ? walletName(tx.wallet_id)
                : tx.kind === "transfer"
                  ? walletName(tx.from_wallet_id) +
                    " → " +
                    walletName(tx.to_wallet_id)
                  : ""}<small
                >{"fund_id" in tx
                  ? fundName(tx.fund_id)
                  : tx.kind === "fund_transfer"
                    ? fundName(tx.from_fund_id) +
                      " → " +
                      fundName(tx.to_fund_id)
                    : ""}</small
              ></td
            ><td
              >{tx.reference}<small
                >{"counterparty" in tx ? tx.counterparty : ""}</small
              ><small>{tx.notes}</small></td
            ><td class="num">{tx.amount}</td><td
              ><button
                class="text-button"
                disabled={!!project.treasury.locked_through &&
                  tx.date <= project.treasury.locked_through}
                onclick={() => {
                  draft = structuredClone(tx);
                  error = "";
                }}>{tr("Изменить", "Modificare")}</button
              ></td
            ></tr
          >{:else}<tr
            ><td colspan="6"
              >{tr(
                "За выбранный месяц операций нет.",
                "Nu există operațiuni pentru luna selectată.",
              )}</td
            ></tr
          >{/each}
      </tbody>
    </table>
  </div>
</article>
<article class="panel">
  <h2>
    {tr("Фиксация финансового журнала", "Blocarea registrului financiar")}
  </h2>
  <p>
    {tr("Зафиксировано по", "Blocat până la")}: {project.treasury
      .locked_through || "—"}. {tr(
      "Закрытие начислений жильцов управляется отдельно.",
      "Închiderea sumelor calculate pentru locatari se gestionează separat.",
    )}
  </p>
  <div class="actions">
    <label
      >{tr("По дату включительно", "Până la data inclusiv")}<input
        type="date"
        bind:value={lockDate}
      /></label
    ><button
      class="button secondary small"
      disabled={!lockDate}
      onclick={() => lock(lockDate)}>{tr("Зафиксировать", "Blocare")}</button
    >{#if project.treasury.locked_through}<button
        class="text-button"
        onclick={() => lock(null)}>{tr("Снять фиксацию", "Deblocare")}</button
      >{/if}
  </div>
</article>

<style>
  .treasury-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 20px;
  }
  .treasury-summary strong {
    font-size: 22px;
  }
  .treasury-summary p {
    color: var(--muted);
    font-size: 11px;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: end;
    flex-wrap: wrap;
    margin: 14px 0;
  }
  form {
    border: 1px solid var(--border);
    padding: 18px;
    margin: 18px 0;
  }
  details {
    margin: 16px 0;
  }
  summary {
    cursor: pointer;
  }
  select[multiple] {
    width: 100%;
  }
  @media (max-width: 1050px) {
    .treasury-summary {
      grid-template-columns: 1fr;
    }
  }
</style>
