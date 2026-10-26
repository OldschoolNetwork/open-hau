export const receiptEnglish: Record<string, string> = {
  "Indexurile contoarelor": "Meter readings",
  "Contor / serviciu": "Meter / service",
  Precedent: "Previous",
  Data: "Date",
  Ultimul: "Latest",
  Consum: "Consumption",
  "Pe serviciu": "Per service",
  "Indexurile sunt afișate separat de volumul facturat. Data lipsește dacă nu a fost înregistrată.":
    "Meter readings are shown separately from billed quantities. Dates are omitted when not recorded.",
  "Date fictive": "Fictional data",
  "CIORNĂ: date incomplete. Totalul nu este final.":
    "DRAFT: readings, tariffs or history are incomplete. The total is provisional.",
  "Perioada de calcul": "Billing period",
  "Achitați până la": "Due by",
  Plătitor: "Payer",
  "Cont personal": "Account number",
  "ap.": "apt.",
  Serviciu: "Service",
  Volum: "Quantity",
  "Unit.": "Unit",
  Tarif: "Rate",
  Sumă: "Amount",
  "Sold inițial": "Opening balance",
  "Calculat pentru servicii": "Service charges",
  Ajustare: "Adjustment",
  "Achitat în luna curentă": "Payments this month",
  "Total spre plată": "Total due",
  "Aviz de plată": "Payment notice",
  "Data / Semnătura": "Date / Signature",
  Achitat: "Paid",
  "Date bancare": "Bank details",
  "Factura pentru servicii comunale": "Utility bill",
  "Vă mulțumim pentru achitarea la timp.": "Thank you for paying on time.",
  "Apă și canalizare": "Water and sewerage",
  "Energie electrică": "Electricity",
  "Evacuarea deșeurilor": "Waste collection",
  "Deservirea blocului": "Building maintenance",
  "Servicii bancare": "Banking services",
};
export function englishReceiptName(value: {
  ru: string;
  ro: string;
  en?: string;
}) {
  if (value.en !== undefined) return value.en;
  if (value.ro.endsWith(" · diferență comună"))
    return (
      (receiptEnglish[value.ro.slice(0, -" · diferență comună".length)] ||
        value.ro.slice(0, -" · diferență comună".length)) +
      " · shared difference"
    );
  return receiptEnglish[value.ro] || value.ro;
}
