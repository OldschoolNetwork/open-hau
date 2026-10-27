import type {Project} from "./model";
export const dateFormats=["iso","dmy-dot","dmy-slash","mdy-slash","dmy-short","long","short-month","weekday","roman-month"] as const;
export const periodFormats=["auto","iso","month-dot","month-slash","long","short-month","roman-month"] as const;
type Language="ru"|"ro"|"en"|"both";
const locales={ru:"ru-RU",ro:"ro-RO",en:"en-GB"};
const roman=["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
function bilingual(lang:Language,render:(language:"ru"|"ro"|"en")=>string){if(lang!=="both")return render(lang);const ru=render("ru"),ro=render("ro");return ru===ro?ru:ru+" / "+ro;}
function calendar(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const [y,m,d]=value.split("-").map(Number),date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date:null;}
export function displayDate(value:string|null|undefined,p:Project,language:Language=p.settings.language):string{
  if(!value)return "—";const date=calendar(value);if(!date)return value;
  const [y,m,d]=value.split("-"),style=p.settings.date_format;
  if(style==="iso")return value;
  if(style==="dmy-dot")return `${d}.${m}.${y}`;
  if(style==="dmy-slash")return `${d}/${m}/${y}`;
  if(style==="mdy-slash")return `${m}/${d}/${y}`;
  if(style==="dmy-short")return `${d}.${m}.${y.slice(-2)}`;
  if(style==="roman-month")return `${d} ${roman[Number(m)-1]} ${y}`;
  return bilingual(language,lang=>{
    const parts=new Intl.DateTimeFormat(locales[lang],{day:"numeric",month:style==="short-month"?"short":"long",year:"numeric",timeZone:"UTC"}).formatToParts(date);
    const month=parts.find(x=>x.type==="month")?.value||m;
    const text=`${Number(d)} ${month} ${y}`;
    return style==="weekday"?new Intl.DateTimeFormat(locales[lang],{weekday:"long",timeZone:"UTC"}).format(date)+", "+text:text;
  });
}
export function displayPeriod(value:string,p:Project,language:Language=p.settings.language):string{
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return value;
  const [y,m]=value.split("-");
  const style=p.settings.period_format==="auto"?({iso:"iso","dmy-dot":"month-dot","dmy-slash":"month-slash","mdy-slash":"month-slash","dmy-short":"month-dot",long:"long","short-month":"short-month",weekday:"long","roman-month":"roman-month"} as const)[p.settings.date_format]:p.settings.period_format;
  if(style==="iso")return value;
  if(style==="month-dot")return `${m}.${y}`;
  if(style==="month-slash")return `${m}/${y}`;
  if(style==="roman-month")return `${roman[Number(m)-1]} ${y}`;
  const date=calendar(value+"-01")!;
  return bilingual(language,lang=>new Intl.DateTimeFormat(locales[lang],{month:style==="short-month"?"short":"long",timeZone:"UTC"}).format(date)+" "+y);
}
