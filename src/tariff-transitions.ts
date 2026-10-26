import { projectSchema, uid, type Project } from "./model";
import { monthNext } from "./engine";

export function addAverageTariff(p: Project, serviceId: string, period: string, average: string, nextRate: string): Project {
  const ru = p.settings.language === "ru";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    throw Error(ru ? "Укажите расчётный месяц." : "Indicați luna de calcul.");
  const following = monthNext(period);
  if (p.closed_periods.some(x => x >= period))
    throw Error(ru ? "Тариф затрагивает закрытые месяцы. Сначала откройте их." : "Tariful afectează luni închise. Redeschideți-le mai întâi.");
  const dates = [period + "-01", following + "-01"];
  if (p.tariffs.some(x => x.service_id === serviceId && dates.includes(x.effective_from)))
    throw Error(ru ? "На одну из дат уже задан тариф. Измените существующие записи в истории тарифов." : "Există deja un tarif pentru una dintre date. Modificați înregistrările existente din istoricul tarifelor.");
  const next = structuredClone(p);
  next.tariffs.push(
    {id: uid(), service_id: serviceId, effective_from: dates[0], rate: average},
    {id: uid(), service_id: serviceId, effective_from: dates[1], rate: nextRate},
  );
  return projectSchema.parse(next);
}
