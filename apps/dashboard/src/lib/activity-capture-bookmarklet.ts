export function buildActivityCaptureBookmarklet(dashboardOrigin: string) {
  const origin = JSON.stringify(dashboardOrigin.replace(/\/$/, ""));
  const code = `(function(){
    var dashboard=${origin};
    var selection=window.getSelection();
    var selected=selection&&selection.rangeCount>0&&selection.toString().trim().length>0;
    var root=document.createElement('div');
    if(selected){root.appendChild(selection.getRangeAt(0).cloneContents());}
    else{root.appendChild((document.body||document.documentElement).cloneNode(true));}
    root.querySelectorAll('script,style,noscript,iframe,object,embed,form,input,button,canvas,svg,nav,footer,header').forEach(function(node){node.remove();});
    root.querySelectorAll('*').forEach(function(node){
      Array.from(node.attributes||[]).forEach(function(attr){if(/^on/i.test(attr.name)||attr.name==='srcdoc'){node.removeAttribute(attr.name);}});
      if(node.tagName==='A'&&node.getAttribute('href')){try{node.setAttribute('href',new URL(node.getAttribute('href'),location.href).href);}catch(e){}}
      if(node.tagName==='IMG'&&node.getAttribute('src')){try{node.setAttribute('src',new URL(node.getAttribute('src'),location.href).href);}catch(e){}}
    });
    var html=root.innerHTML.slice(0,500000);
    var payload={
      schema_version:1,
      capture_id:String(Date.now())+'-'+Math.random().toString(36).slice(2),
      url:location.href,
      canonical_url:(document.querySelector('link[rel="canonical"]')||{}).href||null,
      title:document.title||location.hostname,
      captured_at:new Date().toISOString(),
      capture_mode:selected?'selection':'page',
      language:document.documentElement.lang||null,
      html:html,
      text:(root.textContent||'').replace(/\\s+/g,' ').trim().slice(0,500000)
    };
    var target=window.open(dashboard+'/activities/capture','dadOpsActivityCapture');
    if(!target){alert('Allow pop-ups to capture this page.');return;}
    var attempts=0;
    var timer=setInterval(function(){
      attempts+=1;
      try{target.postMessage({type:'dad-ops-activity-capture',payload:payload},dashboard);}catch(e){}
      if(attempts>=20||target.closed){clearInterval(timer);}
    },500);
  })();`;
  return `javascript:${code.replace(/\s+/g, " ").trim()}`;
}
