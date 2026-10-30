import {z} from 'zod';
import type {Project} from './model';
import {receiptReadings} from './meters';
export const receiptContentSchema=z.object({
 logo:z.boolean().default(true),address:z.boolean().default(true),bank:z.boolean().default(true),deadline:z.boolean().default(true),footer:z.boolean().default(true),stub:z.boolean().default(true),
 readings:z.boolean().default(true),serial:z.boolean().default(true),dates:z.boolean().default(true),consumption:z.boolean().default(true),previous:z.boolean().default(true),current:z.boolean().default(true),note:z.boolean().default(true),labels:z.enum(['service','meter','none']).default('service'),
 services:z.array(z.string().min(1).max(100)).max(1000).nullable().default(null),
 types:z.array(z.string().max(100)).max(1000).nullable().default(null),excluded_meters:z.array(z.string().max(300)).max(100000).default([]),
}).default({logo:true,address:true,bank:true,deadline:true,footer:true,stub:true,readings:true,serial:true,dates:true,consumption:true,previous:true,current:true,note:true,labels:'service',services:null,types:null,excluded_meters:[]});
export type ReceiptContent=z.output<typeof receiptContentSchema>;
export const defaultReceiptContent=()=>receiptContentSchema.parse({});
export const receiptReadingKey=(accountId:string,row:{aggregate:boolean;service_id:string;meter_id:string})=>row.aggregate?'legacy:'+accountId+':'+row.service_id:row.meter_id;
export function selectedReceiptReadings(project:Project,accountId:string,period:string){
 const options=project.settings.receipt_content;
 if(!options.readings)return [];
 const types=new Map(project.meters.map(m=>[m.id,m.type_id||''])),excluded=new Set(options.excluded_meters);
 return receiptReadings(project,accountId,period).filter(row=>(options.services===null||options.services.includes(row.service_id))&&(options.types===null||options.types.includes(types.get(row.meter_id)||''))&&!excluded.has(receiptReadingKey(accountId,row)));
}
