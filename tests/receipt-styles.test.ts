import {test} from "node:test";
import assert from "node:assert/strict";
import {demoProject,projectSchema,receiptDesigns,defaultCustomReceipt} from "../src/model";
import {receiptDocument} from "../src/receipt";
test("every receipt design preserves totals and validated configuration",()=>{
  for(const design of receiptDesigns){
    const p=demoProject();p.settings.receipt_design=design;
    p.settings.custom_receipt={...defaultCustomReceipt,font:"serif",decoration:"dots",border:"double",economy:true};
    assert(projectSchema.safeParse(p).success);
    const html=receiptDocument(p,[p.accounts[0]],p.settings.period);
    assert(html.includes(`class="receipt ${design}`));assert(html.includes("1.047,44"));
    if(design==="heritage"){assert(html.includes("r-legacy-notice"));assert(html.includes("Date bancare"));}
    if(design==="custom"){assert(html.includes("font-serif border-double"));assert(html.includes("economy"));}
  }
});
test("English receipt labels, decimal formatting and editable service names are independent of UI language",()=>{
  const p=demoProject();p.settings.receipt_language="en";
  p.services[0].name.en="Custom water service";
  p.settings.receipt_title.en="Monthly utility statement";
  p.settings.receipt_footer.en="Custom footer <safe>";
  assert(projectSchema.safeParse(p).success);
  const html=receiptDocument(p,[p.accounts[0]],p.settings.period);
  assert(html.includes('lang="en"'));assert(html.includes("Total due"));assert(html.includes("1,047.44"));
  assert(html.includes("Custom water service"));assert(html.includes("Monthly utility statement"));
  assert(html.includes("Custom footer &lt;safe&gt;"));assert(html.includes("20.66"));
  assert(!html.includes(">Serviciu<"));assert(!html.includes(">Расчётный период<"));
});
test("custom design presets survive export and old format 2 data remains readable",()=>{
  const p=demoProject();p.settings.receipt_design="custom";p.settings.custom_receipt={...defaultCustomReceipt,font:"mono"};
  p.settings.receipt_presets.push({name:"Fictional custom",design:"custom",color:"#112233",font_size:12,logo:"",custom:p.settings.custom_receipt});
  const restored=projectSchema.parse(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.settings.receipt_presets[0].custom?.font,"mono");
  const old=demoProject() as any;delete old.monthly_occupancy;delete old.shared_groups;
  assert(projectSchema.safeParse(old).success);
});
