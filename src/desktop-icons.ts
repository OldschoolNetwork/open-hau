import {RefreshCw,Undo2,Redo2,Scissors,ClipboardPaste,TextSelect,LogOut,File,FilePlus,Save,SaveAll,Copy,Database,LayoutDashboard,Landmark,Archive,Building2,ChartNoAxesCombined,ChevronRight,FileJson,FolderOpen,Gauge,Info,Layers3,ReceiptText,Settings,Users,Wallet} from "@lucide/svelte";
import type {DesktopCommand} from "./desktop-menu";
export function commandIcon(command:DesktopCommand){
  const id=command.id;
  const editIcons:Record<string,typeof File>={undo:Undo2,redo:Redo2,cut:Scissors,copy:Copy,paste:ClipboardPaste,'select-all':TextSelect};if(editIcons[id])return editIcons[id];
  if(id==='updates')return RefreshCw;
  if(id==='file')return File;
  const fileIcons:Record<string,typeof File>={'exit':LogOut,'database-home':Database,'database-new':FilePlus,'database-open':FolderOpen,'save':Save,'save-as':SaveAll,'import-copy':Copy,'export-json':FileJson,'workspace-tools':LayoutDashboard,'overview':ChartNoAxesCombined,'readings':Gauge,'payments':Wallet,'treasury':Landmark};
  if(fileIcons[id])return fileIcons[id];
  if(id==="about"||id==="help"||id==="manual")return Info;
  if(id==="operations"||id==="catalogs")return FolderOpen;
  if(id.includes("meter")||id.includes("reading")||id.includes("allocation"))return Gauge;
  if(id.includes("account")||id.includes("citizen")||id.includes("benefit")||id.includes("relationships")||id.includes("residence"))return Users;
  if(id.includes("properties")||id.includes("building")||id.includes("localit")||id.includes("street")||id.includes("entrance"))return Building2;
  if(id.startsWith("batch")||id.includes("payment")||id.includes("bank")||id==="treasury")return Wallet;
  if(id.includes("receipt")||id.includes("tariff"))return ReceiptText;
  if(id.includes("report")||id.includes("balance")||id==="accumulation")return ChartNoAxesCombined;
  if(id.includes("setting")||id==="tools"||id==="regulations"||id==="processes")return Settings;
  if(id.includes("service")||id.includes("norm")||id.includes("unit"))return Layers3;
  if(id==="information")return Archive;
  if(id==="next"||id==="previous")return ChevronRight;
  return FileJson;
}
