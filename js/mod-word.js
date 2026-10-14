/* Plantillas con membrete (.docx en IndexedDB) y Exportar a Word con JSZip */
(function(){
const LM=window.LM, V=LM.views, E=LM.esc;
const JSZIP='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', MARK='{{CONTENIDO}}';
let jzp=null; function jszip(){ if(window.JSZip) return Promise.resolve(window.JSZip); return jzp=jzp||new Promise((ok,ko)=>{ const s=document.createElement('script'); s.src=JSZIP; s.onload=()=>ok(window.JSZip); s.onerror=()=>{ jzp=null; ko(new Error('No se pudo descargar el componente de Word (¿sin conexión?)')); }; document.head.appendChild(s); }); }
/* ---------- IndexedDB ---------- */
let dbp=null; function db(){ return dbp=dbp||new Promise((res,rej)=>{ if(!window.indexedDB) return rej(new Error('Este navegador no permite guardar plantillas (IndexedDB)')); const q=indexedDB.open('lexmonitor-membretes',1); q.onupgradeneeded=()=>q.result.createObjectStore('tpl',{keyPath:'id'}); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); }); }
const tx=async(mode,fn)=>{ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction('tpl',mode); const st=t.objectStore('tpl'); let out; const r=fn(st); if(r) r.onsuccess=()=>out=r.result; t.oncomplete=()=>res(out); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error||new Error('Operación cancelada (¿sin espacio?)')); }); };
LM.memList=async()=>((await tx('readonly',s=>s.getAll()))||[]).sort((a,b)=>a.creado<b.creado?-1:1);
LM.memGet=id=>tx('readonly',s=>s.get(id));
LM.memPut=rec=>tx('readwrite',s=>s.put(rec));
LM.memDel=id=>tx('readwrite',s=>s.delete(id));
LM.memSetDefault=async id=>{ const L=await LM.memList(); for(const r of L){ r.def=r.id===id; await LM.memPut(r); } };
/* ---------- XML helpers ---------- */
const X=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ptext=xml=>(xml.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')).join('').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function runs(s,base){ base=base||{}; const out=[]; const re=/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*)/g; let last=0,m;
  const R=(t,b,i)=>{ if(!t) return; out.push('<w:r><w:rPr>'+((b||base.b)?'<w:b/>':'')+(i?'<w:i/>':'')+(base.sz?'<w:sz w:val="'+base.sz+'"/><w:szCs w:val="'+base.sz+'"/>':'')+'</w:rPr><w:t xml:space="preserve">'+X(t)+'</w:t></w:r>'); };
  while((m=re.exec(s))){ R(s.slice(last,m.index)); const t=m[0]; if(t[0]==='*'&&t[1]==='*'||t[0]==='_') R(t.slice(2,-2),true); else R(t.slice(1,-1),false,true); last=re.lastIndex; } R(s.slice(last)); return out.join(''); }
const para=(inner,ppr)=>'<w:p>'+(ppr?'<w:pPr>'+ppr+'</w:pPr>':'')+inner+'</w:p>';
/* Markdown sencillo -> párrafos WordprocessingML */
LM.mdToWord=function(md){ const L=String(md).replace(/\r/g,'').split('\n'); const out=[]; let i=0;
  const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim().replace(/<br\s*\/?>/gi,' '));
  while(i<L.length){ const l=L[i]; let m;
    if(/^```/.test(l)){ i++; while(i<L.length&&!/^```/.test(L[i])) out.push(para(runs(L[i++]))); i++; continue; }
    if(/^\s*\|/.test(l)&&i+1<L.length&&/^\s*\|?\s*:?-{2,}/.test(L[i+1])){ const rows=[cells(l)]; i+=2; while(i<L.length&&/^\s*\|/.test(L[i])) rows.push(cells(L[i++]));
      const bd='<w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:space="0" w:color="808080"/>').join('')+'</w:tblBorders>';
      out.push('<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>'+bd+'</w:tblPr>'+rows.map((r,ri)=>'<w:tr>'+r.map(c=>'<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>'+para(runs(c,{b:ri===0,sz:20}))+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>'); out.push(para('')); continue; }
    if((m=l.match(/^(#{1,6})\s+(.*)/))){ const sz=[0,30,28,26,24,24,24][m[1].length]; out.push(para(runs(m[2],{b:true,sz}),'<w:keepNext/><w:spacing w:before="240" w:after="120"/>')); i++; continue; }
    if(/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(l)){ i++; continue; }
    if((m=l.match(/^\s*([-*+]|\d+[.)])\s+(.*)/))){ const pre=/\d/.test(m[1])?m[1].replace(')','.')+' ':'• '; out.push(para(runs(pre+m[2]),'<w:ind w:left="567" w:hanging="283"/>')); i++; continue; }
    if((m=l.match(/^>\s?(.*)/))){ out.push(para(runs(m[1],{}).replace(/<w:rPr>/g,'<w:rPr><w:i/>'),'<w:ind w:left="567"/>')); i++; continue; }
    out.push(para(runs(l))); i++; }
  return out.join(''); };
/* ---------- Plantilla genérica ---------- */
async function generic(){ const JSZip=await jszip(); const z=new JSZip(); const C=LM.state.config;
  const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>');
  z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>');
  z.file('word/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+W+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="es-CO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>');
  z.file('word/header1.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr '+W+'>'+para(runs(C.firma||'',{b:true,sz:20}),'<w:jc w:val="center"/>')+para(runs([C.abogado,C.email,C.ciudad].filter(Boolean).join(' · '),{sz:16}),'<w:jc w:val="center"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="808080"/></w:pBdr>')+'</w:hdr>');
  z.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+W+'><w:body><w:p><w:r><w:t>'+MARK+'</w:t></w:r></w:p><w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1701" w:right="1418" w:bottom="1418" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return z.generateAsync({type:'arraybuffer'}); }
/* ---------- Construcción del .docx ---------- */
LM.buildDocx=async function(buf,md){ const JSZip=await jszip(); const z=await JSZip.loadAsync(buf); const f=z.file('word/document.xml'); if(!f) throw new Error('La plantilla no es un documento de Word válido (.docx)');
  let doc=await f.async('string'); const content=LM.mdToWord(md); let done=false;
  doc=doc.replace(/<w:p(?=[\s>])[\s\S]*?<\/w:p>/g,p=>{ if(done||ptext(p).indexOf(MARK)<0) return p; done=true; return content; });
  if(!done){ const bm=doc.match(/<w:body>([\s\S]*)<\/w:body>/); if(!bm) throw new Error('No se encontró el cuerpo del documento en la plantilla');
    const sm=bm[1].match(/<w:sectPr[\s\S]*<\/w:sectPr>\s*$/); doc=doc.replace(bm[0],'<w:body>'+content+(sm?sm[0]:'')+'</w:body>'); }
  z.file('word/document.xml',doc); return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'}); };
LM.memInfo=async function(buf){ const JSZip=await jszip(); const z=await JSZip.loadAsync(buf); const d=z.file('word/document.xml'); if(!d) throw new Error('No es un .docx válido');
  const names=Object.keys(z.files); const hdr=names.filter(n=>/^word\/header\d*\.xml$/.test(n)), ftr=names.filter(n=>/^word\/footer\d*\.xml$/.test(n));
  const txt=async L=>(await Promise.all(L.map(async n=>ptext(await z.file(n).async('string'))))).filter(Boolean).join(' · ');
  const body=await d.async('string'); const hrels=(await Promise.all(names.filter(n=>/^word\/_rels\/(header|footer)\d*\.xml\.rels$/.test(n)).map(n=>z.file(n).async('string')))).join('');
  return {header:await txt(hdr),footer:await txt(ftr),imgs:(hrels.match(/relationships\/image"/g)||[]).length,marker:ptext(body.replace(/<\/w:p>/g,'</w:p>')).indexOf(MARK)>=0||body.replace(/<[^>]+>/g,'').indexOf(MARK)>=0,bodyText:ptext(body).slice(0,300)}; };
/* ---------- Exportar ---------- */
async function exportWith(id,md,fname){ try{ LM.toast('Generando Word…'); let buf; if(id){ const r=await LM.memGet(id); if(!r) throw new Error('Plantilla no encontrada'); buf=r.buf; } else buf=await generic();
  const blob=await LM.buildDocx(buf,md); LM.download(fname.replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ]+/g,'_')+'.docx',blob); LM.toast('Documento de Word descargado ✓'); }
  catch(e){ LM.toast('No se pudo exportar: '+e.message); } }
LM.exportWord=async function(md,fname){ let L=[]; try{ L=await LM.memList(); }catch(e){}
  if(L.length<=1) return exportWith(L[0]&&L[0].id,md,fname);
  const def=(L.find(r=>r.def)||L[0]).id;
  LM.modal('<h2>📄 Exportar a Word</h2><label for="ew-t">Plantilla con membrete</label><select id="ew-t">'+L.map(r=>'<option value="'+r.id+'"'+(r.id===def?' selected':'')+'>'+E(r.nombre)+(r.def?' (predeterminada)':'')+'</option>').join('')+'<option value="">Genérica (sin membrete de la firma)</option></select><div class="row" style="justify-content:flex-end;margin-top:1rem"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ew-go">Exportar</button></div>',(m,close)=>{ m.querySelector('#ew-go').onclick=()=>{ const v=m.querySelector('#ew-t').value; close(); exportWith(v,md,fname); }; }); };
/* ---------- Sección en Configuración ---------- */
LM.memSection=async function(host){ let L=[]; let err=''; try{ L=await LM.memList(); }catch(e){ err=e.message; }
  host.innerHTML='<h2>📄 Plantillas con membrete (Word)</h2><p class="small muted">Suba uno o varios documentos .docx de la firma. Se usan al pulsar <b>📄 Exportar a Word</b> en Borradores y en los resultados de IA.</p>'+
   '<ul class="small"><li>El membrete (logo, nombre, datos) debe estar en el <b>encabezado</b> y/o el <b>pie de página</b> del documento.</li><li>Opcional: escriba <b class="mono">'+MARK+'</b> en el cuerpo, en el lugar donde debe ir el texto. Si no lo tiene, se reemplaza todo el cuerpo y se conservan encabezado, pie, márgenes y estilos.</li><li>Se guardan solo en este navegador (no se incluyen en el respaldo JSON).</li></ul>'+
   (err?'<p class="small" style="color:#c0392b">'+E(err)+'</p>':'')+
   '<div class="row"><label class="btn primary" for="mem-up" style="margin:0">⬆ Subir plantilla .docx</label><input type="file" id="mem-up" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple class="hide"></div>'+
   '<div class="list" style="margin-top:.6rem">'+(L.length?L.map(r=>'<div class="card"><div class="row between"><b>'+E(r.nombre)+'</b>'+(r.def?'<span class="chip ok">Predeterminada</span>':'')+'</div><div class="small muted">'+Math.round(r.size/1024)+' KB · '+LM.fmt(r.creado.slice(0,10))+'</div><div class="row" style="margin-top:.4rem"><button class="btn sm" data-mv="'+r.id+'">👁 Vista previa</button>'+(r.def?'':'<button class="btn sm" data-md="'+r.id+'">★ Predeterminada</button>')+'<button class="btn sm" data-mt="'+r.id+'">⬇ Probar</button><button class="btn sm danger" data-mx="'+r.id+'">🗑 Eliminar</button></div><div class="small" data-mp="'+r.id+'"></div></div>').join(''):'<p class="small muted">Aún no hay plantillas. Mientras tanto se usa una genérica con el nombre de la firma en el encabezado.</p>')+'</div>';
  const redo=()=>LM.memSection(host);
  host.querySelector('#mem-up').onchange=async e=>{ const fs=[...e.target.files]; for(const f of fs){ try{ if(!/\.docx$/i.test(f.name)) throw new Error('debe ser .docx'); const buf=await f.arrayBuffer(); await LM.memInfo(buf);
      await LM.memPut({id:'m'+LM.uid(),nombre:f.name.replace(/\.docx$/i,''),buf,size:f.size,creado:new Date().toISOString(),def:!L.length}); L.push(1); LM.toast('Plantilla «'+f.name+'» guardada ✓'); }catch(er){ LM.toast('No se pudo cargar '+f.name+': '+er.message); } } redo(); };
  host.querySelectorAll('[data-mv]').forEach(b=>b.onclick=async()=>{ const o=host.querySelector('[data-mp="'+b.dataset.mv+'"]'); o.textContent='Leyendo…'; try{ const r=await LM.memGet(b.dataset.mv); const i=await LM.memInfo(r.buf);
      o.innerHTML='<div class="card" style="margin-top:.4rem"><div><b>Encabezado:</b> '+(E(i.header)||'<i>sin texto</i>')+(i.imgs?' · 🖼 '+i.imgs+' imagen(es) en encabezado/pie':'')+'</div><div><b>Pie:</b> '+(E(i.footer)||'<i>sin texto</i>')+'</div><div><b>Marcador '+MARK+':</b> '+(i.marker?'sí (el texto irá ahí)':'no (se reemplazará el cuerpo)')+'</div><div class="muted"><b>Cuerpo:</b> '+(E(i.bodyText)||'<i>vacío</i>')+'</div></div>'; }catch(e){ o.textContent='No se pudo leer: '+e.message; } });
  host.querySelectorAll('[data-md]').forEach(b=>b.onclick=async()=>{ await LM.memSetDefault(b.dataset.md); LM.toast('Plantilla predeterminada ✓'); redo(); });
  host.querySelectorAll('[data-mt]').forEach(b=>b.onclick=()=>exportWith(b.dataset.mt,'# Documento de prueba\n\nEste texto se insertó en la plantilla. **Negrita**, *cursiva* y una lista:\n\n- Primer punto\n- Segundo punto','Prueba_plantilla'));
  host.querySelectorAll('[data-mx]').forEach(b=>b.onclick=async()=>{ if(!confirm('¿Eliminar esta plantilla?')) return; const r=await LM.memGet(b.dataset.mx); await LM.memDel(b.dataset.mx); if(r&&r.def){ const rest=await LM.memList(); if(rest[0]) await LM.memSetDefault(rest[0].id); } LM.toast('Plantilla eliminada'); redo(); });
};
const origC=V.config; V.config=function(el,args){ origC(el,args); const c=document.createElement('div'); c.className='card'; c.id='cf-mem'; c.style.marginTop='1rem'; const ia=el.querySelector('#cf-ia'); (ia||[...el.querySelectorAll('.card')].pop()).after(c); LM.memSection(c); };
/* ---------- Botón en Borradores > Plantillas ---------- */
const origB=V.borradores; V.borradores=function(el,args){ origB(el,args); const d=el.querySelector('#b-doc'); if(!d) return;
  d.insertAdjacentHTML('beforebegin','<button class="btn primary" id="b-word">📄 Exportar a Word</button>');
  el.querySelector('#b-word').onclick=()=>{ const p=LM.proc(el.querySelector('#b-p').value); const t=LM.TPL[el.querySelector('#b-t').value]; LM.exportWord(el.querySelector('#b-txt').value,t.n.replace(/\s+/g,'_')+'_'+String(p.radicado).slice(-9)); }; };
})();
