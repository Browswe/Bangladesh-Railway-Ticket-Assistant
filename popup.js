const $=id=>document.getElementById(id),msg=s=>{$("status").textContent=s;setTimeout(()=>$("status").textContent="",2600)};let profiles=[],routes=[];
const labels={en:{lang:"বাংলা"},bn:{lang:"English"}};
async function load(){const x=await chrome.storage.local.get(["profiles","routes","search","dark","lang","checks","reminder"]);profiles=x.profiles||[];routes=x.routes||[];const s=x.search||{};["from","to","date","class","qty"].forEach(k=>{if(s[k]!=null)$(k).value=s[k]});
$("profile").innerHTML=profiles.length?profiles.map((p,i)=>'<option value="'+i+'">'+esc(p.name||"Passenger "+(i+1))+"</option>").join(""):'<option value="">No profiles</option>';
$("list").innerHTML=profiles.map((p,i)=>'<div><span>'+esc(p.name||("Passenger "+(i+1)))+'</span><button data-d="'+i+'">Delete</button></div>').join("");
document.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{profiles.splice(+b.dataset.d,1);await chrome.storage.local.set({profiles});load()});
$("route").innerHTML='<option value="">Saved routes</option>'+routes.map((r,i)=>'<option value="'+i+'">'+esc(r.name||((r.from||"?")+" → "+(r.to||"?")))+"</option>").join("");
$("route").onchange=()=>{const r=routes[+$("route").value];if(r){["from","to","date","class","qty"].forEach(k=>$(k).value=r[k]||"")}};
const checks=x.checks||[];document.querySelectorAll(".check").forEach((c,i)=>{c.checked=!!checks[i];c.onchange=saveChecks});updateProgress();
if(x.dark)document.body.classList.add("dark");$("lang").textContent=labels[x.lang==="bn"?"bn":"en"].lang;if(x.reminder)$("reminder").value=x.reminder}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function saveChecks(){await chrome.storage.local.set({checks:[...document.querySelectorAll(".check")].map(c=>c.checked)});updateProgress()}
function updateProgress(){const c=[...document.querySelectorAll(".check")];$("progress").textContent=c.filter(x=>x.checked).length+"/"+c.length}
$("add").onclick=async()=>{let name=prompt("Profile name");if(!name)return;profiles.push({name,fullName:prompt("Full name (optional)")||"",phone:prompt("Mobile (optional)")||"",nid:prompt("NID (optional)")||"",passport:prompt("Passport (optional)")||""});await chrome.storage.local.set({profiles});load();msg("Profile saved")};
$("fill").onclick=()=>chrome.tabs.query({active:true,currentWindow:true},ts=>chrome.tabs.sendMessage(ts[0].id,{type:"fillProfile",profile:profiles[+$("profile").value]},()=>msg(chrome.runtime.lastError?"Open the Railway site first":"Profile filled")));
$("clear").onclick=()=>chrome.tabs.query({active:true,currentWindow:true},ts=>chrome.tabs.sendMessage(ts[0].id,{type:"clear"},()=>msg(chrome.runtime.lastError?"Open the Railway site first":"Editable fields cleared")));
$("fillSearch").onclick=()=>chrome.tabs.query({active:true,currentWindow:true},ts=>chrome.tabs.sendMessage(ts[0].id,{type:"fillSearch",data:Object.fromEntries(["from","to","date","class","qty"].map(k=>[k,$(k).value]))},()=>msg(chrome.runtime.lastError?"Open the Railway site first":"Search fields filled")));
$("saveSearch").onclick=async()=>{let r={name:prompt("Route name (e.g. Sylhet → Dhaka)")||"",...Object.fromEntries(["from","to","date","class","qty"].map(k=>[k,$(k).value]))};routes.push(r);await chrome.storage.local.set({routes,search:r});load();msg("Route saved")};
$("delRoute").onclick=async()=>{let i=+$("route").value;if(!Number.isNaN(i)&&routes[i]){routes.splice(i,1);await chrome.storage.local.set({routes});load();msg("Route deleted")}};
$("open").onclick=()=>chrome.tabs.create({url:"https://eticket.railway.gov.bd/"});
$("theme").onclick=async()=>{document.body.classList.toggle("dark");await chrome.storage.local.set({dark:document.body.classList.contains("dark")})};
$("lang").onclick=async()=>{let x=await chrome.storage.local.get("lang");await chrome.storage.local.set({lang:x.lang==="bn"?"en":"bn"});load()};
$("export").onclick=async()=>{let data=await chrome.storage.local.get(["profiles","routes","search"]);let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="railway-assistant-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("import").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=async()=>{try{let x=JSON.parse(r.result);profiles=x.profiles||[];routes=x.routes||[];await chrome.storage.local.set({profiles,routes,search:x.search||{}});load();msg("Backup imported")}catch{msg("Invalid JSON file")}};r.readAsText(f)};
$("setReminder").onclick=async()=>{let v=$("reminder").value;if(!v)return msg("Select reminder time");let when=new Date(v).getTime();if(when<=Date.now())return msg("Reminder time must be in the future");await chrome.alarms.create("railway-reminder",{when});await chrome.storage.local.set({reminder:v});msg("Reminder set")};
$("clearReminder").onclick=async()=>{await chrome.alarms.clear("railway-reminder");await chrome.storage.local.remove("reminder");$("reminder").value="";msg("Reminder cleared")};
load();