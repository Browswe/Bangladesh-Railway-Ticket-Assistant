const $=id=>document.getElementById(id);
const msg=s=>{const el=$("status");el.textContent=s;clearTimeout(window.__msg);window.__msg=setTimeout(()=>el.textContent="",2800)};
let profiles=[],routes=[],groups=[],history=[];
const keys=["from","to","date","class","qty","train"];
const data=()=>chrome.storage.local.get(["profiles","routes","groups","history","search","dark","lang","checks","reminder","pin"]);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function currentSearch(){return Object.fromEntries(keys.map(k=>[k,$(k).value]))}
function render(){
  $("profile").innerHTML=profiles.length?profiles.map((p,i)=>'<option value="'+i+'">'+esc(p.name||("Passenger "+(i+1)))+"</option>").join(""):'<option value="">No profiles</option>';
  $("list").innerHTML=profiles.map((p,i)=>'<div><span>'+esc(p.name||"Passenger")+" • "+esc(p.phone||"no phone")+'</span><button data-d="'+i+'">Delete</button></div>').join("");
  document.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{profiles.splice(+b.dataset.d,1);groups=groups.map(g=>({...g,members:g.members.filter(i=>i!==+b.dataset.d).map(i=>i>+b.dataset.d?i-1:i)})).filter(g=>g.members.length);await chrome.storage.local.set({profiles,groups});render();msg("Passenger deleted")});
  $("route").innerHTML='<option value="">Saved routes</option>'+routes.map((r,i)=>'<option value="'+i+'">'+esc(r.name||((r.from||"?")+" → "+(r.to||"?")))+"</option>").join("");
  $("group").innerHTML='<option value="">Family groups</option>'+groups.map((g,i)=>'<option value="'+i+'">'+esc(g.name)+" ("+g.members.length+")</option>").join("");
  $("stats").innerHTML='<div class="stat"><b>'+profiles.length+'</b>Passengers</div><div class="stat"><b>'+routes.length+'</b>Routes</div><div class="stat"><b>'+history.length+'</b>Journeys</div>';
  $("history").innerHTML=history.slice(-5).reverse().map((h,i)=>'<div class="history"><button data-h="'+(history.length-1-i)+'">×</button><b>'+esc(h.from)+" → "+esc(h.to)+'</b><br><small>'+esc(h.date)+" • "+esc(h.note||"No note")+'</small></div>').join("");
  document.querySelectorAll("[data-h]").forEach(b=>b.onclick=async()=>{history.splice(+b.dataset.h,1);await chrome.storage.local.set({history});render()});
  updateProgress();
}
async function load(){
  const x=await data();profiles=x.profiles||[];routes=x.routes||[];groups=x.groups||[];history=x.history||[];
  const s=x.search||{};keys.forEach(k=>{if(s[k]!=null)$(k).value=s[k]});
  render();
  document.querySelectorAll(".check").forEach((c,i)=>{c.checked=!!(x.checks||[])[i];c.onchange=saveChecks});
  document.body.classList.toggle("dark",!!x.dark);
  $("reminder").value=x.reminder||"";
  $("lang").textContent=x.lang==="bn"?"English":"বাংলা";
}
async function saveChecks(){await chrome.storage.local.set({checks:[...document.querySelectorAll(".check")].map(c=>c.checked)});updateProgress()}
function updateProgress(){const c=[...document.querySelectorAll(".check")];$("progress").textContent=c.filter(x=>x.checked).length+"/"+c.length}
async function send(type,payload){
  const ts=await chrome.tabs.query({active:true,currentWindow:true});const tab=ts[0];
  if(!tab?.id)return msg("Open the official Railway page first");
  try{const r=await chrome.tabs.sendMessage(tab.id,{type,data:payload});msg(r?.message||"Done")}catch{msg("Refresh the official Railway page, then try again")}
}
$("add").onclick=async()=>{const name=prompt("Profile name");if(!name)return;profiles.push({name,fullName:prompt("Full name")||"",phone:prompt("Mobile")||"",nid:prompt("NID")||"",passport:prompt("Passport")||"",note:prompt("Note (optional)")||""});await chrome.storage.local.set({profiles});render();msg("Passenger saved")};
$("edit").onclick=async()=>{const i=+$("profile").value,p=profiles[i];if(!p)return msg("Select a passenger");p.name=prompt("Profile name",p.name)||p.name;p.fullName=prompt("Full name",p.fullName)||p.fullName;p.phone=prompt("Mobile",p.phone)||p.phone;p.nid=prompt("NID",p.nid)||p.nid;p.passport=prompt("Passport",p.passport)||p.passport;await chrome.storage.local.set({profiles});render();msg("Passenger updated")};
$("fill").onclick=()=>send("fillProfile",profiles[+$("profile").value]);
$("saveGroup").onclick=async()=>{if(!profiles.length)return msg("Add passengers first");let name=$("groupName").value.trim()||prompt("Family/group name");if(!name)return;let raw=prompt("Profile numbers to include, e.g. 1,2,3. Leave blank for all",profiles.map((_,i)=>i+1).join(","));let members=(raw?.trim()?raw.split(",").map(x=>parseInt(x.trim(),10)-1):profiles.map((_,i)=>i)).filter(i=>Number.isInteger(i)&&i>=0&&i<profiles.length);members=[...new Set(members)];if(!members.length)return msg("No valid profiles selected");groups.push({name,members});await chrome.storage.local.set({groups});$("groupName").value="";render();msg("Group saved")};
$("fillGroup").onclick=()=>{const g=groups[+$("group").value];if(!g)return msg("Select a group");send("fillProfiles",g.members.map(i=>profiles[i]).filter(Boolean))};
$("saveSearch").onclick=async()=>{const r={name:prompt("Route name")||(( $("from").value||"?")+" → "+($("to").value||"?")), ...currentSearch()};routes.push(r);await chrome.storage.local.set({routes,search:r});render();msg("Route saved")};
$("route").onchange=()=>{const r=routes[+$("route").value];if(r)keys.forEach(k=>$(k).value=r[k]||"")};
$("repeat").onclick=()=>{const h=history[history.length-1];if(!h)return msg("No saved journey");keys.forEach(k=>$(k).value=h[k]||"");send("fillSearch",currentSearch())};
$("delRoute").onclick=async()=>{const i=+$("route").value;if(!routes[i])return msg("Select a route");routes.splice(i,1);await chrome.storage.local.set({routes});render();msg("Route deleted")};
$("fillSearch").onclick=()=>send("fillSearch",currentSearch());
$("checkForm").onclick=async()=>{const ts=await chrome.tabs.query({active:true,currentWindow:true});try{const r=await chrome.tabs.sendMessage(ts[0].id,{type:"checkForm"});$("checker").textContent=r?.message||"Check complete";if(r?.empty?.length)$("checker").textContent+=" Missing: "+r.empty.join(", ")}catch{$("checker").textContent="Refresh the official Railway page, then run the checker again."}};
$("clear").onclick=()=>send("clear");
$("open").onclick=()=>chrome.tabs.create({url:"https://eticket.railway.gov.bd/"});
$("theme").onclick=async()=>{document.body.classList.toggle("dark");await chrome.storage.local.set({dark:document.body.classList.contains("dark")})};
$("lang").onclick=async()=>{const x=await data();await chrome.storage.local.set({lang:x.lang==="bn"?"en":"bn"});await load();msg("Language preference saved. Full UI translation will be added in a future UI pass.")};
$("export").onclick=async()=>{const x=await data();delete x.pin;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(x,null,2)],{type:"application/json"}));a.download="railway-assistant-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("import").onchange=e=>{const f=e.target.files[0];if(!f)return;const rr=new FileReader();rr.onload=async()=>{try{const x=JSON.parse(rr.result);const clean={profiles:Array.isArray(x.profiles)?x.profiles:[],routes:Array.isArray(x.routes)?x.routes:[],history:Array.isArray(x.history)?x.history:[],search:x.search&&typeof x.search==="object"?x.search:{},groups:Array.isArray(x.groups)?x.groups:[]};clean.groups=clean.groups.map(g=>({name:String(g.name||"Group"),members:(Array.isArray(g.members)?g.members:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<clean.profiles.length)})).filter(g=>g.members.length);await chrome.storage.local.set(clean);await load();msg("Backup imported safely")}catch{msg("Invalid backup file")}};rr.readAsText(f);e.target.value=""};
$("setReminder").onclick=async()=>{const v=$("reminder").value;if(!v)return msg("Select time");const when=new Date(v).getTime();if(!Number.isFinite(when)||when<=Date.now())return msg("Choose a future time");await chrome.alarms.clear("railway-reminder");await chrome.alarms.create("railway-reminder",{when});await chrome.storage.local.set({reminder:v});msg("Reminder set")};
$("clearReminder").onclick=async()=>{await chrome.alarms.clear("railway-reminder");await chrome.storage.local.remove("reminder");$("reminder").value="";msg("Reminder cleared")};
$("saveHistory").onclick=async()=>{const s=currentSearch();if(!s.from&&!s.to&&!s.date)return msg("Enter a journey first");history.push({...s,note:$("historyNote").value.trim(),createdAt:new Date().toISOString()});history=history.slice(-50);await chrome.storage.local.set({history});$("historyNote").value="";render();msg("Journey saved")};
$("wipe").onclick=async()=>{if(confirm("Delete all Railway Assistant local data?")){await chrome.storage.local.clear();await chrome.alarms.clearAll();location.reload()}};
$("pinSave").onclick=async()=>{const p=$("pin").value.trim();if(!/^\d{4,8}$/.test(p))return msg("PIN must be 4-8 digits");await chrome.storage.local.set({pin:p});$("pin").value="";unlock();msg("PIN saved")};
$("pinUnlock").onclick=async()=>{const x=await data();if(!x.pin)return unlock();if($("pin").value===x.pin){$("pin").value="";unlock()}else msg("Wrong PIN")};
function unlock(){$("lockBox").classList.add("hidden");$("app").classList.remove("hidden");load()}
(async()=>{const x=await data();if(!x.pin)unlock();else $("pinHint").textContent="Enter your PIN to unlock saved data."})();