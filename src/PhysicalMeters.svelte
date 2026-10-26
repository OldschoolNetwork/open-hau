<script lang="ts">
  import { translator } from "./i18n";
  import { issueText } from "./validation-language";
  import {
    projectSchema,
    uid,
    today,
    type Project,
    type PhysicalMeter,
    type PhysicalMeterValue,
  } from "./model";
  export let project: Project;
  export let onapply: (next: Project) => void;
  let meter: PhysicalMeter | null = null,
    reading: PhysicalMeterValue | null = null,
    error = "";
  $: tr = translator(project.settings.language);
  function newMeter() {
    meter = {
      id: uid(),
      scope: "individual",
      account_id: project.accounts.find((a) => a.active)?.id || "",
      service_id: project.services[0]?.id || "",
      label: "",
      serial_number: "",
      unit: "m³",
      active: true,
      installed_on: null,
      retired_on: null,
      initial_value: "",
    };
    reading = null;
    error = "";
  }
  function newReading(id: string) {
    reading = {
      id: uid(),
      meter_id: id,
      period: project.settings.period,
      reading_date: today(),
      value: "",
      kind: "regular",
      notes: "",
    };
    meter = null;
    error = "";
  }
  function commit(kind: "meter" | "reading") {
    try {
      error = "";
      const next = structuredClone(project);
      if (kind === "meter" && meter) {
        const value = {
          ...meter,
          account_id: meter.scope === "shared" ? "" : meter.account_id,
          installed_on: meter.installed_on || null,
          retired_on: meter.retired_on || null,
        };
        const index = next.meters.findIndex((m) => m.id === value.id);
        if (index < 0) next.meters.push(value);
        else next.meters[index] = value;
      } else if (kind === "reading" && reading) {
        const old = next.meter_values.find((r) => r.id === reading!.id);
        if (
          next.closed_periods.includes(reading.period) ||
          (old && next.closed_periods.includes(old.period))
        )
          throw Error(
            tr(
              "Период закрыт. Показания не изменены.",
              "Perioada este închisă. Indexurile nu au fost modificate.",
            ),
          );
        const index = next.meter_values.findIndex((r) => r.id === reading!.id);
        if (index < 0) next.meter_values.push({ ...reading });
        else next.meter_values[index] = { ...reading };
      }
      const result = projectSchema.safeParse(next);
      if (!result.success)
        throw Error(
          result.error.issues
            .slice(0, 3)
            .map((i) => issueText(i, project.settings.language))
            .join("; "),
        );
      onapply(result.data);
      meter = null;
      reading = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<article class="panel meters-panel">
  <div class="meter-heading">
    <div>
      <h2>{tr("Физические счётчики", "Contoare fizice")}</h2>
      <p>
        {tr(
          "Номер прибора, даты и накопительные показания. Расход рассчитывается отдельно для каждого счётчика.",
          "Numărul contorului, datele și indexurile cumulative. Consumul se calculează separat pentru fiecare contor.",
        )}
      </p>
    </div>
    <button class="button secondary" onclick={newMeter}
      >{tr("Добавить счётчик", "Adaugă contor")}</button
    >
  </div>
  {#if error}<p class="alert error" role="alert">{error}</p>{/if}
  {#if meter}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        commit("meter");
      }}
    >
      <div class="meter-fields">
        <label
          >{tr("Название прибора", "Denumirea contorului")}<input
            required
            bind:value={meter.label}
          /></label
        >
        <label
          >{tr("Заводской номер", "Număr de serie")}<input
            bind:value={meter.serial_number}
          /></label
        >
        <label
          >{tr("Назначение", "Destinație")}<select bind:value={meter.scope}
            ><option value="individual"
              >{tr("Индивидуальный", "Individual")}</option
            ><option value="shared">{tr("Общий", "Comun")}</option></select
          ></label
        >
        {#if meter.scope === "individual"}<label
            >{tr("Лицевой счёт", "Cont personal")}<select
              required
              bind:value={meter.account_id}
              >{#each project.accounts as a}<option value={a.id}
                  >{a.number} · {a.payer_name}</option
                >{/each}</select
            ></label
          >{/if}
        <label
          >{tr("Услуга", "Serviciu")}<select
            required
            bind:value={meter.service_id}
            >{#each project.services as s}<option value={s.id}
                >{s.name[project.settings.language]}</option
              >{/each}</select
          ></label
        >
        <label
          >{tr("Единица измерения", "Unitate de măsură")}<input
            required
            bind:value={meter.unit}
          /></label
        >
        <label
          >{tr("Дата установки", "Data instalării")}<input
            type="date"
            bind:value={meter.installed_on}
          /></label
        >
        <label
          >{tr("Начальное показание", "Index inițial")}<input
            required
            inputmode="decimal"
            bind:value={meter.initial_value}
          /></label
        >
        <label
          >{tr("Дата снятия", "Data demontării")}<input
            type="date"
            bind:value={meter.retired_on}
          /></label
        >
        <label class="check"
          ><input type="checkbox" bind:checked={meter.active} />{tr(
            "Действующий прибор",
            "Contor activ",
          )}</label
        >
      </div>
      <p class="muted">
        {tr(
          "Без даты установки укажите начальное показание отдельной записью с датой. Для общего счётчика автоматическое распределение пока недоступно.",
          "Fără data instalării, introduceți indexul inițial printr-o înregistrare datată. Repartizarea automată a contorului comun nu este încă disponibilă.",
        )}
      </p>
      <div class="meter-actions">
        <button class="button" type="submit"
          >{tr("Применить счётчик", "Aplică contorul")}</button
        ><button
          class="button secondary"
          type="button"
          onclick={() => (meter = null)}>{tr("Отмена", "Anulare")}</button
        >
      </div>
    </form>
  {/if}
  {#if reading}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        commit("reading");
      }}
    >
      <h3>{project.meters.find((m) => m.id === reading?.meter_id)?.label}</h3>
      <div class="meter-fields">
        <label
          >{tr("Расчётный месяц", "Luna de calcul")}<input
            required
            type="month"
            bind:value={reading.period}
          /></label
        >
        <label
          >{tr("Дата показания", "Data citirii")}<input
            required
            type="date"
            bind:value={reading.reading_date}
          /></label
        >
        <label
          >{tr("Показание прибора", "Indexul contorului")}<input
            required
            inputmode="decimal"
            bind:value={reading.value}
          /></label
        >
        <label
          >{tr("Тип записи", "Tipul citirii")}<select bind:value={reading.kind}
            ><option value="initial">{tr("Начальное", "Inițial")}</option
            ><option value="regular">{tr("Очередное", "Periodic")}</option
            ><option value="final">{tr("При снятии", "Final")}</option></select
          ></label
        >
        <label
          >{tr("Примечание", "Notă")}<input bind:value={reading.notes} /></label
        >
      </div>
      <div class="meter-actions">
        <button class="button" type="submit"
          >{tr("Применить показание", "Aplică indexul")}</button
        ><button
          class="button secondary"
          type="button"
          onclick={() => (reading = null)}>{tr("Отмена", "Anulare")}</button
        >
      </div>
    </form>
  {/if}
  {#if !project.meters.length}<p class="muted">
      {tr(
        "Физические приборы ещё не добавлены. Сводные показания старого формата доступны ниже.",
        "Nu au fost adăugate contoare fizice. Indexurile agregate din formatul vechi sunt disponibile mai jos.",
      )}
    </p>{/if}
  {#each project.meters as m}
    <section class="meter-card">
      <div class="meter-heading">
        <div>
          <h3>{m.label} {m.serial_number ? `· ${m.serial_number}` : ""}</h3>
          <p>
            {m.scope === "shared"
              ? tr("Общий счётчик", "Contor comun")
              : project.accounts.find((a) => a.id === m.account_id)?.number} · {project.services.find(
              (s) => s.id === m.service_id,
            )?.name[project.settings.language]} · {m.unit}{!m.active
              ? ` · ${tr("Снят / неактивен", "Demontat / inactiv")}`
              : ""}
          </p>
        </div>
        <div class="meter-actions">
          <button
            class="button secondary"
            onclick={() => {
              meter = { ...m };
              reading = null;
              error = "";
            }}>{tr("Изменить прибор", "Modifică contorul")}</button
          ><button
            class="button secondary"
            disabled={project.closed_periods.includes(project.settings.period)}
            onclick={() => newReading(m.id)}
            >{tr("Внести показание", "Adaugă index")}</button
          >
        </div>
      </div>
      <details>
        <summary>{tr("История показаний", "Istoricul citirilor")}</summary>
        <div class="table-wrap">
          <table>
            <thead
              ><tr
                ><th>{tr("Месяц", "Luna")}</th><th>{tr("Дата", "Data")}</th><th
                  >{tr("Показание", "Index")}</th
                ><th>{tr("Примечание", "Notă")}</th><th
                  >{tr("Действие", "Acțiune")}</th
                ></tr
              ></thead
            ><tbody
              >{#each project.meter_values
                .filter((r) => r.meter_id === m.id)
                .sort( (a, b) => b.reading_date.localeCompare(a.reading_date) ) as r}<tr
                  ><td>{r.period}</td><td>{r.reading_date}</td><td>{r.value}</td
                  ><td>{r.notes}</td><td
                    ><button
                      class="button secondary"
                      disabled={project.closed_periods.includes(r.period)}
                      onclick={() => {
                        reading = { ...r };
                        meter = null;
                        error = "";
                      }}>{tr("Изменить показание", "Modifică indexul")}</button
                    ></td
                  ></tr
                >{/each}</tbody
            >
          </table>
        </div>
      </details>
    </section>
  {/each}
</article>

<style>
  .meters-panel {
    padding: 20px;
    margin-bottom: 24px;
  }
  .meter-heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 16px;
    flex-wrap: wrap;
  }
  .meter-heading h2,
  .meter-heading h3 {
    margin: 0 0 8px;
  }
  .meter-heading p {
    margin: 0 0 12px;
    color: var(--muted);
  }
  .meter-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin: 18px 0;
  }
  .meter-fields label {
    display: grid;
    gap: 6px;
  }
  .meter-fields .check {
    display: flex;
    align-items: center;
  }
  .meter-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .meter-card {
    border-top: 1px solid var(--border);
    padding-top: 18px;
    margin-top: 18px;
  }
  form {
    padding: 16px 0;
    border-top: 1px solid var(--border);
  }
  summary {
    cursor: pointer;
    padding: 8px 0;
  }
</style>
