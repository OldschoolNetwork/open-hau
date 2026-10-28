import type {BalanceFilter} from './balance-view';
import type {ReferenceKind} from './catalog-definitions';
export type SortRule={column:number;descending:boolean};
export type FilterItems={id:string;code:string;name:string;address?:string}[];
export type ReportSettingsRequest={id:string;filters:BalanceFilter[];labels:string[];items:FilterItems[];columns:string[];sort:SortRule[];onapply:(filters:BalanceFilter[],sort:SortRule[])=>void};
export const openReportSettings=(request:ReportSettingsRequest)=>window.dispatchEvent(new CustomEvent('openhau:report-settings',{detail:request}));
export type ReportLookupRequest={id:string;parentId?:string;label:string;items:FilterItems;selected:string[];multiple:boolean;kind?:ReferenceKind|'accounts'|'services';onchoose:(ids:string[])=>void};
export const openReportLookup=(request:ReportLookupRequest)=>window.dispatchEvent(new CustomEvent('openhau:report-lookup',{detail:request}));
