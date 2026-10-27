export const referenceKinds=["banks","bank-accounts","payment-methods","ownership","property-types","meter-types","tariff-types","service-types","citizens","citizen-groups","service-groups","benefit-documents","identity-documents","units","laws","buildings","benefit-categories","counterparties","localities","norms","properties","allocation-bases","calculation-bases","entrances","benefit-calculation","identity-reasons","allocation-methods","relationships","streets"] as const;
export type ReferenceKind=typeof referenceKinds[number];
export type CatalogField={key:string;ru:string;ro:string;type?:"date"|"number";reference?:ReferenceKind|"accounts"|"services"};
const f=(key:string,ru:string,ro:string,type?:"date"|"number"):CatalogField=>({key,ru,ro,type});
const link=(key:string,ru:string,ro:string,reference:CatalogField["reference"]):CatalogField=>({key,ru,ro,reference});
export const catalogFields:Record<ReferenceKind,CatalogField[]>={
 "banks":[f("bic","БИК / код банка","BIC / cod bancar"),f("swift","SWIFT","SWIFT"),f("address","Адрес","Adresă")],
 "bank-accounts":[link("bank_id","Банк","Bancă","banks"),f("iban","IBAN / расчётный счёт","IBAN / cont bancar"),f("currency","Валюта","Monedă"),link("owner_id","Владелец","Titular","counterparties")],
 "payment-methods":[link("bank_account_id","Банковский счёт","Cont bancar","bank-accounts"),f("purpose","Назначение платежа","Destinația plății")],
 "ownership":[],"property-types":[f("description","Описание вида объекта","Descrierea tipului")],
 "meter-types":[link("unit_id","Единица измерения","Unitate de măsură","units"),f("digits","Разрядность","Număr de cifre","number"),f("verification_months","Период поверки, месяцев","Verificare, luni","number")],
 "tariff-types":[link("service_id","Услуга","Serviciu","services"),link("unit_id","Единица измерения","Unitate de măsură","units")],
 "service-types":[link("unit_id","Единица измерения","Unitate de măsură","units"),f("description","Описание","Descriere")],
 "citizens":[f("birth_date","Дата рождения","Data nașterii","date"),f("phone","Телефон","Telefon"),f("email","Электронная почта","E-mail"),link("account_id","Лицевой счёт","Cont personal","accounts"),link("property_id","Объект учёта","Obiect","properties"),link("relationship_id","Родство","Rudenie","relationships"),f("registration","Вид регистрации","Tip de înregistrare"),f("residence_status","Статус проживания","Starea locuirii"),link("benefit_id","Категория льготы","Categorie de facilități","benefit-categories")],
 "citizen-groups":[f("description","Описание","Descriere")],"service-groups":[f("description","Описание","Descriere")],
 "benefit-documents":[f("description","Описание вида подтверждающего документа","Descrierea tipului documentului justificativ")],
 "identity-documents":[f("description","Описание вида документа","Descrierea tipului de document")],
 "units":[f("symbol","Обозначение","Simbol"),f("decimals","Точность, знаков","Precizie, zecimale","number")],
 "laws":[f("number","Номер","Număr"),f("adopted_on","Дата принятия","Data adoptării","date"),f("reference","Ссылка / реквизиты","Referință")],
 "buildings":[link("locality_id","Населённый пункт","Localitate","localities"),link("street_id","Улица","Stradă","streets"),f("number","Номер здания","Număr clădire"),f("block","Корпус","Corp"),f("floors","Этажность","Etaje","number")],
 "benefit-categories":[link("law_id","Основание","Temei","laws"),f("description","Описание категории","Descrierea categoriei")],
 "counterparties":[f("idno","CF / IDNO","CF / IDNO"),f("address","Адрес","Adresă"),f("phone","Телефон","Telefon"),f("email","Электронная почта","E-mail")],
 "localities":[f("region","Район / регион","Raion / regiune"),f("postal_code","Почтовый индекс","Cod poștal")],
 "norms":[link("service_id","Услуга","Serviciu","services"),link("unit_id","Единица измерения","Unitate de măsură","units"),f("quantity","Величина нормы","Valoarea normei","number"),f("effective_from","Действует с","Valabil din","date")],
 "properties":[link("building_id","Здание","Clădire","buildings"),link("type_id","Вид объекта","Tip de obiect","property-types"),link("entrance_id","Подъезд","Scară","entrances"),f("number","Номер объекта / квартиры","Număr obiect / apartament"),f("floor","Этаж","Etaj","number"),f("total_area","Общая площадь, м²","Suprafață totală, m²","number"),f("living_area","Жилая площадь, м²","Suprafață locuibilă, m²","number"),link("ownership_id","Собственность","Proprietate","ownership")],
 "allocation-bases":[f("description","Описание основания","Descrierea bazei")],"calculation-bases":[f("description","Описание основания","Descrierea bazei")],
 "entrances":[link("building_id","Здание","Clădire","buildings"),f("number","Номер подъезда","Număr scară")],
 "benefit-calculation":[link("category_id","Категория льготы","Categorie de facilități","benefit-categories"),link("service_id","Услуга","Serviciu","services"),f("description","Правило / описание","Regulă / descriere")],
 "identity-reasons":[f("description","Описание причины","Descrierea motivului")],"allocation-methods":[f("description","Описание способа","Descrierea metodei")],"relationships":[],
 "streets":[link("locality_id","Населённый пункт","Localitate","localities"),f("street_type","Вид улицы","Tip de stradă")],
};
