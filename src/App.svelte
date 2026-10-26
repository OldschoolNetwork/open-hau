<script lang="ts">
  import { onMount } from "svelte";
  import Reports from "./Reports.svelte";
  import PhysicalMeters from "./PhysicalMeters.svelte";
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
  } from "./storage";
  import { receipt, receiptBaseCSS, receiptDocument } from "./receipt";
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
  let loadFailed = false;
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
      ru: "Услуги и тарифы",
      ro: "Servicii și tarife",
      icon: Layers3,
    },
    { id: "readings", ru: "Показания", ro: "Indexuri", icon: Gauge },
    { id: "payments", ru: "Оплаты", ro: "Plăți", icon: Wallet },
    { id: "reports", ru: "Отчёты", ro: "Rapoarte", icon: ChartNoAxesCombined },
    { id: "receipts", ru: "Квитанции", ro: "Facturi", icon: ReceiptText },
    { id: "settings", ru: "Настройки", ro: "Setări", icon: Settings },
  ];
  const t = (ru: string, ro: string) =>
    p.settings.language === "ru" ? ru : ro;
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
  function fail(e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }
  function valid(candidate: unknown): Project {
    const parsed = projectSchema.safeParse(candidate);
    if (!parsed.success)
      throw Error(
        parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
    return parsed.data;
  }
  function setProject(next: Project) {
    p = valid(next);
    dirty = true;
    error = "";
  }
  async function save(reason:"save"|"close"="save") {
    if (busy) return;
    if (loadFailed) {
      error = t(
        "База не прочитана. Сохранение заблокировано, чтобы не затереть данные.",
        "Baza nu a putut fi citită. Salvarea este blocată pentru a proteja datele.",
      );
      return;
    }
    if (Object.keys(readingEdits).length) {
      error = t(
        "Сначала нажми «Применить показания».",
        "Apasă mai întâi „Aplică indexurile”.",
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
  function navigate(id: string) {
    page = id;
    query = "";
    error = "";
  }
  function openEditor(kind: string, item?: unknown) {
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
    if (kind === "account") draft.apartmentsText = draft.apartments.join(", ");
  }
  function saveEditor() {
    try {
      const next = structuredClone(p);
      let item = structuredClone(draft);
      if (modal === "account") {
        item.apartments = item.apartmentsText
          .split(",")
          .map((x: string) => x.trim())
          .filter(Boolean);
        delete item.apartmentsText;
        if (next.snapshots.some((x) => x.account_id === item.id)) {
          const old = next.accounts.find((x) => x.id === item.id)!;
          if (
            item.opening_balance !== old.opening_balance ||
            item.opening_period !== old.opening_period
          )
            throw Error(
              t(
                "Для изменения начального остатка сначала открой закрытые месяцы этого счёта.",
                "Redeschide lunile închise înainte de modificarea soldului inițial.",
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
              "Период закрыт. Сначала открой его.",
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
          throw Error("Сначала открой закрытый период");
        next.payments = next.payments.filter((x) => x.id !== id);
      } else if (kind === "adjustments") {
        const row = next.adjustments.find((x) => x.id === id)!;
        if (next.closed_periods.includes(row.period))
          throw Error("Сначала открой закрытый период");
        next.adjustments = next.adjustments.filter((x) => x.id !== id);
      } else if (kind === "tariffs") {
        const row = next.tariffs.find((x) => x.id === id)!;
        if (
          next.closed_periods.some((x) => x >= row.effective_from.slice(0, 7))
        )
          throw Error(
            "Тариф использовался в закрытом периоде: сначала открой его",
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
      if (closed) throw Error("Период закрыт");
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
        "Показания применены. Нажми «Сохранить», чтобы записать базу.",
        "Indexurile au fost aplicate. Apasă „Salvează” pentru a scrie baza.",
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
        throw Error("Сначала примени показания");
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
        throw Error("Сначала примени показания");
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
        throw Error("Сначала примени показания");
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
      error = "Сначала примени показания";
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
        throw Error(t("Выбери счета для печати.", "Selectează conturile."));
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
      error = t("Выбери счета.", "Selectează conturile.");
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
      error = "Максимум 20 конфигураций";
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
                "Сохранить изменения перед выходом? Если показания не применены, сначала примени их.",
                "Salvezi modificările înainte de ieșire? Aplică mai întâi indexurile introduse.",
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
        const saved = await load();
        if (saved) p = saved;
        dbPath = await storagePath();
        selected = p.accounts.filter((a) => a.active).map((a) => a.id);
      } catch (e) {
        loadFailed = true;
        fail(e);
      } finally {
        loading = false;
      }
    })();
    return () => {
      unlistenClose?.();
      document.removeEventListener("click", external);
      themeMedia.removeEventListener("change", themeChange);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", keydown);
    };
  });
</script>

<svelte:head><title>OpenHaU · {period}</title></svelte:head>
<div class="app-shell">
  <aside class="sidebar no-print">
    <a
      class="brand"
      href="#overview"
      onclick={() => navigate("overview")}
      aria-label="OpenHaU"
      ><img src="/brand/logo-short.svg" alt="" /><span>OpenHaU</span></a
    >
    <div class="workspace">
      <div class="org-symbol"><Building2 size={18} /></div>
      <div>
        <strong>{p.organization.name}</strong><small
          >{t("Локальная база · MDL", "Bază locală · MDL")}</small
        >
      </div>
    </div>
    <div class="nav-label">{t("РАБОЧЕЕ ПРОСТРАНСТВО", "SPAȚIU DE LUCRU")}</div>
    <nav>
      {#each pages as item}<button
          class:active={page === item.id}
          onclick={() => navigate(item.id)}
          ><item.icon size={19} /><span
            >{lang === "ru" ? item.ru : item.ro}</span
          >{#if item.id === "accounts"}<small>{p.accounts.length}</small
            >{/if}</button
        >{/each}
    </nav>
    <div class="sidebar-bottom">
      <div class="local-pill">
        <span></span>{t("Работает без интернета", "Funcționează offline")}
      </div>
      <button class="about-button" onclick={() => (modal = "about")}
        ><img src="/brand/icon.png" alt="" /><span
          >OpenHaU <small>26.2 Development</small></span
        ><Info size={16} /></button
      >
    </div>
  </aside>
  <main class="no-print">
    <header class="topbar">
      <div class="breadcrumb">
        OpenHaU <ChevronRight size={14} /><span
          >{lang === "ru" ? heading?.ru : heading?.ro}</span
        >
      </div>
      <div class="top-actions">
        <span class="save-state" class:unsaved={dirty}
          ><span></span>{dirty
            ? t("Есть изменения", "Modificări nesalvate")
            : t("Все изменения сохранены", "Toate modificările salvate")}</span
        ><select
          class="language-select"
          bind:value={p.settings.language}
          onchange={changed}
          aria-label="Language"
          ><option value="ru">RU</option><option value="ro">RO</option></select
        ><button class="button small" onclick={()=>save()} disabled={busy || loading}
          ><Save size={15} />{t("Сохранить", "Salvează")}</button
        >
      </div>
    </header>
    <section class="content">
      {#if error}<div class="alert error" role="alert">
          <TriangleAlert size={18} /><span>{error}</span><button
            class="icon-button"
            onclick={() => (error = "")}
            aria-label="Close"><X size={16} /></button
          >
        </div>{/if}
      {#if notice}<div class="alert success" role="status">
          <Check size={18} /><span>{notice}</span><button
            class="icon-button"
            onclick={() => (notice = "")}
            aria-label="Close"><X size={16} /></button
          >
        </div>{/if}
      <div class="page-heading">
        <div>
          <div class="eyebrow">HOUSE & UTILITIES</div>
          <h1>{lang === "ru" ? heading?.ru : heading?.ro}</h1>
          <p>
            {page === "overview"
              ? t(
                  "Всё, что нужно для спокойного расчётного месяца.",
                  "Tot ce îți trebuie pentru o lună de calcul liniștită.",
                )
              : page === "accounts"
                ? t(
                    "Жители, помещения и персональные условия начислений.",
                    "Locatari, locuințe și condiții individuale de calcul.",
                  )
                : page === "services"
                  ? t(
                      "Твои услуги, названия и история тарифов.",
                      "Serviciile tale, denumiri și istoricul tarifelor.",
                    )
                  : page === "readings"
                    ? t(
                        "Точные объёмы. Прозрачные начисления.",
                        "Volume exacte. Calcule transparente.",
                      )
                    : page === "payments"
                      ? t(
                          "Оплаты и корректировки с понятной историей.",
                          "Plăți și ajustări cu un istoric clar.",
                        )
                      : page === "reports"
                        ? t("Остатки и обороты за выбранный период.", "Solduri și rulaje pentru perioada selectată.")
                      : page === "receipts"
                        ? t(
                            "Красивые квитанции. На твоём языке.",
                            "Facturi bine gândite. În limba ta.",
                          )
                        : t(
                            "Программа, которая подстраивается под тебя.",
                            "Programul care se adaptează la tine.",
                          )}
          </p>
        </div>
        <div class="period-picker">
          <small>{t("РАСЧЁТНЫЙ ПЕРИОД", "PERIOADA DE CALCUL")}</small><input
            type="month"
            value={period}
            onchange={(e) => changePeriod(e.currentTarget.value)}
            aria-label={t("Расчётный период", "Perioada de calcul")}
          />
        </div>
      </div>
      {#if loading}<div class="empty-state">
          {t("Открываем базу…", "Deschidem baza…")}
        </div>
      {:else if loadFailed}
        <div class="empty-state">
          <TriangleAlert size={30} />
          <h3>{t("Не удалось прочитать базу", "Baza nu a putut fi citită")}</h3>
          <p>
            {t(
              "Данные не перезаписаны. Сохрани исходный файл и проверь резервные копии.",
              "Datele nu au fost suprascrise. Păstrează fișierul original și verifică copiile de rezervă.",
            )}
          </p>
        </div>
      {:else if page === "overview"}
        {#if p.demo}<div class="demo-banner">
            <div class="demo-icon"><Info size={21} /></div>
            <div>
              <strong
                >{t(
                  "Это твоя площадка для знакомства",
                  "Spațiul tău de explorare",
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
              >{t("Создать свою базу", "Creează baza ta")}
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
                    "Verifică sumele și plățile",
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
                  "Твои данные остаются на твоём компьютере.",
                  "Datele tale rămân pe calculatorul tău.",
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
                    >{t("Жители / мусор", "Locatari / deșeuri")}</th
                  ><th>{t("Статус", "Stare")}</th><th></th></tr
                ></thead
              ><tbody
                >{#each accounts as a}<tr
                    ><td class="mono">{a.number}</td><td
                      ><strong>{a.payer_name}</strong><small
                        >{a.address} · {a.apartments.join(", ")}</small
                      ></td
                    ><td class="num">{a.total_area_m2}</td><td class="num"
                      >{a.registered_residents} / {a.waste_charge_persons}</td
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
        <div class="toolbar">
          <p class="muted">
            {t(
              "Тарифы задаются с первого числа месяца.",
              "Tarifele se aplică din prima zi a lunii.",
            )}
          </p>
          <button class="button" onclick={() => openEditor("service")}
            ><Plus size={17} />{t("Новая услуга", "Serviciu nou")}</button
          >
        </div>
        <div class="services-grid">
          {#each p.services as s}<article class="panel service-card">
              <div class="service-card-top">
                <span class="quick-icon"><Layers3 size={20} /></span><button
                  class="icon-button"
                  onclick={() => openEditor("service", s)}
                  aria-label="Edit"><Pencil size={16} /></button
                >
              </div>
              <h2>{s.name[lang]}</h2>
              <p>{s.name[lang === "ru" ? "ro" : "ru"]}</p>
              <div class="service-properties">
                <span class="badge"
                  >{s.calculation_type === "metered"
                    ? t("По счётчику", "Contor")
                    : s.calculation_type === "person"
                      ? t("За человека", "Pe persoană")
                      : s.calculation_type === "area"
                        ? t("По площади", "Pe suprafață")
                        : s.calculation_type === "manual"
                          ? t("Ручной объём", "Volum manual")
                          : t("За счёт", "Pe cont")}</span
                ><span>{unitLabel(s.unit, lang)}</span><span
                  >{s.active ? "●" : "○"}</span
                >
              </div>
            </article>{/each}
        </div>
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
            <button class="button small" onclick={() => openEditor("tariff")}
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
                >{#each [...p.tariffs].sort( (a, b) => b.effective_from.localeCompare(a.effective_from) ) as tariff}<tr
                    ><td
                      >{p.services.find((s) => s.id === tariff.service_id)
                        ?.name[lang]}</td
                    ><td>{tariff.effective_from}</td><td class="num"
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
                              ? String(a.waste_charge_persons)
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
                    ><td>{pay.payment_date}</td><td>{pay.entered_date}</td><td
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
                    "Добавь первую — она сразу появится в расчётах.",
                    "Adaugă prima plată — va apărea imediat în calcule.",
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
      {:else if page === "reports"}
        <Reports project={p} />
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
                    >Studio · {t("Современный", "Modern")}</option
                  ><option value="compact"
                    >Compact · {t("Экономный", "Economic")}</option
                  ><option value="classic"
                    >Classic · {t("С корешком", "Cu aviz")}</option
                  ></select
                ></label
              ><label
                >{t("Язык квитанции", "Limba facturii")}<select
                  bind:value={p.settings.receipt_language}
                  onchange={changed}
                  ><option value="ru">Русский</option><option value="ro"
                    >Română</option
                  ><option value="both">Русский + Română</option></select
                ></label
              >
              <div class="two-fields">
                <label
                  >{t("Цвет", "Culoare")}<input
                    type="color"
                    bind:value={p.settings.receipt_color}
                    onchange={changed}
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
                  "Печать / PDF",
                  "Tipărire / PDF",
                )}</button
              ><button class="button secondary" onclick={exportHTML}
                ><Download size={16} />{t(
                  "Сохранить HTML",
                  "Salvează HTML",
                )}</button
              >
              <p class="quiet-note">
                {t(
                  "В PDF сохраняет системный диалог печати. Если он недоступен, открой сохранённый HTML в браузере.",
                  "PDF se salvează din dialogul de imprimare. Dacă nu este disponibil, deschide HTML-ul în browser.",
                )}
              </p>
            </div>
          </aside>
          <div class="receipt-preview">
            <div class="preview-label">
              <span
                >{t("ПРЕДПРОСМОТР", "PREVIZUALIZARE")} · {receiptAccounts.length}</span
              ><span>A4</span>
            </div>
            <div class="paper-stack">
              {@html `<style>${receiptBaseCSS}\n${p.settings.receipt_css.replace(/<\/style/gi, "")}</style>`}{#each receiptAccounts as a}{@html receipt(
                  p,
                  a,
                  period,
                )}{/each}{#if !receiptAccounts.length}<div class="empty-state">
                  {t("Выбери счета слева.", "Selectează conturile din stânga.")}
                </div>{/if}
            </div>
          </div>
        </div>
      {:else if page === "settings"}
        <BackupSettings language={lang} unsaved={dirty || !!Object.keys(readingEdits).length} />
        <ExportSettings project={p} unsaved={dirty || !!Object.keys(readingEdits).length} />
        <div class="settings-grid">
          <article class="panel">
            <div class="panel-heading">
              <div>
                <h2>{t("Внешний вид", "Aspect")}</h2>
                <p>
                  {t(
                    "Твоя программа — твои предпочтения.",
                    "Programul tău — preferințele tale.",
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
                    bind:value={p.settings.accent}
                    onchange={changed}
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
            </div>
          </article>
          <article class="panel">
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
          </article>
          <article class="panel">
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
                  "Правило по умолчанию — half up. Перед рабочими начислениями согласуй его с бухгалтером. Закрытые месяцы не пересчитываются.",
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
              ><label
                >{t("Подпись внизу · RU", "Text de subsol · RU")}<textarea
                  bind:value={p.settings.receipt_footer.ru}
                  oninput={changed}></textarea></label
              ><label
                >{t("Подпись внизу · RO", "Text de subsol · RO")}<textarea
                  bind:value={p.settings.receipt_footer.ro}
                  oninput={changed}></textarea></label
              >
            </div>
          </article>
          <article class="panel">
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
              <hr />
              <h3>{t("Обновления", "Actualizări")}</h3>
              <p class="quiet-note">
                {t(
                  "26.2 Development · пока ручная установка. Подписанные обновления через GitHub Releases — следующий этап.",
                  "26.2 Development · instalare manuală deocamdată. Actualizări semnate prin GitHub Releases — etapa următoare.",
                )}
              </p>
              <a
                href="https://github.com/OldschoolNetwork/open-hau/releases"
                target="_blank"
                rel="noreferrer">GitHub Releases ↗</a
              >
            </div>
          </article>
        </div>
      {/if}
      <footer class="app-footer">
        <span>OpenHaU · 26.2 Development</span><span
          >{t(
            "Сделано с заботой о людях и их времени.",
            "Creat cu grijă pentru oameni și timpul lor.",
          )}</span
        >
      </footer>
    </section>
  </main>
</div>
<div class="print-only">
  {#each receiptAccounts as a}{@html receipt(p, a, period)}{/each}
</div>

{#if modal}
  <div class="modal-backdrop no-print" role="presentation">
    <div
      class="modal"
      class:wide={modal === "json" || modal === "import"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
      tabindex="-1"
    >
      <header>
        <div>
          <div class="eyebrow">OPENHAU</div>
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
              )}<input
                type="number"
                min="0"
                bind:value={draft.waste_charge_persons}
              /></label
            >
          </div>
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
          <label
            >{t("Название на русском", "Denumire în rusă")}<input
              bind:value={draft.name.ru}
            /></label
          ><label
            >{t("Название на румынском", "Denumire în română")}<input
              bind:value={draft.name.ro}
            /></label
          ><label
            >{t("Тип расчёта", "Tip de calcul")}<select
              bind:value={draft.calculation_type}
              ><option value="metered"
                >{t(
                  "Разница показаний счётчика",
                  "Diferența indexurilor",
                )}</option
              ><option value="person"
                >{t(
                  "За человека (поле для мусора)",
                  "Pe persoană (câmpul pentru deșeuri)",
                )}</option
              ><option value="area"
                >{t("По общей площади", "Pe suprafața totală")}</option
              ><option value="fixed"
                >{t("Фиксированный объём на счёт", "Volum fix pe cont")}</option
              ><option value="manual"
                >{t("Ручной объём каждый месяц", "Volum manual lunar")}</option
              ></select
            ></label
          >
          <div class="two-fields">
            <label
              >{t("Единица измерения", "Unitate de măsură")}<input
                bind:value={draft.unit}
              /></label
            ><label
              >{t(
                "Объём по умолчанию для фиксированной платы",
                "Volum implicit pentru taxa fixă",
              )}<input bind:value={draft.default_quantity} /></label
            >
          </div>
          <label class="check-row"
            ><input type="checkbox" bind:checked={draft.active} />{t(
              "Услуга активна",
              "Serviciu activ",
            )}</label
          ><label
            >{t("Примечание", "Notă")}<textarea bind:value={draft.notes}
            ></textarea></label
          >
        {:else if modal === "tariff"}
          <label
            >{t("Услуга", "Serviciu")}<select bind:value={draft.service_id}
              >{#each p.services as s}<option value={s.id}
                  >{s.name[lang]}</option
                >{/each}</select
            ></label
          ><label
            >{t(
              "Действует с первого дня месяца",
              "Valabil din prima zi a lunii",
            )}<input type="date" bind:value={draft.effective_from} /></label
          ><label
            >{t("Тариф, MDL", "Tarif, MDL")}<input
              bind:value={draft.rate}
            /></label
          >
          <p class="quiet-note">
            {t(
              "Для нового тарифа добавляй новую запись с датой, чтобы сохранить историю.",
              "Pentru un tarif nou adaugă o înregistrare cu dată, pentru a păstra istoricul.",
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
              "Одинаковое количество строк не означает одинаковое содержимое. Проверь полный JSON до применения.",
              "Același număr de rânduri nu înseamnă același conținut. Verifică JSON-ul complet înainte de aplicare.",
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
                "Локальная бухгалтерия для небольших ассоциаций жильцов. Сделано для бабушки, с вниманием к деталям.",
                "Contabilitate locală pentru asociații mici de locatari. Creat pentru bunica, cu atenție la detalii.",
              )}
            </p>
            <p class="quiet-note">
              {t(
                "Предварительная версия: проверяй расчёты параллельно с рабочей системой.",
                "Versiune preliminară: verifică sumele în paralel cu sistemul curent.",
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
            >{t("Проверить изменения", "Verifică modificările")}</button
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
