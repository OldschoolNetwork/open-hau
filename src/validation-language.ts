type Language = "ru" | "ro";
const messages: Record<string, [string, string]> = {
  "Duplicate payment batches":["Повторяющиеся документы оплаты","Documente de plată duplicate"],
  "Invalid payment batch configuration":["Проверьте месяц долга и услугу обслуживания в документе оплаты","Verificați luna datoriei și serviciul deservirii din document"],
  "Duplicate payment batch accounts or rows":["В документе повторяются лицевые счета или строки","Documentul conține conturi sau rânduri duplicate"],
  "Unknown payment batch account":["Лицевой счёт документа оплаты не найден","Contul documentului de plată nu a fost găsit"],
  "Draft payment batch references a receipt":["Черновик не должен содержать проведённых оплат","Ciorna nu poate conține plăți aplicate"],
  "Zero batch row references a receipt":["Нулевая строка не должна создавать оплату","Rândul nul nu poate crea o plată"],
  "Applied payment batch differs from its receipts":["Проведённый документ не совпадает со связанными оплатами","Documentul aplicat diferă de plățile asociate"],
  "Receipt belongs to multiple payment batches":["Оплата связана с несколькими документами","Plata este asociată mai multor documente"],
  "Applied payment batch allocation is incomplete":["В проведённом документе неполная расшифровка оплаты","Repartizarea plății documentului aplicat este incompletă"],
  "Invalid batch payment amount":["Сумма оплаты строки должна быть неотрицательной","Suma plății rândului trebuie să fie nenegativă"],
  "Payment allocation period is after payment date":["Месяц погашаемого долга позже даты оплаты","Luna datoriei este după data plății"],
  "Unknown service accounting account or service": ["Не найден счёт или услуга для распределения", "Contul sau serviciul repartizării nu a fost găsit"],
  "Unknown service accounting payment or service": ["Не найдена оплата или услуга для распределения", "Plata sau serviciul repartizării nu a fost găsit"],
  "Duplicate service accounting allocation": ["Повторяющееся распределение по услуге", "Repartizare duplicată pe serviciu"],
  "Service payment allocation exceeds payment amount": ["Сумма распределения по услугам выходит за пределы оплаты", "Suma repartizată pe servicii depășește plata"],
  "Ledger amounts require at most two decimal places": ["Для денежных операций допустимо не более двух знаков после точки", "Operațiunile monetare acceptă cel mult două zecimale"],
  "Ledger amount must be positive": ["Сумма операции должна быть больше нуля", "Suma operațiunii trebuie să fie mai mare decât zero"],
  "Duplicate treasury identifiers": ["Повторяющиеся идентификаторы финансового журнала", "Identificatori duplicați în registrul financiar"],
  "Treasury transaction references an unknown wallet": ["Банк или касса для операции не найдены", "Banca sau casa operațiunii nu a fost găsită"],
  "Treasury transaction precedes wallet opening": ["Операция раньше даты начального остатка банка или кассы", "Operațiunea precedă data soldului inițial al băncii sau casei"],
  "Treasury transaction references an unknown fund": ["Фонд операции не найден", "Fondul operațiunii nu a fost găsit"],
  "Treasury transaction precedes fund opening": ["Операция раньше даты начального остатка фонда", "Operațiunea precedă data soldului inițial al fondului"],
  "Wallet transfer requires different wallets": ["Для перевода выберите разные счета банка или кассы", "Pentru transfer selectați conturi diferite de bancă sau casă"],
  "Fund transfer requires different funds": ["Для распределения выберите разные назначения средств", "Pentru repartizare selectați destinații diferite ale banilor"],
  "Treasury income references an unknown resident payment": ["Связанная оплата жильца не найдена", "Plata asociată a locatarului nu a fost găsită"],
  "Resident payment is linked to treasury more than once": ["Оплата жильца уже связана с другим поступлением", "Plata locatarului este deja asociată cu altă încasare"],
  "Linked payment sum differs from treasury income": ["Сумма выбранных оплат не совпадает с поступлением", "Suma plăților selectate nu corespunde încasării"],
  "Unknown shared difference billing service": ["Услуга для начисления расхождений не найдена", "Serviciul pentru facturarea diferențelor nu a fost găsit"],
  "Shared difference service cannot have physical meters": ["Для расхождений нужна отдельная услуга без физических приборов", "Pentru diferențe este necesar un serviciu separat, fără contoare fizice"],
  "Shared difference service unit mismatch": ["Единица услуги расхождений не совпадает с единицей общего счётчика", "Unitatea serviciului pentru diferențe nu corespunde contorului comun"],
  "Duplicate tariff document identifiers": ["Повторяющиеся документы тарифов", "Documente tarifare duplicate"],
  "Duplicate tariff document rows": ["Повторяющиеся строки документа тарифов", "Rânduri duplicate în documentul tarifar"],
  "Duplicate tariff document service dates": ["В документе повторяются услуга и дата тарифа", "Serviciul și data tarifului se repetă în document"],
  "Unknown tariff document service": ["Услуга документа не найдена", "Serviciul din document nu a fost găsit"],
  "Tariff document effective date must start a month": ["Дата начала действия тарифа должна быть первым числом месяца", "Data intrării în vigoare a tarifului trebuie să fie prima zi a lunii"],
  "Draft tariff document cannot reference applied rates": ["Черновик не может ссылаться на применённые тарифы", "Ciorna nu poate face referire la tarife aplicate"],
  "Applied tariff document differs from tariff history": ["Применённый документ не совпадает с историей тарифов", "Documentul aplicat nu corespunde istoricului tarifelor"],
  "Tariff belongs to more than one document": ["Тариф связан с несколькими документами", "Tariful este asociat mai multor documente"],
  "Duplicate payment deadline months": [
    "Для месяца указано несколько сроков оплаты",
    "Sunt indicate mai multe termene de plată pentru aceeași lună",
  ],
  "Payment deadline precedes billing month": [
    "Срок оплаты раньше расчётного месяца",
    "Termenul de plată precedă luna de calcul",
  ],
  "Duplicate monthly occupancy identifiers": [
    "Повторяющиеся идентификаторы месячных данных",
    "Identificatori duplicați în datele lunare",
  ],
  "Duplicate monthly occupancy entries": [
    "Повторяющиеся данные о проживающих за месяц",
    "Date duplicate despre locatari pentru aceeași lună",
  ],
  "Monthly occupancy references an unknown account": [
    "Не найден счёт для данных о проживающих",
    "Cont necunoscut în datele despre locatari",
  ],
  "Monthly occupancy references an unknown apartment": [
    "Не найдена квартира для данных о проживающих",
    "Apartament necunoscut în datele despre locatari",
  ],
  "Direct monthly occupancy must have a zero baseline": [
    "При прямом вводе начальное значение должно быть нулём",
    "La introducerea directă valoarea inițială trebuie să fie zero",
  ],
  "Cumulative occupancy cannot decrease": [
    "Новое накопительное значение не может быть меньше предыдущего",
    "Noua valoare cumulativă nu poate fi mai mică decât precedenta",
  ],
  "Account totals and apartment occupancy cannot be mixed for the same month": [
    "Нельзя смешивать общий итог по счёту и записи по квартирам в одном месяце",
    "Nu combinați totalul contului cu înregistrările pe apartamente în aceeași lună",
  ],
  "Duplicate shared group identifiers": [
    "Повторяющиеся идентификаторы групп",
    "Identificatori duplicați ai grupurilor",
  ],
  "Group requires a shared meter": [
    "Для группы нужен общий счётчик",
    "Grupul necesită un contor comun",
  ],
  "Shared group end precedes start": [
    "Окончание действия группы раньше начала",
    "Sfârșitul valabilității grupului precedă începutul",
  ],
  "Duplicate linked individual meters": [
    "Один прибор подключён к группе несколько раз",
    "Același contor este conectat la grup de mai multe ori",
  ],
  "Linked meters must be individual meters for the same service": [
    "Подключите индивидуальные приборы той же услуги",
    "Conectați contoare individuale pentru același serviciu",
  ],
  "Linked account must use the shared meter service": [
    "Услуга общего прибора должна быть подключена к счёту",
    "Serviciul contorului comun trebuie conectat la cont",
  ],
  "Duplicate exception months": [
    "Повторяющиеся месяцы исключений",
    "Luni duplicate în lista de excepții",
  ],
  "Invalid excluded accounts": [
    "Проверьте список освобождённых счетов",
    "Verificați lista conturilor exceptate",
  ],
  "Meter groups overlap in time": [
    "Приборы подключены к пересекающимся по времени группам",
    "Contoarele sunt conectate la grupuri cu perioade suprapuse",
  ],
  "Duplicate physical meter identifiers": [
    "Повторяющиеся идентификаторы счётчиков",
    "Identificatori duplicați ai contoarelor",
  ],
  "Duplicate physical reading identifiers": [
    "Повторяющиеся идентификаторы показаний",
    "Identificatori duplicați ai citirilor",
  ],
  "Physical meter references an unknown service": [
    "Счётчик ссылается на неизвестную услугу",
    "Contorul face referire la un serviciu necunoscut",
  ],
  "Individual meter references an unknown account": [
    "Счётчик ссылается на неизвестный лицевой счёт",
    "Contorul face referire la un cont necunoscut",
  ],
  "Shared meters must not belong to one individual account": [
    "Общий прибор не должен принадлежать одному счёту",
    "Contorul comun nu trebuie atribuit unui singur cont",
  ],
  "Meter retirement precedes installation": [
    "Дата снятия раньше даты установки",
    "Data demontării precedă data instalării",
  ],
  "Duplicate meter readings on the same date": [
    "У прибора уже есть показание на эту дату",
    "Contorul are deja o citire la această dată",
  ],
  "Reading references an unknown physical meter": [
    "Не найден прибор для показания",
    "Contorul citirii nu a fost găsit",
  ],
  "Reading date falls outside the meter installation lifetime": [
    "Дата показания вне срока эксплуатации прибора",
    "Data citirii este în afara perioadei de funcționare a contorului",
  ],
  "Full project JSON exceeds 20 MB": [
    "Полный JSON превышает 20 МБ",
    "Fișierul JSON complet depășește 20 MB",
  ],
};
const romanian: Record<string, string> = {
  "Номера лицевых счетов должны быть уникальны":
    "Numerele conturilor trebuie să fie unice",
  "Ссылка на неизвестный счёт": "Referință la un cont necunoscut",
  "Ссылка на неизвестную услугу": "Referință la un serviciu necunoscut",
  "Два тарифа одной услуги на одну дату":
    "Două tarife ale aceluiași serviciu la aceeași dată",
  "В 26.1 тариф действует с первого дня месяца":
    "Tariful intră în vigoare din prima zi a lunii",
  "Повторяющиеся сохранённые начисления": "Calcule păstrate duplicate",
  "Некорректная ссылка в сохранённом начислении":
    "Referință invalidă într-un calcul păstrat",
  "Сохранённые суммы должны иметь два десятичных знака":
    "Sumele păstrate trebuie să aibă două zecimale",
  "Итог сохранённого начисления не совпадает с суммой строк и корректировкой":
    "Totalul calculului păstrat diferă de suma rândurilor și ajustării",
  "Некорректные сохранённые суммы": "Sume păstrate invalide",
  "Повторяющиеся закрытые периоды": "Perioade închise duplicate",
  "Нужно неотрицательное значение": "Este necesară o valoare nenegativă",
  "Некорректная дата": "Dată invalidă",
  "Текущие показания меньше предыдущих":
    "Indexul actual este mai mic decât cel precedent",
  "Используй число с точкой, до 16 цифр до и после неё":
    "Introduceți un număr cu punct zecimal, maximum 16 cifre înainte și după punct",
  "Полный JSON превышает 20 МБ; уменьшите логотипы или число конфигураций":
    "Fișierul JSON depășește 20 MB; micșorați siglele sau numărul configurațiilor",
  "SVG с DTD или сущностями не поддерживается":
    "SVG cu DTD sau entități nu este acceptat",
  "Некорректный SVG": "Fișier SVG invalid",
  "Максимальный размер логотипа — 2 МБ":
    "Dimensiunea maximă a siglei este 2 MB",
  "Выберите SVG, PNG, JPEG или WebP": "Selectați SVG, PNG, JPEG sau WebP",
  "Не удалось прочитать изображение": "Imaginea nu a putut fi citită",
  "Файл больше 20 МБ": "Fișierul depășește 20 MB",
  "Неподдерживаемый формат или версия данных OpenHaU":
    "Format sau versiune de date OpenHaU neacceptată",
  "Нельзя перезаписать базу более нового формата":
    "O bază într-un format mai nou nu poate fi suprascrisă",
};
export function validationText(message: string, language: Language) {
  if (messages[message]) return messages[message][language === "ru" ? 0 : 1];
  if (language === "ru") return message;
  if (romanian[message]) return romanian[message];
  for (const [prefix, replacement] of [
    ["Повторяющиеся ID:", "Identificatori duplicați:"],
    ["Повторяющиеся строки ", "Rânduri duplicate: "],
    ["Неизвестная услуга ", "Serviciu necunoscut: "],
  ])
    if (message.startsWith(prefix))
      return replacement + message.slice(prefix.length);
  return message;
}
export function issueText(
  issue: { code: string; message: string },
  language: Language,
) {
  if (issue.code === "custom") return validationText(issue.message, language);
  if (language === "ru") return "Проверьте значение и формат поля";
  return "Verificați valoarea și formatul câmpului";
}
