// Small, dependency-free OOXML writer. Text is always inline text, never a formula.
const enc=new TextEncoder();
const xml=(s:string)=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const crc=(data:Uint8Array)=>{let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
function zip(files:Record<string,string>){
 const parts:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
 const header=(size:number,values:[number,number,number][])=>{const a=new Uint8Array(size),v=new DataView(a.buffer);for(const [pos,value,bytes]of values)bytes===4?v.setUint32(pos,value,true):v.setUint16(pos,value,true);return a;};
 for(const [name,content]of Object.entries(files)){
  const n=enc.encode(name),d=enc.encode(content),checksum=crc(d);
  const h=header(30,[[0,0x04034b50,4],[4,20,2],[12,33,2],[14,checksum,4],[18,d.length,4],[22,d.length,4],[26,n.length,2]]);
  parts.push(h,n,d);central.push(header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[14,33,2],[16,checksum,4],[20,d.length,4],[24,d.length,4],[28,n.length,2],[42,offset,4]]),n);offset+=h.length+n.length+d.length;
 }
 const length=central.reduce((s,a)=>s+a.length,0),count=Object.keys(files).length;
 parts.push(...central,header(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,length,4],[16,offset,4]]));
 const output=new Uint8Array(parts.reduce((s,a)=>s+a.length,0));let pos=0;for(const a of parts){output.set(a,pos);pos+=a.length;}return output;
}
const column=(i:number):string=>i<26?String.fromCharCode(65+i):column(Math.floor(i/26)-1)+column(i%26);
export function tableXLSX(title:string,subtitle:string,headers:string[],rows:string[][],numericStart:number,numericCount=5){
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const all=[[title],[subtitle],headers,...rows];
 const widths=headers.map((_,i)=>Math.min(i>=numericStart&&i<numericStart+numericCount?24:70,Math.max(14,...[headers,...rows].map(r=>Math.max(...String(r[i]||'').split('\n').map(s=>[...s].length))+3))));
 const sheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${all.map((r,ri)=>`<row r="${ri+1}"${ri===2?' ht="32" customHeight="1"':''}>${r.map((value,ci)=>{const number=ri>2&&ci>=numericStart&&ci<numericStart+numericCount&&/^-?\d+(\.\d+)?$/.test(value);const total=ri===all.length-1&&ri>2;const style=ri===2?1:total?(number?4:3):number?2:0;return `<c r="${column(ci)}${ri+1}" s="${style}"${number?'':' t="inlineStr"'}>${number?`<v>${value}</v>`:`<is><t xml:space="preserve">${xml(value)}</t></is>`}</c>`;}).join('')}</row>`).join('')}</sheetData><autoFilter ref="A3:${column(headers.length-1)}${Math.max(3,all.length-1)}"/><printOptions horizontalCentered="1"/><pageSetup orientation="landscape" paperSize="9"/></worksheet>`;
 return zip({
  '[Content_Types].xml':`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'xl/styles.xml':`<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7EDF3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="4" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyFont="1"><alignment horizontal="right"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  'xl/worksheets/sheet1.xml':sheet,
 });
}
