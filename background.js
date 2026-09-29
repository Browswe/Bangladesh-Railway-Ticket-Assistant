chrome.runtime.onInstalled.addListener(()=>chrome.storage.local.set({installedAt:Date.now()}));
chrome.alarms.onAlarm.addListener(async a=>{if(a.name!=="railway-reminder")return;try{await chrome.notifications.create("railway-reminder",{type:"basic",title:"🚆 Railway Reminder",message:"Your saved railway journey reminder is due. Open Bangladesh Railway and review your booking."})}catch(e){console.warn("Railway reminder notification failed",e)}});
chrome.commands.onCommand.addListener(async c=>{
  if(c==="open-railway"){await chrome.tabs.create({url:"https://eticket.railway.gov.bd/"});return}
  if(c==="fill-search"){
    const x=await chrome.storage.local.get("search");const ts=await chrome.tabs.query({active:true,currentWindow:true});const tab=ts[0];
    if(!tab?.id)return;
    try{await chrome.tabs.sendMessage(tab.id,{type:"fillSearch",data:x.search||{}})}catch(e){console.warn("Search fill failed",e)}
  }
});