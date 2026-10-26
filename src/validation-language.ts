type Language = "ru" | "ro";
const messages: Record<string, [string, string]> = {
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
  "Выбери SVG, PNG, JPEG или WebP": "Selectați SVG, PNG, JPEG sau WebP",
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
