/* Análisis con IA (Google Gemini): clave en localStorage, carga de documentos, ejecución de instrucciones, simulación sin clave */
(function(){
const LM=window.LM, V=LM.views, E=LM.esc;
const KK='lm_gemini_key', KM='lm_gemini_model', DEF_MODEL='auto', MAXC=500000;
const API=window.LM_TEST_API||'https://generativelanguage.googleapis.com/v1beta/models/';
LM.gemKey=()=>{ try{ return localStorage.getItem(KK)||''; }catch(e){ return ''; } };
LM.gemModel=()=>{ try{ return (localStorage.getItem(KM)||DEF_MODEL).replace(/^models\//,'').trim()||DEF_MODEL; }catch(e){ return DEF_MODEL; } };
const setModel=m=>{ try{ localStorage.setItem(KM,m); }catch(e){} };
/* v10: el modelo guardado automáticamente por versiones anteriores vuelve a 'auto' (una vez) */
try{ if(!localStorage.getItem('lm_gemini_v10')){ localStorage.setItem(KM,'auto'); localStorage.setItem('lm_gemini_v10','1'); } }catch(e){}
/* Orden de preferencia (flash vigentes primero). Nota: Google limita los modelos 2.5 a proyectos que ya los usaban; los proyectos nuevos deben usar 3.x */
const PREF=['gemini-3.5-flash-lite','gemini-flash-lite-latest','gemini-3.1-flash-lite','gemini-2.5-flash-lite','gemini-3.6-flash','gemini-flash-latest','gemini-3.5-flash','gemini-3.7-flash','gemini-3.8-flash','gemini-3-flash-preview','gemini-2.5-flash','gemini-2.0-flash-lite','gemini-2.0-flash'];
const BAD=/tts|live|image|audio|embed|transcribe|translate|computer-use|robotics|aqa|veo|imagen|lyria|nano|banana|learnlm|gemma/i;
const AVISO='<div class="card conf" style="margin:.6rem 0"><b>⚠ Antes de usar la IA.</b> <span class="small">En el plan gratuito de Google Gemini, Google puede usar los datos enviados para mejorar sus productos. <b>No suba documentos con datos reales de clientes</b>: anonimícelos primero. <b>Revise siempre el resultado</b>: la IA puede equivocarse u omitir información.</span></div>';
/* ---------- Errores ---------- */
const gmsg=(st,body)=>{ const e=body&&body.error; return 'Google: '+st+(e&&e.status?' '+e.status:'')+(e&&e.message?' — '+e.message:''); };
function errMsg(st,body){ const m=(body&&body.error&&body.error.message)||''; const r=JSON.stringify(body||{}); let t;
  if(/API_KEY_INVALID|API key not valid|API key expired/i.test(r)||st===401) t='Clave de API inválida o vencida. Revísela en Configuración → Inteligencia artificial.';
  else if(st===429) t=/limit:\s*0\b|limit 0/i.test(m)?'El modelo no tiene cuota gratuita para este proyecto (límite 0). Pruebe la conexión en Configuración para elegir otro modelo.':'Cuota excedida (429): se alcanzó el límite gratuito de solicitudes o de tokens de Gemini. Espere un minuto (o hasta mañana si es el límite diario) e intente de nuevo.';
  else if(st===404||/not found|not supported for generateContent|is not available|no longer available|access to (this|the) model/i.test(m)) t='Modelo no disponible para esta clave ('+LM.gemModel()+').';
  else if(st===403) t='Acceso denegado (403): la clave no tiene permiso para la API de Gemini o está restringida.';
  else if(/token|too long|exceeds|size/i.test(m)&&(st===400||st===413)) t='El texto es demasiado largo para el modelo. Reduzca los documentos o divídalos.';
  else if(st>=500) t='Google está saturado o no disponible en este momento para este modelo.';
  else t='Error de Gemini.';
  return t+'\n['+gmsg(st,body)+']'; }
const isModelErr=(st,body)=>{ const m=(body&&body.error&&body.error.message)||''; if(/API_KEY_INVALID|API key not valid/i.test(JSON.stringify(body||{}))) return false;
  return st===404||(st===429&&/limit:\s*0\b/i.test(m))||((st===400||st===403)&&/model|not found|not supported|not available/i.test(m)); };
/* Trabajo en curso: señal de cancelación, plazo total y tiempo máximo por solicitud */
let JOB=null; const cancelErr=()=>{ const e=new Error('Operación cancelada.'); e.cancel=true; return e; };
async function call(url,opt,tmo){ if(navigator.onLine===false) throw new Error('Sin conexión a internet. Conéctese e intente de nuevo.');
  const job=JOB; if(job&&job.signal&&job.signal.aborted) throw cancelErr();
  tmo=tmo||(job?job.tmo:15000);
  const ac=new AbortController(); let why=''; const t=setTimeout(()=>{ why='timeout'; ac.abort(); },tmo);
  const onC=()=>{ why='cancel'; ac.abort(); }; job&&job.signal&&job.signal.addEventListener('abort',onC);
  let res, body=null;
  try{ try{ res=await fetch(url,Object.assign({},opt,{signal:ac.signal})); }
    catch(e){ if(why==='cancel') throw cancelErr(); if(why==='timeout'){ const er=new Error('Google no respondió en '+Math.round(tmo/1000)+' s.'); er.timeout=true; throw er; } throw new Error('No se pudo conectar con Gemini (sin conexión o bloqueado por la red).'); }
    try{ body=await res.json(); }catch(e){ if(why==='cancel') throw cancelErr(); if(why==='timeout'){ const er=new Error('Google no terminó de responder en '+Math.round(tmo/1000)+' s.'); er.timeout=true; throw er; } }
  } finally{ clearTimeout(t); job&&job.signal&&job.signal.removeEventListener('abort',onC); }
  if(!res.ok){ const er=new Error(errMsg(res.status,body)); er.status=res.status; er.body=body; er.model=isModelErr(res.status,body); er.rate=res.status===429&&!er.model; er.transient=[500,502,503,504].includes(res.status)||/overload|high demand|UNAVAILABLE|try again later/i.test(JSON.stringify(body||{})); throw er; } return body; }
/* Lista real de modelos de la clave que admiten generateContent, ordenados por preferencia */
LM.gemList=async function(key){ let out=[], tok='';
  for(let n=0;n<5;n++){ const b=await call(API.replace(/\/$/,'')+'?pageSize=1000&key='+encodeURIComponent(key)+(tok?'&pageToken='+encodeURIComponent(tok):''),undefined,15000); (b.models||[]).forEach(m=>out.push(m)); tok=b.nextPageToken; if(!tok) break; }
  const ok=out.filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>({id:String(m.name).replace(/^models\//,''),n:m.displayName||m.name})).filter(m=>/gemini/i.test(m.id)&&!BAD.test(m.id));
  const rank=id=>{ const i=PREF.indexOf(id); if(i>=0) return i; return 100+(/flash/.test(id)?0:50)+(/preview|exp/.test(id)?20:0)+(/lite/.test(id)?0:5)-((parseFloat((id.match(/gemini-(\d+(?:\.\d+)?)/)||[])[1])||0)); };
  return ok.sort((a,b)=>rank(a.id)-rank(b.id)); };
LM.gemPick=async function(key,exclude){ const L=await LM.gemList(key); const c=L.find(m=>!(exclude||[]).includes(m.id)); if(!c) throw new Error('Su clave no tiene ningún modelo Gemini de texto disponible.'); return {pick:c.id,list:L}; };
const KOK='lm_gemini_ok'; const okModel=m=>{ try{ localStorage.setItem(KOK,JSON.stringify({m,t:Date.now()})); }catch(e){} };
const recentOk=()=>{ try{ const o=JSON.parse(localStorage.getItem(KOK)||'null'); return o&&Date.now()-o.t<6*3600*1000?o.m:null; }catch(e){ return null; } };
/* 429: ¿cuota diaria? ¿cuántos segundos esperar? (RetryInfo.retryDelay o 'retry in Ns') */
function quotaInfo(body){ const e=(body&&body.error)||{}; const det=e.details||[]; const txt=JSON.stringify(det)+' '+(e.message||'');
  let wait=null; const ri=det.find(d=>/RetryInfo/.test(d['@type']||'')); if(ri&&ri.retryDelay) wait=parseFloat(ri.retryDelay);
  if(wait==null){ const m=(e.message||'').match(/retry in ([\d.]+)\s*s/i); if(m) wait=parseFloat(m[1]); }
  return {daily:/PerDay|per day|daily/i.test(txt),wait}; }
const sleep=ms=>new Promise((ok,ko)=>{ const job=JOB; if(job&&job.signal&&job.signal.aborted) return ko(cancelErr()); const t=setTimeout(()=>{ job&&job.signal&&job.signal.removeEventListener('abort',c); ok(); },ms); const c=()=>{ clearTimeout(t); ko(cancelErr()); }; job&&job.signal&&job.signal.addEventListener('abort',c); });
LM.gemOnStatus=null; const status=t=>{ try{ LM.gemOnStatus&&LM.gemOnStatus(t); }catch(e){} };
const T_FIRST=()=>window.LM_TEST_FIRST||20000, T_TOTAL=()=>window.LM_TEST_TOTAL||180000, MAXM=3;
/* Razonamiento ("thinking") al mínimo: es la principal causa de lentitud en el plan gratuito */
function thinkCfg(model){ if(/^gemini-(3|flash-latest|flash-lite-latest)/.test(model)) return {thinkingLevel:/3\.8|flash-latest|pro/.test(model)?'low':'minimal'}; if(/^gemini-2\.5-flash/.test(model)) return {thinkingBudget:0}; return null; }
/* Una llamada en streaming (SSE). El plazo corre hasta el primer fragmento; luego se deja terminar (tope total) */
async function stream1(key,model,prompt,gc,onText,noThink){ if(navigator.onLine===false) throw new Error('Sin conexión a internet. Conéctese e intente de nuevo.');
  const job=JOB; if(job&&job.signal&&job.signal.aborted) throw cancelErr();
  const cfg=Object.assign({temperature:0.2,maxOutputTokens:4096},gc||{}); const th=noThink?null:thinkCfg(model); if(th) cfg.thinkingConfig=th;
  const ac=new AbortController(); let why=''; let t=setTimeout(()=>{ why='first'; ac.abort(); },T_FIRST()); const tAll=setTimeout(()=>{ why='total'; ac.abort(); },T_TOTAL());
  const onC=()=>{ why='cancel'; ac.abort(); }; job&&job.signal&&job.signal.addEventListener('abort',onC);
  let text='', finish='', block='', got=false;
  const fail=e=>{ if(why==='cancel') return cancelErr(); if(why==='first'){ const er=new Error(model+' no empezó a responder en '+Math.round(T_FIRST()/1000)+' s.'); er.timeout=true; return er; } if(why==='total'){ const er=new Error('La respuesta superó el tiempo máximo ('+Math.round(T_TOTAL()/1000)+' s).'); er.partial=text; return er; } return e; };
  try{ let res; try{ res=await fetch(API+encodeURIComponent(model)+':streamGenerateContent?alt=sse&key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:cfg}),signal:ac.signal}); }
    catch(e){ throw fail(new Error('No se pudo conectar con Gemini (sin conexión o bloqueado por la red).')); }
    if(!res.ok){ let body=null; try{ const raw=await res.text(); body=JSON.parse(raw); if(Array.isArray(body)) body=body[0]; }catch(e){ if(why) throw fail(e); }
      if(!noThink&&th&&res.status===400&&/thinking/i.test(JSON.stringify(body||{}))){ clearTimeout(t); clearTimeout(tAll); return stream1(key,model,prompt,gc,onText,true); }
      const er=new Error(errMsg(res.status,body)); er.status=res.status; er.body=body; er.model=isModelErr(res.status,body); er.rate=res.status===429&&!er.model; er.transient=[500,502,503,504].includes(res.status)||/overload|high demand|UNAVAILABLE/i.test(JSON.stringify(body||{})); throw er; }
    const rd=res.body.getReader(), dec=new TextDecoder(); let buf='';
    const handle=ev=>{ const data=ev.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join(''); if(!data) return; let j; try{ j=JSON.parse(data); }catch(e){ return; }
      if(j.error){ const er=new Error(errMsg(j.error.code||500,j)); er.transient=true; er.partial=text; throw er; }
      const c=j.candidates&&j.candidates[0]; if(j.promptFeedback&&j.promptFeedback.blockReason) block=j.promptFeedback.blockReason;
      if(c){ (c.content&&c.content.parts||[]).forEach(p=>{ if(!p.thought&&p.text){ text+=p.text; } }); if(c.finishReason) finish=c.finishReason; }
      if(!got){ got=true; clearTimeout(t); status('Recibiendo respuesta de '+model+'…'); }
      onText&&onText(text); };
    for(;;){ let r; try{ r=await rd.read(); }catch(e){ throw fail(new Error('Se interrumpió la conexión con Gemini.')); } if(r.done) break;
      buf+=dec.decode(r.value,{stream:true}).replace(/\r/g,''); let i; while((i=buf.indexOf('\n\n'))>=0){ handle(buf.slice(0,i)); buf=buf.slice(i+2); } }
    if(buf.trim()) handle(buf);
  } catch(e){ if(e&&e.partial===undefined&&text) e.partial=text; throw e; }
  finally{ clearTimeout(t); clearTimeout(tAll); job&&job.signal&&job.signal.removeEventListener('abort',onC); }
  if(!text){ const er=new Error('Gemini no devolvió texto ('+(block||finish||'respuesta vacía')+').'+(block?' Ajuste el contenido e intente de nuevo.':'')); er.empty=true; throw er; }
  return {text,finish,model}; }
/* Orden: modelo que funcionó recientemente, luego lista real (lite primero); máximo 3 modelos por intento, cada uno con su propio plazo */
async function withFallback(key,prompt,opt){ opt=opt||{}; let list=null; const getList=async()=>list=list||await LM.gemList(key);
  const cur=LM.gemModel(), rec=recentOk(); let L=[]; try{ L=(await getList()).map(m=>m.id); }catch(e){ if(e.cancel||/inválida|API key/i.test(e.message)) throw e; }
  let order=[]; const add=m=>{ if(m&&m!=='auto'&&!order.includes(m)&&(!L.length||L.includes(m))) order.push(m); };
  add(cur); add(rec); L.forEach(add); if(!order.length&&!L.length) order=[cur!=='auto'?cur:PREF[0]];
  if(!order.length) throw new Error('Su clave no tiene ningún modelo Gemini de texto disponible.');
  order=order.slice(0,MAXM); const tried=[]; let lastErr=null, partial='';
  for(const model of order){ tried.push(model); const nx=order[tried.length];
    for(let a=0;a<2;a++){
      try{ status((tried.length>1||a?'Probando con ':'Conectando con ')+model+'… (esperando primer fragmento, máx. '+Math.round(T_FIRST()/1000)+' s)'); const r=await stream1(key,model,prompt,opt.gc,opt.onText); okModel(model); r.list=list; return r; }
      catch(e){ lastErr=e; if(e.cancel) throw e; if(e.partial&&e.partial.length>partial.length) partial=e.partial;
        if(e.partial&&e.partial.length>200){ okModel(model); return {text:e.partial+'\n\n> ⚠ La respuesta se interrumpió: '+e.message.split('\n')[0],model,list}; }
        if(e.rate&&a===0){ const q=quotaInfo(e.body); if(!q.daily&&q.wait!=null&&q.wait<=30){ for(let k=Math.ceil(q.wait)+1;k>0;k--){ status('Límite por minuto de Google, reintentando en '+k+' s… ('+model+')'); await sleep(1000); } continue; } e.switchQ=q.daily?'Cuota diaria agotada':'Límite por minuto de Google'; break; }
        if(e.transient&&a===0){ status('Google está saturado, reintentando en 2 s… ('+model+')'); await sleep(2000); continue; }
        break; } }
    if(!(lastErr.transient||lastErr.model||lastErr.rate||lastErr.timeout||lastErr.empty)) throw lastErr;
    if(nx){ status((lastErr.switchQ||(lastErr.timeout?model+' no respondió a tiempo':lastErr.transient?'Google saturado':lastErr.empty?'Respuesta vacía':'Modelo no disponible'))+'; cambiando a '+nx+'…'); } }
  const lit=(lastErr.message.match(/\[Google:[^\]]*\]/)||[''])[0];
  throw new Error((lastErr.rate?'Se alcanzaron los límites gratuitos de Google':lastErr.timeout?'Ningún modelo empezó a responder a tiempo':lastErr.transient?'Google está saturado':'No se obtuvo respuesta')+' (modelos probados: '+tried.join(', ')+'). Intente de nuevo en unos minutos'+(lastErr.rate?' (o mañana si es la cuota diaria)':'')+'.\nÚltimo error: '+lastErr.message.split('\n')[0]+(lit?'\n'+lit:'')); }
LM.gemTest=async function(key,signal){ JOB={signal,tmo:15000}; try{ const ok=recentOk(), cur=LM.gemModel();
  if(ok&&(cur==='auto'||cur===ok)){ const list=await LM.gemList(key); if(list.some(m=>m.id===ok)){ return {model:ok,list,cached:true}; } }
  const r=await withFallback(key,'Responde solo: OK',{gc:{maxOutputTokens:16}}); const list=r.list||await LM.gemList(key); return {model:r.model,list}; }finally{ JOB=null; } };
LM.gemRun=async function(prompt,signal,onText){ const key=LM.gemKey(); if(prompt.length>MAXC) throw new Error('El texto es demasiado largo ('+Math.round(prompt.length/1000)+' mil caracteres; máximo '+MAXC/1000+' mil). Reduzca los documentos o divídalos.');
  JOB={signal,tmo:15000}; let r; try{ r=await withFallback(key,prompt,{onText}); }finally{ JOB=null; }
  return r.text+(r.finish==='MAX_TOKENS'?'\n\n> ⚠ Respuesta cortada por longitud máxima.':''); };
/* ---------- Markdown mínimo y seguro ---------- */
function inl(s){ return E(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/__([^_]+)__/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<i>$2</i>'); }
LM.md=function(src){ const L=String(src).replace(/\r/g,'').split('\n'); let h='',i=0;
  const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
  while(i<L.length){ const l=L[i];
    if(/^```/.test(l)){ let b=[]; i++; while(i<L.length&&!/^```/.test(L[i])) b.push(L[i++]); i++; h+='<pre>'+E(b.join('\n'))+'</pre>'; continue; }
    if(/^\s*\|/.test(l)&&i+1<L.length&&/^\s*\|?\s*:?-{2,}/.test(L[i+1])){ const hd=cells(l); i+=2; let rows=[]; while(i<L.length&&/^\s*\|/.test(L[i])) rows.push(cells(L[i++]));
      h+='<div class="md-table"><table><thead><tr>'+hd.map(c=>'<th>'+inl(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+inl(c).replace(/&lt;br\s*\/?&gt;/g,'<br>')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'; continue; }
    let m;
    if((m=l.match(/^(#{1,6})\s+(.*)/))){ const n=Math.min(m[1].length+1,4); h+='<h'+n+'>'+inl(m[2])+'</h'+n+'>'; i++; continue; }
    if(/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(l)){ h+='<hr>'; i++; continue; }
    if(/^>\s?/.test(l)){ let b=[]; while(i<L.length&&/^>\s?/.test(L[i])) b.push(L[i++].replace(/^>\s?/,'')); h+='<blockquote>'+b.map(inl).join('<br>')+'</blockquote>'; continue; }
    if(/^\s*([-*+]|\d+[.)])\s+/.test(l)){ const ol=/^\s*\d/.test(l); let b=[]; while(i<L.length&&/^\s*([-*+]|\d+[.)])\s+/.test(L[i])) b.push(L[i++].replace(/^\s*([-*+]|\d+[.)])\s+/,'')); h+=(ol?'<ol>':'<ul>')+b.map(x=>'<li>'+inl(x)+'</li>').join('')+(ol?'</ol>':'</ul>'); continue; }
    if(!l.trim()){ i++; continue; }
    let b=[]; while(i<L.length&&L[i].trim()&&!/^(#{1,6}\s|```|>|\s*\||\s*([-*+]|\d+[.)])\s)/.test(L[i])) b.push(L[i++]); if(!b.length) b.push(L[i++]); h+='<p>'+b.map(inl).join('<br>')+'</p>'; }
  return h; };
/* ---------- Lectura de archivos ---------- */
const CDN={pdf:'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',pdfw:'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',docx:'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'};
const loaded={}; function load(u){ return loaded[u]=loaded[u]||new Promise((ok,ko)=>{ const s=document.createElement('script'); s.src=u; s.onload=ok; s.onerror=()=>{ delete loaded[u]; ko(new Error('no se pudo descargar el lector (¿sin conexión?)')); }; document.head.appendChild(s); }); }
LM.readDoc=async function(f){ const n=f.name.toLowerCase();
  if(/\.(txt|md|csv)$/.test(n)||f.type.startsWith('text/')) return await f.text();
  if(/\.pdf$/.test(n)){ await load(CDN.pdf); const pj=window.pdfjsLib; pj.GlobalWorkerOptions.workerSrc=CDN.pdfw;
    const pdf=await pj.getDocument({data:await f.arrayBuffer()}).promise; let out=[];
    for(let k=1;k<=pdf.numPages;k++){ const pg=await pdf.getPage(k); const tc=await pg.getTextContent(); out.push('[Página '+k+']\n'+tc.items.map(it=>it.str+(it.hasEOL?'\n':' ')).join('')); }
    const t=out.join('\n\n'); if(t.replace(/\[Página \d+\]|\s/g,'').length<20) throw new Error('el PDF no tiene texto seleccionable (parece escaneado). Use un PDF con texto o pegue el contenido'); return t; }
  if(/\.docx$/.test(n)){ await load(CDN.docx); const r=await window.mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()}); return r.value; }
  if(/\.doc$/.test(n)) throw new Error('el formato .doc antiguo no es compatible; guárdelo como .docx o PDF');
  throw new Error('formato no compatible (use .txt, .pdf o .docx)'); };
/* ---------- Resultados de ejemplo (simulación) ---------- */
const SIM={
 comparar:'## COMPARACIÓN DE DOCUMENTOS (EJEMPLO)\n\n### 1. Coincidencias\n| Tema | Documento A (cita textual) | Documento B (cita textual) | Observación |\n|---|---|---|---|\n| Fecha del acto | "Resolución 123 del 5 de marzo de 2025" (hecho 2) | "la Resolución 123 del 5 de marzo de 2025" (num. 2) | Ambos coinciden |\n\n### 2. Diferencias\n| Tema | Documento A | Documento B | Observación |\n|---|---|---|---|\n| Notificación | "notificada el 10 de marzo" (hecho 3) | "notificada el 7 de marzo" (num. 3) | Fechas distintas [VERIFICAR] |\n| Cuantía | "$45.000.000" (pretensión 2) | No consta | El documento B no se pronuncia |\n\n### 3. Hechos\n- Hecho 1: **aceptado**.\n- Hecho 3: **negado** parcialmente (fecha de notificación).\n- Hecho 4: **no contestado**.\n\n### 5. Resumen\nEl punto en disputa más relevante es la fecha de notificación, que incide en la caducidad.\n\n### PUNTOS A VERIFICAR POR EL ABOGADO\n- Constancia de notificación de la Resolución 123.',
 contradicciones:'## CONTRADICCIONES DETECTADAS (EJEMPLO)\n\n| N.º | Tipo | Ubicación textual | Descripción | Importancia |\n|---|---|---|---|---|\n| 1 | Fechas inconsistentes | "radicó la petición el 2 de mayo" (hecho 4) vs. "petición del 12 de mayo" (hecho 7) | La misma petición aparece con dos fechas | alta |\n| 2 | Hecho sin prueba | "fue desvinculado sin aviso previo" (hecho 5) | No se relaciona prueba que lo soporte | media |\n| 3 | Prueba no relacionada | "certificado de tradición" (prueba 6) | No se vincula con ningún hecho | baja |\n\n**Fundamentos que no corresponden:** No se encontraron en el documento.\n\n### PUNTOS A VERIFICAR POR EL ABOGADO\n- Fecha real de radicación de la petición.',
 def:'## BORRADOR GENERADO (EJEMPLO)\n\n### ENCABEZADO\nDespacho: No consta · Radicado: [RADICADO]\n\n### DESARROLLO\n1. Hecho primero, tomado del documento entregado.\n2. Argumento propuesto **[VERIFICAR]**.\n\n### PUNTOS A VERIFICAR POR EL ABOGADO\n- Datos que no constan en los documentos.'};
/* ---------- Generar documento ---------- */
const DEMANDA='ESTRUCTURA\n1. Designación del despacho y de las partes con sus representantes.\n2. Pretensiones, numeradas.\n3. Hechos, numerados (solo los que constan).\n4. Normas violadas y concepto de la violación (citas textuales o [norma por verificar]).\n5. Pruebas que se aportan y que se solicitan.\n6. Estimación razonada de la cuantía (si no consta, [COMPLETAR: cuantía]).\n7. Anexos y notificaciones.';
function genTypes(){ const T=LM.TPL||{}, P=LM.PROMPTS||[]; const L=Object.keys(T).map(k=>({k:'tpl:'+k,n:T[k].n,src:'Borradores'}));
  L.push({k:'demanda',n:'Demanda (medio de control del proceso)'});
  P.filter(x=>['contestacion','reposicion','apelacion','tutela','concepto'].includes(x[0])).forEach(x=>L.push({k:'p:'+x[0],n:x[1]})); return L; }
const RGEN='REGLAS OBLIGATORIAS\n1. Usa SOLO los datos que te entrego. Nunca inventes nombres, fechas, radicados, cifras, normas ni jurisprudencia.\n2. Todo dato que falte márcalo exactamente así: [COMPLETAR: descripción del dato] (por ejemplo [COMPLETAR: fecha de notificación]).\n3. Las citas normativas solo si el texto está en lo que te entrego; si no, escribe [norma por verificar: …].\n4. Distingue hechos (datos del proceso) de argumentos.\n5. Al final, agrega la sección "PUNTOS A VERIFICAR POR EL ABOGADO".';
LM.genPrompt=function(tk,p,extra,anon){ const C=LM.state.config, c=LM.cli(p.clienteId)||{}; let base='', role='Actúa como abogado(a) litigante en derecho administrativo colombiano. Redacta un BORRADOR completo de ';
  const t=genTypes().find(x=>x.k===tk)||{n:tk};
  if(tk.indexOf('tpl:')===0){ let m=LM.TPL[tk.slice(4)].t(p,c,C); if(anon){ m=m.split(c.nombre||'\u0000').join('[CLIENTE]').split(p.radicado||'\u0000').join('[RADICADO]').split(LM.fmtRad(p.radicado)).join('[RADICADO]'); } base='MODELO DE REFERENCIA DE LA FIRMA (respeta su estructura y mejora la redacción; completa con los datos del proceso):\n"""\n'+m+'\n"""'; }
  else if(tk==='demanda') base=DEMANDA;
  else { const x=LM.PROMPTS.find(q=>q[0]===tk.slice(2)); role=x[2]+' Redacta el documento completo: '; base=x[3]; }
  return role+t.n.toUpperCase()+'.\n\n'+RGEN+'\n\n'+base+'\n\n'+LM.datosProceso(p,anon)+'\nDATOS DE LA FIRMA\n- Abogado(a): '+(C.abogado||'[COMPLETAR: abogado]')+'\n- Tarjeta profesional: '+(C.tp||'[COMPLETAR: T.P.]')+'\n- Correo: '+(C.email||'[COMPLETAR: correo]')+'\n- Ciudad: '+(C.ciudad||'[COMPLETAR: ciudad]')+'\n\n'+(extra?'INSTRUCCIONES ADICIONALES DEL ABOGADO\n'+extra+'\n\n':'')+'FORMATO DE SALIDA\nMarkdown: títulos con ## para cada sección, **negrita** para lo destacado y listas numeradas. Español jurídico formal, listo para revisión.'; };
function simGen(tk,p){ const c=LM.cli(p.clienteId)||{}; let body;
  if(tk.indexOf('tpl:')===0) body=LM.TPL[tk.slice(4)].t(p,c,LM.state.config).replace(/^_{3,}.*$/gm,'[COMPLETAR: firma]');
  else body='## ENCABEZADO\nSeñores\n'+(p.despacho||'[COMPLETAR: despacho]')+'\nRadicado: '+LM.fmtRad(p.radicado)+'\n\n## HECHOS\n1. '+(p.resumen||'[COMPLETAR: hechos]')+'\n2. [COMPLETAR: fecha de notificación del acto]\n\n## PETICIONES\n1. [COMPLETAR: petición concreta]';
  return '> SIMULACIÓN: texto de ejemplo armado con la plantilla; no lo redactó la IA.\n\n'+body+'\n\n## PUNTOS A VERIFICAR POR EL ABOGADO\n- Revise cada [COMPLETAR: …] antes de radicar.'; }
/* ---------- Panel de IA (dos modos) ---------- */
LM.iaAttach=function(el,getKey,getPid,getPrompt,getTitle){ const box=document.createElement('div'); box.className='card'; box.id='ia-run'; box.style.marginTop='1rem'; el.appendChild(box);
  const docs={A:'',B:''}; let last=null, mode='analizar', gk=genTypes()[0].k, extra='', gp=null, ganon=true;
  const slot=(id,t)=>'<div class="ia-doc"><label for="ia-d'+id+'">'+t+'</label><textarea id="ia-d'+id+'" data-d="'+id+'" style="min-height:120px" placeholder="Pegue aquí el texto ANONIMIZADO…">'+E(docs[id])+'</textarea><div class="row"><label class="btn sm" for="ia-f'+id+'" style="margin:0">📎 Subir archivo (.txt, .pdf, .docx)</label><input type="file" id="ia-f'+id+'" data-f="'+id+'" accept=".txt,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="hide"><span class="small muted" id="ia-s'+id+'"></span></div></div>';
  const draw=()=>{ const key=getKey(), two=key==='comparar', has=!!LM.gemKey(); gp=gp||getPid();
    const modes='<div class="subnav" role="tablist" aria-label="Modo"><button class="btn sm'+(mode==='analizar'?' active primary':'')+'" data-mode="analizar" role="tab">🔍 Analizar / comparar documentos</button><button class="btn sm'+(mode==='generar'?' active primary':'')+'" data-mode="generar" role="tab">✍ Generar documento</button></div>';
    const an='<p class="small muted">Ejecuta la instrucción de arriba (<b>'+E(getTitle())+'</b>) con Google Gemini ('+E(LM.gemModel())+') sobre los documentos que cargue aquí.</p><div class="grid'+(two?' g2':'')+'">'+(two?slot('A','Documento A')+slot('B','Documento B'):slot('A',key==='contradicciones'?'Documento a revisar':'Documento(s)'))+'</div><div class="row" style="margin-top:.6rem"><button class="btn primary" id="ia-go">⚡ Analizar con IA</button><span class="small muted" id="ia-st" aria-live="polite"></span></div>';
    const ge='<p class="small muted">La IA redacta el documento con los datos registrados del proceso (partes, radicado, despacho, hechos y actuaciones) y los de la firma. Lo que falte quedará marcado como <b>[COMPLETAR: …]</b>; nunca se inventa.</p><div class="grid g2"><div><label for="ig-t">Tipo de documento</label><select id="ig-t">'+genTypes().map(x=>'<option value="'+x.k+'"'+(x.k===gk?' selected':'')+'>'+E(x.n)+(x.src?' (plantilla)':'')+'</option>').join('')+'</select></div><div><label for="ig-p">Proceso</label><select id="ig-p">'+LM.state.procesos.map(p=>'<option value="'+p.id+'"'+(p.id===gp?' selected':'')+'>'+LM.fmtRad(p.radicado).slice(0,24)+' · '+E(p.medio)+'</option>').join('')+'</select></div></div><label for="ig-x">Instrucciones adicionales (opcional)</label><textarea id="ig-x" style="min-height:80px" placeholder="Ej.: enfatizar la caducidad; tono conciliador; pedir audiencia…">'+E(extra)+'</textarea><label class="row" style="font-weight:500"><input type="checkbox" id="ig-a"'+(ganon?' checked':'')+'> Anonimizar cliente y radicado al enviar a la IA</label><div class="row" style="margin-top:.6rem"><button class="btn primary" id="ig-go">✍ Generar documento</button><span class="small muted" id="ia-st" aria-live="polite"></span></div>';
    box.innerHTML='<h2>⚡ Analizar con IA</h2>'+modes+AVISO+(has?'':'<p class="small"><span class="chip warn">Sin clave de API</span> Se mostrará un <b>resultado de ejemplo (simulación)</b>. Para usar la IA real, pegue su clave en <a href="#/config">⚙ Configuración → Inteligencia artificial</a> (se obtiene gratis en aistudio.google.com/apikey).</p>')+(mode==='generar'?ge:an)+'<div id="ia-res"></div>';
    box.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ mode=b.dataset.mode; last=null; draw(); });
    if(mode==='generar'){ box.querySelector('#ig-t').onchange=e=>gk=e.target.value; box.querySelector('#ig-p').onchange=e=>gp=e.target.value; box.querySelector('#ig-x').oninput=e=>extra=e.target.value; box.querySelector('#ig-a').onchange=e=>ganon=e.target.checked; box.querySelector('#ig-go').onclick=runGen; }
    else { box.querySelectorAll('[data-d]').forEach(t=>t.oninput=()=>docs[t.dataset.d]=t.value);
      box.querySelectorAll('[data-f]').forEach(inp=>inp.onchange=async()=>{ const f=inp.files[0], id=inp.dataset.f, s=box.querySelector('#ia-s'+id); if(!f) return; s.textContent='Leyendo '+f.name+'…';
        try{ const t=await LM.readDoc(f); docs[id]=t; box.querySelector('#ia-d'+id).value=t; s.textContent='✓ '+f.name+' ('+t.length.toLocaleString('es-CO')+' caracteres)'; }
        catch(e){ s.textContent=''; LM.toast('No se pudo leer '+f.name+': '+e.message); } inp.value=''; });
      box.querySelector('#ia-go').onclick=run; }
    if(last) show(last.text,last.sim,last.title); };
  const show=(text,sim,title)=>{ last={text,sim,title}; const r=box.querySelector('#ia-res'); let editing=false;
    r.innerHTML='<div class="row between" style="margin-top:1rem"><h3 style="margin:0">'+E(title)+(sim?' <span class="chip warn">SIMULACIÓN · ejemplo, no es un análisis real</span>':'')+'</h3><div class="row"><button class="btn sm" id="ia-ed">✎ Editar</button><button class="btn sm primary" id="ia-wd">📄 Exportar a Word</button><button class="btn sm" id="ia-cp">📋 Copiar</button><button class="btn sm" id="ia-dl">⬇ .md</button><button class="btn sm" id="ia-nt">📝 Guardar como nota</button></div></div><p class="small" style="color:#a35d00">Revise siempre el resultado antes de usarlo: la IA puede equivocarse.'+(/\[COMPLETAR/.test(text)?' Complete los campos <b>[COMPLETAR: …]</b>.':'')+'</p><textarea id="ia-txt" class="prompt-out hide" style="min-height:360px">'+E(text)+'</textarea><div class="md-out">'+LM.md(text)+'</div>';
    const ta=r.querySelector('#ia-txt'), out=r.querySelector('.md-out'), cur=()=>{ last.text=ta.value; return ta.value; };
    r.querySelector('#ia-ed').onclick=e=>{ editing=!editing; ta.classList.toggle('hide',!editing); out.classList.toggle('hide',editing); if(!editing) out.innerHTML=LM.md(cur()); e.target.textContent=editing?'👁 Vista previa':'✎ Editar'; };
    const fname=()=>(title||'Documento').replace(/\s+/g,'_')+'_'+LM.iso(LM.today());
    r.querySelector('#ia-wd').onclick=()=>LM.exportWord((sim?'':'')+cur(),fname());
    r.querySelector('#ia-cp').onclick=()=>(navigator.clipboard?navigator.clipboard.writeText(cur()):Promise.reject()).then(()=>LM.toast('Resultado copiado ✓'),()=>LM.toast('No se pudo copiar'));
    r.querySelector('#ia-dl').onclick=()=>{ LM.download(fname()+'.md',(sim?'> SIMULACIÓN: resultado de ejemplo\n\n':'')+cur(),'text/markdown'); LM.toast('Resultado descargado ✓'); };
    r.querySelector('#ia-nt').onclick=()=>{ const p=LM.proc(mode==='generar'?gp:getPid()); if(!p) return LM.toast('Seleccione un proceso');
      p.notas=(p.notas?p.notas+'\n\n':'')+'--- IA: '+title+' ('+new Date().toLocaleString('es-CO')+')'+(sim?' [SIMULACIÓN]':'')+' — revisar ---\n'+cur(); LM.save(); LM.toast('Guardado en Notas del proceso ✓'); }; };
  async function exec(prompt,simText,title,btn){ const st=box.querySelector('#ia-st');
    if(!LM.gemKey()){ st.textContent='Simulación (sin clave)'; return show(simText,true,title); }
    btn.disabled=true; const ac=new AbortController(), t0=Date.now(); let cur='Iniciando…';
    const paint=()=>{ st.innerHTML='<span class="spin" aria-hidden="true"></span> '+E(cur)+' <span class="muted">· '+Math.round((Date.now()-t0)/1000)+' s</span> <button class="btn sm danger" id="ia-cancel" type="button">✕ Cancelar</button>'; st.querySelector('#ia-cancel').onclick=()=>{ cur='Cancelando…'; ac.abort(); }; };
    LM.gemOnStatus=t=>{ cur=t; paint(); }; paint(); const tick=setInterval(paint,1000);
    try{ const t=await LM.gemRun(prompt,ac.signal,txt=>{ const r=box.querySelector('#ia-res'); let pv=r.querySelector('#ia-live'); if(!pv){ r.innerHTML='<div class="card" style="margin-top:1rem"><b>Recibiendo…</b><div id="ia-live" class="small" style="white-space:pre-wrap;max-height:50vh;overflow:auto"></div></div>'; pv=r.querySelector('#ia-live'); } pv.textContent=txt; pv.scrollTop=pv.scrollHeight; }); clearInterval(tick); st.textContent='✓ Listo ('+Math.round((Date.now()-t0)/1000)+' s)'; show(t,false,title); }
    catch(e){ clearInterval(tick); st.textContent=e.cancel?'Cancelado.':''; if(!e.cancel) box.querySelector('#ia-res').innerHTML='<div class="card" style="border-color:#c0392b;margin-top:1rem"><b>❌ No se pudo completar.</b><p class="small">'+E(e.message).replace(/\n/g,'<br>')+'</p></div>'; }
    finally{ btn.disabled=false; LM.gemOnStatus=null; } }
  function run(){ const key=getKey(), two=key==='comparar'; const A=docs.A.trim(), B=docs.B.trim();
    if(!A||(two&&!B)) return LM.toast(two?'Cargue los dos documentos (A y B)':'Cargue o pegue al menos un documento');
    const base=getPrompt().split('\n').filter(l=>!/\[Pegue aquí/.test(l)&&!/^(DOCUMENTOS?|DOCUMENTO [AB])\s*$/.test(l.trim())).join('\n');
    const prompt=base+'\n\n'+(two?'DOCUMENTO A\n"""\n'+A+'\n"""\n\nDOCUMENTO B\n"""\n'+B+'\n"""':'DOCUMENTOS\n"""\n'+A+'\n"""')+'\n\nResponde en Markdown (usa tablas Markdown cuando la estructura pida tablas).';
    exec(prompt,SIM[key]||SIM.def,getTitle(),box.querySelector('#ia-go')); }
  function runGen(){ const p=LM.proc(gp); if(!p) return LM.toast('Seleccione un proceso'); const t=genTypes().find(x=>x.k===gk);
    exec(LM.genPrompt(gk,p,extra.trim(),ganon),simGen(gk,p),t.n,box.querySelector('#ig-go')); }
  draw(); return draw; };
/* ---------- Configuración ---------- */
const origC=V.config; V.config=function(el,args){ origC(el,args); const k=LM.gemKey();
  const card='<div class="card" style="margin-top:1rem" id="cf-ia"><h2>🤖 Inteligencia artificial (Google Gemini)</h2><p class="small muted">Pegue su clave de API de Gemini para que <b>Borradores → 🤖 Instrucciones para IA → ⚡ Analizar con IA</b> analice documentos y genere escritos. Obténgala gratis en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. La clave se guarda solo en este navegador (no se exporta en el respaldo JSON ni se envía a ningún servidor distinto de Google).</p>'+AVISO+
   '<label for="cf-gk">Clave de API</label><div class="row" style="flex-wrap:nowrap"><input id="cf-gk" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" value="'+E(k)+'" style="flex:1"><button class="btn sm" id="cf-gkv" type="button" aria-label="Mostrar u ocultar clave">👁</button></div>'+
   '<label for="cf-gm">Modelo</label><select id="cf-gm"><option value="auto">Automático (el mejor disponible para su clave)</option>'+(LM.gemModel()!=='auto'?'<option value="'+E(LM.gemModel())+'" selected>'+E(LM.gemModel())+'</option>':'')+'<option value="__otro">Otro (escribir)…</option></select><input id="cf-gmo" class="hide" placeholder="p. ej. gemini-3.8-flash" style="margin-top:.4rem"><p class="small muted">Pulse «Probar conexión» para cargar la lista real de modelos de su clave.</p>'+
   '<div class="row" style="margin-top:.6rem"><button class="btn primary" id="cf-gs">💾 Guardar clave</button><button class="btn" id="cf-gt">🔌 Probar conexión</button><button class="btn danger" id="cf-gd">🗑 Borrar clave</button></div><p class="small" id="cf-gmsg">'+(k?'<span class="chip ok">Clave guardada</span>':'<span class="chip">Sin clave: el análisis funciona en modo simulación</span>')+'</p></div>';
  const ab=[...el.querySelectorAll('.card')].pop(); ab.insertAdjacentHTML('beforebegin',card);
  const $=s=>el.querySelector(s), msg=h=>$('#cf-gmsg').innerHTML=h;
  const saveK=()=>{ const v=$('#cf-gk').value.trim(); let m=$('#cf-gm').value; if(m==='__otro') m=$('#cf-gmo').value.trim().replace(/^models\//,'')||DEF_MODEL; try{ v?localStorage.setItem(KK,v):localStorage.removeItem(KK); localStorage.setItem(KM,m); }catch(e){ LM.toast('No se pudo guardar en este navegador'); } return v; };
  const fill=(list,cur)=>{ const sel=$('#cf-gm'); sel.innerHTML='<option value="auto">Automático (el mejor disponible para su clave)</option>'+list.map(m=>'<option value="'+E(m.id)+'"'+(m.id===cur?' selected':'')+'>'+E(m.id)+' — '+E(m.n)+'</option>').join('')+'<option value="__otro">Otro (escribir)…</option>'; };
  $('#cf-gm').onchange=e=>{ $('#cf-gmo').classList.toggle('hide',e.target.value!=='__otro'); if(e.target.value!=='__otro') saveK(); };
  $('#cf-gkv').onclick=()=>{ const i=$('#cf-gk'); i.type=i.type==='password'?'text':'password'; };
  $('#cf-gs').onclick=()=>{ const v=saveK(); msg(v?'<span class="chip ok">Clave guardada</span>':'<span class="chip">Sin clave</span>'); LM.toast(v?'Clave guardada en este navegador ✓':'Sin clave: modo simulación'); };
  $('#cf-gt').onclick=async()=>{ const v=saveK(); if(!v) return msg('<span class="chip warn">Pegue primero una clave</span>'); const ac=new AbortController(); const cbtn=' <button class="btn sm danger" id="cf-gc" type="button">✕ Cancelar</button>'; LM.gemOnStatus=t=>{ msg('<span class="spin"></span> '+E(t)+cbtn); $('#cf-gc').onclick=()=>ac.abort(); }; LM.gemOnStatus('Probando…');
    try{ const r=await LM.gemTest(v,ac.signal); fill(r.list,LM.gemModel()); msg('<span class="chip ok">✓ Conexión correcta</span> Modelo en uso: <b>'+E(r.model)+'</b> ('+r.list.length+' modelos disponibles'+(r.cached?'; funcionó en las últimas horas, no se gastó cuota':'')+')'); }catch(e){ msg(e.cancel?'<span class="chip">Prueba cancelada</span>':'<span class="chip warn">Error</span> '+E(e.message).replace(/\n/g,'<br>')); } LM.gemOnStatus=null; };
  $('#cf-gd').onclick=()=>{ if(!confirm('¿Borrar la clave de API de este navegador?')) return; try{ localStorage.removeItem(KK); }catch(e){} $('#cf-gk').value=''; msg('<span class="chip">Clave borrada: modo simulación</span>'); LM.toast('Clave borrada'); };
};
})();
