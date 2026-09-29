const norm=s=>String(s??"").toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g," ").trim();
function textOf(e){return norm([e.name,e.id,e.placeholder,e.getAttribute("aria-label"),e.getAttribute("autocomplete"),e.getAttribute("data-testid")].filter(Boolean).join(" "))}
function visible(e){const r=e.getBoundingClientRect();return !e.disabled&&!e.readOnly&&r.width>0&&r.height>0}
function setValue(e,v){if(!e||v==null||v==="")return false;const proto=e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:e.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;if(setter)setter.call(e,String(v));else e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return true}
function allFields(){return [...document.querySelectorAll("input,textarea,select,[role='combobox']")].filter(visible)}
function matches(e,words){const t=textOf(e);return words.some(w=>t.includes(norm(w)))}
function findField(words,{exclude=[]}={}){return allFields().find(e=>matches(e,words)&&!exclude.some(w=>matches(e,[w])))}
function findAll(words,{exclude=[]}={}){return allFields().filter(e=>matches(e,words)&&!exclude.some(w=>matches(e,[w])))}
const CLASS_ALIASES={SHOVAN:["SHOVAN","SHULOV"],S_CHAIR:["S_CHAIR","SHOVON CHAIR","SHOVAN CHAIR"],SNIGDHA:["SNIGDHA"],F_BERTH:["F_BERTH"],F_SEAT:["F_SEAT"],F_CHAIR:["F_CHAIR"],AC_B:["AC_B"],AC_S:["AC_S"],AC_CHAIR:["AC_CHAIR"]};
function classCandidates(value){const key=norm(value).replace(/ /g,"_");return CLASS_ALIASES[key]||[value]};
function choose(e,value){
  if(!e||value==null||value==="")return false;
  const candidates=classCandidates(value);
  if(e.tagName==="SELECT"){
    const opt=[...e.options].find(o=>candidates.some(v=>norm(o.textContent)===norm(v)||norm(o.value)===norm(v)||norm(o.textContent).includes(norm(v))));
    if(opt){e.value=opt.value;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return true}
  }
  const target=e;
  target.click();
  const wanted=candidates.map(norm);
  const optionNodes=[...document.querySelectorAll("option,[role='option'],li,mat-option,.ng-option,.dropdown-item")].filter(visible);
  const opt=optionNodes.find(o=>wanted.some(v=>norm(o.textContent)===v||norm(o.textContent).includes(v)));
  if(opt){opt.click();return true}
  return setValue(e,value)
}
function fillProfile(p,index=0){if(!p)return{message:"No passenger profile selected."};const names=findAll(["full name","passenger name","traveller name","traveler name","name"],{exclude:["email"]});const mobiles=findAll(["mobile","phone","contact"]);const ids=findAll(["nid","national id","identity number","identification number","id number"]);const passports=findAll(["passport"]);let count=0;count+=setValue(names[index],p.fullName||p.name)?1:0;count+=setValue(mobiles[index],p.phone)?1:0;count+=setValue(ids[index],p.nid)?1:0;count+=setValue(passports[index],p.passport)?1:0;return{message:count?"Filled "+count+" passenger field(s). Review the details manually.":"No matching passenger fields were found on this page."}}
function fillProfiles(ps){const results=(ps||[]).map((p,i)=>fillProfile(p,i));const filled=results.filter(r=>!r.message.startsWith("No matching")).length;return{message:"Processed "+(ps?.length||0)+" profile(s); matched "+filled+". Review every passenger manually."}}
function fillSearch(d){let count=0;const from=findField(["from","origin","source","boarding station","departure station"],{exclude:["email"]});const to=findField(["to","destination","arrival station"]);const date=findField(["journey date","travel date","departure date"]);const cls=findField(["class","coach","seat class"]);const qty=findField(["passenger","quantity","adult","ticket quantity"]);const train=findField(["train"]);count+=choose(from,d.from)?1:0;count+=choose(to,d.to)?1:0;count+=choose(date,d.date)?1:0;count+=choose(cls,d.class)?1:0;count+=choose(qty,d.qty)?1:0;count+=choose(train,d.train)?1:0;return{message:count?"Filled "+count+" search field(s). Review before searching.":"No matching search fields were found on this page."}}
function clearForm(){let n=0;allFields().forEach(e=>{if(e.tagName==="SELECT"){e.selectedIndex=0;e.dispatchEvent(new Event("change",{bubbles:true}));n++}else if(setValue(e,""))n++});return{message:"Cleared "+n+" editable field(s). Use carefully."}}
function checkForm(){const all=allFields();const required=all.filter(e=>e.required||e.getAttribute("aria-required")==="true");const targets=required.length?required:all.filter(e=>{const t=textOf(e);return /(from|origin|source|boarding|destination|arrival|journey date|travel date|passenger name|mobile|phone|nid|national id|passport|class|coach|quantity|adult)/.test(t)});const empty=targets.filter(e=>!String(e.value||"").trim());const names=empty.slice(0,15).map(e=>e.getAttribute("aria-label")||e.placeholder||e.name||e.id||"unnamed field");return{message:"Checked "+targets.length+" relevant field(s); "+empty.length+" appear empty.",empty:names,requiredMode:!!required.length}}
chrome.runtime.onMessage.addListener((m,s,sendResponse)=>{try{let r;if(m.type==="fillProfile")r=fillProfile(m.data);else if(m.type==="fillProfiles")r=fillProfiles(m.data||[]);else if(m.type==="fillSearch")r=fillSearch(m.data||{});else if(m.type==="clear")r=clearForm();else if(m.type==="checkForm")r=checkForm();sendResponse(r||{message:"No action"});}catch(e){sendResponse({message:"Could not complete helper action on this page. Refresh the Railway page and try again."});}return true});