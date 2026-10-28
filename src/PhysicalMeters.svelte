<script lang="ts">
  import {onDestroy} from "svelte";import {reportEditorDirty} from "./editor-drafts";
  export let editorId="";
  import {displayDate,displayPeriod} from "./date-format";
  import RecordToolbar from "./RecordToolbar.svelte";
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
  export let scopeFilter:"all"|"individual"|"shared"="all";
  export let editorOnly=false;
  export let initialMeter:PhysicalMeter|null=null;
  export let initialReading:PhysicalMeterValue|null=null;
  export let onedit:((meter:PhysicalMeter)=>void)|undefined=undefined;
  export let onreading:((reading:PhysicalMeterValue)=>void)|undefined=undefined;
  export let onclose:()=>void=()=>{};
  let selected='',query='',filterOpen=false;
  $: selectedMeter=project.meters.find(m=>m.id===selected);
  $: rows=project.meters.filter(m=>(scopeFilter==='all'||m.scope===scopeFilter)&&(m.label+' '+m.serial_number+' '+(project.accounts.find(a=>a.id===m.account_id)?.number||'')).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  function editMeter(value:PhysicalMeter){if(onedit)onedit(structuredClone(value));else{meter=structuredClone(value);reading=null;}}
  let meter: PhysicalMeter | null = initialMeter?structuredClone(initialMeter):null,
    reading: PhysicalMeterValue | null = initialReading?structuredClone(initialReading):null,
    error = "";
  $: tr = translator(project.settings.language);
  function newMeter() {
    meter = {
      id: uid(),
      scope: scopeFilter==="shared"?"shared":"individual",
      account_id: scopeFilter==="shared"?"":project.accounts.find((a) => a.active)?.id || "",
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
    if(onedit){onedit(meter);meter=null;}
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
    if(onreading){onreading(reading);reading=null;}
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
        if(index>=0&&next.meters[index].status_history?.length&&next.meters[index].active!==value.active)throw Error(tr('Измените статус через документ «Изменение статусов приборов учёта».','Modificați starea prin documentul de modificare a stărilor contoarelor.'));
        if (index < 0) next.meters.push(value);
        else next.meters[index] = value;
      } else if (kind === "reading" && reading) {
        const old = next.meter_values.find((r) => r.id === reading!.id);
        if(old&&next.meter_documents.some(d=>d.state==='applied'&&d.rows.some(row=>(row.reading_id||'reading-'+row.id)===old.id)))throw Error(tr('Показание введено проведённым документом и доступно только для просмотра.','Indexul a fost introdus printr-un document aplicat și poate fi doar vizualizat.'));
        const physical=next.meters.find(m=>m.id===reading!.meter_id),state=[...(physical?.status_history||[])].filter(s=>s.date<=reading!.reading_date).sort((a,b)=>b.date.localeCompare(a.date))[0];
        if(reading.kind==='regular'&&(state?!state.active:!physical?.active))throw Error(tr('Прибор отключён на указанную дату.','Contorul este deconectat la data indicată.'));
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
      reportEditorDirty(editorId,false);
      if(editorOnly)onclose();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  let savedDraft=JSON.stringify([meter,reading]);
  $:reportEditorDirty(editorId,editorOnly&&!!(meter||reading)&&JSON.stringify([meter,reading])!==savedDraft);
  onDestroy(()=>reportEditorDirty(editorId,false));
</script>

<article class="panel meters-panel">
  {#if !editorOnly}<RecordToolbar language={project.settings.language} selected={!!selectedMeter} onadd={newMeter} onedit={()=>selectedMeter&&editMeter(selectedMeter)} oncopy={()=>{if(selectedMeter)editMeter({...structuredClone(selectedMeter),id:uid(),serial_number:'',initial_value:'0',active:true,status_history:[],installed_on:null,retired_on:null,source_metadata:undefined,account_links:[]});}} onrefresh={()=>selected=''} onfilter={()=>filterOpen=!filterOpen} onclearfilter={()=>query=''} filterActive={!!query}/>
  {#if filterOpen}<input aria-label={tr('Поиск прибора','Căutare contor')} bind:value={query}/>{/if}{/if}
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
          onclick={()=>{if(editorOnly)onclose();else meter=null;}}>{tr("Отмена", "Anulare")}</button
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
          onclick={()=>{if(editorOnly)onclose();else reading=null;}}>{tr("Отмена", "Anulare")}</button
        >
      </div>
    </form>
  {/if}
  {#if !editorOnly}
  <div class="table-wrap"><table><thead><tr><th>{tr('Наименование','Denumire')}</th><th>{tr('Вид прибора','Tip contor')}</th><th>{tr('Лицевой счёт','Cont personal')}</th><th>{tr('Заводской номер','Număr de serie')}</th><th>{tr('Статус','Stare')}</th></tr></thead><tbody>{#each rows as m}<tr class:selected={selected===m.id} onclick={()=>selected=m.id} ondblclick={()=>editMeter(m)}><td>{m.label}</td><td>{project.reference_catalogs['meter-types']?.find(r=>r.id===m.type_id)?.name||m.unit}</td><td>{project.accounts.find(a=>a.id===m.account_id)?.number||'—'}</td><td>{m.serial_number}</td><td>{m.active?tr('Подключён','Conectat'):tr('Не подключён','Deconectat')}</td></tr>{/each}</tbody></table></div>
  {#if !rows.length}<p>{tr('Приборов учёта нет.','Nu există contoare.')}</p>{/if}
  {#if selectedMeter}{@const m=selectedMeter}<section class="selected-meter"><div class="meter-heading"><h3>{m.label}</h3><button class="button secondary" disabled={project.closed_periods.includes(project.settings.period)} onclick={()=>newReading(m.id)}>{tr('Внести показание','Adaugă index')}</button></div>
  <details open><summary>{tr('История показаний','Istoricul citirilor')}</summary><div class="table-wrap"><table><thead><tr><th>{tr('Период','Perioada')}</th><th>{tr('Дата','Data')}</th><th>{tr('Показание','Index')}</th><th>{tr('Вид записи','Tip înregistrare')}</th><th></th></tr></thead><tbody>{#each project.meter_values.filter(r=>r.meter_id===m.id).sort((a,b)=>b.reading_date.localeCompare(a.reading_date)) as r}<tr><td>{displayPeriod(r.period,project)}</td><td>{displayDate(r.reading_date,project)}</td><td>{r.value}</td><td>{r.kind==='initial'?tr('Начальное','Inițial'):r.kind==='final'?tr('При снятии','Final'):tr('Очередное','Periodic')}</td><td><button class="button secondary" disabled={project.closed_periods.includes(r.period)||project.meter_documents.some(d=>d.state==='applied'&&d.rows.some(row=>(row.reading_id||'reading-'+row.id)===r.id))} onclick={()=>{if(onreading)onreading(structuredClone(r));else{reading=structuredClone(r);meter=null;}}}>{tr('Изменить','Modifică')}</button></td></tr>{/each}</tbody></table></div></details>
  {#if m.status_history?.length}<details><summary>{tr('История статусов','Istoricul stărilor')}</summary><table><thead><tr><th>{tr('Дата','Data')}</th><th>{tr('Статус','Stare')}</th></tr></thead><tbody>{#each [...m.status_history].reverse() as state}<tr><td>{displayDate(state.date,project)}</td><td>{state.active?tr('Подключён','Conectat'):tr('Не подключён','Deconectat')}</td></tr>{/each}</tbody></table></details>{/if}
  {#if m.account_links?.length}<details><summary>{tr('История пользователей общего прибора','Istoricul utilizatorilor contorului comun')}</summary><div class="table-wrap"><table><thead><tr><th>{tr('Дата','Data')}</th><th>{tr('Лицевой счёт','Cont personal')}</th><th>{tr('Связь','Legătură')}</th><th>{tr('Статус','Stare')}</th></tr></thead><tbody>{#each [...m.account_links].reverse() as link}<tr><td>{displayDate(link.date,project)}</td><td>{project.accounts.find(a=>a.id===link.account_id)?.number}</td><td>{link.dependent?tr('Зависимый пользователь','Utilizator dependent'):tr('Пользователь','Utilizator')}</td><td>{link.active?tr('Подключён','Conectat'):tr('Не подключён','Deconectat')}</td></tr>{/each}</tbody></table></div></details>{/if}</section>{/if}
  {/if}
</article>

<style>
  table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left}th{background:#80808020}.selected{background:#489bcb30}.selected-meter{margin-top:18px}details{margin-top:14px}
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
  .meter-heading h3 {
    margin: 0 0 8px;
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
  form {
    padding: 16px 0;
    border-top: 1px solid var(--border);
  }
  summary {
    cursor: pointer;
    padding: 8px 0;
  }
</style>
