/* Módulos: Generador de borradores, Reportes para el cliente, Configuración */
(function(){
const LM=window.LM, V=LM.views, E=LM.esc;
const TPL={
 peticion:{n:'Derecho de petición',t:(p,c,C)=>`${C.ciudad}, ${LM.fmtLong(LM.today())}

Señores
${p.demandado}
E. S. D.

Referencia: Derecho de petición (art. 23 C.P. y Ley 1755 de 2015)
Peticionario: ${c.nombre}

${C.abogado}, identificado(a) como aparece al pie de mi firma, actuando en calidad de apoderado(a) de ${c.nombre}, respetuosamente presento derecho de petición con fundamento en el artículo 23 de la Constitución Política y la Ley 1755 de 2015, en los siguientes términos:

PETICIONES
1. Se expida copia íntegra del expediente administrativo relacionado con: ${p.resumen}
2. Se informe el estado actual de la actuación administrativa.

NOTIFICACIONES
Recibiré notificaciones en el correo ${C.email}.

Atentamente,


${C.abogado}
${C.tp}
${C.firma}`},
 impulso:{n:'Memorial de impulso procesal',t:(p,c,C)=>`Señor(a)
${p.ponente}
${p.despacho}
E. S. D.

Medio de control: ${p.medio}
Radicado: ${LM.fmtRad(p.radicado)}
Demandante: ${p.demandante}
Demandado: ${p.demandado}

Asunto: Solicitud de impulso procesal

${C.abogado}, en calidad de apoderado(a) de la parte ${p.demandante===c.nombre?'demandante':'interesada'}, respetuosamente solicito al Despacho se sirva dar impulso al proceso de la referencia, toda vez que la última actuación registrada data del ${LM.fmt(p.actuaciones.slice().sort((a,b)=>a.fecha<b.fecha?1:-1)[0].fecha)}, encontrándose el proceso en la etapa de ${p.etapa.toLowerCase()}.

Lo anterior, en aplicación de los principios de celeridad y eficacia (art. 103 CPACA) y del derecho de acceso a la administración de justicia.

Del señor(a) Juez / Magistrado(a),


${C.abogado}
${C.tp}
${C.email}`},
 copias:{n:'Solicitud de copias',t:(p,c,C)=>`Señor(a)
${p.ponente}
${p.despacho}
E. S. D.

Radicado: ${LM.fmtRad(p.radicado)}
Medio de control: ${p.medio}

Asunto: Solicitud de copias del expediente

${C.abogado}, apoderado(a) de ${c.nombre}, solicito respetuosamente se expidan copias digitales del expediente de la referencia, en particular de las siguientes piezas procesales: [indicar piezas], con destino a ${C.email}.

Atentamente,


${C.abogado}
${C.tp}`},
 poder:{n:'Poder especial',t:(p,c,C)=>`Señor(a)
${p.ponente||'Juez(a) / Magistrado(a)'}
${p.despacho}
E. S. D.

${c.nombre}, identificado(a) con ${c.doc}, por medio del presente escrito confiero PODER ESPECIAL, amplio y suficiente a ${C.abogado}, identificado(a) con ${C.tp}, para que en mi nombre y representación inicie y lleve hasta su terminación el medio de control de ${p.medio.toUpperCase()} contra ${p.demandado}${p.radicado?', radicado '+LM.fmtRad(p.radicado):''}.

Mi apoderado(a) queda facultado(a) para recibir, conciliar, transigir, sustituir, desistir, reasumir, presentar recursos y, en general, todas las facultades del artículo 77 del Código General del Proceso. El correo de notificaciones del apoderado inscrito en el Registro Nacional de Abogados es ${C.email} (art. 5 Ley 2213 de 2022).

Atentamente,


${c.nombre}
${c.doc}

Acepto,

${C.abogado}
${C.tp}`}
};
LM.TPL=TPL;
V.borradores=function(el,args){
  const S=LM.state; const pid=args[0]||S.procesos[0].id, tk=args[1]||'impulso';
  el.innerHTML='<h1>Generador de borradores</h1><p class="small muted">Las plantillas se llenan con los datos del proceso y la firma. Son borradores: revíselos antes de radicar.</p><div class="card no-print"><div class="grid g2"><div><label for="b-p">Proceso</label><select id="b-p">'+S.procesos.map(p=>'<option value="'+p.id+'"'+(p.id===pid?' selected':'')+'>'+LM.fmtRad(p.radicado).slice(0,24)+' · '+E(p.medio)+'</option>').join('')+'</select></div><div><label for="b-t">Plantilla</label><select id="b-t">'+Object.entries(TPL).map(([k,v])=>'<option value="'+k+'"'+(k===tk?' selected':'')+'>'+v.n+'</option>').join('')+'</select></div></div><div class="row" style="margin-top:.8rem"><button class="btn primary" id="b-doc">⬇ Descargar .doc</button><button class="btn" id="b-print">🖨 Imprimir / PDF</button><button class="btn" id="b-copy">Copiar texto</button></div></div><label for="b-txt" class="no-print">Texto (editable)</label><textarea id="b-txt" class="doc-preview" style="min-height:60vh;width:100%"></textarea>';
  const gen=()=>{ const p=LM.proc(el.querySelector('#b-p').value); el.querySelector('#b-txt').value=TPL[el.querySelector('#b-t').value].t(p,LM.cli(p.clienteId),S.config); };
  el.querySelectorAll('#b-p,#b-t').forEach(x=>x.onchange=gen); gen();
  const name=()=>{ const p=LM.proc(el.querySelector('#b-p').value); return TPL[el.querySelector('#b-t').value].n.replace(/\s+/g,'_')+'_'+p.radicado.slice(-9); };
  el.querySelector('#b-doc').onclick=()=>{ const html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Borrador</title></head><body style="font-family:Times New Roman;font-size:12pt;line-height:1.5">'+E(el.querySelector('#b-txt').value).replace(/\n/g,'<br>')+'</body></html>'; LM.download(name()+'.doc','\ufeff'+html,'application/msword'); LM.toast('Borrador descargado ✓'); };
  el.querySelector('#b-print').onclick=()=>LM.printDoc('<div style="white-space:pre-wrap;font-family:Georgia,serif;line-height:1.6">'+E(el.querySelector('#b-txt').value)+'</div>');
  el.querySelector('#b-copy').onclick=()=>{ const t=el.querySelector('#b-txt'); t.select(); (navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(()=>LM.toast('Copiado ✓'),()=>{ try{document.execCommand('copy');LM.toast('Copiado ✓');}catch(e){LM.toast('No se pudo copiar');} }); };
};
LM.printDoc=function(html){ const w=window.open('','_blank'); if(!w){ LM.toast('Permita ventanas emergentes para imprimir'); return; } w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+E(LM.state.config.appName)+'</title><style>body{font-family:system-ui,sans-serif;color:#111;margin:2cm;font-size:11pt}h1{font-size:16pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:10pt}.f{color:#a35d00;font-size:9pt;border:1px solid #e0b060;padding:4px;border-radius:4px}</style></head><body>'+html+'<script>setTimeout(function(){window.print()},300)<\/script></body></html>'); w.document.close(); };

LM.reportHtml=function(p){ const S=LM.state, c=LM.cli(p.clienteId), r=LM.parseRadicado(p.radicado), hoy=LM.iso(LM.today()); const acts=p.actuaciones.slice().sort((a,b)=>a.fecha<b.fecha?1:-1); const ev=(p.eventos||[]).filter(e=>e.fecha>=hoy).sort((a,b)=>a.fecha<b.fecha?-1:1);
  return '<p class="f">Documento de demostración con datos ficticios.</p><h1>Informe de estado del proceso</h1><p>'+E(S.config.firma)+' · '+E(S.config.abogado)+'<br>Fecha del informe: '+LM.fmtLong(hoy)+'</p><table><tr><th>Cliente</th><td>'+E(c.nombre)+'</td></tr><tr><th>Radicado</th><td>'+LM.fmtRad(p.radicado)+'</td></tr><tr><th>Medio de control</th><td>'+E(p.medio)+'</td></tr><tr><th>Despacho</th><td>'+E(p.despacho)+'</td></tr><tr><th>Partes</th><td>'+E(p.demandante)+' vs. '+E(p.demandado)+'</td></tr><tr><th>Estado / etapa</th><td>'+E(p.estado)+' · '+E(p.etapa)+'</td></tr>'+(p.cuantia?'<tr><th>Cuantía</th><td>'+LM.money(p.cuantia)+'</td></tr>':'')+'</table><h2>Resumen</h2><p>'+E(p.resumen)+'</p><h2>Próximas fechas</h2>'+(ev.length?'<ul>'+ev.map(e=>'<li><b>'+LM.fmtLong(e.fecha)+(e.hora?' '+e.hora:'')+':</b> '+E(e.titulo)+'</li>').join('')+'</ul>':'<p>No hay fechas próximas programadas.</p>')+'<h2>Últimas actuaciones</h2><table><tr><th>Fecha</th><th>Actuación</th><th>Detalle</th></tr>'+acts.slice(0,8).map(a=>'<tr><td>'+LM.fmt(a.fecha)+'</td><td>'+E(a.titulo)+'</td><td>'+E(a.detalle)+'</td></tr>').join('')+'</table><p style="margin-top:1.5em;font-size:9pt;color:#555">Este informe resume la información registrada en '+E(S.config.appName)+'. Ante cualquier inquietud, comuníquese con su apoderado(a).</p>'; };
V.reportes=function(el,args){ const S=LM.state; const pid=args[0]||S.procesos[0].id;
  const act=S.procesos.filter(p=>p.estado!=='Terminado'); const byEt={}; act.forEach(p=>byEt[p.etapa]=(byEt[p.etapa]||0)+1);
  el.innerHTML='<h1>Reportes</h1><div class="grid g2"><div class="card no-print"><h2>Informe para el cliente</h2><label for="r-p">Proceso</label><select id="r-p">'+S.procesos.map(p=>'<option value="'+p.id+'"'+(p.id===pid?' selected':'')+'>'+LM.fmtRad(p.radicado).slice(0,24)+' · '+E(LM.cli(p.clienteId).nombre)+'</option>').join('')+'</select><div class="row" style="margin-top:.8rem"><button class="btn primary" id="r-print">🖨 Imprimir / guardar PDF</button><button class="btn" id="r-doc">⬇ .doc</button></div></div><div class="card"><h2>Cartera por etapa</h2>'+LM.donut(Object.entries(byEt).map(([k,v])=>({k,v})))+'</div></div><div class="card" style="margin-top:1rem" id="r-prev"></div>';
  const draw=()=>{ el.querySelector('#r-prev').innerHTML='<div class="doc-preview" style="white-space:normal;font-family:system-ui">'+LM.reportHtml(LM.proc(el.querySelector('#r-p').value)).replace(/<table>/g,'<div class="table-wrap"><table>').replace(/<\/table>/g,'</table></div>')+'</div>'; };
  el.querySelector('#r-p').onchange=draw; draw();
  el.querySelector('#r-print').onclick=()=>LM.printDoc(LM.reportHtml(LM.proc(el.querySelector('#r-p').value)));
  el.querySelector('#r-doc').onclick=()=>{ const p=LM.proc(el.querySelector('#r-p').value); LM.download('Informe_'+p.radicado.slice(-9)+'.doc','\ufeff<html><head><meta charset="utf-8"></head><body>'+LM.reportHtml(p)+'</body></html>','application/msword'); LM.toast('Informe descargado ✓'); };
};

V.config=function(el){ const S=LM.state, C=S.config;
  const f=(k,l,t)=>'<div><label for="cf-'+k+'">'+l+'</label><input id="cf-'+k+'" type="'+(t||'text')+'" value="'+E(C[k])+'"></div>';
  el.innerHTML='<h1>Configuración</h1><div class="grid g2"><div class="card"><h2>Firma y producto</h2><div class="grid g2">'+f('appName','Nombre del producto')+f('firma','Nombre de la firma')+f('abogado','Abogado(a) titular')+f('tp','Tarjeta profesional')+f('email','Correo de notificaciones','email')+f('ciudad','Ciudad')+'</div><label for="cf-theme">Tema</label><select id="cf-theme">'+[['auto','Automático'],['light','Claro'],['dark','Oscuro']].map(([k,t])=>'<option value="'+k+'"'+(C.theme===k?' selected':'')+'>'+t+'</option>').join('')+'</select></div>'+
  '<div class="card"><h2>Reglas de términos</h2><div class="grid g2"><div><label for="cf-vi">Inicio vacancia colectiva (MM-DD)</label><input id="cf-vi" value="'+C.vacIni+'" pattern="\\d\\d-\\d\\d"></div><div><label for="cf-vf">Fin vacancia colectiva (MM-DD)</label><input id="cf-vf" value="'+C.vacFin+'"></div></div><label class="row" style="font-weight:500"><input type="checkbox" id="cf-vs"'+(C.vacSanta?' checked':'')+'> Vacancia lunes a miércoles de Semana Santa</label><label for="cf-in">Días para alertar inactividad</label><input id="cf-in" type="number" value="'+C.inactividadDias+'"><p class="small muted">Por defecto 20 dic – 10 ene (Decreto 1265 de 1970). Ajústelo si el Consejo Superior de la Judicatura fija otra cosa.</p></div></div>'+
  '<div class="row" style="margin-top:1rem"><button class="btn primary" id="cf-save">Guardar configuración</button></div>'+
  '<div class="card" style="margin-top:1rem"><h2>Datos</h2><p class="small muted">Todo se guarda en este navegador. Exporte un respaldo JSON para llevarlo a otro equipo.</p><div class="row"><button class="btn" id="exp">⬇ Exportar JSON</button><label class="btn" for="imp" style="margin:0">⬆ Importar JSON</label><input type="file" id="imp" accept="application/json,.json" class="hide"><button class="btn danger" id="rst">↺ Restaurar datos de demostración</button></div><p class="small muted" style="margin-top:.6rem">'+S.procesos.length+' procesos · '+S.clientes.length+' clientes · '+S.alertas.length+' alertas · tamaño '+Math.round(JSON.stringify(S).length/1024)+' KB</p></div>'+
  '<div class="card" style="margin-top:1rem"><h2>Acerca de</h2><p class="small">Maqueta funcional offline. Sin conexión a SAMAI, CPNU, WhatsApp ni correo: esas integraciones se simulan. Los datos son ficticios. '+(/^https?:$/.test(location.protocol)?'Instalable como app (PWA).':'Abierta como archivo local: para instalarla como app, sírvala por HTTPS.')+'</p></div>';
  el.querySelector('#cf-save').onclick=()=>{ ['appName','firma','abogado','tp','email','ciudad'].forEach(k=>C[k]=el.querySelector('#cf-'+k).value.trim()||C[k]); C.theme=el.querySelector('#cf-theme').value;
    const vi=el.querySelector('#cf-vi').value, vf=el.querySelector('#cf-vf').value; if(!/^\d\d-\d\d$/.test(vi)||!/^\d\d-\d\d$/.test(vf)) return LM.toast('Formato de vacancia: MM-DD');
    C.vacIni=vi; C.vacFin=vf; C.vacSanta=el.querySelector('#cf-vs').checked; C.inactividadDias=+el.querySelector('#cf-in').value||180; LM.save(); LM.applyTheme(); LM.refreshChrome(); LM.toast('Configuración guardada ✓'); };
  el.querySelector('#exp').onclick=()=>{ LM.download('lexmonitor-respaldo-'+LM.iso(LM.today())+'.json',JSON.stringify(S,null,2),'application/json'); LM.toast('Respaldo exportado ✓'); };
  el.querySelector('#imp').onchange=e=>{ const file=e.target.files[0]; if(!file) return; const rd=new FileReader(); rd.onload=()=>{ try{ const d=JSON.parse(rd.result); if(!d.procesos||!d.config) throw new Error('Estructura no reconocida'); LM.state=d; LM.save(); LM.applyTheme(); LM.toast('Datos importados ✓'); LM.route(); }catch(err){ LM.toast('No se pudo importar: '+err.message); } }; rd.readAsText(file); };
  el.querySelector('#rst').onclick=()=>{ if(!confirm('¿Reemplazar todos los datos por la demostración?')) return; LM.reset(); LM.applyTheme(); LM.toast('Datos de demostración restaurados'); LM.route(); };
};
})();
