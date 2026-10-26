import { projectSchema, uid, type Project, type TariffDocument } from "./model";

export function saveTariffDocument(p: Project, document: TariffDocument, apply = false): Project {
  const ru = p.settings.language === "ru";
  const old = p.tariff_documents.find(d => d.id === document.id);
  if (old?.state === "applied" || document.state !== "draft")
    throw Error(ru ? "Применённый документ доступен только для просмотра." : "Documentul aplicat poate fi doar vizualizat.");
  const next = structuredClone(p), doc = structuredClone(document);
  const index = next.tariff_documents.findIndex(d => d.id === doc.id);
  if (index < 0) next.tariff_documents.push(doc); else next.tariff_documents[index] = doc;
  // Validate the complete draft before applying any rate.
  projectSchema.parse(next);
  if (apply) {
    for (const row of doc.rows) {
      if (p.closed_periods.some(month => month >= row.effective_from.slice(0, 7)))
        throw Error(ru ? "Тариф затрагивает закрытые месяцы. Сначала откройте их." : "Tariful afectează luni închise. Redeschideți-le mai întâi.");
      if (p.tariffs.some(t => t.service_id === row.service_id && t.effective_from === row.effective_from))
        throw Error(ru ? "На эту дату уже задан тариф услуги. Документ не применён." : "Există deja un tarif al serviciului pentru această dată. Documentul nu a fost aplicat.");
      row.tariff_id = uid();
      next.tariffs.push({id: row.tariff_id, service_id: row.service_id, effective_from: row.effective_from, rate: row.rate});
    }
    doc.state = "applied";
  }
  return projectSchema.parse(next);
}
