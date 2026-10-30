<script lang="ts">
  import { SlidersHorizontal, ChevronDown, LockKeyhole } from "./icons";
  import { translator } from "./i18n";
  import {
    languageOverrides,
    translatedName,
    referenceLabel,
  } from "./localization";
  import { receiptReadings } from "./meters";
  import type { Project } from "./model";
  import {
    defaultReceiptContent,
    receiptReadingKey,
    type ReceiptContent,
  } from "./receipt-content";
  export let project: Project;
  export let accountIds: string[] = [];
  export let period = "";
  export let onapply: (options: ReceiptContent) => void;
  let open = false,
    individual = false,
    query = "";
  $: t = translator(project.settings.language, $languageOverrides);
  $: options = project.settings.receipt_content;
  $: services = project.services.filter(
    (service) =>
      service.calculation_type === "metered" ||
      project.meters.some((meter) => meter.service_id === service.id) ||
      project.meter_readings.some(
        (reading) => reading.service_id === service.id,
      ),
  );
  const blocks = [
    ["logo", "Логотип организации", "Sigla asociației", "Organization logo"],
    ["address", "Адрес плательщика", "Adresa plătitorului", "Payer address"],
    ["bank", "Банковские реквизиты", "Date bancare", "Bank details"],
    ["deadline", "Срок оплаты", "Termen de plată", "Payment deadline"],
    [
      "footer",
      "Текст внизу квитанции",
      "Text la sfârșitul facturii",
      "Footer message",
    ],
    [
      "stub",
      "Извещение / отрывная часть",
      "Aviz / parte detașabilă",
      "Payment notice / detachable part",
    ],
  ] as const;
  $: types = [
    ...(project.reference_catalogs["meter-types"] || []).map((row) => ({
      id: row.id,
      name: referenceLabel(row, project.settings.language, $languageOverrides),
    })),
    {
      id: "",
      name: t(
        "Без вида прибора",
        "Fără tip de contor",
        "Unspecified meter type",
      ),
    },
  ];
  $: individualRows =
    open && individual
      ? project.accounts
          .filter((a) => accountIds.includes(a.id))
          .flatMap((a) =>
            receiptReadings(
              project,
              a.id,
              period || project.settings.period,
            ).map((row) => ({
              key: receiptReadingKey(a.id, row),
              name: a.number + " · " + row.label + " · " + row.serial_number,
            })),
          )
          .filter((row) =>
            row.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
          )
      : [];
  const columns = [
    [
      "previous",
      "Предыдущие показания",
      "Index precedent",
      "Previous readings",
    ],
    ["current", "Последние показания", "Index curent", "Latest readings"],
    ["serial", "Номер прибора", "Numărul contorului", "Meter serial number"],
    ["dates", "Даты показаний", "Datele citirilor", "Reading dates"],
    ["consumption", "Расход", "Consum", "Consumption"],
    [
      "note",
      "Пояснение под таблицей",
      "Notă sub tabel",
      "Explanation below the table",
    ],
  ] as const;
  function toggle(key: keyof ReceiptContent, value: boolean) {
    onapply({ ...options, [key]: value });
  }
  function meterType(id: string, value: boolean) {
    const ids = new Set(options.types ?? types.map((row) => row.id));
    if (value) ids.add(id);
    else ids.delete(id);
    onapply({ ...options, types: [...ids] });
  }
  function individualMeter(key: string, value: boolean) {
    const ids = new Set(options.excluded_meters);
    if (value) ids.delete(key);
    else ids.add(key);
    onapply({ ...options, excluded_meters: [...ids] });
  }
  function service(id: string, value: boolean) {
    const ids = new Set(options.services ?? services.map((s) => s.id));
    if (value) ids.add(id);
    else ids.delete(id);
    onapply({ ...options, services: [...ids] });
  }
</script>

<div class="receipt-content-menu">
  <button
    class="button secondary"
    aria-expanded={open}
    onclick={() => (open = !open)}
    ><SlidersHorizontal size={17} /><span
      >{t(
        "Содержимое квитанции",
        "Conținutul facturii",
        "Receipt contents",
      )}</span
    ><ChevronDown size={15} class={open ? "expanded" : ""} /></button
  >
  {#if open}<div class="receipt-content-options">
      <h3>
        {t("Необязательные блоки", "Blocuri opționale", "Optional sections")}
      </h3>
      {#each blocks as field}<label class="check-row"><input
            type="checkbox"
            checked={options[field[0]]}
            onchange={(e) => toggle(field[0], e.currentTarget.checked)}
          /><span>{t(field[1], field[2], field[3])}</span></label
        >{/each}
      <h3>{t("Показания приборов", "Indexuri contoare", "Meter readings")}</h3>
      <label class="check-row"><input
          type="checkbox"
          checked={options.readings}
          onchange={(e) => toggle("readings", e.currentTarget.checked)}
        /><span
          >{t(
            "Печатать показания",
            "Include indexurile",
            "Include meter readings",
          )}</span
        ></label
      >
      <fieldset disabled={!options.readings}>
        <legend
          >{t(
            "Какие услуги показывать",
            "Servicii afișate",
            "Services to include",
          )}</legend
        >
        <div class="receipt-content-actions">
          <button
            class="text-button"
            onclick={() => onapply({ ...options, services: null })}
            >{t("Все", "Toate", "All")}</button
          ><button
            class="text-button"
            onclick={() => onapply({ ...options, services: [] })}
            >{t("Ни одной", "Niciunul", "None")}</button
          >
        </div>
        {#each services as item}<label class="check-row"><input
              type="checkbox"
              checked={options.services === null ||
                options.services.includes(item.id)}
              onchange={(e) => service(item.id, e.currentTarget.checked)}
            /><span
              >{translatedName(
                item.name,
                project.settings.language,
                $languageOverrides,
              )}</span
            ></label
          >{/each}
        {#if !services.length}<p>
            {t(
              "Приборы ещё не добавлены.",
              "Contoarele nu au fost adăugate.",
              "No meters have been added yet.",
            )}
          </p>{/if}
        <details class="receipt-meter-types">
          <summary
            >{t("Виды приборов", "Tipuri de contoare", "Meter types")}</summary
          >
          <div class="receipt-content-actions">
            <button
              class="text-button"
              onclick={() => onapply({ ...options, types: null })}
              >{t("Все", "Toate", "All")}</button
            ><button
              class="text-button"
              onclick={() => onapply({ ...options, types: [] })}
              >{t("Ни одного", "Niciunul", "None")}</button
            >
          </div>
          {#each types as row}<label class="check-row"><input
                type="checkbox"
                checked={options.types === null ||
                  options.types.includes(row.id)}
                onchange={(e) => meterType(row.id, e.currentTarget.checked)}
              /><span>{row.name}</span></label
            >{/each}
        </details>
        <details ontoggle={(e) => (individual = e.currentTarget.open)}>
          <summary
            >{t(
              "Отдельные приборы и строки",
              "Contoare și rânduri individuale",
              "Individual meters and rows",
            )}</summary
          ><input
            class="receipt-meter-search"
            aria-label={t("Поиск прибора", "Căutare contor", "Find a meter")}
            placeholder={t(
              "Номер счёта, прибор или номер",
              "Cont, contor sau număr",
              "Account, meter or serial",
            )}
            bind:value={query}
          /><button
            class="text-button"
            onclick={() => onapply({ ...options, excluded_meters: [] })}
            >{t(
              "Включить все строки",
              "Include toate rândurile",
              "Include all rows",
            )}</button
          >{#each individualRows.slice(0, 80) as row}<label class="check-row"><input
                type="checkbox"
                checked={!options.excluded_meters.includes(row.key)}
                onchange={(e) =>
                  individualMeter(row.key, e.currentTarget.checked)}
              /><span>{row.name}</span></label
            >{/each}{#if individualRows.length > 80}<small
              >{t(
                "Для остальных строк уточните поиск.",
                "Precizați căutarea pentru alte rânduri.",
                "Refine the search for additional rows.",
              )}</small
            >{/if}
        </details>
        <label class="receipt-label-format"
          ><span
            >{t("Подпись прибора", "Eticheta contorului", "Meter label")}</span
          ><select
            value={options.labels}
            onchange={(e) =>
              onapply({
                ...options,
                labels: e.currentTarget.value as ReceiptContent["labels"],
              })}
            ><option value="service"
              >{t(
                "Название услуги",
                "Denumirea serviciului",
                "Service name",
              )}</option
            ><option value="meter"
              >{t(
                "Название прибора",
                "Denumirea contorului",
                "Meter name",
              )}</option
            ><option value="none"
              >{t("Без подписи", "Fără etichetă", "No label")}</option
            ></select
          ></label
        >
        {#each columns as field}<label class="check-row"><input
              type="checkbox"
              checked={options[field[0]]}
              onchange={(e) => toggle(field[0], e.currentTarget.checked)}
            /><span>{t(field[1], field[2], field[3])}</span></label
          >{/each}
      </fieldset>
      <p class="required-note">
        <LockKeyhole size={14} />{t(
          "Организация, плательщик, номер счёта, период, начисления и итог отображаются всегда.",
          "Asociația, plătitorul, contul, perioada, calculele și totalul sunt afișate permanent.",
          "Organization, payer, account number, period, charges and total are always included.",
        )}
      </p>
      <button
        class="text-button"
        onclick={() => onapply(defaultReceiptContent())}
        >{t(
          "Восстановить всё содержимое",
          "Restabilește tot conținutul",
          "Restore all content",
        )}</button
      >
    </div>{/if}
</div>

<style>
  .receipt-content-menu {
    min-width: 0;
  }
  .receipt-content-menu > button {
    width: 100%;
    display: flex;
    gap: 10px;
    align-items: center;
    text-align: left;
  }
  .receipt-content-menu > button span {
    flex: 1;
  }
  .receipt-content-menu :global(.expanded) {
    transform: rotate(180deg);
  }
  .receipt-content-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 10px;
    border-bottom: 1px solid var(--border);
  }
  h3 {
    font-size: 13px;
    font-weight: 600;
    margin: 6px 0;
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    line-height: 1.4;
  }
  input {
    flex: none;
    margin-top: 2px;
  }
  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  fieldset {
    display: flex;
    flex-direction: column;
    gap: 11px;
    border: 0;
    padding: 6px 0;
    margin: 0;
    min-width: 0;
  }
  legend {
    font-size: 12px;
    color: var(--muted);
    padding: 0 0 4px;
  }
  .receipt-content-actions {
    display: flex;
    gap: 16px;
  }
  .required-note {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.5;
    margin: 6px 0;
  }
  .required-note :global(svg) {
    flex: none;
    margin-top: 2px;
  }
  button {
    white-space: normal;
  }
  details {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  details label {
    margin: 10px 0;
  }
  summary {
    cursor: pointer;
    padding: 6px 0;
  }
  select,
  .receipt-meter-search {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .receipt-label-format {
    flex-direction: column;
    gap: 6px;
  }
  .receipt-meter-search {
    margin: 8px 0;
  }
</style>
