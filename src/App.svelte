<script lang="ts">
  import {invoke} from "@tauri-apps/api/core";
  import { translator } from "./i18n";
  import { onMount } from "svelte";
  import DesktopMenu from "./DesktopMenu.svelte";
  import DesktopWindow from "./DesktopWindow.svelte";
  import DesktopChooser from "./DesktopChooser.svelte";
  import {desktopMenus,chooserGroups,catalogs} from "./desktop-menu";
  import ReferenceCatalog from "./ReferenceCatalog.svelte";
  import ReferenceRecordEditor from "./ReferenceRecordEditor.svelte";
  import type {ReferenceKind} from "./catalog-definitions";
  import { ZodError } from "zod";
  import Reports from "./Reports.svelte";
  import Documentation from "./Documentation.svelte";
  import DesktopWidgets from "./DesktopWidgets.svelte";
  import MarkedDeletion from "./MarkedDeletion.svelte";
  import ReportSettings from "./ReportSettings.svelte";
  import type {ReportSettingsRequest} from "./report-settings";
  import Notifications from "./Notifications.svelte";
  import NotificationSettings from "./NotificationSettings.svelte";
  import SettingsHome from "./SettingsHome.svelte";
  import DatabaseHome from "./DatabaseHome.svelte";
  import {databaseCatalog,readDatabase,activateDatabase,createDatabase,setDatabaseAuto,type DatabaseCatalog} from "./database-catalog";
  import ServiceCatalog from "./ServiceCatalog.svelte";
  import ServiceEditor from "./ServiceEditor.svelte";
  import PaymentReport from "./PaymentReport.svelte";
  import PaymentAllocation from "./PaymentAllocation.svelte";
  import PaymentBatches from "./PaymentBatches.svelte";
  import {displayDate,displayPeriod,dateFormats,periodFormats} from "./date-format";
  import {previousPaymentMonth,type PaymentShare} from "./payment-allocation";
  import PhysicalMeters from "./PhysicalMeters.svelte";
  import MonthlyResidents from "./MonthlyResidents.svelte";
  import { monthlyPersons, setAccountMonthlyPersons } from "./occupancy";
  import { addAverageTariff } from "./tariff-transitions";
  import TariffDocuments from "./TariffDocuments.svelte";
  import Treasury from "./Treasury.svelte";
  import SharedMeters from "./SharedMeters.svelte";
  import ReceiptDesigner from "./ReceiptDesigner.svelte";
  import {paymentDeadline} from "./payment-deadlines";
  import {validationText,issueText} from "./validation-language";
  import {receiptDesignCSS} from "./receipt-designs";
  import BackupSettings from "./BackupSettings.svelte";
  import ExportSettings from "./ExportSettings.svelte";
  import { physicalReadings } from "./meters";
  import {
    LayoutDashboard,
    Users,
    Layers3,
    Gauge,
    Wallet,
    ReceiptText,
    Settings,
    Plus,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    ChevronRight,
    Check,
    Download,
    Upload,
    Save,
    Sun,
    Moon,
    Monitor,
    Printer,
    Pencil,
    X,
    FolderOpen,
    LockKeyhole,
    UnlockKeyhole,
    Info,
    FileJson,
    Palette,
    Building2,
    TriangleAlert,
    Archive,
    ChartNoAxesCombined,
    CheckCheck,
  } from "@lucide/svelte";
  import {
    demoProject,
    projectSchema,
    uid,
    today,
    type Project,
    type Account,
    type Service,
    unitLabel,
  } from "./model";
  import {
    D,
    add,
    money,
    statement,
    charges,
    closePeriod,
    reopenPeriod,
    csv,
  } from "./engine";
  import {
    load,
    persist,
    ask,
    exportText,
    importJson,
    storagePath,
    native,
    runtimePlatform,
  } from "./storage";
  import { receipt, receiptBaseCSS, receiptDocument } from "./receipt";
  import {exportPDF} from "./storage";
  import { loadLogo } from "./logo";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  let p: Project = demoProject();
  let page = "overview",
    query = "",
    loading = true,
    dirty = false,
    busy = false,
    error = "",
    notice = "",
    dbPath = "",
    modal = "",
    draft: any = {},
    jsonText = "",
    jsonTitle = "",
    imported: Project | null = null,
    selected: string[] = [];
  let readingEdits: Record<
    string,
    { previous: string; current: string; quantity: string }
  > = {};
  let presetName = "";
  let tariffServiceFilter = "";
  let tariffEntryMode = "standard", tariffTransitionPeriod = "", tariffFollowingRate = "";
  let loadFailed = false;
  type WorkspaceView={id:string;page:string;visible:boolean;minimized:boolean;position:{x:number;y:number;width:number;height:number}};
  let desktopViews:WorkspaceView[]=[],activeDesktop="",desktopArea:HTMLElement;
  let reportSettingsRequests:Record<string,ReportSettingsRequest>={};
  let workspaceLocked=false;
  function openDesktop(id:string){
    const existing=desktopViews.find(v=>v.id===id);
    if(existing){existing.visible=true;existing.minimized=false;focusDesktop(id);return;}
    const n=desktopViews.length%6;
    desktopViews=[...desktopViews,{id,page:id,visible:true,minimized:false,position:{x:16+n*22,y:16+n*22,width:Math.max(620,Math.min(1060,(desktopArea?.clientWidth||window.innerWidth)-50)),height:Math.max(300,Math.min(650,(desktopArea?.clientHeight||window.innerHeight-150)-40))}}];
    activeDesktop=id;
  }
  function focusDesktop(id:string){
    const view=desktopViews.find(v=>v.id===id);if(!view)return;
    if(activeDesktop===id&&view.visible&&!view.minimized)return;
    view.visible=true;view.minimized=false;desktopViews=[...desktopViews.filter(v=>v.id!==id),view];activeDesktop=id;
    if(pages.some(x=>x.id===id))page=id;
  }
  function hideDesktop(id:string,minimize=false){
    desktopViews=desktopViews.map(v=>v.id===id?{...v,visible:minimize?v.visible:false,minimized:minimize}:v);
    activeDesktop=[...desktopViews].reverse().find(v=>v.visible&&!v.minimized)?.id||"";
  }
  function desktopTitle(id:string,language:"ru"|"ro"){
    if(id==='purge')return language==='ru'?'Удаление помеченных объектов':'Eliminare obiecte marcate';
    if(id.startsWith("reportsettings:"))return language==='ru'?'Настройка отчёта':'Configurare raport';
    if(id.startsWith("catalog:")||id.startsWith("catalogedit:")){const [,kind]=id.split(":"),entry=catalogs.find(c=>c.id===kind);return (entry?.[language]||kind)+(id.startsWith("catalogedit:")?(language==="ru"?" · запись":" · înregistrare"):"");}
    const titles:Record<string,[string,string]>={reports:["Оборотно-сальдовая ведомость","Balanță de verificare"],receipts:["Квитанция","Factură"],tariffs:["Изменение тарифов на услуги","Modificare tarife servicii"],settings:["Общие настройки","Setări generale"]};
    if(titles[id])return titles[id][language==="ru"?0:1];
    if(id.startsWith("chooser:")){const group=chooserGroups[id.slice(8)];return t("Выбор объекта: ","Selectare obiect: ")+(group?.[language]||"");}
    if(id==="period")return t("Смена расчетного периода","Schimbare perioadă de calcul");
    if(id==="manual")return t("Документация","Documentație");
    const entry=pages.find(x=>x.id===id);return entry?.[language]||id;
  }
  function desktopCommand(action:string){
    if(action==='temporary-lock'){workspaceLocked=true;return;}
    if(action.startsWith("file:")){if(action==="file:save")void save();else if(action==="file:export")void exportJson();else if(action==="file:open")void importDatabase();else void requestDatabaseHome();return;}
    if(action.startsWith("edit:")){void editText(action.slice(5));return;}
    showDatabaseHome=false;
    if(action==="about"){modal="about";return;}
    if(action.startsWith("window:")){
      const visible=desktopViews.filter(v=>v.visible),index=visible.findIndex(v=>v.id===activeDesktop);
      if(action==="window:next"||action==="window:previous"){if(visible.length)focusDesktop(visible[(Math.max(index,0)+(action==="window:next"?1:visible.length-1))%visible.length].id);}
      else if(action==="window:close")hideDesktop(activeDesktop);
      else if(action==="window:close-all"){desktopViews=desktopViews.map(v=>({...v,visible:false}));activeDesktop="";}
      else if(action==="window:cascade")desktopViews=desktopViews.map((v,i)=>({...v,position:{...v.position,x:16+(i%8)*26,y:16+(i%8)*26}}));
      return;
    }
    if(pages.some(x=>x.id===action))navigate(action);else openDesktop(action);
  }
  function reveal(e:PointerEvent){
    const element=e.target instanceof Element?e.target.closest<HTMLElement>('button,summary'):null;
    if(element){const rect=element.getBoundingClientRect();element.style.setProperty('--reveal-x',(e.clientX-rect.left)+'px');element.style.setProperty('--reveal-y',(e.clientY-rect.top)+'px');}
  }

  const pages = [
    { id: "overview", ru: "Обзор", ro: "Prezentare", icon: LayoutDashboard },
    {
      id: "accounts",
      ru: "Лицевые счета",
      ro: "Conturi personale",
      icon: Users,
    },
    {
      id: "services",
      ru: "Услуги",
      ro: "Servicii",
      icon: Layers3,
    },
    { id: "tariffs", ru: "Тарифы", ro: "Tarife", icon: ReceiptText },
    { id: "readings", ru: "Показания", ro: "Indexuri", icon: Gauge },
    { id: "payments", ru: "Оплаты", ro: "Plăți", icon: Wallet },
    {id:"individual-meters",ru:"Индивидуальные приборы учёта",ro:"Contoare individuale",icon:Gauge},
    {id:"shared-meters",ru:"Коллективные приборы учёта",ro:"Contoare comune",icon:Gauge},
    { id: "payment-batches",ru:"Групповой ввод оплаты",ro:"Introducere plăți în grup",icon:Wallet },
    { id:"payment-report",ru:"Отчёт по оплатам",ro:"Raport de plăți",icon:ChartNoAxesCombined },
    { id: "treasury", ru: "Банк и касса", ro: "Bancă și casă", icon: Building2 },
    { id: "reports", ru: "Отчёты", ro: "Rapoarte", icon: ChartNoAxesCombined },
    { id:"service-reports",ru:"Оборотно-сальдовая ведомость по услугам",ro:"Balanță de verificare pe servicii",icon:ChartNoAxesCombined },
    { id: "receipts", ru: "Квитанции", ro: "Facturi", icon: ReceiptText },
    { id: "settings", ru: "Настройки", ro: "Setări", icon: Settings },
  ];
  $: t = translator(p.settings.language);
  $: period = p.settings.period;
  $: lang = p.settings.language;
  $: closed = p.closed_periods.includes(period);
  $: accounts = p.accounts.filter((a) =>
    (
      a.payer_name +
      " " +
      a.number +
      " " +
      a.address +
      " " +
      a.apartments.join(" ")
    )
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  $: active = p.accounts.filter((a) => a.active && a.opening_period <= period);
  $: statements = active.map((a) => ({ a, s: statement(p, a, period) }));
  $: totalCharges = money(add(statements.map((x) => x.s.total)), p);
  $: totalPaid = money(add(statements.map((x) => x.s.paid)), p);
  $: totalBalance = money(add(statements.map((x) => x.s.balance)), p);
  $: missing = statements.filter(
    (x) => x.s.warnings.length || x.s.gaps.length,
  ).length;
  $: heading = pages.find((x) => x.id === page);
  $: receiptAccounts = active.filter((a) => selected.includes(a.id));
  $: if (typeof document !== "undefined") {
    const dark =
      p.settings.theme === "dark" ||
      (p.settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.lang = p.settings.language;
    document.documentElement.style.setProperty("--accent", p.settings.accent);
  }
  function changed() {
    p = { ...p };
    dirty = true;
    notice = "";
  }
  function setPaymentDeadline(value:string){
    try{
      const next=structuredClone(p);
      next.payment_deadlines=next.payment_deadlines.filter(d=>d.period!==period);
      if(value)next.payment_deadlines.push({period,due_date:value});
      setProject(next);
    }catch(e){fail(e);}
  }
  function fail(e: unknown) {
    error = e instanceof ZodError
      ? e.issues.slice(0, 5).map(i => issueText(i, p.settings.language)).join("; ")
      : validationText(e instanceof Error ? e.message : String(e),p.settings.language);
  }
  function valid(candidate: unknown): Project {
    const parsed = projectSchema.safeParse(candidate);
    if (!parsed.success)
      throw Error(
        parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${issueText(i,p.settings.language)}`)
          .join("\n"),
      );
    return parsed.data;
  }
  function setProject(next: Project) {
    p = valid(next);
    dirty = true;
    error = "";
  }
  let catalog:DatabaseCatalog={databases:[{id:"default",name:"OpenHaU"}],auto:null,last:"default"},activeDatabaseId="default",showDatabaseHome=true,lastTextField:HTMLInputElement|HTMLTextAreaElement|null=null;
  function rememberText(e:FocusEvent){if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)lastTextField=e.target;}
  async function editText(command:string){try{const field=lastTextField;if(!field||!field.isConnected)throw Error(t("Выберите текстовое поле для редактирования.","Selectați un câmp de text pentru editare."));field.focus();if(command==="paste"){const text=await navigator.clipboard.readText();field.setRangeText(text,field.selectionStart??field.value.length,field.selectionEnd??field.value.length,"end");field.dispatchEvent(new Event("input",{bubbles:true}));}else if(!document.execCommand(command))throw Error(t("Операция недоступна для выбранного поля. Используйте сочетание клавиш.","Operațiunea nu este disponibilă pentru câmpul selectat. Utilizați combinația de taste."));}catch(e){fail(e);}}
  async function refreshCatalog(){try{catalog=await databaseCatalog();}catch(e){fail(e);}}
  let databaseOpened=false;
  async function prepareDatabaseChange(){
    if(modal||Object.keys(readingEdits).length){fail(t("Завершите редактирование и примените введённые показания перед сменой базы.","Încheiați editarea și aplicați indexurile înainte de schimbarea bazei."));return false;}
    if(!databaseOpened)return true;
    if(!(await ask(t("Сохранить текущую базу и продолжить? Сначала примените изменения в открытых документах.","Salvați baza curentă și continuați? Aplicați mai întâi modificările din documentele deschise."))))return false;
    await save();return !dirty&&!error;
  }
  async function requestDatabaseHome(){if(!(await prepareDatabaseChange()))return;showDatabaseHome=true;databaseOpened=false;await refreshCatalog();}
  $: if(native&&!loading)void invoke("set_workspace_mode",{welcome:showDatabaseHome}).catch(fail);
  function blankDatabase(name:string):Project {const empty=demoProject();empty.demo=false;empty.organization={id:uid(),name,association_code:"",fiscal_code:"",bank:"",iban:"",address:"",notes:""};empty.settings={...empty.settings,language:p.settings.language,theme:p.settings.theme,date_format:p.settings.date_format,period_format:p.settings.period_format};empty.accounts=[];empty.services=[];empty.tariffs=[];empty.payments=[];empty.adjustments=[];empty.quantities=[];empty.snapshots=[];empty.closed_periods=[];empty.meter_readings=[];empty.meters=[];empty.meter_values=[];return valid(empty);}
  async function switchDatabase(id:string,initial=false,prepared=false){
    if(id===activeDatabaseId&&!initial){showDatabaseHome=false;databaseOpened=true;return;}
    const raw=await readDatabase(id),entry=catalog.databases.find(d=>d.id===id),candidate=raw?valid(raw):(id==="default"?p:blankDatabase(entry?.name||"OpenHaU"));
    if(!initial&&(modal||Object.keys(readingEdits).length))throw Error(t("Завершите открытое редактирование и примените показания перед сменой базы.","Încheiați editarea și aplicați indexurile înainte de schimbarea bazei."));
    if(!initial&&!prepared&&!(await prepareDatabaseChange()))return;
    dbPath=await activateDatabase(id);activeDatabaseId=id;p=candidate;dirty=false;loadFailed=false;desktopViews=[];activeDesktop="";modal="";readingEdits={};selected=p.accounts.filter(a=>a.active).map(a=>a.id);showDatabaseHome=false;databaseOpened=true;catalog=await databaseCatalog();
  }
  async function openDatabase(id:string){try{await switchDatabase(id);}catch(e){fail(e);}}
  async function newDatabase(name:string){try{if(!(await prepareDatabaseChange()))return;const id=await createDatabase(name);await refreshCatalog();await switchDatabase(id,false,true);if(activeDatabaseId===id){p=blankDatabase(name);dirty=true;await save();}}catch(e){fail(e);}}
  async function importDatabase(){try{const raw=await importJson();if(!raw)return;const candidate=valid(raw);if(!(await prepareDatabaseChange()))return;const id=await createDatabase(candidate.organization.name);await refreshCatalog();await switchDatabase(id,false,true);if(activeDatabaseId===id){p=candidate;dirty=true;await save();}}catch(e){fail(e);}}
  async function configureAutoDatabase(id:string|null){try{await setDatabaseAuto(id);await refreshCatalog();}catch(e){fail(e);}}
  async function save(reason:"save"|"close"="save") {
    if (busy) return;
    notice="";
    if (loadFailed) {
      error = t(
        "База не прочитана. Сохранение заблокировано, чтобы не затереть данные.",
        "Baza nu a putut fi citită. Salvarea este blocată pentru a proteja datele.",
      );
      return;
    }
    if (Object.keys(readingEdits).length) {
      error = t(
        "Сначала примените введённые показания.",
        "Aplicați mai întâi indexurile introduse.",
      );
      return;
    }
    busy = true;
    error = "";
    try {
      const snapshot = valid(p),
        serialized = JSON.stringify(p);
      const result = await persist(snapshot,reason);
      dbPath = result.path;
      dirty =
        Object.keys(readingEdits).length > 0 ||
        JSON.stringify(p) !== serialized;
      if (!dirty) p = snapshot;
      notice = dirty
        ? t(
            "Снимок сохранён; более новые изменения ещё не записаны.",
            "Copia a fost salvată; modificările mai noi nu sunt încă salvate.",
          )
        : t("Сохранено.", "Salvat.");
      if (result.backup_warning) error = t("База сохранена, но внешняя резервная копия не создана: ","Baza a fost salvată, dar copia externă nu a fost creată: ") + result.backup_warning;
      if (result.export_warning) error += (error?"\n":"")+t("База сохранена, но автоматический экспорт отчётов не выполнен: ","Baza a fost salvată, dar exportul automat al rapoartelor a eșuat: ")+result.export_warning;
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
    }
  }
  let settingsCategory="home";
  function navigate(id: string) {
    if(id==="settings")settingsCategory="home";
    page = id;
    openDesktop(id);
    query = "";
    error = "";
  }
  function openEditor(kind: string, item?: unknown) {
    if(kind==="payment"&&item&&p.payment_batches.some(b=>b.state==="applied"&&b.rows.some(r=>r.payment_id===(item as {id:string}).id))){error=t("Оплата относится к проведённому групповому документу. Откройте его для просмотра расшифровки.","Plata aparține unui document de grup aplicat. Deschideți documentul pentru vizualizarea repartizării.");return;}
    if (kind === "tariff" && item && p.tariff_documents.some(d => d.state === "applied" && d.rows.some(r => r.tariff_id === (item as {id: string}).id))) {
      error = t("Тариф введён применённым документом. Документ доступен для просмотра; новый тариф задаётся новой записью.", "Tariful provine dintr-un document aplicat. Documentul poate fi vizualizat; un tarif nou se introduce printr-o înregistrare nouă.");
      return;
    }
    tariffEntryMode = "standard";
    tariffTransitionPeriod = period;
    tariffFollowingRate = "";
    modal = kind;
    error = "";
    if (kind === "account")
      draft = structuredClone(
        item || {
          id: uid(),
          number: String(p.accounts.length + 1).padStart(6, "0"),
          payer_name: "",
          address: "",
          apartments: [],
          total_area_m2: "0",
          registered_residents: 0,
          waste_charge_persons: 0,
          opening_balance: "0.00",
          opening_period: period,
          service_ids: p.services.filter((s) => s.active).map((s) => s.id),
          active: true,
          notes: "",
          custom_fields: {},
        },
      );
    else if (kind === "service")
      draft = structuredClone(
        item || {
          id: uid(),
          name: { ru: "", ro: "" },
          calculation_type: "fixed",
          unit: "",
          active: true,
          default_quantity: "1",
          notes: "",
        },
      );
    else if (kind === "tariff")
      draft = structuredClone(
        item || {
          id: uid(),
          service_id: p.services[0]?.id || "",
          effective_from: period + "-01",
          rate: "0.00",
        },
      );
    else if (kind === "payment")
      draft = structuredClone(
        item || {
          id: uid(),
          account_id: active[0]?.id || "",
          payment_date: today(),
          entered_date: today(),
          amount: "0.00",
          note: "",
        },
      );
    else if (kind === "adjustment")
      draft = structuredClone(
        item || {
          id: uid(),
          account_id: active[0]?.id || "",
          period,
          amount: "0.00",
          note: "",
        },
      );
    else if (kind === "organization") draft = structuredClone(p.organization);
    if (kind === "account") {
      draft.apartmentsText = draft.apartments.join(", ");
      draft.wastePersonsPeriod = period;
      draft.wastePersonsMonth = monthlyPersons(p, draft, period).persons;
      draft.wastePersonsOriginal = draft.wastePersonsMonth;
    }
    if(kind==="payment"){
      draft.allocationThrough=draft.allocation_basis||previousPaymentMonth(draft.payment_date);
      draft.balancingServiceId=draft.allocation_balancing_service_id||p.settings.payment_balancing_service_id||"";
      draft.allocationManual=draft.allocation_manual_amount!==undefined;
      draft.allocationManualAmount=draft.allocation_manual_amount||"0.00";
      draft.allocationCalculated=false;
      draft.serviceShares=structuredClone(p.service_accounting.payments.filter(r=>r.payment_id===draft.id).map(({service_id,amount})=>({service_id,amount})));
      draft.allocationSignature=draft.serviceShares.length?JSON.stringify([draft.account_id,draft.payment_date,draft.amount,draft.allocationThrough,draft.balancingServiceId]):"";
    }
  }
  function saveEditor() {
    try {
      if (modal === "tariff" && tariffEntryMode === "average") {
        setProject(addAverageTariff(p, draft.service_id, tariffTransitionPeriod, draft.rate, tariffFollowingRate));
        modal = "";
        return;
      }
      let next = structuredClone(p);
      let item = structuredClone(draft);
      if(modal==="payment"){
        const signature=JSON.stringify([draft.account_id,draft.payment_date,draft.amount,draft.allocationThrough,draft.balancingServiceId]);
        const total=(draft.serviceShares as PaymentShare[]).reduce((s,r)=>s.plus(r.amount),D(0));
        if(draft.allocationSignature!==signature||!total.eq(item.amount))throw Error(t("Распределите оплату по услугам; итог должен совпадать с суммой платежа.","Repartizați plata pe servicii; totalul trebuie să coincidă cu suma plății."));
        next.service_accounting.payments=next.service_accounting.payments.filter(r=>r.payment_id!==item.id);
        next.service_accounting.payments.push(...(draft.serviceShares as PaymentShare[]).map(r=>({...r,payment_id:item.id})));
        if(draft.balancingServiceId)next.settings.payment_balancing_service_id=draft.balancingServiceId;
        if(draft.allocationCalculated){item.allocation_basis=draft.allocationThrough;item.allocation_balancing_service_id=draft.balancingServiceId;if(draft.allocationManual)item.allocation_manual_amount=draft.allocationManualAmount;else delete item.allocation_manual_amount;}
        for(const key of ["allocationThrough","balancingServiceId","serviceShares","allocationSignature","allocationManual","allocationManualAmount","allocationCalculated"])delete item[key];
      }
      if (modal === "account") {
        item.apartments = item.apartmentsText
          .split(",")
          .map((x: string) => x.trim())
          .filter(Boolean);
        delete item.apartmentsText;
        delete item.wastePersonsMonth;
        delete item.wastePersonsOriginal;
        delete item.wastePersonsPeriod;
        if (next.snapshots.some((x) => x.account_id === item.id)) {
          const old = next.accounts.find((x) => x.id === item.id)!;
          if (
            item.opening_balance !== old.opening_balance ||
            item.opening_period !== old.opening_period
          )
            throw Error(
              t(
                "Для изменения начального остатка сначала откройте закрытые месяцы этого счёта.",
                "Redeschideți lunile închise înainte de modificarea soldului inițial.",
              ),
            );
        }
      }
      if (["payment", "adjustment"].includes(modal)) {
        const key = modal === "payment" ? "payments" : "adjustments";
        const before = (next[key] as any[]).find((x) => x.id === item.id);
        const month =
          modal === "payment" ? item.payment_date.slice(0, 7) : item.period;
        const oldMonth = before
          ? modal === "payment"
            ? before.payment_date.slice(0, 7)
            : before.period
          : null;
        if (
          next.closed_periods.includes(month) ||
          (oldMonth && next.closed_periods.includes(oldMonth))
        )
          throw Error(
            t(
              "Период закрыт. Сначала откройте его.",
              "Perioada este închisă. Redeschide-o mai întâi.",
            ),
          );
        const a = next.accounts.find((x) => x.id === item.account_id);
        if (a && month < a.opening_period)
          throw Error(
            t(
              "Дата раньше начального периода счёта.",
              "Data este anterioară perioadei inițiale a contului.",
            ),
          );
      }
      const keys: Record<string, string> = {
        account: "accounts",
        service: "services",
        tariff: "tariffs",
        payment: "payments",
        adjustment: "adjustments",
      };
      if (modal === "organization") next.organization = item;
      else {
        const key = keys[modal] as "accounts";
        const items = next[key] as any[];
        const idx = items.findIndex((x) => x.id === item.id);
        if (idx < 0) items.push(item);
        else items[idx] = item;
      }
      if (modal === "account" && draft.wastePersonsMonth !== draft.wastePersonsOriginal)
        next = setAccountMonthlyPersons(next, item.id, draft.wastePersonsPeriod, draft.wastePersonsMonth);
      setProject(next);
      modal = "";
    } catch (e) {
      fail(e);
    }
  }
  async function removeItem(kind: string, id: string) {
    if (
      !(await ask(
        t(
          "Удалить эту запись? Предыдущая сохранённая версия останется в резервной копии.",
          "Ștergi această înregistrare? Versiunea salvată anterior rămâne în copia de rezervă.",
        ),
      ))
    )
      return;
    try {
      const next = structuredClone(p);
      if (kind === "payments") {
        const row = next.payments.find((x) => x.id === id)!;
        if (
          closed ||
          next.closed_periods.includes(row.payment_date.slice(0, 7))
        )
          throw Error(t("Сначала откройте закрытый период","Redeschideți mai întâi perioada închisă"));
        next.payments = next.payments.filter((x) => x.id !== id);
        next.service_accounting.payments=next.service_accounting.payments.filter(r=>r.payment_id!==id);
      } else if (kind === "adjustments") {
        const row = next.adjustments.find((x) => x.id === id)!;
        if (next.closed_periods.includes(row.period))
          throw Error(t("Сначала откройте закрытый период","Redeschideți mai întâi perioada închisă"));
        next.adjustments = next.adjustments.filter((x) => x.id !== id);
      } else if (kind === "tariffs") {
        const row = next.tariffs.find((x) => x.id === id)!;
        if (
          next.closed_periods.some((x) => x >= row.effective_from.slice(0, 7))
        )
          throw Error(
            t("Тариф использовался в закрытом периоде: сначала откройте его","Tariful a fost utilizat într-o perioadă închisă: redeschideți perioada"),
          );
        next.tariffs = next.tariffs.filter((x) => x.id !== id);
      }
      setProject(next);
      modal = "";
    } catch (e) {
      fail(e);
    }
  }
  function readingKey(a: string, s: string) {
    return a + "|" + s;
  }
  function getReading(a: string, s: string) {
    const r = p.meter_readings.find(
      (x) => x.account_id === a && x.service_id === s && x.period === period,
    );
    const q = p.quantities.find(
      (x) => x.account_id === a && x.service_id === s && x.period === period,
    );
    return (
      readingEdits[readingKey(a, s)] || {
        previous: r?.previous || "",
        current: r?.current || "",
        quantity: q?.quantity || "",
      }
    );
  }
  function editReading(a: string, s: string, field: string, value: string) {
    readingEdits = {
      ...readingEdits,
      [readingKey(a, s)]: {
        ...getReading(a, s),
        [field]: value.replace(",", "."),
      },
    };
    dirty = true;
  }
  function applyReadings() {
    try {
      if (closed) throw Error(t("Период закрыт","Perioada este închisă"));
      const next = structuredClone(p);
      for (const [key, r] of Object.entries(readingEdits)) {
        const [account_id, service_id] = key.split("|");
        if (r.previous === "" && r.current === "") {
          next.meter_readings = next.meter_readings.filter(
            (x) =>
              !(
                x.account_id === account_id &&
                x.service_id === service_id &&
                x.period === period
              ),
          );
        } else {
          const item = {
            id:
              next.meter_readings.find(
                (x) =>
                  x.account_id === account_id &&
                  x.service_id === service_id &&
                  x.period === period,
              )?.id || uid(),
            account_id,
            service_id,
            period,
            previous: r.previous,
            current: r.current,
          };
          next.meter_readings = next.meter_readings.filter(
            (x) =>
              !(
                x.account_id === account_id &&
                x.service_id === service_id &&
                x.period === period
              ),
          );
          next.meter_readings.push(item);
        }
        next.quantities = next.quantities.filter(
          (x) =>
            !(
              x.account_id === account_id &&
              x.service_id === service_id &&
              x.period === period
            ),
        );
        if (r.quantity !== "")
          next.quantities.push({
            id: uid(),
            account_id,
            service_id,
            period,
            quantity: r.quantity,
          });
      }
      setProject(next);
      readingEdits = {};
      notice = t(
        "Показания применены. Нажмите «Сохранить», чтобы записать базу.",
        "Indexurile au fost aplicate. Apăsați „Salvează” pentru a scrie baza.",
      );
    } catch (e) {
      fail(e);
    }
  }
  async function changePeriod(value: string) {
    if (Object.keys(readingEdits).length) {
      error = t(
        "Сначала примени введённые показания.",
        "Aplică mai întâi indexurile introduse.",
      );
      return;
    }
    p.settings.period = value;
    changed();
  }
  async function toggleClosed() {
    try {
      if (Object.keys(readingEdits).length)
        throw Error(t("Сначала примените показания","Aplicați mai întâi indexurile"));
      if (
        !(await ask(
          closed
            ? t(
                "Открыть период для исправлений?",
                "Redeschizi perioada pentru corecturi?",
              )
            : t(
                "Зафиксировать начисления месяца? Сохраним суммы для истории.",
                "Închizi luna? Sumele vor fi păstrate în istoric.",
              ),
        ))
      )
        return;
      const reopening=closed;
      setProject(reopening ? reopenPeriod(p, period) : closePeriod(p, period));
      await save(reopening?"save":"close");
    } catch (e) {
      fail(e);
    }
  }
  async function exportJson() {
    try {
      if (Object.keys(readingEdits).length)
        throw Error(t("Сначала примените показания","Aplicați mai întâi indexurile"));
      if (
        await exportText(
          "OpenHaU-" + period + ".openhau.json",
          JSON.stringify(valid(p), null, 2),
          "json",
        )
      )
        notice = t("JSON экспортирован.", "JSON exportat.");
    } catch (e) {
      fail(e);
    }
  }
  async function beginImport() {
    try {
      const v = await importJson();
      if (v) {
        imported = valid(v);
        modal = "import";
      }
    } catch (e) {
      fail(e);
    }
  }
  async function applyImport() {
    try {
      if (!imported) return;
      if (Object.keys(readingEdits).length)
        throw Error(t("Сначала примените показания","Aplicați mai întâi indexurile"));
      await persist(valid(p));
      p = imported;
      imported = null;
      selected = [];
      dirty = true;
      modal = "";
      await save();
    } catch (e) {
      fail(e);
    }
  }
  function openJSON() {
    if (Object.keys(readingEdits).length) {
      error = t("Сначала примените показания","Aplicați mai întâi indexurile");
      return;
    }
    jsonTitle = t("Открытый JSON · все данные", "JSON deschis · toate datele");
    jsonText = JSON.stringify(p, null, 2);
    modal = "json";
  }
  function applyJSON() {
    try {
      const v = valid(JSON.parse(jsonText));
      imported = v;
      modal = "import";
    } catch (e) {
      fail(e);
    }
  }
  async function exportCSV() {
    const rows = [
      [
        t("Счёт", "Cont"),
        t("Плательщик", "Plătitor"),
        t("Адрес", "Adresa"),
        t("Начислено", "Calculat"),
        t("Оплачено", "Achitat"),
        t("Остаток", "Sold"),
      ],
      ...statements.map(({ a, s }) => [
        a.number,
        a.payer_name,
        a.address,
        s.total,
        s.paid,
        s.balance,
      ]),
    ];
    try {
      await exportText("OpenHaU-" + period + ".csv", csv(rows), "csv");
    } catch (e) {
      fail(e);
    }
  }
  async function exportHTML() {
    try {
      if (!receiptAccounts.length)
        throw Error(t("Выберите счета для печати.", "Selectați conturile pentru imprimare."));
      await exportText(
        "OpenHaU-facturi-" + period + ".html",
        receiptDocument(p, receiptAccounts, period),
        "html",
      );
    } catch (e) {
      fail(e);
    }
  }
  function printReceipts() {
    if (!receiptAccounts.length) {
      error = t("Выберите счета.", "Selectați conturile.");
      return;
    }
    window.print();
  }
  function toggleAccount(id: string) {
    selected = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
  }
  function serviceToggle(id: string) {
    draft.service_ids = draft.service_ids.includes(id)
      ? draft.service_ids.filter((x: string) => x !== id)
      : [...draft.service_ids, id];
    draft = { ...draft };
  }
  async function logoInput(event: Event) {
    try {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        p.settings.organization_logo = await loadLogo(file);
        changed();
      }
    } catch (e) {
      fail(e);
    }
  }
  function savePreset() {
    if (!presetName.trim()) return;
    if (
      p.settings.receipt_presets.length >= 20 &&
      !p.settings.receipt_presets.some((x) => x.name === presetName.trim())
    ) {
      error = t("Допускается до 20 конфигураций","Sunt permise cel mult 20 de configurații");
      return;
    }
    p.settings.receipt_presets = [
      ...p.settings.receipt_presets.filter((x) => x.name !== presetName.trim()),
      {
        name: presetName.trim(),
        design: p.settings.receipt_design,
        color: p.settings.receipt_color,
        font_size: p.settings.font_size,
        logo: p.settings.organization_logo,
        custom:p.settings.custom_receipt?{...p.settings.custom_receipt}:undefined,
      },
    ];
    presetName = "";
    changed();
  }
  function usePreset(name: string) {
    const preset = p.settings.receipt_presets.find((x) => x.name === name);
    if (preset) {
      p.settings.receipt_design = preset.design;
      p.settings.receipt_color = preset.color;
      p.settings.font_size = preset.font_size;
      p.settings.organization_logo = preset.logo;
      p.settings.custom_receipt=preset.custom?{...preset.custom}:undefined;
      changed();
    }
  }
  async function freshProject() {
    if (
      !(await ask(
        t(
          "Создать пустую базу? Сначала сохраним текущую базу и её JSON-копию.",
          "Creezi o bază goală? Salvăm mai întâi baza curentă și o copie JSON.",
        ),
      ))
    )
      return;
    try {
      if (
        !(await exportText(
          "OpenHaU-before-new.openhau.json",
          JSON.stringify(valid(p), null, 2),
          "json",
        ))
      )
        return;
      await persist(p);
      const next = demoProject();
      next.demo = false;
      next.accounts = [];
      next.meter_readings = [];
      next.organization.name = t("Моя ассоциация", "Asociația mea");
      next.organization.association_code = "";
      next.organization.address = "";
      setProject(next);
      selected = [];
      readingEdits = {};
      await save();
    } catch (e) {
      fail(e);
    }
  }
  onMount(() => {
    const showReportSettings=(event:Event)=>{const request=(event as CustomEvent<ReportSettingsRequest>).detail;const id='reportsettings:'+request.id;reportSettingsRequests={...reportSettingsRequests,[id]:request};desktopViews=desktopViews.filter(v=>v.id!==id);openDesktop(id);};
    window.addEventListener('openhau:report-settings',showReportSettings);
    const external = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.("a");
      if (native && a?.href.startsWith("https://")) {
        e.preventDefault();
        void openUrl(a.href).catch(fail);
      }
    };
    document.addEventListener("click", external);
    const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    const themeChange = () => {
      p = { ...p };
    };
    themeMedia.addEventListener("change", themeChange);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && !native) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    const keydown = (e: KeyboardEvent) => {
      if(workspaceLocked||showDatabaseHome)return;
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyS" || e.key.toLowerCase() === "s")
      ) {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", keydown);
    let unlistenClose: (() => void) | undefined;
    if (native)
      void getCurrentWindow()
        .onCloseRequested(async (event) => {
          if (!dirty) return;
          event.preventDefault();
          if (
            await ask(
              t(
                "Сохранить изменения перед выходом? Если показания не применены, сначала примените их.",
                "Salvați modificările înainte de ieșire? Aplicați mai întâi indexurile introduse.",
              ),
            )
          ) {
            await save();
            if (!dirty) await getCurrentWindow().close();
          }
        })
        .then((fn) => (unlistenClose = fn))
        .catch(fail);
    (async () => {
      try {
        document.documentElement.dataset.platform=await runtimePlatform();
        catalog=await databaseCatalog();
        if(catalog.auto)await switchDatabase(catalog.auto,true);
        else {const saved=await load();if(saved)p=saved;dbPath=await storagePath();selected=p.accounts.filter(a=>a.active).map(a=>a.id);}
      } catch (e) {
        loadFailed = true;
        fail(e);
      } finally {
        loading = false;
      }
    })();
    return () => {
      window.removeEventListener('openhau:report-settings',showReportSettings);
      unlistenClose?.();
      document.removeEventListener("click", external);
      themeMedia.removeEventListener("change", themeChange);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", keydown);
    };
  });
</script>

<svelte:head><title>OpenHaU · {period}</title></svelte:head>
<svelte:window onpointermove={reveal} onfocusin={rememberText}/>
{#snippet workspaceContent(page:string)}
    <section class="content">
      {#if loading}<div class="empty-state">
          {t("Открываем базу…", "Deschidem baza…")}
        </div>
      {:else if loadFailed}
        <div class="empty-state">
          <TriangleAlert size={30} />
          <h3>{t("Не удалось прочитать базу", "Baza nu a putut fi citită")}</h3>
          <p>
            {t(
              "Данные не перезаписаны. Сохраните исходный файл и проверьте резервные копии.",
              "Datele nu au fost suprascrise. Păstrați fișierul original și verificați copiile de rezervă.",
            )}
          </p>
        </div>
      {:else if page === "overview"}
        {#if p.demo}<div class="demo-banner">
            <div class="demo-icon"><Info size={21} /></div>
            <div>
              <strong
                >{t(
                  "Демонстрационная база",
                  "Bază demonstrativă",
                )}</strong
              >
              <p>
                {t(
                  "Здесь только вымышленные данные. Всё можно менять и пробовать.",
                  "Aici sunt doar date fictive. Poți modifica și încerca totul.",
                )}
              </p>
            </div>
            <button class="text-button" onclick={freshProject}
              >{t("Создать рабочую базу", "Creați o bază de lucru")}
              <ArrowUpRight size={16} /></button
            >
          </div>{/if}
        <div class="stat-grid">
          <article class="stat-card">
            <div class="stat-top">
              <span>{t("Начислено за месяц", "Calculat în această lună")}</span>
              <div class="stat-icon purple"><ReceiptText size={19} /></div>
            </div>
            <strong>{totalCharges}<small> MDL</small></strong>
            <p>
              {active.length}
              {t("активных лицевых счетов", "conturi personale active")}
            </p>
          </article>
          <article class="stat-card">
            <div class="stat-top">
              <span>{t("Поступило оплат", "Plăți primite")}</span>
              <div class="stat-icon green"><ArrowDownLeft size={19} /></div>
            </div>
            <strong>{totalPaid}<small> MDL</small></strong>
            <p>
              {t(
                "По дате платежа в выбранном месяце",
                "După data plății în luna selectată",
              )}
            </p>
          </article>
          <article class="stat-card">
            <div class="stat-top">
              <span>{t("Остаток к оплате", "Sold de achitat")}</span>
              <div class="stat-icon amber"><Wallet size={19} /></div>
            </div>
            <strong>{totalBalance}<small> MDL</small></strong>
            <p>
              {missing
                ? t(
                    "Предварительно: есть неполные данные",
                    "Provizoriu: există date incomplete",
                  )
                : t("С учётом остатков и оплат", "Cu solduri și plăți incluse")}
            </p>
          </article>
        </div>
        <div class="overview-columns">
          <article class="panel">
            <div class="panel-heading">
              <div>
                <h2>{t("Месяц под контролем", "Luna sub control")}</h2>
                <p>
                  {t(
                    "Три шага до готовых квитанций",
                    "Trei pași până la facturi gata",
                  )}
                </p>
              </div>
              <span class="badge"
                >{closed
                  ? t("Закрыт", "Închis")
                  : t("В работе", "În lucru")}</span
              >
            </div>
            <button class="workflow" onclick={() => navigate("readings")}
              ><span class="step-number">01</span>
              <div>
                <strong>{t("Внести показания", "Introdu indexurile")}</strong>
                <p>
                  {missing
                    ? t(
                        `Требуют проверки: ${missing}`,
                        `${missing} conturi necesită atenție`,
                      )
                    : t("Все данные заполнены", "Toate datele sunt completate")}
                </p>
              </div>
              <ChevronRight size={18} /></button
            ><button class="workflow" onclick={() => navigate("payments")}
              ><span class="step-number">02</span>
              <div>
                <strong
                  >{t(
                    "Проверить начисления и оплаты",
                    "Verificați sumele și plățile",
                  )}</strong
                >
                <p>
                  {t(
                    "История платежей и ручные корректировки",
                    "Istoricul plăților și ajustări manuale",
                  )}
                </p>
              </div>
              <ChevronRight size={18} /></button
            ><button class="workflow" onclick={() => navigate("receipts")}
              ><span class="step-number">03</span>
              <div>
                <strong
                  >{t("Подготовить квитанции", "Pregătește facturile")}</strong
                >
                <p>
                  {t(
                    "Печать, PDF через диалог печати и HTML",
                    "Tipărire, PDF prin dialogul de imprimare și HTML",
                  )}
                </p>
              </div>
              <ChevronRight size={18} /></button
            >
            <div class="panel-footer">
              <span
                >{t(
                  "Фиксация сохраняет начисления в истории",
                  "Închiderea păstrează sumele în istoric",
                )}</span
              ><button class="button small" onclick={toggleClosed}
                >{#if closed}<UnlockKeyhole size={14} />{:else}<LockKeyhole
                    size={14}
                  />{/if}{closed
                  ? t("Открыть месяц", "Redeschide luna")
                  : t("Закрыть месяц", "Închide luna")}</button
              >
            </div>
          </article>
          <article class="panel quick-panel">
            <div class="panel-heading">
              <h2>{t("Под рукой", "La îndemână")}</h2>
            </div>
            <button onclick={() => openEditor("account")}
              ><span class="quick-icon"><Users size={18} /></span>{t(
                "Добавить лицевой счёт",
                "Adaugă un cont",
              )}<Plus size={17} /></button
            ><button onclick={() => openEditor("payment")}
              ><span class="quick-icon"><Wallet size={18} /></span>{t(
                "Внести оплату",
                "Înregistrează o plată",
              )}<Plus size={17} /></button
            ><button onclick={exportJson}
              ><span class="quick-icon"><Download size={18} /></span>{t(
                "Экспортировать данные",
                "Exportă datele",
              )}<ArrowUpRight size={17} /></button
            ><button onclick={beginImport}
              ><span class="quick-icon"><Upload size={18} /></span>{t(
                "Импортировать JSON",
                "Importă JSON",
              )}<ArrowUpRight size={17} /></button
            >
            <div class="quiet-note">
              <CheckCheck size={16} />
              <p>
                {t(
                  "Данные сохраняются на этом компьютере.",
                  "Datele se păstrează pe acest calculator.",
                )}
              </p>
            </div>
          </article>
        </div>
        <article class="panel">
          <div class="panel-heading">
            <h2>{t("Начисления по счетам", "Calcule pe conturi")}</h2>
            <button class="text-button" onclick={() => navigate("accounts")}
              >{t("Все счета", "Toate conturile")}<ArrowUpRight
                size={15}
              /></button
            >
          </div>
          <div class="table-wrap">
            <table>
              <thead
                ><tr
                  ><th>{t("Счёт / Плательщик", "Cont / Plătitor")}</th><th
                    >{t("Статус", "Stare")}</th
                  ><th class="num">{t("Начислено", "Calculat")}</th><th
                    class="num">{t("Оплачено", "Achitat")}</th
                  ><th class="num">{t("К оплате", "De achitat")}</th></tr
                ></thead
              ><tbody
                >{#each statements as { a, s }}<tr
                    ><td
                      ><strong>{a.payer_name}</strong><small
                        >{a.number} · {a.address}</small
                      ></td
                    ><td
                      ><span
                        class:warning={s.warnings.length || s.gaps.length}
                        class="badge"
                        >{s.warnings.length || s.gaps.length
                          ? t("Проверить", "De verificat")
                          : t("Готово", "Gata")}</span
                      ></td
                    ><td class="num">{s.total}</td><td class="num">{s.paid}</td
                    ><td class="num strong">{s.balance}</td></tr
                  >{/each}</tbody
              >
            </table>
            {#if !statements.length}<div class="empty-state">
                {t(
                  "Начни с первого лицевого счёта.",
                  "Începe cu primul cont personal.",
                )}
              </div>{/if}
          </div>
        </article>
      {:else if page === "accounts"}
        <div class="toolbar">
          <label class="search"
            ><Search size={17} /><input
              bind:value={query}
              placeholder={t(
                "Имя, адрес или номер счёта",
                "Nume, adresă sau număr de cont",
              )}
            /></label
          ><button class="button" onclick={() => openEditor("account")}
            ><Plus size={17} />{t("Новый счёт", "Cont nou")}</button
          >
        </div>
        <article class="panel">
          <div class="table-wrap">
            <table>
              <thead
                ><tr
                  ><th>{t("Лицевой счёт", "Cont personal")}</th><th
                    >{t("Плательщик и адрес", "Plătitor și adresă")}</th
                  ><th class="num">m²</th><th class="num"
                    >{t("Зарегистрировано / мусор", "Înregistrați / deșeuri")} · {displayPeriod(period,p)}</th
                  ><th>{t("Статус", "Stare")}</th><th></th></tr
                ></thead
              ><tbody
                >{#each accounts as a}<tr
                    ><td class="mono">{a.number}</td><td
                      ><strong>{a.payer_name}</strong><small
                        >{a.address} · {a.apartments.join(", ")}</small
                      ></td
                    ><td class="num">{a.total_area_m2}</td><td class="num"
                      >{a.registered_residents} / {monthlyPersons(p, a, period).persons ?? "—"}</td
                    ><td
                      ><span class="badge"
                        >{a.active
                          ? t("Открыт", "Deschis")
                          : t("Архив", "Arhivă")}</span
                      ></td
                    ><td
                      ><button
                        class="icon-button"
                        aria-label={t("Редактировать счёт", "Editează contul")}
                        onclick={() => openEditor("account", a)}
                        ><Pencil size={16} /></button
                      ></td
                    ></tr
                  >{/each}</tbody
              >
            </table>
            {#if !accounts.length}<div class="empty-state">
                {t(
                  "Счетов пока нет. Добавим первый?",
                  "Nu există conturi. Adăugăm primul?",
                )}
              </div>{/if}
          </div>
        </article>
      {:else if page === "services"}
        <ServiceCatalog project={p} onedit={service=>openEditor("service",service)} ontariffs={id=>{tariffServiceFilter=id;navigate("tariffs");}}/>
      {:else if page === "tariffs"}
        <TariffDocuments project={p} onapply={setProject}/>
        <label>{t("Услуга", "Serviciu")}<select bind:value={tariffServiceFilter}>
          <option value="">{t("Все услуги", "Toate serviciile")}</option>
          {#each p.services as s}<option value={s.id}>{s.name[lang]} · {unitLabel(s.unit, lang)}</option>{/each}
        </select></label>
        <article class="panel">
          <div class="panel-heading">
            <div>
              <h2>{t("История тарифов", "Istoricul tarifelor")}</h2>
              <p>
                {t(
                  "Закрытые месяцы сохраняют рассчитанные суммы.",
                  "Lunile închise păstrează sumele calculate.",
                )}
              </p>
            </div>
            <button class="button small" onclick={() => { openEditor("tariff"); if (tariffServiceFilter) draft.service_id = tariffServiceFilter; }}
              ><Plus size={15} />{t("Добавить тариф", "Adaugă tarif")}</button
            >
          </div>
          <div class="table-wrap">
            <table>
              <thead
                ><tr
                  ><th>{t("Услуга", "Serviciu")}</th><th
                    >{t("Действует с", "Valabil din")}</th
                  ><th class="num">{t("Тариф, MDL", "Tarif, MDL")}</th><th
                  ></th></tr
                ></thead
              ><tbody
                >{#each p.tariffs.filter(x => !tariffServiceFilter || x.service_id === tariffServiceFilter).sort( (a, b) => b.effective_from.localeCompare(a.effective_from) ) as tariff}<tr
                    ><td
                      >{p.services.find((s) => s.id === tariff.service_id)
                        ?.name[lang]}</td
                    ><td>{displayDate(tariff.effective_from,p)}</td><td class="num"
                      >{tariff.rate}</td
                    ><td
                      ><button
                        class="icon-button"
                        onclick={() => openEditor("tariff", tariff)}
                        aria-label="Edit"><Pencil size={15} /></button
                      ></td
                    ></tr
                  >{/each}</tbody
              >
            </table>
          </div>
        </article>
      {:else if page === "readings"}
        <PhysicalMeters project={p} onapply={setProject} />
        <SharedMeters project={p} onapply={setProject} />
        <MonthlyResidents project={p} onapply={setProject} />
        <div class="toolbar">
          <p class="muted">
            {t(
              "Объём вручную заменяет разницу показаний; пустое поле её не заменяет.",
              "Volumul manual înlocuiește diferența indexurilor; câmpul gol nu o înlocuiește.",
            )}
          </p>
          <button
            class="button"
            disabled={closed || !Object.keys(readingEdits).length}
            onclick={applyReadings}
            ><Check size={17} />{t(
              "Применить показания",
              "Aplică indexurile",
            )}</button
          >
        </div>
        {#if closed}<div class="alert">
            <LockKeyhole size={17} />{t(
              "Месяц закрыт. Открой его в обзоре для исправлений.",
              "Luna este închisă. Redeschide-o din prezentare pentru corecturi.",
            )}
          </div>{/if}
        <article class="panel">
          <div class="table-wrap">
            <table>
              <thead
                ><tr
                  ><th>{t("Плательщик / услуга", "Plătitor / serviciu")}</th><th
                    >{t("Предыдущие", "Precedent")}</th
                  ><th>{t("Текущие", "Actual")}</th><th
                    >{t("Объём вручную", "Volum manual")}</th
                  ><th>{t("Ед.", "Unit.")}</th></tr
                ></thead
              ><tbody
                >{#each active as a}{#each p.services.filter((s) => s.active && a.service_ids.includes(s.id)) as s}{@const r =
                      getReading(a.id, s.id)}{@const physical = physicalReadings(p,a.id,s.id,period)}<tr
                      ><td
                        ><strong>{a.payer_name}</strong><small
                          >{a.number} · {s.name[lang]}</small
                        ></td
                      ><td
                        >{#if physical.length}<span class="muted">{t("По приборам выше", "Din contoarele de mai sus")}</span>{:else if s.calculation_type === "metered"}<input
                            class="table-input"
                            value={r.previous}
                            oninput={(e) =>
                              editReading(
                                a.id,
                                s.id,
                                "previous",
                                e.currentTarget.value,
                              )}
                            disabled={closed}
                            placeholder="—"
                            aria-label={t(
                              "Предыдущие показания",
                              "Index precedent",
                            )}
                          />{:else}<span class="muted">—</span>{/if}</td
                      ><td
                        >{#if physical.length}<span class="muted">{t("По приборам выше", "Din contoarele de mai sus")}</span>{:else if s.calculation_type === "metered"}<input
                            class="table-input"
                            value={r.current}
                            oninput={(e) =>
                              editReading(
                                a.id,
                                s.id,
                                "current",
                                e.currentTarget.value,
                              )}
                            disabled={closed}
                            placeholder="—"
                            aria-label={t("Текущие показания", "Index actual")}
                          />{:else}<span class="muted">—</span>{/if}</td
                      ><td
                        ><input
                          class="table-input"
                          value={r.quantity}
                          oninput={(e) =>
                            editReading(
                              a.id,
                              s.id,
                              "quantity",
                              e.currentTarget.value,
                            )}
                          disabled={closed}
                          placeholder={s.calculation_type === "fixed"
                            ? s.default_quantity
                            : s.calculation_type === "person"
                              ? String(monthlyPersons(p, a, period).persons ?? "—")
                              : s.calculation_type === "area"
                                ? a.total_area_m2
                                : "—"}
                          aria-label={t("Ручной объём", "Volum manual")}
                        /></td
                      ><td>{unitLabel(s.unit, lang)}</td></tr
                    >{/each}{/each}</tbody
              >
            </table>
          </div>
        </article>
      {:else if page === "payments"}
        <div class="toolbar">
          <p class="muted">
            {t(
              "Дата платежа и дата внесения хранятся отдельно.",
              "Data plății și data înregistrării sunt separate.",
            )}
          </p>
          <div class="button-group">
            <button
              class="button secondary"
              onclick={() => openEditor("adjustment")}
              ><Plus size={16} />{t("Корректировка", "Ajustare")}</button
            ><button class="button" onclick={() => openEditor("payment")}
              ><Plus size={16} />{t(
                "Внести оплату",
                "Înregistrează plata",
              )}</button
            >
          </div>
        </div>
        <article class="panel">
          <div class="panel-heading">
            <h2>{t("Оплаты за месяц", "Plăți în această lună")}</h2>
            <span class="badge">MDL</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead
                ><tr
                  ><th>{t("Плательщик", "Plătitor")}</th><th
                    >{t("Дата платежа", "Data plății")}</th
                  ><th>{t("Внесено", "Înregistrat")}</th><th
                    >{t("Примечание", "Notă")}</th
                  ><th class="num">{t("Сумма", "Sumă")}</th><th></th></tr
                ></thead
              ><tbody
                >{#each p.payments
                  .filter((x) => x.payment_date.startsWith(period))
                  .sort( (a, b) => b.payment_date.localeCompare(a.payment_date) ) as pay}<tr
                    ><td
                      >{p.accounts.find((a) => a.id === pay.account_id)
                        ?.payer_name}</td
                    ><td>{displayDate(pay.payment_date,p)}</td><td>{displayDate(pay.entered_date,p)}</td><td
                      >{pay.note}</td
                    ><td class="num strong">{pay.amount}</td><td
                      ><button
                        class="icon-button"
                        onclick={() => openEditor("payment", pay)}
                        aria-label="Edit"><Pencil size={15} /></button
                      ></td
                    ></tr
                  >{/each}</tbody
              >
            </table>
            {#if !p.payments.some((x) => x.payment_date.startsWith(period))}<div
                class="empty-state"
              >
                <Wallet size={28} />
                <h3>{t("Оплат пока нет", "Încă nu sunt plăți")}</h3>
                <p>
                  {t(
                    "Внесённые оплаты учитываются в расчётах и ведомостях.",
                    "Plățile înregistrate sunt incluse în calcule și rapoarte.",
                  )}
                </p>
              </div>{/if}
          </div>
        </article>
        <article class="panel">
          <div class="panel-heading">
            <h2>{t("Корректировки начислений", "Ajustări ale sumelor")}</h2>
          </div>
          <div class="table-wrap">
            <table>
              <thead
                ><tr
                  ><th>{t("Плательщик", "Plătitor")}</th><th
                    >{t("Причина", "Motiv")}</th
                  ><th class="num">MDL</th><th></th></tr
                ></thead
              ><tbody
                >{#each p.adjustments.filter((x) => x.period === period) as adj}<tr
                    ><td
                      >{p.accounts.find((a) => a.id === adj.account_id)
                        ?.payer_name}</td
                    ><td>{adj.note}</td><td class="num">{adj.amount}</td><td
                      ><button
                        class="icon-button"
                        onclick={() => openEditor("adjustment", adj)}
                        aria-label="Edit"><Pencil size={15} /></button
                      ></td
                    ></tr
                  >{/each}</tbody
              >
            </table>
          </div>
        </article>
      {:else if page === "treasury"}
        <Treasury project={p} onapply={setProject}/>
      {:else if page === "reports"}
        <Reports project={p} />
      {:else if page === "individual-meters" || page === "shared-meters"}
        <PhysicalMeters project={p} onapply={setProject} scopeFilter={page==="individual-meters"?"individual":"shared"}/>
      {:else if page === "payment-report"}
        <PaymentReport project={p}/>
      {:else if page === "payment-batches"}
        <PaymentBatches project={p} onapply={setProject}/>
      {:else if page === "service-reports"}
        <Reports project={p} mode="service"/>
      {:else if page === "receipts"}
        <div class="receipts-layout">
          <aside class="receipt-controls panel">
            <div class="panel-heading">
              <h2>{t("Оформление", "Aspect")}</h2>
            </div>
            <div class="controls-body">
              <label
                >{t("Дизайн", "Design")}<select
                  bind:value={p.settings.receipt_design}
                  onchange={changed}
                  ><option value="studio"
                    >Studio</option
                  ><option value="compact"
                    >Compact</option
                  ><option value="classic"
                    >Classic</option
                  ><option value="ribbon">Ribbon</option
                  ><option value="botanical">Botanical</option
                  ><option value="heritage">Heritage</option
                  ><option value="aero">Aero</option
                  ><option value="custom">{t("Своё оформление", "Aspect personalizat")}</option
                  ></select
                ></label
              ><label
                >{t("Язык квитанции", "Limba facturii")}<select
                  bind:value={p.settings.receipt_language}
                  onchange={changed}
                  ><option value="ru">Русский</option><option value="ro"
                    >Română</option
                  ><option value="both">Русский + Română</option><option value="en">English</option></select
                ></label
              >
              <label>{t("Оплатить до · текущий месяц", "Achitați până la · luna curentă")}<input type="date" value={paymentDeadline(p,period)} onchange={(e)=>setPaymentDeadline(e.currentTarget.value)}/></label>
              {#if p.payment_deadlines.some(d=>d.period===period)}<button class="text-button" onclick={()=>setPaymentDeadline("")}>{t("Вернуть общий срок оплаты", "Restabilește termenul general de plată")}</button>{/if}
              <div class="two-fields">
                <label
                  >{t("Цвет", "Culoare")}<input
                    type="color"
                    value={p.settings.receipt_color}
                    onchange={e=>{p.settings.receipt_color=e.currentTarget.value;changed();}}
                  /></label
                ><label
                  >{t("Шрифт, pt", "Font, pt")}<input
                    type="number"
                    min="9"
                    max="16"
                    bind:value={p.settings.font_size}
                    onchange={changed}
                  /></label
                >
              </div>
              <label class="file-button"
                ><Upload size={16} />{t(
                  "Логотип организации",
                  "Sigla asociației",
                )}<input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp"
                  onchange={logoInput}
                /></label
              ><small class="muted">SVG, PNG, JPEG, WebP · ≤ 2 MB</small
              >{#if p.settings.organization_logo}<button
                  class="text-button"
                  onclick={() => {
                    p.settings.organization_logo = "";
                    changed();
                  }}>{t("Убрать логотип", "Elimină sigla")}</button
                >{/if}
              <hr />
              <label
                >{t("Сохранить оформление", "Salvează aspectul")}<input
                  bind:value={presetName}
                  placeholder={t(
                    "Название конфигурации",
                    "Numele configurației",
                  )}
                /></label
              ><button class="button secondary small" onclick={savePreset}
                ><Save size={14} />{t(
                  "Сохранить конфигурацию",
                  "Salvează configurația",
                )}</button
              >{#if p.settings.receipt_presets.length}<select
                  aria-label="Presets"
                  onchange={(e) => usePreset(e.currentTarget.value)}
                  ><option value=""
                    >{t("Выбрать конфигурацию", "Alege configurația")}</option
                  >{#each p.settings.receipt_presets as pr}<option
                      value={pr.name}>{pr.name}</option
                    >{/each}</select
                >{/if}
              <hr />
              <div class="check-row">
                <input
                  type="checkbox"
                  checked={active.length > 0 &&
                    receiptAccounts.length === active.length}
                  onchange={(e) =>
                    (selected = e.currentTarget.checked
                      ? active.map((a) => a.id)
                      : [])}
                /><strong>{t("Все счета", "Toate conturile")}</strong>
              </div>
              <div class="receipt-account-list">
                {#each active as a}<label class="check-row"
                    ><input
                      type="checkbox"
                      checked={selected.includes(a.id)}
                      onchange={() => toggleAccount(a.id)}
                    /><span>{a.number}<small>{a.payer_name}</small></span
                    ></label
                  >{/each}
              </div>
              <button class="button" onclick={printReceipts}
                ><Printer size={16} />{t(
                  "Печать",
                  "Tipărire",
                )}</button
              ><button class="button secondary" disabled={!native||!receiptAccounts.length} onclick={async()=>{try{await exportPDF(`OpenHaU-receipts-${period}.pdf`,receiptDocument(p,receiptAccounts,period));}catch(e){fail(e);}}}><Download size={16}/>{t("Сохранить PDF","Salvează PDF")}</button
              ><button class="button secondary" onclick={exportHTML}
                ><Download size={16} />{t(
                  "Сохранить HTML",
                  "Salvează HTML",
                )}</button
              >
              {#if p.settings.receipt_design==="custom"}<ReceiptDesigner project={p} onapply={setProject}/>{/if}
              <p class="quiet-note">
                {t(
                  "Для сохранения PDF выберите соответствующее назначение в диалоге печати.",
                  "Pentru salvarea PDF selectați destinația corespunzătoare din dialogul de imprimare.",
                )}
              </p>
            </div>
          </aside>
          <div class="receipt-preview">
            <div class="preview-label">
              <span
                >{t("КВИТАНЦИЙ", "FACTURI")} · {receiptAccounts.length}</span
              ><span>A4</span>
            </div>
            <div class="paper-stack">
              {@html `<style>${receiptBaseCSS}\n${receiptDesignCSS}\n${p.settings.receipt_css.replace(/<\/style/gi, "")}</style>`}{#each receiptAccounts as a}{@html receipt(
                  p,
                  a,
                  period,
                )}{/each}{#if !receiptAccounts.length}<div class="empty-state">
                  {t("Выберите счета слева.", "Selectați conturile din stânga.")}
                </div>{/if}
            </div>
          </div>
        </div>
      {:else if page === "settings"}
        <div class="settings-screen">{#if settingsCategory==="home"}<SettingsHome language={lang} onselect={id=>settingsCategory=id}/>{:else}<button class="button secondary settings-back" onclick={()=>settingsCategory="home"}><ChevronRight size={16} style="transform:rotate(180deg)"/>{t("Все параметры","Toate setările")}</button>
        {#if settingsCategory==="backups"}<BackupSettings language={lang} unsaved={dirty || !!Object.keys(readingEdits).length}/>{/if}
        {#if settingsCategory==="exports"}<ExportSettings project={p} unsaved={dirty || !!Object.keys(readingEdits).length}/>{/if}
        {#if settingsCategory==="notifications"}<NotificationSettings language={lang}/>{/if}
        {#if settingsCategory==="appearance"}<article class="panel">
            <div class="panel-heading">
              <div>
                <h2>{t("Внешний вид", "Aspect")}</h2>
                <p>
                  {t(
                    "Тема, цвета и язык интерфейса.",
                    "Tema, culorile și limba interfeței.",
                  )}
                </p>
              </div>
              <Palette size={20} />
            </div>
            <div class="settings-body">
              <div class="field-label">{t("Тема", "Temă")}</div>
              <div class="theme-options">
                {#each [{ id: "system", ru: "Как в системе", ro: "Sistem", icon: Monitor }, { id: "light", ru: "Светлая", ro: "Luminoasă", icon: Sun }, { id: "dark", ru: "Тёмная", ro: "Întunecată", icon: Moon }] as th}<button
                    class:selected={p.settings.theme === th.id}
                    onclick={() => {
                      p.settings.theme = th.id as "system" | "light" | "dark";
                      changed();
                    }}
                    ><th.icon size={22} />{lang === "ru"
                      ? th.ru
                      : th.ro}</button
                  >{/each}
              </div>
              <div class="two-fields">
                <label
                  >{t("Акцентный цвет", "Culoare accent")}<input
                    type="color"
                    value={p.settings.accent}
                    onchange={e=>{p.settings.accent=e.currentTarget.value;changed();}}
                  /></label
                ><label
                  >{t("Язык интерфейса", "Limba interfeței")}<select
                    bind:value={p.settings.language}
                    onchange={changed}
                    ><option value="ru">Русский</option><option value="ro"
                      >Română</option
                    ></select
                  ></label
                >
              </div>
              <div class="two-fields">
                <label>{t("Формат даты","Formatul datei")}<select bind:value={p.settings.date_format} onchange={()=>{if(p.settings.period_format==="iso")p.settings.period_format="auto";changed();}}>{#each dateFormats as style}<option value={style}>{displayDate("2026-10-26",{...p,settings:{...p.settings,date_format:style}})}</option>{/each}</select></label>
                <label>{t("Формат расчётного месяца","Formatul lunii de calcul")}<select bind:value={p.settings.period_format} onchange={changed}>{#each periodFormats as style}<option value={style}>{style==="auto"?t("Как формат даты · ","Ca formatul datei · "):""}{displayPeriod("2026-10",{...p,settings:{...p.settings,period_format:style}})}</option>{/each}</select></label>
              </div>
            </div>
          </article>{/if}
        {#if settingsCategory==="organization"}<article class="panel">
            <div class="panel-heading">
              <h2>{t("Организация", "Organizație")}</h2>
              <button
                class="icon-button"
                onclick={() => openEditor("organization")}
                aria-label="Edit"><Pencil size={17} /></button
              >
            </div>
            <div class="settings-body organization-summary">
              <strong>{p.organization.name}</strong>
              <p>{p.organization.address || "—"}</p>
              <p>CF/IDNO: {p.organization.fiscal_code || "—"}</p>
              <p>IBAN: {p.organization.iban || "—"}</p>
              <small>{p.organization.bank}</small>
            </div>
          </article>{/if}
        {#if settingsCategory==="calculations"}<article class="panel">
            <div class="panel-heading">
              <h2>{t("Расчёты и квитанции", "Calcule și facturi")}</h2>
            </div>
            <div class="settings-body">
              <label
                >{t("Округление денежных сумм", "Rotunjirea sumelor")}<select
                  bind:value={p.settings.rounding}
                  onchange={changed}
                  ><option value="half_up">Half up · 1,005 → 1,01</option
                  ><option value="half_even">Half even · 1,005 → 1,00</option
                  ></select
                ></label
              >
              <p class="quiet-note">
                {t(
                  "Правило по умолчанию — half up. Перед рабочими начислениями согласуйте его с бухгалтером. Закрытые месяцы не пересчитываются.",
                  "Regula implicită este half up. Confirm-o cu contabilul înainte de utilizare. Lunile închise nu se recalculează.",
                )}
              </p>
              <label
                >{t(
                  "Срок оплаты: день следующего месяца",
                  "Termen de plată: ziua lunii următoare",
                )}<input
                  type="number"
                  min="1"
                  max="28"
                  bind:value={p.settings.due_day}
                  onchange={changed}
                /></label
              ><label
                >{t("Заголовок квитанции · RU", "Titlul facturii · RU")}<input
                  bind:value={p.settings.receipt_title.ru}
                  oninput={changed}
                /></label
              ><label
                >{t("Заголовок квитанции · RO", "Titlul facturii · RO")}<input
                  bind:value={p.settings.receipt_title.ro}
                  oninput={changed}
                /></label
              ><label>{t("Заголовок квитанции · EN", "Titlul facturii · EN")}<input bind:value={p.settings.receipt_title.en} oninput={changed}/></label
              ><label
                >{t("Подпись внизу · RU", "Text de subsol · RU")}<textarea
                  bind:value={p.settings.receipt_footer.ru}
                  oninput={changed}></textarea></label
              ><label
                >{t("Подпись внизу · RO", "Text de subsol · RO")}<textarea
                  bind:value={p.settings.receipt_footer.ro}
                  oninput={changed}></textarea></label
              ><label>{t("Подпись внизу · EN", "Text de subsol · EN")}<textarea bind:value={p.settings.receipt_footer.en} oninput={changed}></textarea></label
              >
            </div>
          </article>{/if}
        {#if settingsCategory==="data"}<article class="panel"><label>{t("Автоматически открывать базу","Deschidere automată a bazei")}<select value={catalog.auto||""} onchange={e=>configureAutoDatabase(e.currentTarget.value||null)}><option value="">{t("Показывать выбор базы","Afișează alegerea bazei")}</option>{#each catalog.databases as db}<option value={db.id}>{db.name}</option>{/each}</select></label><button class="button secondary" onclick={()=>void requestDatabaseHome()}><FolderOpen size={17}/>{t("Каталог баз данных","Catalogul bazelor de date")}</button>
            <div class="panel-heading">
              <h2>
                {t("Данные и резервные копии", "Date și copii de rezervă")}
              </h2>
              <FolderOpen size={20} />
            </div>
            <div class="settings-body">
              <p class="quiet-note">
                {t(
                  "Стандартный SQLite + открытый JSON. Резервная копия перед каждым сохранением существующей базы.",
                  "SQLite standard + JSON deschis. Copie de rezervă înainte de fiecare salvare a bazei existente.",
                )}
              </p>
              <div class="path-box">{dbPath}</div>
              <button class="button secondary" onclick={exportJson}
                ><FileJson size={16} />{t(
                  "Экспорт JSON",
                  "Export JSON",
                )}</button
              ><button class="button secondary" onclick={beginImport}
                ><Upload size={16} />{t(
                  "Импорт JSON с проверкой",
                  "Import JSON cu verificare",
                )}</button
              ><button class="button secondary" onclick={exportCSV}
                ><Download size={16} />{t(
                  "Сводка CSV для таблиц",
                  "Rezumat CSV pentru tabele",
                )}</button
              ><button class="button secondary" onclick={openJSON}
                ><Pencil size={16} />{t(
                  "Редактировать все данные JSON",
                  "Editează toate datele JSON",
                )}</button
              ><button class="text-button" onclick={freshProject}
                >{t("Создать пустую базу", "Creează o bază goală")}<ArrowUpRight
                  size={15}
                /></button
              >
              </div>
          </article>{/if}
        {#if settingsCategory==="updates"}<article class="panel"><h2>{t("Обновления","Actualizări")}</h2><p>{t("Установка обновлений вручную.","Instalarea manuală a actualizărilor.")}</p><a href="https://github.com/OldschoolNetwork/open-hau/releases" target="_blank" rel="noreferrer">GitHub Releases</a></article>{/if}
        {/if}</div>
      {/if}

    </section>
{/snippet}
<div class="desktop-shell no-print" class:welcome-shell={showDatabaseHome}>
  <Notifications {notice} {error} language={lang} onnotice={()=>notice=""}/>
  {#if !showDatabaseHome}<header class="desktop-chrome">
    <div class="desktop-titlebar"><img src="/brand/icon.png" alt=""/><strong>OpenHaU</strong><span>{p.organization.name}</span><span>{t("Период: ","Perioadă: ")}{displayPeriod(period,p)}</span><div class="desktop-state">{dirty?t("Есть изменения","Modificări nesalvate"):t("Все изменения сохранены","Toate modificările salvate")}</div></div>
    <DesktopMenu menus={desktopMenus} language={lang} oncommand={desktopCommand}/>
    <div class="desktop-commandbar"><button class="desktop-save" onclick={()=>save()} disabled={busy||loading}><Save size={17}/>{t("Сохранить","Salvare")}</button></div>
  </header>{/if}
  <main class="desktop-area" bind:this={desktopArea}>
    {#if showDatabaseHome}<DatabaseHome {catalog} language={lang} active={activeDatabaseId} onopen={openDatabase} onnew={newDatabase} onimport={importDatabase} onauto={configureAutoDatabase}/>{:else}
    {#if !desktopViews.some(v=>v.visible&&!v.minimized)}<div class="desktop-empty"><img src="/brand/logo-full.svg" alt="OpenHaU OPEN"/></div>{/if}
    <DesktopWidgets language={lang} databaseId={activeDatabaseId} period={displayPeriod(period,p)} charges={totalCharges} paid={totalPaid} balance={totalBalance} attention={missing} onopen={desktopCommand}/>
    {#each desktopViews as view (view.id)}
      <DesktopWindow id={view.id} title={desktopTitle(view.id,lang)} language={lang} active={activeDesktop===view.id} hidden={!view.visible||view.minimized} minimized={view.minimized} index={desktopViews.indexOf(view)} bind:position={view.position} onfocus={()=>focusDesktop(view.id)} onclose={()=>hideDesktop(view.id)} onminimize={()=>hideDesktop(view.id,true)}>
        {#if view.id.startsWith('reportsettings:')&&reportSettingsRequests[view.id]}<ReportSettings request={reportSettingsRequests[view.id]} language={lang} onclose={()=>hideDesktop(view.id)}/>
        {:else if view.id.startsWith("catalogedit:")}{@const parts=view.id.split(":")}<ReferenceRecordEditor project={p} kind={parts[1] as ReferenceKind} recordId={parts.slice(2).join(":")} onapply={setProject} onclose={()=>hideDesktop(view.id)}/>
        {:else if view.id==='purge'}<MarkedDeletion project={p} onapply={setProject}/>
        {:else if view.id.startsWith("catalog:")}<ReferenceCatalog project={p} kind={view.id.slice(8) as ReferenceKind} onapply={setProject} onedit={id=>openDesktop("catalogedit:"+view.id.slice(8)+":"+(id==="new"?uid():id))}/>
        {:else if view.id.startsWith("chooser:")}<DesktopChooser group={view.id.slice(8)} language={lang} oncommand={action=>{hideDesktop(view.id);desktopCommand(action);}}/>
        {:else if view.id==="period"}<div class="desktop-simple-form"><label>{t("Расчетный период","Perioada de calcul")}<input type="month" value={period} onchange={e=>changePeriod(e.currentTarget.value)}/></label><button class="button secondary" onclick={()=>hideDesktop(view.id)}>{t("Закрыть","Închidere")}</button></div>
        {:else if view.id==="manual"}<Documentation language={lang} onopen={desktopCommand}/>
        {:else}{@render workspaceContent(view.page)}{/if}
      </DesktopWindow>
    {/each}
    {/if}
  </main>
  {#if !showDatabaseHome}<footer class="desktop-dock" aria-label={t("Панель окон","Bara ferestrelor")}>
    <div class="desktop-open-windows">{#each desktopViews.filter(v=>v.visible) as view}{@const WindowIcon=pages.find(item=>item.id===view.id)?.icon||FolderOpen}<button data-window-id={view.id} title={desktopTitle(view.id,lang)} aria-pressed={activeDesktop===view.id&&!view.minimized} class:active={activeDesktop===view.id&&!view.minimized} onclick={()=>focusDesktop(view.id)}><WindowIcon size={18}/><span>{desktopTitle(view.id,lang)}</span></button>{/each}</div>
  </footer>{/if}
</div>
{#if workspaceLocked}<div class="workspace-lock" role="dialog" aria-modal="true" aria-label={t('Временная блокировка','Blocare temporară')} tabindex="-1"><div><h2>{t('Временная блокировка','Blocare temporară')}</h2><p>{t('Ввод временно приостановлен. Это защита от случайных нажатий, без проверки личности.','Introducerea este suspendată. Protecție împotriva apăsărilor accidentale, fără verificarea identității.')}</p><button class="button" onclick={()=>workspaceLocked=false}>{t('Продолжить работу','Continuă lucrul')}</button></div></div>{/if}
<div class="print-only">
  {#each receiptAccounts as a}{@html receipt(p, a, period)}{/each}
</div>

{#if modal}
  <div class="modal-backdrop no-print" role="presentation">
    <div
      class="modal"
      class:wide={modal === "json" || modal === "import" || modal === "payment" || modal === "service"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
      tabindex="-1"
    >
      <header>
        <div>
          <h2 id="modal-heading">
            {modal === "account"
              ? t("Лицевой счёт", "Cont personal")
              : modal === "service"
                ? t("Услуга", "Serviciu")
                : modal === "tariff"
                  ? t("Тариф", "Tarif")
                  : modal === "payment"
                    ? t("Оплата", "Plată")
                    : modal === "adjustment"
                      ? t("Корректировка", "Ajustare")
                      : modal === "organization"
                        ? t("Организация", "Organizație")
                        : modal === "import"
                          ? t("Проверка импорта", "Verificarea importului")
                          : modal === "json"
                            ? jsonTitle
                            : t("О программе", "Despre aplicație")}
          </h2>
        </div>
        <button
          class="icon-button"
          onclick={() => {
            modal = "";
            error = "";
          }}
          aria-label="Close"><X size={20} /></button
        >
      </header>
      {#if error}<div class="alert error" role="alert">{error}</div>{/if}
      <div class="modal-body">
        {#if modal === "account"}
          <div class="two-fields">
            <label
              >{t("Номер счёта", "Număr de cont")}<input
                bind:value={draft.number}
              /></label
            ><label
              >{t("Начальный период", "Perioada inițială")}<input
                type="month"
                bind:value={draft.opening_period}
              /></label
            >
          </div>
          <label
            >{t("Плательщик", "Plătitor")}<input
              bind:value={draft.payer_name}
            /></label
          ><label
            >{t("Адрес", "Adresa")}<input bind:value={draft.address} /></label
          >
          <div class="two-fields">
            <label
              >{t(
                "Квартиры через запятую",
                "Apartamente separate prin virgulă",
              )}<input bind:value={draft.apartmentsText} /></label
            ><label
              >{t("Площадь, м²", "Suprafață, m²")}<input
                bind:value={draft.total_area_m2}
              /></label
            ><label
              >{t("Зарегистрировано людей", "Persoane înregistrate")}<input
                type="number"
                min="0"
                bind:value={draft.registered_residents}
              /></label
            ><label
              >{t(
                "Людей для платы за мусор",
                "Persoane pentru taxa de deșeuri",
              )} · {displayPeriod(draft.wastePersonsPeriod,p)}<input
                type="number"
                min="0"
                step="1"
                disabled={p.closed_periods.includes(draft.wastePersonsPeriod)}
                bind:value={draft.wastePersonsMonth}
              /></label
            >
          </div>
          <p class="quiet-note">{t(
            "Количество для мусора сохраняется за указанный месяц. Изменение общего количества заменяет поквартирную разбивку только за этот месяц. Предыдущие месяцы сохраняются.",
            "Numărul pentru deșeuri se salvează pentru luna indicată. Modificarea totalului înlocuiește detaliile pe apartamente doar pentru această lună. Lunile precedente se păstrează.",
          )}</p>
          <label
            >{t(
              "Начальный остаток, MDL (минус = переплата)",
              "Sold inițial, MDL (minus = avans)",
            )}<input bind:value={draft.opening_balance} /></label
          ><label class="check-row"
            ><input type="checkbox" bind:checked={draft.active} />{t(
              "Счёт открыт",
              "Cont deschis",
            )}</label
          >
          <div class="field-label">
            {t("Подключённые услуги", "Servicii conectate")}
          </div>
          <div class="service-checks">
            {#each p.services as s}<label class="check-row"
                ><input
                  type="checkbox"
                  checked={draft.service_ids.includes(s.id)}
                  onchange={() => serviceToggle(s.id)}
                />{s.name[lang]}</label
              >{/each}
          </div>
          <label
            >{t("Примечание", "Notă")}<textarea bind:value={draft.notes}
            ></textarea></label
          >
          <p class="quiet-note">
            {t(
              "Дополнительные поля можно добавить через редактор JSON: custom_fields.",
              "Câmpurile suplimentare pot fi adăugate în editorul JSON: custom_fields.",
            )}
          </p>
        {:else if modal === "service"}
          <ServiceEditor project={p} bind:draft onreference={kind=>{saveEditor();if(!modal)openDesktop("catalog:"+kind);}} ontariffs={()=>{const id=draft.id;saveEditor();if(!modal){tariffServiceFilter=id;navigate("tariffs");}}}/>
        {:else if modal === "tariff"}
          {#if !p.tariffs.some(x => x.id === draft.id)}
            <label>{t("Способ ввода", "Mod de introducere")}<select bind:value={tariffEntryMode}>
              <option value="standard">{t("Обычный тариф", "Tarif obișnuit")}</option>
              <option value="average">{t("Средняя цена за месяц и новый тариф", "Preț mediu lunar și tarif nou")}</option>
            </select></label>
          {/if}
          <label
            >{t("Услуга", "Serviciu")}<select bind:value={draft.service_id}
              >{#each p.services as s}<option value={s.id}
                  >{s.name[lang]}</option
                >{/each}</select
            ></label
          >{#if tariffEntryMode === "average"}<label>{t("Переходный месяц", "Luna de tranziție")}<input type="month" bind:value={tariffTransitionPeriod}/></label>{:else}<label
            >{t(
              "Действует с первого дня месяца",
              "Valabil din prima zi a lunii",
            )}<input type="date" bind:value={draft.effective_from} /></label
          >{/if}<label
            >{tariffEntryMode === "average" ? t("Средняя цена за переходный месяц, MDL", "Preț mediu pentru luna de tranziție, MDL") : t("Тариф, MDL", "Tarif, MDL")}<input
              bind:value={draft.rate}
            /></label
          >
          {#if tariffEntryMode === "average"}
            <label>{t("Новый тариф с первого числа следующего месяца, MDL", "Tarif nou din prima zi a lunii următoare, MDL")}<input bind:value={tariffFollowingRate}/></label>
            <p class="quiet-note">{t("Среднюю цену вводит бухгалтер. Будут сохранены две записи истории тарифов; существующие записи не перезаписываются.", "Prețul mediu este introdus de contabil. Se salvează două înregistrări în istoricul tarifelor; cele existente nu se suprascriu.")}</p>
          {/if}
          <p class="quiet-note">
            {t(
              "Для нового тарифа добавьте новую запись с датой, чтобы сохранить историю.",
              "Pentru un tarif nou adăugați o înregistrare cu dată, pentru a păstra istoricul.",
            )}
          </p>
        {:else if modal === "payment" || modal === "adjustment"}
          <label
            >{t("Лицевой счёт", "Cont personal")}<select
              bind:value={draft.account_id}
              >{#each p.accounts as a}<option value={a.id}
                  >{a.number} · {a.payer_name}</option
                >{/each}</select
            ></label
          >{#if modal === "payment"}<div class="two-fields">
              <label
                >{t("Дата платежа", "Data plății")}<input
                  type="date"
                  bind:value={draft.payment_date}
                /></label
              ><label
                >{t("Дата внесения", "Data înregistrării")}<input
                  type="date"
                  bind:value={draft.entered_date}
                /></label
              >
            </div>{:else}<label
              >{t("Период", "Perioadă")}<input
                type="month"
                bind:value={draft.period}
              /></label
            >{/if}<label
            >{t("Сумма, MDL", "Sumă, MDL")}<input
              bind:value={draft.amount}
            /></label
          ><label
            >{t("Примечание / причина", "Notă / motiv")}<textarea
              bind:value={draft.note}></textarea></label
          >
          {#if modal==="payment"}<PaymentAllocation project={p} accountId={draft.account_id} date={draft.payment_date} paymentId={draft.id} amount={draft.amount} bind:through={draft.allocationThrough} bind:balancingServiceId={draft.balancingServiceId} bind:shares={draft.serviceShares} bind:signature={draft.allocationSignature} bind:manual={draft.allocationManual} bind:manualAmount={draft.allocationManualAmount} bind:calculated={draft.allocationCalculated}/>{/if}
        {:else if modal === "organization"}
          <label
            >{t("Название организации", "Denumirea organizației")}<input
              bind:value={draft.name}
            /></label
          >
          <div class="two-fields">
            <label
              >{t("Код ассоциации", "Codul asociației")}<input
                bind:value={draft.association_code}
              /></label
            ><label>CF/IDNO<input bind:value={draft.fiscal_code} /></label>
          </div>
          <label
            >{t("Адрес", "Adresa")}<input bind:value={draft.address} /></label
          ><label>{t("Банк", "Banca")}<input bind:value={draft.bank} /></label
          ><label>IBAN<input bind:value={draft.iban} /></label><label
            >{t("Примечание", "Notă")}<textarea bind:value={draft.notes}
            ></textarea></label
          >
        {:else if modal === "json"}<p class="quiet-note">
            {t(
              "Все поля открыты. Применение пройдёт через проверку и предварительный просмотр.",
              "Toate câmpurile sunt deschise. Aplicarea include verificare și previzualizare.",
            )}
          </p>
          <textarea
            class="json-editor"
            bind:value={jsonText}
            spellcheck="false"
            aria-label="JSON"></textarea>
        {:else if modal === "import" && imported}<p>
            {t(
              "Импорт заменит текущий проект. Сначала сохраним текущие данные и резервную копию.",
              "Importul înlocuiește proiectul curent. Mai întâi salvăm datele curente și copia de rezervă.",
            )}
          </p>
          <table>
            <thead
              ><tr
                ><th>{t("Раздел", "Secțiune")}</th><th>{t("Сейчас", "Acum")}</th
                ><th>{t("После импорта", "După import")}</th></tr
              ></thead
            ><tbody
              >{#each ["accounts", "services", "tariffs", "meters", "meter_values", "meter_readings", "payments", "adjustments", "snapshots"] as key}<tr
                  ><td>{key}</td><td>{(p as any)[key].length}</td><td
                    >{(imported as any)[key].length}</td
                  ></tr
                >{/each}</tbody
            >
          </table>
          <p><strong>{imported.organization.name}</strong></p>
          <p class="quiet-note">
            {t(
              "Одинаковое количество строк не означает одинаковое содержимое. Проверьте полный JSON до применения.",
              "Același număr de rânduri nu înseamnă același conținut. Verificați JSON-ul complet înainte de aplicare.",
            )}
          </p>
          <button
            class="button secondary"
            onclick={() => {
              jsonText = JSON.stringify(imported, null, 2);
              jsonTitle = t(
                "Просмотр импортируемых данных",
                "Previzualizarea datelor importate",
              );
              modal = "json";
            }}><FileJson size={15} />{t("Посмотреть JSON", "Vezi JSON")}</button
          >
        {:else if modal === "about"}<div class="about-content">
            <img src="/brand/icon.png" alt="OpenHaU" />
            <h1>OpenHaU</h1>
            <p>House & Utilities · 26.2 Development</p>
            <p>
              {t(
                "Учёт коммунальных услуг для ассоциаций жильцов.",
                "Evidența serviciilor comunale pentru asociații de locatari.",
              )}
            </p>
            <p class="quiet-note">
              {t(
                "Предварительная версия. Рекомендуется сверять расчёты с действующей системой учёта.",
                "Versiune preliminară. Se recomandă verificarea calculelor în paralel cu sistemul de evidență utilizat.",
              )}
            </p>
            <a
              href="https://github.com/OldschoolNetwork/open-hau"
              target="_blank"
              rel="noreferrer">GitHub · OpenHaU ↗</a
            >
            <img
              class="about-logo"
              src="/brand/logo-full.svg"
              alt="OpenHaU logo"
            />
            <div class="social-links">
              <a
                href="https://oldschoolnetwork.online/"
                target="_blank"
                rel="noreferrer">Website ↗</a
              ><a
                href="https://bsky.app/profile/oldnet.bsky.social"
                target="_blank"
                rel="noreferrer">Bluesky ↗</a
              ><a
                href="https://www.youtube.com/@oldschoolnetwork"
                target="_blank"
                rel="noreferrer">YouTube ↗</a
              ><a
                href="https://x.com/oldschool_net"
                target="_blank"
                rel="noreferrer">X ↗</a
              ><a
                href="https://t.me/OldschoolNetwork"
                target="_blank"
                rel="noreferrer">Telegram ↗</a
              >
            </div>
          </div>{/if}
      </div>
      <footer class="modal-footer">
        {#if ["payment", "adjustment", "tariff"].includes(modal) && (p as any)[modal === "payment" ? "payments" : modal === "tariff" ? "tariffs" : "adjustments"].some((x: any) => x.id === draft.id)}<button
            class="text-button danger"
            onclick={() =>
              removeItem(
                modal === "payment"
                  ? "payments"
                  : modal === "tariff"
                    ? "tariffs"
                    : "adjustments",
                draft.id,
              )}>{t("Удалить", "Șterge")}</button
          >{/if}<button
          class="button secondary"
          onclick={() => {
            modal = "";
            error = "";
          }}>{t("Закрыть", "Închide")}</button
        >{#if modal === "json"}<button class="button" onclick={applyJSON}
            >{t("Проверить изменения", "Verificați modificările")}</button
          >{:else if modal === "import"}<button
            class="button"
            onclick={applyImport}
            >{t("Применить импорт", "Aplică importul")}</button
          >{:else if modal !== "about"}<button
            class="button"
            onclick={saveEditor}
            ><Check size={16} />{t("Применить", "Aplică")}</button
          >{/if}
      </footer>
    </div>
  </div>
{/if}





