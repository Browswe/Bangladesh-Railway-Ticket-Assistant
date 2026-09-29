const norm=s=>String(s??"").toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g," ").trim();
function textOf(e){return norm([e.name,e.id,e.placeholder,e.getAttribute("aria-label"),e.getAttribute("autocomplete"),e.getAttribute("data-testid")].filter(Boolean).join(" "))}
function visible(e){const r=e.getBoundingClientRect();return !e.disabled&&!e.readOnly&&r.width>0&&r.height>0}
function setValue(e,v){if(!e||v==null||v==="")return false;const proto=e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:e.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;if(setter)setter.call(e,String(v));else e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return true}
function allFields(){return [...document.querySelectorAll("input,textarea,select,[role='combobox']")].filter(visible)}
function matches(e,words){const t=textOf(e);return words.some(w=>t.includes(norm(w)))}
function findField(words,{exclude=[]}={}){return allFields().find(e=>matches(e,words)&&!exclude.some(w=>matches(e,[w])))}
function findAll(words,{exclude=[]}={}){return allFields().filter(e=>matches(e,words)&&!exclude.some(w=>matches(e,[w])))}
const CLASS_ALIASES={SHOVAN:["SHOVAN","SHULOV","SHOVON"],S_CHAIR:["S_CHAIR","SHOVON CHAIR","SHOVAN CHAIR"],SNIGDHA:["SNIGDHA"],F_BERTH:["F_BERTH","FIRST BERTH"],F_SEAT:["F_SEAT","FIRST SEAT"],F_CHAIR:["F_CHAIR","FIRST CHAIR"],AC_B:["AC_B","AC BERTH"],AC_S:["AC_S","AC SEAT"],AC_CHAIR:["AC_CHAIR","AC CHAIR"]};
function classCandidates(value){const key=norm(value).replace(/ /g,"_");return CLASS_ALIASES[key]||[value]};
function optionNodes(){
  return [...document.querySelectorAll("[role='option'],option,li,mat-option,.ng-option,.dropdown-item,[data-value]")].filter(visible);
}
function dispatchKeys(e,keys){
  keys.forEach(k=>e.dispatchEvent(new KeyboardEvent("keydown",{key:k,code:k,bubbles:true})));
  keys.forEach(k=>e.dispatchEvent(new KeyboardEvent("keyup",{key:k,code:k,bubbles:true})));
}
function findOption(candidates){
  const wanted=candidates.map(norm);
  return optionNodes().find(o=>{
    const t=norm(o.textContent);
    return wanted.some(v=>t===v||t.includes(v));
  });
}
function choose(e,value){
  if(!e||value==null||value==="")return Promise.resolve(false);
  const candidates=classCandidates(value);
  if(e.tagName==="SELECT"){
    const opt=[...e.options].find(o=>candidates.some(v=>norm(o.textContent)===norm(v)||norm(o.value)===norm(v)||norm(o.textContent).includes(norm(v))));
    if(opt){e.value=opt.value;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return Promise.resolve(true)}
  }
  e.focus();e.click();
  return new Promise(resolve=>{
    let done=false;
    const finish=v=>{if(!done){done=true;resolve(v)}};
    const check=()=>{
      const opt=findOption(candidates);
      if(opt){opt.click();finish(true);return}
      dispatchKeys(e,["ArrowDown","Enter"]);
      setTimeout(()=>finish(false),250);
    };
    setTimeout(check,120);
  });
}
async function typeAndPick(e,value){
  if(!e||value==null||value==="")return false;
  e.focus();e.click();
  const full=String(value).trim();
  const prefix=full.length>3?full.slice(0,3):full;
  setValue(e,prefix);
  await new Promise(r=>setTimeout(r,350));
  let opt=findOption([full,prefix]);
  if(opt){opt.click();return true}
  setValue(e,full);
  await new Promise(r=>setTimeout(r,350));
  opt=findOption([full,prefix]);
  if(opt){opt.click();return true}
  dispatchKeys(e,["ArrowDown"]);
  await new Promise(r=>setTimeout(r,80));
  dispatchKeys(e,["Enter"]);
  return String(e.value||"").toLowerCase().includes(full.toLowerCase())||String(e.value||"").toLowerCase().includes(prefix.toLowerCase());
}
function fillProfile(p,index=0){if(!p)return{message:"No passenger profile selected."};const names=findAll(["full name","passenger name","traveller name","traveler name","name"],{exclude:["email"]});const mobiles=findAll(["mobile","phone","contact"]);const ids=findAll(["nid","national id","identity number","identification number","id number"]);const passports=findAll(["passport"]);let count=0;count+=setValue(names[index],p.fullName||p.name)?1:0;count+=setValue(mobiles[index],p.phone)?1:0;count+=setValue(ids[index],p.nid)?1:0;count+=setValue(passports[index],p.passport)?1:0;return{message:count?"Filled "+count+" passenger field(s). Review the details manually.":"No matching passenger fields were found on this page."}}
function fillProfiles(ps){const results=(ps||[]).map((p,i)=>fillProfile(p,i));const filled=results.filter(r=>!r.message.startsWith("No matching")).length;return{message:"Processed "+(ps?.length||0)+" profile(s); matched "+filled+". Review every passenger manually."}}
function typeAndPick(e,value){
  if(!e||value==null||value==="")return false;
  e.focus();e.click();
  const before=e.value;
  if(setValue(e,value)&&String(e.value)===String(value))return true;
  const wanted=norm(value);
  const nodes=[...document.querySelectorAll("[role='option'],option,li,mat-option,.ng-option,.dropdown-item")].filter(visible);
  const opt=nodes.find(o=>norm(o.textContent)===wanted||norm(o.textContent).includes(wanted));
  if(opt){opt.click();return true}
  return before!==e.value;
}
async function fillSearch(d){
  let count=0;
  const from=findField(["from","origin","source","boarding station","departure station","starting station"]);
  const to=findField(["to","destination","arrival station","destination station"]);
  const date=findField(["journey date","travel date","departure date","date"]);
  const cls=findField(["class","coach","seat class","choose class"]);
  const qty=findField(["passenger quantity","ticket quantity","passenger","quantity","adult"]);
  const train=findField(["train name","train"]);
  count+=await typeAndPick(from,d.from)?1:0;
  count+=await typeAndPick(to,d.to)?1:0;
  count+=await typeAndPick(date,d.date)?1:0;
  count+=await choose(cls,d.class)?1:0;
  count+=await typeAndPick(qty,d.qty)?1:0;
  count+=await typeAndPick(train,d.train)?1:0;
  return{message:count?"Filled "+count+" search field(s). Review before searching.":"No matching search fields were found on this page."}
}
function clearForm(){let n=0;allFields().forEach(e=>{if(e.tagName==="SELECT"){e.selectedIndex=0;e.dispatchEvent(new Event("change",{bubbles:true}));n++}else if(setValue(e,""))n++});return{message:"Cleared "+n+" editable field(s). Use carefully."}}
function checkForm(){const all=allFields();const required=all.filter(e=>e.required||e.getAttribute("aria-required")==="true");const targets=required.length?required:all.filter(e=>{const t=textOf(e);return /(from|origin|source|boarding|destination|arrival|journey date|travel date|passenger name|mobile|phone|nid|national id|passport|class|coach|quantity|adult)/.test(t)});const empty=targets.filter(e=>!String(e.value||"").trim());const names=empty.slice(0,15).map(e=>e.getAttribute("aria-label")||e.placeholder||e.name||e.id||"unnamed field");return{message:"Checked "+targets.length+" relevant field(s); "+empty.length+" appear empty.",empty:names,requiredMode:!!required.length}}
chrome.runtime.onMessage.addListener((m,s,sendResponse)=>{(async()=>{try{let r;if(m.type==="fillProfile")r=fillProfile(m.data);else if(m.type==="fillProfiles")r=fillProfiles(m.data||[]);else if(m.type==="fillSearch")r=await fillSearch(m.data||{});else if(m.type==="clear")r=clearForm();else if(m.type==="checkForm")r=checkForm();sendResponse(r||{message:"No action"});}catch(e){sendResponse({message:"Could not complete helper action on this page. Refresh the Railway page and try again."});}})();return true});