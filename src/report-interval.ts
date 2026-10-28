export type IntervalMode='current'|'year'|'quarter'|'month'|'day';
export type IntervalChoice={mode:IntervalMode;year:number;quarter:number;month:number;day:string;yearToDate:boolean;quarterToDate:boolean;monthToDate:boolean};
export function intervalRange(c:IntervalChoice,current:string){
 const valid=(s:string)=>/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 const ym=(year:number,month:number)=>`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}`;
 const last=(year:number,month:number)=>{const d=new Date('2000-01-01T00:00:00Z');d.setUTCFullYear(year,month,0);return d.toISOString().slice(0,10);};
 if(!Number.isInteger(c.year)||c.year<1||c.year>9999||!Number.isInteger(c.month)||c.month<1||c.month>12||!Number.isInteger(c.quarter)||c.quarter<1||c.quarter>4)throw Error('Invalid interval');
 let from='',to='';
 if(c.mode==='day'){from=to=c.day;if(c.monthToDate)from=c.day.slice(0,7)+'-01';}
 else if(c.mode==='current'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(current))throw Error('Invalid current period');const [y,m]=current.split('-').map(Number);from=current+'-01';to=last(y,m);}
 else if(c.mode==='year'){from=ym(c.year,1)+'-01';to=ym(c.year,12)+'-31';}
 else if(c.mode==='quarter'){const first=(c.quarter-1)*3+1;from=ym(c.year,c.yearToDate?1:first)+'-01';to=last(c.year,first+2);}
 else{const first=c.yearToDate?1:c.quarterToDate?Math.floor((c.month-1)/3)*3+1:c.month;from=ym(c.year,first)+'-01';to=last(c.year,c.month);}
 if(!valid(from)||!valid(to)||from>to)throw Error('Invalid interval');return {from,to};
}
export type IntervalRequest={id:string;current:string;from:string;to:string;onapply:(from:string,to:string)=>void};
export const openInterval=(request:IntervalRequest)=>window.dispatchEvent(new CustomEvent('openhau:report-interval',{detail:request}));
