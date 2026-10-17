/* Consulta judicial: una sola sección con dos pestañas, SAMAI (#/alertas, alias #/samai) y Rama Judicial (#/rama). */
(function(){
const LM=window.LM, V=LM.views; const K='lm_consulta_tab';
const tabs=on=>'<div class="cj-head"><h1 style="margin-bottom:.3rem">⚖ Consulta judicial</h1><nav class="cj-tabs" role="tablist" aria-label="Fuente de consulta"><a href="#/alertas" role="tab" aria-selected="'+(on==='samai')+'" class="'+(on==='samai'?'on':'')+'">🔔 SAMAI <span class="small muted">Consejo de Estado y tribunales</span></a><a href="#/rama" role="tab" aria-selected="'+(on==='rama')+'" class="'+(on==='rama'?'on':'')+'">🏛 Rama Judicial <span class="small muted">CPNU · juzgados y tribunales</span></a><a href="#/siugj" role="tab" aria-selected="'+(on==='siugj')+'" class="'+(on==='siugj'?'on':'')+'">⚖ SIUGJ <span class="small muted">Laboral</span></a></nav></div>';
function wrap(name,tab){ const orig=V[name]; V[name]=function(el,args){ if(el.classList&&el.classList.contains('cj-body')) return orig(el,args); try{ localStorage.setItem(K,tab); }catch(e){}
  el.innerHTML=tabs(tab)+'<div class="cj-body"></div>'; return orig(el.querySelector('.cj-body'),args); }; }
wrap('alertas','samai'); wrap('rama','rama'); wrap('siugj','siugj'); V.samai=V.alertas;
V.consulta=function(el,args){ let t='samai'; try{ t=localStorage.getItem(K)||'samai'; }catch(e){} location.replace('#/'+(t==='rama'?'rama':t==='siugj'?'siugj':'alertas')); };
})();
