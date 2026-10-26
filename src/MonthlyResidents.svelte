<script lang="ts">
  import { translator } from "./i18n";
  import { issueText } from "./validation-language";
  import {
    projectSchema,
    uid,
    type Project,
    type MonthlyOccupancy,
  } from "./model";
  import { monthlyPersons } from "./occupancy";
  export let project: Project;
  export let onapply: (next: Project) => void;
  let draft: MonthlyOccupancy | null = null,
    error = "";
  $: tr = translator(project.settings.language);
  function edit(accountId: string, apartment = "") {
    const period = project.settings.period;
    const saved = project.monthly_occupancy.find(
      (r) =>
        r.account_id === accountId &&
        r.apartment === apartment &&
        r.period === period,
    );
    const last = project.monthly_occupancy
      .filter(
        (r) =>
          r.account_id === accountId &&
          r.apartment === apartment &&
          r.period < period,
      )
      .sort((a, b) => b.period.localeCompare(a.period))[0];
    draft = saved
      ? { ...saved }
      : {
          id: uid(),
          account_id: accountId,
          apartment,
          period,
          mode: last?.mode || "direct",
          previous: last?.mode === "cumulative" ? last.current : 0,
          current: last?.mode === "cumulative" ? last.current : 0,
          notes: "",
        };
    error = "";
  }
  function apply() {
    try {
      if (!draft) return;
      if (project.closed_periods.includes(draft.period))
        throw Error(
          tr(
            "Месяц закрыт. Запись не изменена.",
            "Luna este închisă. Înregistrarea nu a fost modificată.",
          ),
        );
      const next = structuredClone(project),
        value = {
          ...draft,
          previous: draft.mode === "direct" ? 0 : draft.previous,
        };
      const index = next.monthly_occupancy.findIndex((r) => r.id === value.id);
      if (index < 0) next.monthly_occupancy.push(value);
      else next.monthly_occupancy[index] = value;
      const checked = projectSchema.safeParse(next);
      if (!checked.success)
        throw Error(
          checked.error.issues
            .slice(0, 3)
            .map((i) => issueText(i, project.settings.language))
            .join("; "),
        );
      onapply(checked.data);
      draft = null;
      error = "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<article class="panel residents">
  <h2>
    {tr("Проживающие и вывоз мусора", "Locatari și evacuarea deșeurilor")}
  </h2>
  <p>
    {tr(
      "Количество проживающих за выбранный месяц можно указать по всему счёту или отдельно по каждой квартире. Накопительный ввод: 7 − 3 = 4 человека. Это количество людей, а не показание физического прибора.",
      "Numărul de locatari pentru luna selectată poate fi introdus pe cont sau separat pentru fiecare apartament. Introducere cumulativă: 7 − 3 = 4 persoane. Este un număr de persoane, nu un index al unui contor fizic.",
    )}
  </p>
  {#if error}<p class="alert error" role="alert">{error}</p>{/if}
  {#if draft}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <h3>
        {project.accounts.find((a) => a.id === draft?.account_id)?.number} · {draft.period}
      </h3>
      <div class="fields">
        <label
          >{tr("Квартира / весь счёт", "Apartament / întregul cont")}<select
            bind:value={draft.apartment}
            onchange={() => draft && edit(draft.account_id, draft.apartment)}
            ><option value="">{tr("Весь лицевой счёт", "Întregul cont")}</option
            >{#each project.accounts.find((a) => a.id === draft?.account_id)?.apartments || [] as ap}<option
                value={ap}>{ap}</option
              >{/each}</select
          ></label
        >
        <label
          >{tr("Способ ввода", "Mod de introducere")}<select
            bind:value={draft.mode}
            ><option value="direct"
              >{tr("Человек в этом месяце", "Persoane în această lună")}</option
            ><option value="cumulative"
              >{tr(
                "Накопительный счётчик людей",
                "Registru cumulativ de persoane",
              )}</option
            ></select
          ></label
        >
        {#if draft.mode === "cumulative"}<label
            >{tr("Предыдущее значение", "Valoarea precedentă")}<input
              required
              type="number"
              min="0"
              step="1"
              bind:value={draft.previous}
            /></label
          >{/if}
        <label
          >{draft.mode === "direct"
            ? tr("Число проживающих", "Număr de locatari")
            : tr(
                "Новое накопительное значение",
                "Noua valoare cumulativă",
              )}<input
            required
            type="number"
            min="0"
            step="1"
            bind:value={draft.current}
          /></label
        >
        <label
          >{tr("Примечание", "Notă")}<input bind:value={draft.notes} /></label
        >
      </div>
      <p>
        {tr("Человек к начислению", "Persoane pentru calcul")}: {draft.mode ===
        "direct"
          ? draft.current
          : draft.current - draft.previous}
      </p>
      <div class="actions">
        <button class="button" type="submit"
          >{tr("Применить данные месяца", "Aplică datele lunii")}</button
        ><button
          class="button secondary"
          type="button"
          onclick={() => (draft = null)}>{tr("Отмена", "Anulare")}</button
        >
      </div>
    </form>
  {/if}
  <div class="table-wrap">
    <table>
      <thead
        ><tr
          ><th>{tr("Счёт / плательщик", "Cont / plătitor")}</th><th
            >{tr("Проживающих в месяце", "Locatari în lună")}</th
          ><th>{tr("Источник", "Sursă")}</th><th>{tr("Действие", "Acțiune")}</th
          ></tr
        ></thead
      ><tbody
        >{#each project.accounts.filter((a) => a.active && a.opening_period <= project.settings.period) as a}{@const result =
            monthlyPersons(project, a, project.settings.period)}<tr
            ><td>{a.number}<small>{a.payer_name}</small></td><td
              >{result.persons ?? tr("Не заполнено", "Necompletat")}</td
            ><td
              >{result.source === "monthly"
                ? tr("Месячные данные", "Date lunare")
                : tr(
                    "Значение из карточки счёта",
                    "Valoarea din fișa contului",
                  )}</td
            ><td
              ><button
                class="button secondary"
                disabled={project.closed_periods.includes(
                  project.settings.period,
                )}
                onclick={() => edit(a.id)}
                >{tr("Изменить месяц", "Modifică luna")}</button
              >{#each project.monthly_occupancy.filter((r) => r.account_id === a.id && r.period === project.settings.period && r.apartment) as r}<button
                  class="button secondary"
                  disabled={project.closed_periods.includes(r.period)}
                  onclick={() => edit(a.id, r.apartment)}
                  >{tr("Квартира", "Apartament")} {r.apartment}</button
                >{/each}</td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
</article>

<style>
  .residents {
    padding: 20px;
    margin-bottom: 24px;
  }
  .residents h2 {
    margin-top: 0;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin: 16px 0;
  }
  .fields label {
    display: grid;
    gap: 6px;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  form {
    border-top: 1px solid var(--border);
    padding: 12px 0;
  }
</style>
