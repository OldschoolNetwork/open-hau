<script lang="ts">
import {translatedName} from './localization';

 import {languageOverrides} from "./localization";
  import { translator } from "./i18n";
  import { issueText } from "./validation-language";
  import { projectSchema, uid, type Project, type SharedGroup } from "./model";
  import { sharedDistribution } from "./shared-consumption";
  export let project: Project;
  export let onapply: (next: Project) => void;
  let draft: SharedGroup | null = null,
    error = "";
  $: tr = translator(project.settings.language,$languageOverrides);
  function create() {
    draft = {
      id: uid(),
      name: "",
      shared_meter_id:
        project.meters.find((m) => m.scope === "shared")?.id || "",
      difference_service_id: "",
      individual_meter_ids: [],
      effective_from: project.settings.period,
      effective_to: null,
      precision: 4,
      allow_negative: false,
      exclusions: [],
    };
    error = "";
  }
  function apply() {
    try {
      if (!draft) return;
      const old = project.shared_groups.find((g) => g.id === draft?.id);
      if (old) {
        const frozen = project.closed_periods.filter(
          (month) =>
            old.effective_from <= month &&
            (!old.effective_to || old.effective_to >= month),
        );
        if (
          frozen.some(
            (month) =>
              draft!.effective_from > month ||
              (draft!.effective_to && draft!.effective_to < month),
          ) ||
          (frozen.length &&
            JSON.stringify([
              old.shared_meter_id,
              [...old.individual_meter_ids].sort(),
              old.precision,
              old.allow_negative,
              old.difference_service_id || "",
            ]) !==
              JSON.stringify([
                draft.shared_meter_id,
                [...draft.individual_meter_ids].sort(),
                draft.precision,
                draft.allow_negative,
                draft.difference_service_id || "",
              ]))
        )
          throw Error(
            tr(
              "Группа использовалась в закрытом месяце. Завершите её действие после закрытой истории и создайте новую группу для новых связей.",
              "Grupul a fost utilizat într-o lună închisă. Încheiați valabilitatea după istoricul închis și creați un grup nou pentru conexiunile noi.",
            ),
          );
      }
      const next = structuredClone(project),
        value = { ...draft, effective_to: draft.effective_to || null };
      const index = next.shared_groups.findIndex((g) => g.id === value.id);
      if (index < 0) next.shared_groups.push(value);
      else next.shared_groups[index] = value;
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
  function exception(groupId: string, accountId: string, exclude: boolean) {
    try {
      const period = project.settings.period;
      if (project.closed_periods.includes(period))
        throw Error(
          tr(
            "Месяц закрыт. Исключения не изменены.",
            "Luna este închisă. Excepțiile nu au fost modificate.",
          ),
        );
      const next = structuredClone(project),
        g = next.shared_groups.find((g) => g.id === groupId)!;
      let record = g.exclusions.find((e) => e.period === period);
      if (!record) {
        record = { period, account_ids: [], notes: "" };
        g.exclusions.push(record);
      }
      record.account_ids = record.account_ids.filter((id) => id !== accountId);
      if (exclude) record.account_ids.push(accountId);
      g.exclusions = g.exclusions.filter((e) => e.account_ids.length);
      onapply(projectSchema.parse(next));
      error = "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<article class="panel shared">
  <div class="heading">
    <div>
      <h2>
        {tr(
          "Общие счётчики и распределение разницы",
          "Contoare comune și repartizarea diferenței",
        )}
      </h2>
      <p>
        {tr(
          "Расход общего прибора минус расход всех подключённых индивидуальных приборов. Разница делится поровну между участвующими лицевыми счетами. Исключения действуют только в выбранном месяце.",
          "Consumul contorului comun minus consumul tuturor contoarelor individuale conectate. Diferența se împarte egal între conturile participante. Excepțiile se aplică doar lunii selectate.",
        )}
      </p>
    </div>
    <button
      class="button secondary"
      disabled={!project.meters.some((m) => m.scope === "shared")}
      onclick={create}>{tr("Добавить группу", "Adaugă grup")}</button
    >
  </div>
  {#if !project.meters.some((m) => m.scope === "shared")}<p>
      {tr(
        "Сначала добавьте общий прибор в разделе физических счётчиков.",
        "Adăugați mai întâi un contor comun în secțiunea contoarelor fizice.",
      )}
    </p>{/if}
  {#if error}<p class="alert error" role="alert">{error}</p>{/if}
  {#if draft}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div class="fields">
        <label
          >{tr("Название группы", "Denumirea grupului")}<input
            required
            bind:value={draft.name}
          /></label
        ><label
          >{tr("Общий прибор", "Contor comun")}<select
            required
            bind:value={draft.shared_meter_id}
            onchange={() => {
              if (draft) draft.individual_meter_ids = [];
            }}
            >{#each project.meters.filter((m) => m.scope === "shared") as m}<option
                value={m.id}>{m.label} · {m.serial_number} · {m.unit}</option
              >{/each}</select
          ></label
        ><label
          >{tr("Услуга для начисления расхождений", "Serviciu pentru facturarea diferențelor")}<select bind:value={draft.difference_service_id}>
            <option value="">{tr("Тариф основной услуги", "Tariful serviciului de bază")}</option>
            {#each project.services.filter(s => !project.meters.some(m => m.service_id === s.id)) as s}<option value={s.id}>{translatedName(s.name,project.settings.language,$languageOverrides)} · {s.unit}</option>{/each}
          </select></label><label
          >{tr("С месяца", "Din luna")}<input
            required
            type="month"
            bind:value={draft.effective_from}
          /></label
        ><label
          >{tr("По месяц включительно", "Până în luna inclusiv")}<input
            type="month"
            bind:value={draft.effective_to}
          /></label
        ><label
          >{tr("Знаков после запятой в доле", "Zecimale pentru cotă")}<input
            required
            type="number"
            min="0"
            max="6"
            step="1"
            bind:value={draft.precision}
          /></label
        >
      </div>
      <fieldset>
        <legend
          >{tr(
            "Подключённые индивидуальные приборы",
            "Contoare individuale conectate",
          )}</legend
        >{#each project.meters.filter((m) => m.scope === "individual" && m.service_id === project.meters.find((x) => x.id === draft?.shared_meter_id)?.service_id) as m}<label
            class="check"
            ><input
              type="checkbox"
              value={m.id}
              bind:group={draft.individual_meter_ids}
            />{project.accounts.find((a) => a.id === m.account_id)?.number} · {m.label}
            · {m.serial_number}</label
          >{/each}
      </fieldset>
      <label class="check"
        ><input type="checkbox" bind:checked={draft.allow_negative} />{tr(
          "Разрешить распределение проверенной отрицательной разницы",
          "Permite repartizarea unei diferențe negative verificate",
        )}</label
      >
      <p>
        {tr(
          "Доли могут отличаться на последнюю единицу округления, чтобы сумма разницы сохранялась полностью.",
          "Cotele pot diferi cu ultima unitate de rotunjire pentru a păstra suma exactă a diferenței.",
        )}
      </p>
      <div class="actions">
        <button class="button" type="submit"
          >{tr("Применить группу", "Aplică grupul")}</button
        ><button
          class="button secondary"
          type="button"
          onclick={() => (draft = null)}>{tr("Отмена", "Anulare")}</button
        >
      </div>
    </form>
  {/if}
  {#each project.shared_groups as g}
    <section class="group">
      <div class="heading">
        <h3>{g.name}</h3>
        <button
          class="button secondary"
          onclick={() => {
            draft = structuredClone(g);
            error = "";
          }}>{tr("Изменить группу", "Modifică grupul")}</button
        >
      </div>
      {#if g.effective_from > project.settings.period || (g.effective_to && g.effective_to < project.settings.period)}<p
        >
          {tr(
            "Группа не действует в выбранном месяце.",
            "Grupul nu este valabil în luna selectată.",
          )}
        </p>
      {:else}{@const result = sharedDistribution(
          project,
          g,
          project.settings.period,
        )}
        <p>
          {tr("Общий расход", "Consum comun")}: {result.shared ?? "—"} · {tr(
            "Сумма индивидуальных",
            "Total individual",
          )}: {result.individual} · {tr("Разница", "Diferență")}: {result.difference ??
            "—"} · {tr("Участвует счетов", "Conturi participante")}: {result.participants}
        </p>
        {#each result.warnings as warning}<p role="alert" class="alert">
            {warning}
          </p>{/each}
        <div class="table-wrap">
          <table>
            <thead
              ><tr
                ><th>{tr("Лицевой счёт", "Cont personal")}</th><th
                  >{tr("Индивидуальный расход", "Consum individual")}</th
                ><th
                  >{tr(
                    "Освободить в этом месяце",
                    "Exceptat în această lună",
                  )}</th
                ><th>{tr("Доля разницы", "Cota diferenței")}</th></tr
              ></thead
            ><tbody
              >{#each result.rows as row}<tr
                  ><td>{row.number}</td><td>{row.individual}</td><td
                    ><input
                      type="checkbox"
                      checked={row.excluded}
                      disabled={project.closed_periods.includes(
                        project.settings.period,
                      )}
                      aria-label={tr(
                        "Освобождение счёта ",
                        "Excepție pentru contul ",
                      ) + row.number}
                      onchange={(e) =>
                        exception(
                          g.id,
                          row.account_id,
                          e.currentTarget.checked,
                        )}
                    /></td
                  ><td>{result.ready ? row.share : "—"}</td></tr
                >{/each}</tbody
            >
          </table>
        </div>
      {/if}
    </section>
  {/each}
</article>

<style>
  .shared {
    padding: 20px;
    margin-bottom: 24px;
  }
  .shared h2 {
    margin-top: 0;
  }
  .heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
  }
  .fields label {
    display: grid;
    gap: 6px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .group,
  form {
    border-top: 1px solid var(--border);
    margin-top: 16px;
    padding-top: 16px;
  }
  fieldset {
    border: 0;
    padding: 12px 0;
  }
</style>
