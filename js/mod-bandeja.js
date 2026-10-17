/* Bandeja inteligente: pegar o importar correos (.eml), clasificación y extracción con IA (Gemini), asociación al proceso,
   alerta, término en la agenda y respuesta en BORRADOR editable. Nunca envía correos: solo copia o abre el cliente de correo (mailto). */
(function(){
const LM=window.LM, V=LM.views, E=LM.esc;
const CAT={notificacion:['⚖ Notificación judicial','danger'],termino:['⏱ Término o plazo','warn'],cliente:['👤 Cliente','info'],sin_importancia:['· Sin importancia','']};
const EJ=[
 {n:'Notificación de auto (Consejo de Estado)',t:'From: Secretaría Sección Quinta <secgeneral@consejodeestado.gov.co>\nTo: abogado@ejemplo.test\nSubject: NOTIFICACIÓN AUTO RADICADO 11001-03-28-000-2026-00045-00\nDate: {HOY}\n\nSeñor(a) apoderado(a):\n\nPor medio del presente se notifica el auto de fecha {AYER}, proferido dentro del medio de control de nulidad electoral con radicado 11001032800020260004500, demandante Hernán Pulido Suesca (ficticio), mediante el cual se INADMITE la demanda y se concede el término de TRES (3) DÍAS para que la parte actora la corrija, so pena de rechazo (art. 276 CPACA).\n\nEl término empezará a correr a partir del día siguiente a la recepción de este mensaje.\n\nCordialmente,\nSecretaría General (mensaje ficticio de ejemplo)'},
 {n:'Consulta de una clienta',t:'From: Mariela Toquica <mariela.t@ejemplo.test>\nTo: abogado@ejemplo.test\nSubject: ¿Qué pasó con mi tutela?\nDate: {HOY}\n\nDoctor, buenas tardes. Me llegó un correo del juzgado de Duitama diciendo que negaron la tutela contra la EPS (radicado 15238-40-03-001-2026-00218-00). No entiendo bien qué significa ni si todavía se puede hacer algo, porque el procedimiento lo necesito pronto. ¿Me puede llamar o explicarme por aquí?\n\nMil gracias,\nMariela'},
 {n:'Boletín sin importancia',t:'From: Boletín Jurídico Semanal <noticias@boletin-ejemplo.test>\nTo: abogado@ejemplo.test\nSubject: 🎉 Descuento del 40% en nuestro diplomado virtual\nDate: {HOY}\n\nAproveche esta semana el 40% de descuento en el diplomado en contratación estatal. Cupos limitados. Inscríbase hoy en nuestro sitio web.\n\nSi no desea recibir más mensajes, haga clic aquí para cancelar la suscripción.'}];
LM.bandejaEJ=EJ;
const ej=i=>EJ[i].t.replace('{HOY}',new Date().toUTCString()).replace('{AYER}',LM.fmt(LM.iso(LM.addDays(LM.today(),-1))));
/* ---- Lectura de .eml (cabeceras, multipart, quoted-printable, base64) ---- */
const dec=(b,cs)=>{ try{ return new TextDecoder(/8859|latin|1252/i.test(cs||'')?'windows-1252':'utf-8').decode(b); }catch(e){ return String.fromCharCode.apply(null,b); } };
const qp=(s,cs)=>{ const t=s.replace(/=\r?\n/g,''); const out=[]; for(let i=0;i<t.length;i++){ if(t[i]==='='&&/^[0-9A-F]{2}$/i.test(t.substr(i+1,2))){ out.push(parseInt(t.substr(i+1,2),16)); i+=2; } else out.push(t.charCodeAt(i)&255); } return dec(new Uint8Array(out),cs); };
const b64=(s,cs)=>{ try{ const r=atob(s.replace(/\s+/g,'')); return dec(Uint8Array.from(r,c=>c.charCodeAt(0)),cs); }catch(e){ return s; } };
const mimeWord=s=>String(s||'').replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi,(m,cs,enc,t)=>enc.toUpperCase()==='B'?b64(t,cs):qp(t.replace(/_/g,' '),cs));
function heads(raw){ const i=raw.search(/\r?\n\r?\n/); const h=i<0?raw:raw.slice(0,i), body=i<0?'':raw.slice(i).replace(/^\r?\n\r?\n/,''); const H={};
  h.replace(/\r?\n[ \t]+/g,' ').split(/\r?\n/).forEach(l=>{ const m=l.match(/^([\w-]+):\s*(.*)$/); if(m) H[m[1].toLowerCase()]=m[2]; }); return {H,body}; }
function part(raw){ const {H,body}=heads(raw), ct=H['content-type']||'text/plain', cs=(ct.match(/charset="?([\w-]+)/i)||[])[1], te=(H['content-transfer-encoding']||'').toLowerCase();
  const bd=(ct.match(/boundary="?([^";]+)"?/i)||[])[1];
  if(/^multipart\//i.test(ct)&&bd){ const ps=body.split('--'+bd).slice(1).filter(x=>!/^--/.test(x)).map(part); return ps.find(p=>p.plain)||ps.find(p=>p.text)||{text:''}; }
  let t=te==='base64'?b64(body,cs):te==='quoted-printable'?qp(body,cs):body;
  if(/text\/html/i.test(ct)) return {text:t.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?>|<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&'),plain:false};
  return {text:t,plain:/text\/plain/i.test(ct)||!H['content-type']}; }
LM.parseEmail=function(raw){ raw=String(raw||''); const {H}=heads(raw); const has=/^(from|subject|to|date):/im.test(raw.slice(0,2000));
  if(!has) return {de:'',para:'',asunto:'',fecha:'',cuerpo:raw.trim()};
  return {de:mimeWord(H.from||''),para:mimeWord(H.to||''),asunto:mimeWord(H.subject||''),fecha:H.date||'',cuerpo:String(part(raw).text||'').replace(/\r/g,'').trim()}; };
const addr=s=>((String(s).match(/<([^>]+)>/)||[])[1]||(String(s).match(/[\w.+-]+@[\w.-]+/)||[''])[0]).trim();
const digits=s=>String(s||'').replace(/\D/g,'');
/* Busca radicados de 23 dígitos (con o sin guiones/puntos/espacios) */
LM.findRads=function(t){ const out=new Set(); (String(t).match(/\d[\d\s.\-]{20,40}\d/g)||[]).forEach(m=>{ const d=digits(m); if(d.length===23) out.add(d); }); return [...out]; };
function asociar(m,rad){ const S=LM.state; const r=digits(rad); let p=r.length>=20&&S.procesos.find(x=>digits(x.radicado)===r);
  if(!p){ for(const x of LM.findRads(m.asunto+' '+m.cuerpo)){ p=S.procesos.find(y=>digits(y.radicado)===x); if(p) break; } }
  if(!p){ const a=addr(m.de).toLowerCase(); const c=a&&S.clientes.find(c=>(c.email||'').toLowerCase()===a); if(c){ const L=S.procesos.filter(x=>x.clienteId===c.id&&x.estado!=='Terminado'); p=L.find(x=>/tutela/i.test(m.cuerpo)&&/tutela/i.test(x.medio))||L[0]; } }
  return p||null; }
/* ---- Prompt y simulación ---- */
LM.bandejaPrompt=function(m){ const S=LM.state; const lista=S.procesos.filter(p=>p.estado!=='Terminado').slice(0,40).map(p=>'- '+digits(p.radicado)+' | '+p.medio+' | '+(p.demandante||'')+' vs '+(p.demandado||'')).join('\n');
  return 'Eres el asistente de un abogado litigante en derecho administrativo colombiano. Analiza el correo y responde SOLO con un objeto JSON válido (sin texto adicional ni ```), con esta forma:\n'+
  '{"categoria":"notificacion|termino|cliente|sin_importancia","prioridad":"alta|media|baja","resumen":"1-2 frases","radicado":"23 dígitos o vacío","fechas":[{"fecha":"AAAA-MM-DD","descripcion":"..."}],'+
  '"termino":{"hay":true,"descripcion":"...","dias":3,"tipo":"habiles|calendario","desde":"AAAA-MM-DD","vence":"AAAA-MM-DD o vacío"},"accion":"qué debe hacer el abogado","respuesta":{"asunto":"...","cuerpo":"borrador de respuesta cordial y profesional en español, firmado como '+(S.config.abogado||'el apoderado')+'"}}\n'+
  'Reglas: "notificacion" = mensaje de un despacho judicial, secretaría o entidad notificando una providencia; "termino" = el mensaje se centra en un plazo o vencimiento; "cliente" = escribe un cliente o tercero interesado; "sin_importancia" = publicidad, boletines o mensajes sin acción. '+
  'Si el término corre "a partir del día siguiente" de la recepción, "desde" es la fecha del correo. No inventes radicados ni fechas: deja vacío lo que no esté en el correo. Para sin_importancia la respuesta puede quedar vacía. Para una notificación, el borrador es un acuse de recibo al despacho. Hoy es '+LM.iso(LM.today())+'.\n'+
  'Procesos del abogado (radicado | medio | partes):\n'+lista+'\n\nCORREO\nDe: '+m.de+'\nPara: '+m.para+'\nFecha: '+m.fecha+'\nAsunto: '+m.asunto+'\n\n'+m.cuerpo.slice(0,20000); };
const fechaCorreo=m=>{ const d=new Date(m.fecha); return isNaN(d)?LM.iso(LM.today()):LM.iso(d); };
function simular(m){ const t=(m.asunto+' '+m.cuerpo).toLowerCase(), rad=LM.findRads(m.asunto+' '+m.cuerpo)[0]||'';
  const num={un:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,diez:10,quince:15}; const tm=t.match(/(?:t[ée]rmino|plazo)[^.]{0,60}?\b(\d{1,2}|uno|dos|tres|cuatro|cinco|diez|quince)\b[^.]{0,6}\(?\d*\)?\s*d[ií]as(\s+h[áa]biles)?/);
  const cat=/descuento|suscripci|promoci|diplomado|boletín|webinar/.test(t)?'sin_importancia':/notifica|providencia|auto |secretar[ií]a|despacho/.test(t)&&/gov\.co|rama|consejo|juzgado|tribunal/.test(t+m.de.toLowerCase())?'notificacion':/vence|t[ée]rmino|plazo/.test(t)?'termino':'cliente';
  const dias=tm?(num[tm[1]]||parseInt(tm[1],10)):0; const n=(m.de.match(/^\s*"?([^"<]+?)"?\s*</)||[])[1]||'';
  return {categoria:cat,prioridad:cat==='sin_importancia'?'baja':cat==='cliente'?'media':'alta',resumen:cat==='sin_importancia'?'Mensaje publicitario o informativo; no requiere acción.':(m.asunto||'Correo')+' (análisis simulado sin IA).',radicado:rad,fechas:[],
   termino:dias?{hay:true,descripcion:'Término de '+dias+' días'+(tm[2]?' hábiles':''),dias,tipo:'habiles',desde:fechaCorreo(m),vence:''}:{hay:false},accion:cat==='notificacion'?'Revisar la providencia y agendar el vencimiento.':cat==='cliente'?'Responder al cliente.':'Ninguna.',
   respuesta:cat==='sin_importancia'?{asunto:'',cuerpo:''}:cat==='notificacion'?{asunto:'Acuse de recibo – '+m.asunto,cuerpo:'Respetados señores:\n\nAcuso recibo de la notificación remitida'+(rad?' dentro del proceso '+LM.fmtRad(rad):'')+'.\n\nCordialmente,\n'+(LM.state.config.abogado||'Apoderado(a)')}:{asunto:'Re: '+m.asunto,cuerpo:'Hola'+(n?' '+n.split(' ')[0]:'')+', buen día.\n\nRecibí su mensaje. Ya revisé el estado del proceso y le explico los pasos a seguir; si prefiere, la llamo hoy en la tarde.\n\nCordialmente,\n'+(LM.state.config.abogado||'Apoderado(a)')},simulado:true}; }
const parseJSON=t=>{ const s=String(t).replace(/```json|```/g,''); const a=s.indexOf('{'), b=s.lastIndexOf('}'); if(a<0||b<a) throw new Error('La IA no devolvió JSON'); return JSON.parse(s.slice(a,b+1)); };
LM.bandejaAnalizar=async function(m,signal){ if(!LM.iaReady()) return simular(m); const t=await LM.gemRun(LM.bandejaPrompt(m),signal,()=>{}); const r=parseJSON(t); if(!CAT[r.categoria]) r.categoria='cliente'; r.respuesta=r.respuesta||{asunto:'',cuerpo:''}; r.termino=r.termino||{hay:false}; return r; };
/* Calcula el vencimiento si la IA dio días pero no fecha (días hábiles con festivos de Colombia del calendario de LexMonitor) */
function vence(r,m){ const T=r.termino; if(!T||!T.hay) return ''; if(T.vence&&/^\d{4}-\d{2}-\d{2}$/.test(T.vence)) return T.vence; const n=parseInt(T.dias,10); if(!n) return ''; const d=/^\d{4}-\d{2}-\d{2}$/.test(T.desde||'')?T.desde:fechaCorreo(m);
  return T.tipo==='calendario'?LM.iso(LM.addDays(LM.parse(d),n)):LM.addHabiles(d,n); }
function crearAlerta(b){ const S=LM.state; const r=b.r, p=LM.proc(b.procesoId); const now=new Date(), hh=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    const a={id:LM.uid(),fecha:LM.iso(LM.today())+'T'+hh,procesoId:b.procesoId,titulo:'Correo · '+(CAT[r.categoria]||CAT.cliente)[0].replace(/^\S+\s/,'')+': '+(b.m.asunto||'').slice(0,90),texto:(r.resumen||'')+(b.vence?' Vence: '+LM.fmt(b.vence)+'.':''),leida:false,nivel:r.prioridad==='alta'?'alta':r.prioridad==='baja'?'baja':'media',fuente:'Bandeja inteligente'};
    S.alertas.push(a); b.alertaId=a.id;
    if(p&&b.vence&&!b.eventoId){ const ev={id:LM.uid(),fecha:b.vence,tipo:'vencimiento',titulo:(r.termino.descripcion||'Vence término')+' (correo)',preparada:false}; p.eventos=p.eventos||[]; p.eventos.push(ev); b.eventoId=ev.id; } }
/* Ingresa un correo analizado (pegado o traído del buzón conectado) a la bandeja local: asociación, vencimiento y alerta */
LM.bandejaIngresar=function(m,r,srv){ const S=LM.state; S.bandeja=S.bandeja||[]; if(srv&&S.bandeja.some(x=>x.srv&&x.srv.id===srv.id)) return null;
  const b={id:LM.uid(),at:new Date().toISOString(),m:{de:m.de,para:m.para||'',asunto:m.asunto,fecha:m.fecha,cuerpo:String(m.cuerpo||'').slice(0,20000)},r};
  if(srv) b.srv=srv; r.respuesta=r.respuesta||{asunto:'',cuerpo:''}; r.termino=r.termino||{hay:false}; if(!CAT[r.categoria]) r.categoria=r.categoria==='sin_clasificar'?'cliente':'cliente';
  const p=asociar(b.m,r.radicado); b.procesoId=p?p.id:null; b.vence=vence(r,b.m); if(r.categoria!=='sin_importancia') crearAlerta(b);
  S.bandeja.push(b); S.bandeja=S.bandeja.slice(-100); return b; };
LM.bandejaAbrir=id=>{ LM._bxOpen={id,msg:''}; if(/^#\/bandeja/.test(location.hash)) LM.route(); else location.hash='#/bandeja'; };
V.bandeja=function(el){ const S=LM.state; S.bandeja=S.bandeja||[];
  el.innerHTML='<h1>📥 Bandeja inteligente</h1><p class="small muted">Conecte su buzón (Gmail, Outlook o IMAP) o pegue un correo / importe un archivo <b>.eml</b>. La IA lo clasifica, extrae radicado, fechas y términos, lo asocia al proceso, crea la alerta y redacta una respuesta en <b>borrador</b>. LexMonitor <b>nunca envía correos</b>: usted revisa, copia, abre su programa de correo o guarda la respuesta en su carpeta Borradores.</p>'+
   '<div id="bx-buzon"></div><div class="card"><div class="row between"><h2>Pegar o importar un correo</h2><div class="row"><span class="small muted">Ejemplos:</span>'+EJ.map((x,i)=>'<button class="btn sm" data-ej="'+i+'">'+E(x.n)+'</button>').join('')+'</div></div>'+
   '<label>Correo (con cabeceras De/Asunto/Fecha si las tiene, o solo el texto)<textarea id="bx-raw" rows="9" placeholder="From: …&#10;Subject: …&#10;&#10;Texto del correo"></textarea></label><div class="row"><label class="btn sm" style="cursor:pointer">📎 Importar .eml / .txt<input type="file" id="bx-file" accept=".eml,.txt,message/rfc822,text/plain" hidden></label><span class="sp"></span><button class="btn primary" id="bx-go">🤖 Analizar con IA</button></div><p class="small" id="bx-st">'+(LM.iaReady()?'<span class="chip ok">IA activa</span>':'<span class="chip warn">Sin clave ni código</span> Se usará un análisis <b>simulado</b> por reglas. Active la IA en <a href="#/config">⚙ Configuración</a>.')+'</p></div>'+
   '<div id="bx-res"></div><h2 style="margin-top:1rem">Correos analizados ('+S.bandeja.length+')</h2><div class="list" id="bx-list">'+(S.bandeja.slice().reverse().map(b=>{ const c=CAT[b.r.categoria]||CAT.cliente, p=LM.proc(b.procesoId);
     return '<div class="item"><div class="row between"><b>'+E(b.m.asunto||'(sin asunto)')+'</b><span class="chip '+c[1]+'">'+c[0]+'</span></div><div class="small muted">'+E(b.m.de)+' · '+new Date(b.at).toLocaleString('es-CO')+(p?' · <a href="#/proceso/'+p.id+'">'+LM.fmtRad(p.radicado)+'</a>':'')+(b.vence?' · vence <b>'+LM.fmt(b.vence)+'</b>':'')+'</div><div class="small">'+E(b.r.resumen||'')+'</div><div class="row" style="margin-top:.3rem"><button class="btn sm" data-ab="'+b.id+'">Abrir</button><button class="btn sm" data-del="'+b.id+'">Quitar</button></div></div>'; }).join('')||'<p class="small muted">Aún no hay correos analizados.</p>')+'</div>'+
   '';
  const raw=el.querySelector('#bx-raw'), res=el.querySelector('#bx-res');
  el.querySelectorAll('[data-ej]').forEach(b=>b.onclick=()=>{ raw.value=ej(+b.dataset.ej); raw.focus(); });
  el.querySelector('#bx-file').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; if(f.size>3e6){ LM.toast('Archivo demasiado grande (máx. 3 MB)'); return; } raw.value=await f.text(); LM.toast('Correo cargado: '+f.name); };
  const show=b=>{ const r=b.r, m=b.m, c=CAT[r.categoria]||CAT.cliente; const procs=S.procesos.slice().sort((a,b)=>a.radicado<b.radicado?-1:1);
    res.innerHTML='<div class="card" style="margin-top:1rem"><div class="row between"><h2>'+E(m.asunto||'(sin asunto)')+'</h2><span class="row"><span class="chip '+c[1]+'">'+c[0]+'</span><span class="chip">prioridad '+E(r.prioridad||'—')+'</span>'+(r.simulado?'<span class="chip warn">simulado</span>':'')+'</span></div><div class="small muted">De: '+E(m.de||'—')+' · '+E(m.fecha||'')+'</div>'+
     '<p>'+E(r.resumen||'')+'</p>'+(r.accion?'<p class="small"><b>Acción sugerida:</b> '+E(r.accion)+'</p>':'')+
     '<div class="grid g2 small"><div><b>Radicado:</b> '+(r.radicado?LM.fmtRad(digits(r.radicado)):'—')+'</div><div><b>Término:</b> '+(r.termino&&r.termino.hay?E(r.termino.descripcion||'')+(b.vence?' → vence <b>'+LM.fmt(b.vence)+'</b>':''):'—')+'</div></div>'+
     ((r.fechas||[]).length?'<ul class="small">'+r.fechas.map(f=>'<li>'+E(f.fecha)+' · '+E(f.descripcion||'')+'</li>').join('')+'</ul>':'')+
     '<label>Proceso asociado<select id="bx-p"><option value="">— Sin asociar —</option>'+procs.map(p=>'<option value="'+p.id+'"'+(p.id===b.procesoId?' selected':'')+'>'+LM.fmtRad(p.radicado)+' · '+E((p.demandante||'').slice(0,40))+'</option>').join('')+'</select></label>'+
     '<div class="small muted">'+(b.alertaId?'✅ Alerta creada'+(b.eventoId?' y vencimiento agregado a la agenda':'')+'.':'Sin alerta (correo sin importancia o sin proceso).')+'</div>'+
     (r.categoria!=='sin_importancia'||r.respuesta.cuerpo?'<h3>Respuesta (borrador editable)</h3><label>Para<input id="bx-to" value="'+E(addr(m.de))+'"></label><label>Asunto<input id="bx-as" value="'+E(r.respuesta.asunto||('Re: '+(m.asunto||'')))+'"></label><textarea id="bx-body" rows="9">'+E(r.respuesta.cuerpo||'')+'</textarea><div class="row"><button class="btn" id="bx-copy">📋 Copiar</button><button class="btn primary" id="bx-mail">✉ Abrir en mi correo</button>'+(b.srv?'<button class="btn primary" id="bx-draft">📝 Crear borrador en mi buzón</button>':'')+'<span class="small muted">No se envía nada automáticamente.</span></div>':'')+'</div>';
    const sel=res.querySelector('#bx-p'); sel.onchange=()=>{ b.procesoId=sel.value||null; const a=S.alertas.find(x=>x.id===b.alertaId); if(a) a.procesoId=b.procesoId; else if(b.procesoId&&r.categoria!=='sin_importancia') crearAlerta(b); LM.save(); show(b); };
    const g=id=>res.querySelector(id); const save=()=>{ if(!g('#bx-body')) return; r.respuesta={asunto:g('#bx-as').value,cuerpo:g('#bx-body').value}; LM.save(); };
    if(g('#bx-body')){ ['#bx-as','#bx-body'].forEach(i=>g(i).addEventListener('change',save));
      g('#bx-copy').onclick=async()=>{ save(); const t='Para: '+g('#bx-to').value+'\nAsunto: '+g('#bx-as').value+'\n\n'+g('#bx-body').value; try{ await navigator.clipboard.writeText(t); LM.toast('📋 Respuesta copiada'); }catch(e){ g('#bx-body').select(); document.execCommand('copy'); LM.toast('📋 Respuesta copiada'); } };
      const dr=g('#bx-draft'); if(dr) dr.onclick=async()=>{ save(); dr.disabled=true; dr.textContent='⏳ Creando borrador…'; try{ const x=await LM.correoBorrador(b,{to:g('#bx-to').value,subject:g('#bx-as').value,body:g('#bx-body').value}); b.borrador=x; LM.save(); dr.textContent='✅ Borrador creado en '+x.donde; LM.toast('📝 Borrador guardado en su carpeta Borradores (no se envió)'); }catch(e){ dr.disabled=false; dr.textContent='📝 Crear borrador en mi buzón'; LM.toast('⚠ '+e.message); } };
      g('#bx-mail').onclick=()=>{ save(); location.href='mailto:'+encodeURIComponent(g('#bx-to').value)+'?subject='+encodeURIComponent(g('#bx-as').value)+'&body='+encodeURIComponent(g('#bx-body').value.slice(0,1800)); }; } };
  el.querySelector('#bx-go').onclick=async e=>{ const txt=raw.value.trim(); if(txt.length<20){ LM.toast('Pegue el correo o cargue un .eml'); return; } const btn=e.target, st=el.querySelector('#bx-st'); btn.disabled=true; btn.textContent='⏳ Analizando…'; const t0=Date.now();
    try{ const m=LM.parseEmail(txt); const r=await LM.bandejaAnalizar(m); const b=LM.bandejaIngresar(m,r); LM.save(); LM.refreshChrome(); st.innerHTML='✓ Analizado en '+Math.round((Date.now()-t0)/1000)+' s'+(r.simulado?' (simulación sin IA)':''); LM._bxOpen={id:b.id,msg:st.innerHTML}; V.bandeja(el); return; }
    catch(err){ st.innerHTML='<span class="err">⚠ '+E(err.message)+'</span>'; }
    btn.disabled=false; btn.textContent='🤖 Analizar con IA'; };
  el.querySelectorAll('[data-ab]').forEach(x=>x.onclick=()=>{ show(S.bandeja.find(b=>b.id===x.dataset.ab)); res.scrollIntoView(); });
  if(LM._bxOpen){ const o=LM._bxOpen; LM._bxOpen=null; const b=S.bandeja.find(x=>x.id===o.id); if(b){ el.querySelector('#bx-st').innerHTML=o.msg; show(b); setTimeout(()=>res.scrollIntoView({behavior:'smooth'}),50); } }
  if(LM.correoCard) LM.correoCard(el.querySelector('#bx-buzon'),()=>V.bandeja(el));
  el.querySelectorAll('[data-del]').forEach(x=>x.onclick=()=>{ S.bandeja=S.bandeja.filter(b=>b.id!==x.dataset.del); LM.save(); V.bandeja(el); });
};
})();
