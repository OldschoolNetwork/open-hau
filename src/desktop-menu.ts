import {informationViews,accumulationViews} from "./register-data";
import {referenceKinds} from "./catalog-definitions";
export type DesktopCommand = {
  id: string;
  ru: string;
  ro: string;
  action?: string;
  children?: DesktopCommand[];
};
const item = (
  id: string,
  ru: string,
  ro: string,
  action?: string,
): DesktopCommand => ({ id, ru, ro, action });
export const catalogs: DesktopCommand[] = [
  item("banks", "Банки", "Bănci"),
  item("bank-accounts", "Банковские счета", "Conturi bancare"),
  item("payment-methods", "Варианты оплаты", "Modalități de plată"),
  item("ownership", "Вид собственности", "Tip de proprietate"),
  item("property-types", "Виды объектов учета", "Tipuri de obiecte"),
  item("meter-types", "Виды приборов учета", "Tipuri de contoare"),
  item("tariff-types", "Виды тарифов", "Tipuri de tarife"),
  item("service-types", "Виды услуг", "Tipuri de servicii"),
  item("citizens", "Граждане", "Persoane"),
  item("citizen-groups", "Группы граждан", "Grupuri de persoane"),
  item("service-groups", "Группы услуг", "Grupuri de servicii"),
  item(
    "benefit-documents",
    "Документы на предоставление льгот",
    "Documente pentru facilități",
  ),
  item(
    "identity-documents",
    "Документы, удостоверяющие личность",
    "Acte de identitate",
  ),
  item("units", "Единицы измерений", "Unități de măsură"),
  item("laws", "Законы", "Legi"),
  item("buildings", "Здания", "Clădiri"),
  item(
    "individual-meters",
    "Индивидуальные приборы учета",
    "Contoare individuale",
  ),
  item("benefit-categories", "Категории льгот", "Categorii de facilități"),
  item("shared-meters", "Коллективные приборы учета", "Contoare comune"),
  item("counterparties", "Контрагенты", "Parteneri"),
  item("accounts", "Лицевые счета", "Conturi personale", "accounts"),
  item("localities", "Населенные пункты", "Localități"),
  item("norms", "Нормы и стандарты учета", "Norme și standarde"),
  item("properties", "Объекты учета", "Obiecte"),
  item(
    "allocation-bases",
    "Основания распределения показаний коллективных приборов учета",
    "Baze de repartizare a contoarelor comune",
  ),
  item(
    "calculation-bases",
    "Основания расчета услуг",
    "Baze de calcul al serviciilor",
  ),
  item("entrances", "Подъезды", "Scări"),
  item(
    "benefit-calculation",
    "Правила расчета льгот",
    "Reguli de calcul al facilităților",
  ),
  item(
    "identity-reasons",
    "Причины изменения паспортных данных",
    "Motive de modificare a actelor",
  ),
  item("allocation-methods", "Способы распределения", "Metode de repartizare"),
  item("relationships", "Степень родства граждан", "Relații de rudenie"),
  item("streets", "Улицы", "Străzi"),
  item("services", "Услуги", "Servicii", "services"),
];
for(const entry of catalogs)if(!entry.action&&referenceKinds.includes(entry.id as typeof referenceKinds[number]))entry.action="catalog:"+entry.id;
for(const entry of catalogs)if(entry.id==="individual-meters"||entry.id==="shared-meters")entry.action=entry.id;
const catalog = (id: string) => catalogs.find((x) => x.id === id)!;
export const documents: DesktopCommand[] = [
  item(
    "opening-balances",
    "Ввод начальных остатков",
    "Introducere solduri inițiale",
  ),
  item(
    "initial-readings",
    "Ввод начальных показаний приборов учета",
    "Introducere indexuri inițiale",
  ),
  item(
    "individual-readings",
    "Ввод показаний индивидуальных приборов учета",
    "Introducere indexuri individuale",
  ),
  item(
    "shared-readings",
    "Ввод показаний коллективных приборов учета",
    "Introducere indexuri comune",
  ),
  item("payment-batch", "Групповой ввод оплаты", "Introducere plăți în grup", "payment-batches"),
  item("close-account", "Закрытие лицевого счета", "Închidere cont personal"),
  item(
    "citizen-changes",
    "Изменение информации о гражданине",
    "Modificare date persoană",
  ),
  item(
    "account-changes",
    "Изменение информации о лицевом счете",
    "Modificare date cont personal",
  ),
  item("norm-changes", "Изменение норм", "Modificare norme"),
  item(
    "penalty-changes",
    "Изменение расчета пени",
    "Modificare calcul penalități",
  ),
  item(
    "meter-status",
    "Изменение статусов приборов учета",
    "Modificare stare contoare",
  ),
  item(
    "residence-status",
    "Изменение статусов проживающих",
    "Modificare statut locatari",
  ),
  item(
    "tariffs",
    "Изменение тарифов на услуги",
    "Modificare tarife servicii",
    "tariffs",
  ),
  item(
    "building-services",
    "Изменение услуг зданий",
    "Modificare servicii clădiri",
  ),
  item(
    "account-services",
    "Изменение услуг лицевых счетов",
    "Modificare servicii conturi",
  ),
  item(
    "charge-corrections",
    "Корректировка начислений",
    "Corectare sume calculate",
  ),
  item("service-charges", "Начисление за услуги", "Calcul servicii"),
  item("penalties", "Начисление пени", "Calcul penalități"),
  item("open-account", "Открытие лицевого счета", "Deschidere cont personal"),
  item(
    "recalculation",
    "Перерасчет начислений за услуги",
    "Recalculare servicii",
  ),
  item(
    "benefit-rules",
    "Правила предоставления льгот",
    "Reguli de acordare a facilităților",
  ),
  item("grant-benefits", "Предоставление льгот", "Acordare facilități"),
  item(
    "end-benefits",
    "Прекращение предоставления льгот",
    "Încetare facilități",
  ),
  item(
    "shared-connections",
    "Управление коллективными приборами учета",
    "Administrare contoare comune",
  ),
];
for(const entry of documents)if(['open-account','close-account','account-changes','account-services','opening-balances','individual-readings','shared-readings','initial-readings','meter-status','shared-connections','residence-status'].includes(entry.id))entry.action=entry.id;
const document = (id:string)=>documents.find(x=>x.id===id)!;
export const reportCommands: DesktopCommand[] = [
  item("receipts", "Квитанция", "Factură", "receipts"),
  item(
    "balances",
    "Оборотно-сальдовая ведомость",
    "Balanță de verificare",
    "reports",
  ),
  item(
    "service-balances",
    "Оборотно-сальдовая ведомость по услугам",
    "Balanță pe servicii",
    "service-reports",
  ),
  item("payment-report", "Отчет по оплате", "Raport de plăți", "payment-report"),
  item("account-ledger", "Карточка расчетов", "Fișă de calcul"),
  item("beneficiaries", "Список льготников", "Lista beneficiarilor"),
  item("beneficiary-register", "Реестр льготников", "Registrul beneficiarilor"),
  item("residential-list", "Список жилых помещений", "Lista locuințelor"),
];
export const processCommands: DesktopCommand[] = [
  item(
    "batch-charges",
    "Групповое начисление за услуги",
    "Calcul servicii în grup",
  ),
  item(
    "batch-recalculation",
    "Групповой перерасчет начислений за услуги",
    "Recalculare servicii în grup",
  ),
  item(
    "period",
    "Смена расчетного периода",
    "Schimbare perioadă de calcul",
    "period",
  ),
];
export const informationRegisters: DesktopCommand[] = [
  "Дополнительные объекты учета",
  "Зависимые пользователи коллективных приборов учета",
  "Зарегистрированные",
  "Значения норм и стандартов учета",
  "Значения тарифов",
  "Льготы граждан",
  "Настройка пени",
  "Ответственные потребители",
  "Паспортные данные",
  "Показания индивидуальных приборов учета",
  "Показания коллективных приборов учета",
  "Пользователи коллективных приборов учета",
  "Правила предоставления льгот",
  "Проживающие",
  "Расчет пени",
  "Соотношение единиц измерения",
  "Состав семьи",
  "Статусы индивидуальных приборов учета",
  "Статусы коллективных приборов учета",
  "Услуги зданий",
  "Услуги лицевых счетов",
].map((ru, i) =>
  item(
    `information-${i}`,
    ru,
    [
      "Obiecte suplimentare",
      "Utilizatori dependenți ai contoarelor comune",
      "Persoane înregistrate",
      "Valori norme și standarde",
      "Valori tarife",
      "Facilități persoane",
      "Configurare penalități",
      "Consumatori responsabili",
      "Date acte de identitate",
      "Indexuri individuale",
      "Indexuri comune",
      "Utilizatori contoare comune",
      "Reguli de acordare facilități",
      "Locatari",
      "Calcul penalități",
      "Conversie unități",
      "Componența familiei",
      "Stări contoare individuale",
      "Stări contoare comune",
      "Servicii clădiri",
      "Servicii conturi",
    ][i],
  ),
);
export const accumulationRegisters: DesktopCommand[] = [
  "Авансы потребителей",
  "Взаиморасчеты с потребителями",
  "Начисления за услуги",
  "Объем потребления по индивидуальным приборам учета",
  "Объем потребления по коллективным приборам учета",
  "Объем потребления по услугам",
  "Пени",
  "Предоставление льгот",
].map((ru, i) =>
  item(
    `accumulation-${i}`,
    ru,
    [
      "Avansuri consumatori",
      "Decontări cu consumatorii",
      "Sume calculate pe servicii",
      "Consum contoare individuale",
      "Consum contoare comune",
      "Consum pe servicii",
      "Penalități",
      "Facilități acordate",
    ][i],
  ),
);
for(const entry of informationRegisters)if(informationViews[entry.id])entry.action='register:'+entry.id;
for(const entry of accumulationRegisters)if(accumulationViews[entry.id])entry.action='register:'+entry.id;
export const chooserGroups: Record<
  string,
  { ru: string; ro: string; items: DesktopCommand[] }
> = {
  catalogs: { ru: "Справочник", ro: "Catalog", items: catalogs },
  documents: { ru: "Документы", ro: "Documente", items: documents },
  reports: { ru: "Отчет", ro: "Raport", items: reportCommands },
  processes: { ru: "Обработка", ro: "Procesare", items: processCommands },
  information: {
    ru: "Регистр сведений",
    ro: "Registru de informații",
    items: informationRegisters,
  },
  accumulation: {
    ru: "Регистр накоплений",
    ro: "Registru de acumulare",
    items: accumulationRegisters,
  },
};
export const desktopMenus: DesktopCommand[] = [
  {id:"file",ru:"Файл",ro:"Fișier",children:[item("database-home","Базы данных…","Baze de date…","file:catalog"),item("database-new","Создать базу…","Creează bază…","file:new"),item("database-open","Открыть базу…","Deschide baza…","file:open"),item("save","Сохранить","Salvează","file:save"),item("save-as","Сохранить базу как…","Salvează baza ca…","file:save-as"),item("import-copy","Импортировать копию JSON…","Importă o copie JSON…","file:import"),item("export-json","Экспорт JSON…","Export JSON…","file:export"),item("exit","Выход","Ieșire","file:exit"),{
        id: "workspace-tools",
        ru: "Рабочие инструменты OpenHaU",
        ro: "Instrumente OpenHaU",
        children: [
          item("overview", "Обзор", "Prezentare", "overview"),
          item(
            "readings",
            "Показания и распределение",
            "Indexuri și repartizare",
            "readings",
          ),
          item(
            "payments",
            "Оплаты и корректировки",
            "Plăți și ajustări",
            "payments",
          ),
          item("treasury", "Банк и касса", "Bancă și casă", "treasury"),
        ],
      }]},
  {id:"edit",ru:"Правка",ro:"Editare",children:[item("undo","Отменить","Anulează","edit:undo"),item("redo","Повторить","Refă","edit:redo"),item("cut","Вырезать","Decupează","edit:cut"),item("copy","Копировать","Copiază","edit:copy"),item("paste","Вставить","Lipește","edit:paste"),item("select-all","Выделить всё","Selectează tot","edit:selectAll")]},
  {
    id: "operations",
    ru: "Операции",
    ro: "Operațiuni",
    children: Object.entries(chooserGroups).map(([key, value]) =>
      item(key, value.ru + "…", value.ro + "…", "chooser:" + key),
    ),
  },
  {
    id: "accounts-menu",
    ru: "Лицевые счета",
    ro: "Conturi personale",
    children: [
      catalog("accounts"),
      document("open-account"),
      document("close-account"),
      document("account-changes"),
      document("account-services"),
      document("payment-batch"),
      item("payments", "Оплаты и расшифровка платежей", "Plăți și repartizarea lor", "payments"),
      catalog("payment-methods"),
      document("opening-balances"),
    ],
  },
  {
    id: "properties-menu",
    ru: "Объекты учета",
    ro: "Obiecte",
    children: [
      catalog("buildings"),
      catalog("properties"),
      document("building-services"),
      catalog("localities"),
      catalog("streets"),
      item(
        "characteristic-types",
        "Виды характеристик",
        "Tipuri de caracteristici",
      ),
      catalog("property-types"),
    ],
  },
  {
    id: "meters-menu",
    ru: "Приборы учета",
    ro: "Contoare",
    children: [
      document("individual-readings"),
      catalog("shared-meters"),
      document("shared-connections"),
      document("shared-readings"),
      document("meter-status"),
      catalog("meter-types"),
      catalog("allocation-bases"),
      document("initial-readings"),
    ],
  },
  {
    id: "citizens-menu",
    ru: "Граждане",
    ro: "Persoane",
    children: [
      catalog("citizens"),
      document("residence-status"),
      document("grant-benefits"),
      document("end-benefits"),
      document("citizen-changes"),
      catalog("identity-documents"),
      catalog("relationships"),
      catalog("citizen-groups"),
    ],
  },
  {
    id: "regulations",
    ru: "Регламенты",
    ro: "Proceduri",
    children: [
      ...processCommands,
      document("service-charges"),
      document("penalties"),
      document("recalculation"),
      document("charge-corrections"),
    ],
  },
  {
    id: "reports-menu",
    ru: "Отчеты",
    ro: "Rapoarte",
    children: reportCommands,
  },
  {
    id: "settings-menu",
    ru: "Настройки",
    ro: "Setări",
    children: [
      item("settings", "Общие настройки", "Setări generale", "settings"),
      {
        id: "service-settings",
        ru: "Настройка услуг",
        ro: "Configurare servicii",
        children: [
          catalog("services"),
          catalog("service-types"),
          document("tariffs"),
          catalog("units"),
          item(
            "unit-conversions",
            "Соотношение единиц измерения",
            "Conversie unități",
          ),
        ],
      },
      {
        id: "benefit-settings",
        ru: "Настройка льгот",
        ro: "Configurare facilități",
        children: [
          catalog("benefit-categories"),
          catalog("laws"),
          catalog("benefit-calculation"),
          document("benefit-rules"),
        ],
      },
      {
        id: "penalty-settings",
        ru: "Настройка пени",
        ro: "Configurare penalități",
        children: [
          item("penalty-setup", "Настройка пени", "Configurare penalități"),
          document("penalty-changes"),
        ],
      },
      {
        id: "norm-settings",
        ru: "Настройка норм",
        ro: "Configurare norme",
        children: [catalog("norms"), document("norm-changes")],
      },
      catalog("counterparties"),
    ],
  },
  {
    id: "windows",
    ru: "Окно",
    ro: "Fereastră",
    children: [
      item("next", "Следующее", "Următoarea", "window:next"),
      item("previous", "Предыдущее", "Precedenta", "window:previous"),
      item("close", "Закрыть", "Închidere", "window:close"),
      item(
        "close-all",
        "Закрыть все окна",
        "Închidere toate ferestrele",
        "window:close-all",
      ),
      item("cascade", "Каскадом", "Cascadă", "window:cascade"),
    ],
  },
  {
    id: "tools",
    ru: "Сервис",
    ro: "Instrumente",
    children: [
      item(
        "purge",
        "Удаление помеченных объектов",
        "Eliminare obiecte marcate",
        "purge",
      ),
      item("temporary-lock", "Временная блокировка", "Blocare temporară","temporary-lock"),

    ],
  },
  {
    id: "help",
    ru: "Справка",
    ro: "Ajutor",
    children: [
      item("manual", "Документация", "Documentație", "manual"),
      item("about", "О программе", "Despre aplicație", "about"),
    ],
  },
];
