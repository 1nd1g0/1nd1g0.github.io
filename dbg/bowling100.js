/* dbg/bowling100.js — developer harness for bowling100.html
   Loaded only when the URL asks for it: bowling100.html?debug=dbg/bowling100.js
   (the page's loader runs dbg/_harness.js first, then this file).

   Everything here is developer-side. The page keeps only the physics frame
   recorder (rec / recPush / recApply, which its cinematic replay also uses)
   and the inert DB hook object; this file installs the real step-mode
   machinery into those hooks and registers the panel with TLDBG.

   Console: TLDBG.state(), TLDBG.param("PC"), DBG.on(), DBG.step(10), DBG.seek(0)
   Step-mode keys: , . Left Right Home End Space V, WASD QE pan, drag orbit,
   wheel or two-finger pinch zoom. */
(function(){
if(!window.TLDBG||typeof TLDBG.register!=="function")return;

/* step-mode strings: this UI is not part of the game, so it carries its own
   five-language table instead of the player's translation keys */
const L={
 en:{replay:"REPLAY",replayTip:"step through the last throw one physics frame at a time",
  dbBackTip:"back one frame (, / Left)",dbPlayTip:"play/pause (Space)",dbFwdTip:"forward one frame (. / Right)",
  copyThrow:"COPY THROW",copyTip:"copy this throw's full initial state to clipboard",
  exitKey:"EXIT (V)",dbgInfoFmt:"f {i}/{n}  t={t}s\nball {v} m/s   down {d}",
  noThrowMsg:"NO THROW RECORDED",copiedMsg:"THROW COPIED",copyBlockedMsg:"COPY BLOCKED: clipboard refused"},
 es:{replay:"REPETICIÓN",replayTip:"revisa el último lanzamiento cuadro por cuadro de física",
  dbBackTip:"un cuadro atrás (, / Izq)",dbPlayTip:"pausa / reproducción (Espacio)",dbFwdTip:"un cuadro adelante (. / Der)",
  copyThrow:"COPIAR LANZAMIENTO",copyTip:"copia al portapapeles el estado inicial completo de este lanzamiento",
  exitKey:"SALIR (V)",dbgInfoFmt:"f {i}/{n}  t={t}s\nbola {v} m/s   derribados {d}",
  noThrowMsg:"NO HAY LANZAMIENTO REGISTRADO",copiedMsg:"LANZAMIENTO COPIADO",copyBlockedMsg:"COPIA BLOQUEADA: el portapapeles lo rechazó"},
 pt:{replay:"REPLAY",replayTip:"revê o último lançamento quadro a quadro da física",
  dbBackTip:"um quadro atrás (, / Esq)",dbPlayTip:"tocar / pausar (Espaço)",dbFwdTip:"um quadro à frente (. / Dir)",
  copyThrow:"COPIAR LANÇAMENTO",copyTip:"copiar para a área de transferência o estado inicial completo deste lançamento",
  exitKey:"SAIR (V)",dbgInfoFmt:"f {i}/{n}  t={t}s\nbola {v} m/s   derrubados {d}",
  noThrowMsg:"NENHUM LANÇAMENTO REGISTRADO",copiedMsg:"LANÇAMENTO COPIADO",copyBlockedMsg:"COPIA BLOQUEADA: a área de transferência recusou"},
 ru:{replay:"ПОВТОР",replayTip:"разобрать последний бросок кадр за кадром физики",
  dbBackTip:"кадр назад (, / влево)",dbPlayTip:"пуск / пауза (Пробел)",dbFwdTip:"кадр вперёд (. / вправо)",
  copyThrow:"КОПИРОВАТЬ БРОСОК",copyTip:"копировать полное начальное состояние этого броска в буфер обмена",
  exitKey:"ВЫХОД (V)",dbgInfoFmt:"f {i}/{n}  t={t}s\nшар {v} м/с   сбито {d}",
  noThrowMsg:"БРОСОК НЕ ЗАПИСАН",copiedMsg:"БРОСОК СКОПИРОВАН",copyBlockedMsg:"КОПИРОВАНИЕ ЗАБЛОКИРОВАНО: буфер отказал"},
 zh:{replay:"回放",replayTip:"按物理帧逐帧回看上一次投球",
  dbBackTip:"后退一帧（, / 左）",dbPlayTip:"播放 / 暂停（空格）",dbFwdTip:"前进一帧（. / 右）",
  copyThrow:"复制投球",copyTip:"把这次投球的完整初始状态复制到剪贴板",
  exitKey:"退出 (V)",dbgInfoFmt:"f {i}/{n}  t={t}s\n球速 {v} m/s   撞倒 {d}",
  noThrowMsg:"没有已记录的投球",copiedMsg:"投球已复制",copyBlockedMsg:"复制被拦截：剪贴板拒绝"}
};
function lang(){try{return (window.TLI18N&&TLI18N.lang)?TLI18N.lang():"en"}catch(e){return "en"}}
function tr(k){var c=lang();return (L[c]&&L[c][k])||L.en[k]||k}

/* ---------- step mode: frame scrub, free camera, velocity overlay ---------- */
let dbgOn=false,dbPlay=false,dbAcc=0,dbOff={x:0,y:0,z:0},dbk={},dbDrag=null,live=false;
const dbCam={yaw:0,pitch:0.3,dist:2.5,tx:0,ty:0.3,tz:-18.3};
const dbPtr=new Map();let dbPinch=0;
function dbPinchD(){const a=[...dbPtr.values()],
 dx=a[0][0]-a[1][0],dy=a[0][1]-a[1][1];return Math.sqrt(dx*dx+dy*dy)||1}
function dbFollow(){const b=ball;if(!dbgOn||b.drop||b.dead)return;
 dbCam.tx=b.x+dbOff.x;dbCam.ty=0.2+dbOff.y;dbCam.tz=b.z+dbOff.z;}
function el(id){return document.getElementById(id)}
function ui(){return {btn:el("dbgbtn"),bar:el("dbar"),scrub:el("dscrub"),txt:el("dtxt"),play:el("dbp")}}
function readout(){
 const u=ui();if(!u.txt||!u.scrub)return;
 const r=rec,di2=di,a=r[di2];
 u.scrub.max=r.length-1;u.scrub.value=di2;
 u.txt.textContent=tr("dbgInfoFmt").replace("{i}",di2).replace("{n}",Math.max(0,r.length-1))
  .replace("{t}",(di2/120).toFixed(3))
  .replace("{v}",a?Number(a[6]).toFixed(2):"0").replace("{d}",(typeof PC!=="undefined"?PC:10)-pinsStanding());
}
function dbEnter(){
 if(!rec||!rec.length)return;
 if(phase==='replay'){repAudStop();RP=null;el("skipbtn").style.display='none'}
 dbgOn=true;dbPlay=false;dbAcc=0;dbOff={x:0,y:0,z:0};
 const dx=camX-lkX,dy=camY-lkY,dz=camZ-lkZ;
 dbCam.dist=Math.max(0.6,Math.sqrt(dx*dx+dy*dy+dz*dz));
 dbCam.yaw=Math.atan2(dx,dz);
 dbCam.pitch=Math.asin(Math.max(-0.99,Math.min(0.99,dy/dbCam.dist)));
 const u=ui();u.btn.style.display='none';u.bar.style.display='flex';
 // step mode ALWAYS starts at frame 0 (the release): the cinematic replay, the
 // scrubber and a previous exit all park di at the throw's END, so resuming at
 // di showed a settled pile with no throw left to step.
 recApply(0);dbFollow();copyThrow();
}
function dbExit(){
 dbgOn=false;dbPlay=false;ui().bar.style.display='none';
 recApply(rec.length-1); // ALWAYS continue from the throw's FINAL frame: a
 // mid-flight scrub must never become the live state - THROW 2 continues from
 // where the throw actually ended
 if(phase==='replay'&&!RP)finishThrow(); // the slow-motion sequence was taken over
 if(rec.length)ui().btn.style.display='block';
}
function dbStep(n){dbPlay=false;const p=ui().play;if(p)p.classList.remove('on');
 recApply(di+n);if(dbgOn)dbFollow()}
function dbLoop(dt){
 dbAcc+=dt*120;const n=dbAcc|0;
 if(n){dbAcc-=n;recApply(di+n);dbFollow();
  if(di>=rec.length-1){dbPlay=false;const p=ui().play;if(p)p.classList.remove('on')}}
 readout();
}
function dbPlayToggle(){dbPlay=!dbPlay;const p=ui().play;if(p)p.classList.toggle('on',dbPlay)}
/* free camera: drag=orbit, wheel=zoom, WASD=pan, Q/E=up-down; the pivot tracks
   the stepped ball until it leaves the deck, then it holds. */
function dbCamMove(dt){
 const f=dt*(dbCam.dist*1.5+0.6),sy=Math.sin(dbCam.yaw),cy=Math.cos(dbCam.yaw);
 if(dbk.KeyW||dbk.ArrowUp){dbOff.x+=sy*f;dbOff.z+=cy*f}
 if(dbk.KeyS||dbk.ArrowDown){dbOff.x-=sy*f;dbOff.z-=cy*f}
 if(dbk.KeyD){dbOff.x+=cy*f;dbOff.z-=sy*f}
 if(dbk.KeyA){dbOff.x-=cy*f;dbOff.z+=sy*f}
 if(dbk.KeyE)dbOff.y+=f;
 if(dbk.KeyQ)dbOff.y-=f;
}
function dbCamUpdate(){
 const cp=Math.cos(dbCam.pitch),PI=Math.PI;
 PV=m4mul(m4persp(55*PI/180,ASP,0.05,300),m4look(
  [dbCam.tx+dbCam.dist*Math.sin(dbCam.yaw)*cp,dbCam.ty+dbCam.dist*Math.sin(dbCam.pitch),
   dbCam.tz+dbCam.dist*Math.cos(dbCam.yaw)*cp],
  [dbCam.tx,dbCam.ty,dbCam.tz],[0,1,0]));
}
/* velocity vectors: red = pin slide, cyan = ball motion, amber = tip-over direction */
function dbDraw(){
 for(const p of pins){
  if(p.dead)continue;
  const s=Math.sqrt(p.vx*p.vx+p.vz*p.vz);
  if(s>0.12){const ang=Math.atan2(p.vz,p.vx),len=Math.min(0.9,s*0.12),
   lf=p.th>0.02?0.0605*Math.sin(Math.min(p.th,Math.PI/2)):0;
   draw(M_BOX,m4mul(m4mul(m4t(p.x,(p.y||0)+lf+0.03,p.z),m4ry(-ang)),m4s(len,0.008,0.008)),[1,0.25,0.25],6,0,0)}
  if(p.om>0.05&&p.th>0.02&&p.th<Math.PI/2-0.02){const len=Math.min(0.9,p.om*0.12);
   draw(M_BOX,m4mul(m4mul(m4t(p.x,0.04,p.z),m4ry(-p.dir)),m4s(len,0.008,0.008)),[1,0.6,0.1],6,0,0)}
 }
 if(ball&&!ball.dead){const s=Math.sqrt(ball.vx*ball.vx+ball.vz*ball.vz);
  if(s>0.15){const ang=Math.atan2(ball.vz,ball.vx);
   draw(M_BOX,m4mul(m4mul(m4t(ball.x,BALL_R+0.03,ball.z),m4ry(-ang)),m4s(Math.min(0.9,s*0.12),0.01,0.01)),
    [0.3,0.9,1],6,0,0)}}
}
async function copyThrow(){
 if(!throwSnap){msg(tr("noThrowMsg"),900);return false}
 let ok=false;
 try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(throwSnap);ok=true}}catch(e){}
 if(!ok){
  const ta=document.createElement('textarea');ta.value=throwSnap;ta.style.cssText='position:fixed;left:-2000px;top:0';
  document.body.appendChild(ta);ta.select();try{ok=document.execCommand('copy')}catch(e){}ta.remove();
 }
 msg(ok?tr("copiedMsg"):tr("copyBlockedMsg"),1100);
 return ok;
}
/* input: only while step mode is live (or the live overlay owns the pointer) */
window.addEventListener('pointerdown',e=>{if(!dbgOn||e.target!==C)return;e.preventDefault();
 dbPtr.set(e.pointerId,[e.clientX,e.clientY]);
 if(dbPtr.size===2){dbPinch=dbPinchD();dbDrag=null}
 else dbDrag={x:e.clientX,y:e.clientY}});
window.addEventListener('pointermove',e=>{if(!dbPtr.has(e.pointerId))return;
 dbPtr.set(e.pointerId,[e.clientX,e.clientY]);
 if(dbPtr.size>=2){const d=dbPinchD();
  if(dbPinch)dbCam.dist=Math.max(0.15,Math.min(40,dbCam.dist*dbPinch/d));dbPinch=d;return}
 if(!dbDrag)return;
 dbCam.yaw+=(e.clientX-dbDrag.x)*0.006;
 dbCam.pitch=Math.max(-1.5,Math.min(1.5,dbCam.pitch+(e.clientY-dbDrag.y)*0.006));
 dbDrag={x:e.clientX,y:e.clientY}});
function dbLift(e){dbPtr.delete(e.pointerId);dbPinch=0;
 if(dbPtr.size){const p=[...dbPtr.values()][0];dbDrag={x:p[0],y:p[1]}}else dbDrag=null}
window.addEventListener('pointerup',dbLift);window.addEventListener('pointercancel',dbLift);
window.addEventListener('wheel',e=>{if(!dbgOn)return;e.preventDefault();
 dbCam.dist=Math.max(0.15,Math.min(40,dbCam.dist*Math.exp(e.deltaY*0.0012)))},{passive:false});
window.addEventListener('keydown',e=>{
 if(!dbgOn)return;
 const t=e.target;
 if(t&&(t.tagName==='TEXTAREA'||t.tagName==='INPUT')||t&&t.id&&String(t.id).indexOf('tll')===0)return;
 if(e.code==='KeyV'||e.code==='Escape'){dbExit();return}
 if(e.code==='ArrowRight'||e.code==='Period'){e.preventDefault();dbStep(e.shiftKey?10:1)}
 else if(e.code==='ArrowLeft'||e.code==='Comma'){e.preventDefault();dbStep(e.shiftKey?-10:-1)}
 else if(e.code==='Home')dbStep(-di);
 else if(e.code==='End')dbStep(Math.max(0,rec.length-1)-di);
 else if(e.code==='Space'){dbPlayToggle();e.preventDefault()}
 if('WASDQE'.includes(String(e.key).toUpperCase())||e.code==='ArrowUp'||e.code==='ArrowDown')dbk[e.code]=true;
});
window.addEventListener('keyup',e=>{dbk[e.code]=false});

/* ---------- the developer UI this file owns ---------- */
const STYLE=document.createElement('style');
STYLE.id="tll-bowl-style";
STYLE.textContent=
"#dbgbtn{position:fixed;left:8px;bottom:8px;display:none;z-index:7;font:700 clamp(10px,1.6vw,13px)/1 Arial;padding:10px 14px;border-radius:99px;border:1px solid #4df;color:#4df;background:rgba(0,10,20,.75);cursor:pointer}\n"+
"#dbar{position:fixed;left:50%;bottom:0;transform:translateX(-50%);display:none;z-index:9;align-items:center;gap:6px;padding:8px 10px;background:rgba(4,6,14,.85);border:1px solid rgba(77,221,255,.4);border-radius:10px 10px 0 0;color:#cfe}\n"+
"#dbar button{font:700 13px/1 Arial;padding:8px 11px;border-radius:8px;border:1px solid #468;background:#123;color:#cfe;cursor:pointer}\n"+
"#dbar button.on{background:#246;border-color:#4df}\n"+
"#dscrub{width:min(38vw,320px);accent-color:#4df}\n"+
"#dtxt{font:11px/1.5 monospace;white-space:pre;color:#9fe;min-width:230px}\n"+
/* phones cannot fit the bar as one row: the readout becomes a full-width header
   line above the controls, the scrub flexes, the buttons shrink. */
"@media(max-width:760px),(max-height:420px){\n"+
"#dbar{left:4px;right:4px;transform:none;flex-wrap:wrap;justify-content:center;gap:4px;padding:5px 6px;max-width:calc(100vw - 8px)}\n"+
"#dscrub{flex:1 1 140px;width:auto;min-width:0}\n"+
"#dtxt{order:-1;flex:1 0 100%;width:auto;min-width:0;text-align:center;font-size:10px;line-height:1.35}\n"+
"#dbar button{font-size:11px;padding:7px 9px}}\n";
document.head.appendChild(STYLE);
const DBTN=document.createElement('button');
DBTN.id="dbgbtn";DBTN.style.display='none';DBTN.textContent=tr("replay");DBTN.title=tr("replayTip");
DBTN.addEventListener('click',dbEnter);
document.body.appendChild(DBTN);
const DBAR=document.createElement('div');
DBAR.id="dbar";
DBAR.innerHTML='<button id="dbb">'+tr("dbBackTip")+'</button><button id="dbp">'+tr("dbPlayTip")
 +'</button><button id="dbf">'+tr("dbFwdTip")+'</button><input id="dscrub" type="range" min="0" max="0" value="0">'
 +'<span id="dtxt"></span><button id="dbc">'+tr("copyThrow")+'</button><button id="dbo">'+tr("exitKey")+'</button>';
document.body.appendChild(DBAR);
el("dbb").addEventListener('click',()=>dbStep(-1));
el("dbf").addEventListener('click',()=>dbStep(1));
el("dbp").addEventListener('click',dbPlayToggle);
el("dbo").addEventListener('click',dbExit);
el("dbc").addEventListener('click',copyThrow);
el("dscrub").addEventListener('input',e=>{dbPlay=false;const p=ui().play;
 if(p)p.classList.remove('on');recApply(+e.target.value);if(dbgOn)dbFollow();readout()});
function relabel(){DBTN.textContent=tr("replay");DBTN.title=tr("replayTip");
 el("dbb").textContent=tr("dbBackTip");el("dbp").textContent=tr("dbPlayTip");
 el("dbf").textContent=tr("dbFwdTip");el("dbc").textContent=tr("copyThrow");
 el("dbc").title=tr("copyTip");el("dbo").textContent=tr("exitKey");readout()}
try{if(window.TLI18N&&TLI18N.onChange)TLI18N.onChange(relabel)}catch(e){}

/* install the page's hooks (DB was declared at the top of the game script) */
const H=window.DBHOOKS||{};
H.draw=dbDraw;H.loop=dbLoop;H.camMove=dbCamMove;H.camUpdate=dbCamUpdate;
H.seek=i=>recApply(i);H.applyUI=()=>{if(dbgOn)dbFollow();readout()};
H.throwStart=()=>{if(!dbgOn)DBTN.style.display='none'};
H.throwEnd=()=>{if(!dbgOn&&rec&&rec.length)DBTN.style.display='block'};
window.DBG={on:dbEnter,off:dbExit,step:dbStep,seek:i=>recApply(i),n:()=>rec.length,
 play:v=>{dbPlay=!!v},pause:()=>{dbPlay=false},cam:dbCam,get frames(){return rec},
 active:()=>dbgOn,liveOverlay:v=>{live=!!v;H.live=live},throw:()=>throwSnap,copy:copyThrow};

/* ---------- harness registration ---------- */
const N={num:v=>typeof v==="number"&&isFinite(v)?v:0};
function throwThrow(){
 if(typeof phase!=="undefined"&&phase!=="play"){const b=document.getElementById("play");if(b)b.click();}
 if(rec&&rec.length)return;
 aim=0;power=0.6;spin=0.2;if(typeof throwBall==="function")throwBall();
}
TLDBG.register({
 game:"bowling100",file:"bowling100.html",
 control:[
  {id:"stepMode",label:"Enter or leave step mode",args:'"on" | "off"',argDefault:"on",
   doc:"DBG.on() pauses the live 120 Hz simulation and replays recorded frames; DBG.off() resumes live play. Throws a ball first if nothing is recorded yet.",
   run:v=>{const s=String(v||"on");if(s!=="off"&&!(rec&&rec.length))throwThrow();if(s==="off")DBG.off();else DBG.on();return{stepMode:DBG.active(),frames:DBG.n()}}},
  {id:"step",label:"Step the replay N frames",args:"frame count (negative rewinds)",argDefault:10,
   doc:"DBG.step(n) advances or rewinds the recorded throw frame by frame — the frame-accurate view of pin toppling. With nothing recorded it throws first and reports the frame count.",
   run:n=>{if(!(rec&&rec.length)){throwThrow();return"throw started — step again once frames are recorded";}DBG.step(Number(n)||1);return{frame:typeof di==="undefined"?null:di,of:DBG.n(),standing:typeof pinsStanding==="function"?pinsStanding():null}},
   },
  {id:"seek",label:"Jump to a recorded frame",args:"frame index",argDefault:0,
   doc:"DBG.seek(i) restores the whole simulation state (ball, pins, camera target) at frame i.",
   run:i=>{if(!(rec&&rec.length)){throwThrow();return"throw started — seek again once frames are recorded";}DBG.seek(Math.max(0,Math.min(DBG.n()-1,Math.round(Number(i)||0))));return{frame:typeof di==="undefined"?null:di,of:DBG.n(),pins:typeof pins==="undefined"?0:pins.length}},
   },
  {id:"play",label:"Play or hold the replay",args:'true | false',argDefault:true,
   doc:"DBG.play(v) runs the replay continuously at the slow-play rate; false holds the current frame.",
   run:v=>{DBG.play(v!==false&&v!=="false");return{playing:!!dbPlay,frame:typeof di==="undefined"?null:di}},
   },
  {id:"throw",label:"Throw a ball",args:"[aim, power, spin]",argDefault:"[0, 0.6, 0.2]",
   doc:"Writes aim/power/spin then throwBall() — the same launch the drag gesture feeds, so the physics records the whole throw.",
   run:a=>{
    if(typeof phase!=="undefined"&&phase!=="play"){const b=document.getElementById("play");if(b)b.click();}
    if(!Array.isArray(a))return"want [aim, power, spin]";
    aim=Number(a[0]);power=Number(a[1]);spin=Number(a[2]);
    if(typeof throwBall==="function")throwBall();
    return{aim:N.num(aim),power:N.num(power),spin:N.num(spin),recorded:typeof rec==="undefined"?0:rec.length,throwN:typeof throwN==="undefined"?null:throwN}},
   },
  {id:"rack",label:"Set pins in the rack",args:"pin count (1-200)",argDefault:10,
   doc:"Writes PC — odd rack counts (1, 3, 5, 7, 9) plus fullRack for the ten-pin layout.",
   run:n=>{PC=Math.max(1,Math.min(200,Math.round(Number(n)||10)));if(typeof newRack==="function")newRack();return{PC:PC,fullRack:typeof fullRack==="undefined"?null:fullRack,pins:typeof pins==="undefined"?0:pins.length}},
   },
  {id:"camera",label:"Set the free camera",args:"[yaw, pitch, distance]",argDefault:"[0.4, 0.3, 6]",
   doc:"Writes dbCam — the orbit the drag/wheel gestures drive while in step mode.",
   run:a=>{
    if(!Array.isArray(a))return"want [yaw, pitch, distance]";
    dbCam.yaw=Number(a[0]);dbCam.pitch=Number(a[1]);dbCam.dist=Number(a[2]);
    return{yaw:+dbCam.yaw.toFixed(3),pitch:+dbCam.pitch.toFixed(3),dist:+dbCam.dist.toFixed(2)}},
   },
  {id:"overlay",label:"Live overlay on or off",args:'true | false',argDefault:true,
   doc:"DBG.liveOverlay(v) draws the physics readout over the live game while you tune, off for clean screenshots.",
   run:v=>{DBG.liveOverlay(v!==false&&v!=="false");return{live:!!live,stepMode:DBG.active()}},
   },
  {id:"probe",label:"Read the simulation state",args:"unused",
   doc:"Phase and frame, throw number and rack size, aim/power/spin, ball kinematics (position, velocity, spin, gutter, drop, dead, active), standing pins, recorded frame count and playback position, camera and free-camera pose.",
   run:()=>{
    const out={phase:typeof phase==="undefined"?null:phase,frame:typeof frame==="undefined"?null:frame,
      throwN:typeof throwN==="undefined"?null:throwN,PC:typeof PC==="undefined"?null:PC,
      aim:N.num(aim),power:N.num(power),spin:N.num(spin),fullRack:typeof fullRack==="undefined"?null:fullRack,
      pins:typeof pins==="undefined"?0:pins.length,standing:typeof pinsStanding==="function"?pinsStanding():null,
      recorded:typeof rec==="undefined"?0:rec.length,atFrame:typeof di==="undefined"?0:di,
      stepMode:dbgOn,playing:!!dbPlay,live:!!live};
    if(typeof ball!=="undefined"&&ball)out.ball={x:+ball.x.toFixed(3),z:+ball.z.toFixed(3),y:+(ball.y||0).toFixed(3),
      v:+(ball.v||0).toFixed(2),vx:+ball.vx.toFixed(2),vz:+ball.vz.toFixed(2),spin:+(ball.spin||0).toFixed(2),
      gutter:!!ball.gutter,drop:+(ball.drop||0).toFixed(3),dead:!!ball.dead,active:!!ball.active};
    return out;
   }},
  {id:"watch",label:"Log the throw every N seconds",args:"seconds (0 stops)",argDefault:0.4,
   doc:"Ball position/speed and standing pin count each interval while a throw runs; window.__tllBowl holds the timer.",
   run:s=>{
    if(window.__tllBowl){clearInterval(window.__tllBowl);window.__tllBowl=null}
    const sec=Number(s);if(!(sec>0))return"watch stopped";
    window.__tllBowl=setInterval(()=>{
      const b=(typeof ball!=="undefined"&&ball)?ball:null;
      console.log("ball",b?(b.x.toFixed(2)+","+b.z.toFixed(2)+" v"+(b.v||0).toFixed(2)+(b.gutter?" GUTTER":"")):"-",
        "standing",typeof pinsStanding==="function"?pinsStanding():"-","frame",typeof di==="undefined"?frame:di,"phase",typeof phase==="undefined"?null:phase);
    },sec*1000);
    return"watching every "+sec+"s";
   }}
 ],

 recipes:[
  {label:"Frame-by-frame topple trace",
   doc:"Throws, then walks the recorded frames printing ball position and standing pins each 5 frames — the pin-action timeline.",
   js:"var D=window.DBG;if(!D.active())D.on();D.seek(0);\nvar out=[];\nfor(var i=0;i<D.n();i+=5){D.seek(i);\n out.push({frame:i,ball:(typeof ball!=='undefined'&&ball)?ball.x.toFixed(2)+','+ball.z.toFixed(2):'-',standing:typeof pinsStanding==='function'?pinsStanding():'-',gutter:(typeof ball!=='undefined'&&ball)?!!ball.gutter:null});}\nconsole.table(out);"},
  {label:"Rack-size sweep",
   doc:"Throws at 1, 3, 5, 7, 9 and 10 pins with the same line and prints what survives — the spare-conversion check per rack size.",
   js:"var out=[],racks=[1,3,5,7,9,10],i=0;\nwindow.__tllBowl=setInterval(function(){\n PC=racks[i]; if(typeof newRack==='function')newRack();\n aim=0;power=0.6;spin=0.2; if(typeof throwBall==='function')throwBall();\n setTimeout(function(){out.push({pins:racks[i],standing:typeof pinsStanding==='function'?pinsStanding():'-',recorded:rec.length});},2200);\n if(++i>=racks.length){clearInterval(window.__tllBowl);setTimeout(function(){console.table(out);},2500);}\n},2600);"}
 ],

 docs:[
  {topic:"What this panel is",text:"Live map of bowling100's physics: 120 Hz rigid-pin simulation (tip-over toppling, chain collisions, lane/gutter geometry). STATE reads the game's own variables; BALANCE holds the coefficients; CHEATS and the step-mode bar are the debugging tools."},
  {topic:"Step mode (REPLAY)",text:"After a throw the REPLAY button appears bottom-left. It pauses the live simulation and replays the recorded frames one at a time: , / Left back one frame, . / Right forward (Shift = 10), Home/End, Space auto-play, V or Escape exit. Exiting ALWAYS resumes from the throw's final frame, so THROW 2 continues where the throw really ended."},
  {topic:"Free camera",text:"While in step mode: drag orbits around the ball, wheel or two-finger pinch zooms (0.15-40 m), WASD pans, Q/E move up-down. The pivot tracks the ball until it drops off the deck, then holds."},
  {topic:"Velocity overlay",text:"In step mode (or with the live-overlay cheat on): red box = pin slide velocity, amber = tip-over rotation, cyan = ball motion. Drawn inside the game's own render pass, so it follows the same camera."},
  {topic:"COPY THROW",text:"Puts the throw's full initial state JSON on the clipboard: ball and every pin's position/velocity/rotation plus the physics constants (K block). Paste it to an LLM to re-simulate the throw 1:1 or to reason about a bug."},
  {topic:"What is NOT reachable",text:"BALL_R, MBALL, PIN_H, PR, PIN_S, PIN_RZ, PITZ, PITEDGE, PIN_CG, TIPC, GTOP, KREST, CDAMP and DT are page-level const bindings: readable here, not writable at runtime. Those rows say READ ONLY and point at the line to edit in the file. HOOK (2.1) and FR (0.55) are inline literals in the integrator, so they are read-only rows too."},
  {topic:"Layout and texts",text:"Layout edits are written per screen mode (portrait/landscape x mobile/desktop) and exported as media-query hints. Texts come from the shared kit (i18n.js): 5 languages, every key of this page. The step-mode bar's own labels are NOT in the kit table - they live in this file."}
 ],
 state:function(){
  const out={phase:typeof phase==="undefined"?null:phase,frame:typeof frame==="undefined"?null:frame,
   throwN:typeof throwN==="undefined"?null:throwN,PC:typeof PC==="undefined"?null:PC,
   aim:N.num(aim),power:N.num(power),spin:N.num(spin),startX:N.num(startX),astep:typeof astep==="undefined"?null:astep,
   pins:typeof pins==="undefined"?0:pins.length,
   standing:(typeof pins!=="undefined"&&typeof pinsStanding==="function")?pinsStanding():null,
   fullRack:typeof fullRack==="undefined"?null:fullRack,
   RS:N.num(typeof RS==="undefined"?0:RS),SHQ:typeof SHQ==="undefined"?null:SHQ,
   recorded:typeof rec==="undefined"?0:rec.length,atFrame:typeof di==="undefined"?0:di,
   stepMode:dbgOn,slowPlay:dbPlay,
   cam:{x:N.num(camX),y:N.num(camY),z:N.num(camZ),look:[N.num(lkX),N.num(lkY),N.num(lkZ)],fov:N.num(fov)},
   dbCam:{yaw:+dbCam.yaw.toFixed(3),pitch:+dbCam.pitch.toFixed(3),dist:+dbCam.dist.toFixed(2)}};
  if(typeof ball!=="undefined"&&ball)out.ball={x:+ball.x.toFixed(3),z:+ball.z.toFixed(3),y:+(ball.y||0).toFixed(3),
   v:+(ball.v||0).toFixed(2),vx:+ball.vx.toFixed(2),vz:+ball.vz.toFixed(2),spin:+(ball.spin||0).toFixed(2),
   gutter:!!ball.gutter,drop:+(ball.drop||0).toFixed(3),dead:!!ball.dead,active:!!ball.active};
  return out;
 },
 params:[
  {id:"PC",label:"Pins in the rack",min:1,max:200,step:1,get:()=>PC,set:v=>{PC=v|0},
   code:{file:"bowling100.html",line:929,name:"PC"},
   doc:"how many pins stand; the mode buttons set it to 10 or 100. Raising it without setMode() leaves the rack layout and lane width alone."},
  {id:"LW",label:"Lane width",unit:"m",min:0.6,max:6,step:0.02,get:()=>LW,set:v=>{LW=v;LWH=LW/2;WALLX=LWH+GUTW+0.04},
   code:{file:"bowling100.html",line:929,name:"LW"},
   doc:"playable width; the walls and the gutter mouth move with it (the setter recomputes WALLX)."},
  {id:"GUTW",label:"Gutter width",unit:"m",min:0.05,max:1.2,step:0.01,get:()=>GUTW,
   set:v=>{GUTW=v;LWH=LW/2;WALLX=LWH+GUTW+0.04},
   code:{file:"bowling100.html",line:929,name:"GUTW"},
   doc:"how far outside the lane a ball can still roll before it is a gutter ball."},
  {id:"RACKZ",label:"Rack depth",unit:"m",min:-26,max:-8,step:0.1,get:()=>RACKZ,set:v=>{RACKZ=v},
   code:{file:"bowling100.html",line:929,name:"RACKZ"},
   doc:"z of the head pin; the whole triangle hangs from it."},
  {id:"AIMCAP",label:"Aim window",unit:"rad",min:0.005,max:0.2,step:0.002,get:()=>AIMCAP,set:v=>{AIMCAP=v},
   code:{file:"bowling100.html",line:930,name:"AIMCAP"},
   doc:"half-angle the aim step can swing from straight down the lane."},
  {id:"STARTXW",label:"Start width",unit:"m",min:0.1,max:2,step:0.05,get:()=>STARTXW,set:v=>{STARTXW=v},
   code:{file:"bowling100.html",line:930,name:"STARTXW"},
   doc:"how far left/right the ball can be placed at the foul line."},
  {id:"LANEZ",label:"Foul-line z",unit:"m",min:-26,max:-10,step:0.1,get:()=>LANEZ,set:v=>{LANEZ=v},
   code:{file:"bowling100.html",line:930,name:"LANEZ"},
   doc:"where the ball starts; the camera and the aim UI reference it."},
  {id:"MPIN",label:"Pin mass",unit:"kg",min:0.2,max:8,step:0.02,get:()=>MPIN,set:v=>{MPIN=v},
   code:{file:"bowling100.html",line:942,name:"MPIN"},
   doc:"regulation 1.56 kg. Heavier pins fly less and topple harder against neighbours."},
  {id:"PMW",label:"100-pin mass factor",min:0.05,max:2,step:0.02,get:()=>PMW,set:v=>{PMW=v},
   code:{file:"bowling100.html",line:942,name:"PMW"},
   doc:"scales pin mass and inertia together in wide mode; setMode() applies it, so edit it then press the 100-pin mode to see the effect."},
  {id:"I_CM",label:"Pin inertia",unit:"kg m^2",min:0.002,max:0.1,step:0.0005,get:()=>I_CM,set:v=>{I_CM=v},
   code:{file:"bowling100.html",line:1117,name:"I_CM"},
   doc:"rotational inertia about the pin's centre of mass; lower tips over faster."},
  {id:"gripDry",label:"Lane grip (dry)",min:0,max:1,step:0.01,
   get:()=>(typeof grip==="function"?0.06:0),
   set:v=>{const k=v;try{grip=function(z){return z>-12.6?k:Math.max(0,Math.min(1,(-z-12.6)/1.8))*k}}catch(e){}},
   code:{file:"bowling100.html",line:1118,name:"grip"},
   doc:"friction the ball feels near the foul line, ramping in over the last metres; drives hook. The setter replaces the page's grip() function, so this is live. 0.06 is the shipped value."},
  {id:"FLIK_SPD1",label:"Flick speed ceiling",unit:"px/s",min:600,max:6000,step:50,get:()=>FLIK.SPD1,set:v=>{FLIK.SPD1=v},
   code:{file:"bowling100.html",line:2400,name:"FLIK.SPD1"},
   doc:"drag speed that maps to full launch power."},
  {id:"FLIK_TRAV1",label:"Flick travel ceiling",unit:"px",min:120,max:1200,step:10,get:()=>FLIK.TRAV1,set:v=>{FLIK.TRAV1=v},
   code:{file:"bowling100.html",line:2400,name:"FLIK.TRAV1"},
   doc:"drag distance that maps to full launch power."},
  {id:"FLIK_HSPD1",label:"Hook speed ceiling",unit:"px/s",min:400,max:4000,step:50,get:()=>FLIK.HSPD1,set:v=>{FLIK.HSPD1=v},
   code:{file:"bowling100.html",line:2401,name:"FLIK.HSPD1"},
   doc:"horizontal drag speed that maps to maximum hook/spin."},
  {id:"FLIK_MINP",label:"Minimum throw power",min:0,max:0.5,step:0.01,get:()=>FLIK.MINP,set:v=>{FLIK.MINP=v},
   code:{file:"bowling100.html",line:2402,name:"FLIK.MINP"},
   doc:"floor of the power ramp; below the flick threshold a tap still rolls the ball this slowly."},
  {id:"fov",label:"Camera FOV",unit:"deg",min:12,max:80,step:1,get:()=>fov,set:v=>{fov=v},
   code:{file:"bowling100.html",line:1733,name:"fov"},
   doc:"the live follow camera's field of view."},
  {id:"camY",label:"Camera height",unit:"m",min:0.2,max:6,step:0.1,get:()=>camY,set:v=>{camY=v},
   code:{file:"bowling100.html",line:1733,name:"camY"},
   doc:"eye height of the follow camera."},
  {id:"RS",label:"Render scale",min:0.4,max:1,step:0.05,get:()=>RS,set:v=>{RS=Math.max(0.4,Math.min(1,v));resize()},
   code:{file:"bowling100.html",line:416,name:"RS"},
   doc:"resolution ladder the AUTO watchdog rides; the GRAPHICS menu pins it in CUSTOM."},
  {id:"DT",label:"Physics step",unit:"s",min:0.001,max:0.02,step:0.001,get:()=>DT,set:null,readonly:true,
   code:{file:"bowling100.html",line:2825,name:"DT"},
   doc:"READ ONLY (page const). 1/120 s fixed step; change it in the file — every tuning number here is calibrated against it."},
  {id:"BALL_R",label:"Ball radius",unit:"m",get:()=>BALL_R,set:null,readonly:true,
   code:{file:"bowling100.html",line:974,name:"BALL_R"},doc:"READ ONLY (page const): 0.109 m regulation."},
  {id:"MBALL",label:"Ball mass",unit:"kg",get:()=>MBALL,set:null,readonly:true,
   code:{file:"bowling100.html",line:974,name:"MBALL"},doc:"READ ONLY (page const): 6.8 kg."},
  {id:"PIN_H",label:"Pin height",unit:"m",get:()=>PIN_H,set:null,readonly:true,
   code:{file:"bowling100.html",line:975,name:"PIN_H"},doc:"READ ONLY (page const): 0.381 m."},
  {id:"PIN_CG",label:"Pin centre of mass",unit:"m",get:()=>PIN_CG,set:null,readonly:true,
   code:{file:"bowling100.html",line:1116,name:"PIN_CG"},
   doc:"READ ONLY (page const): 0.142 m above the base — what makes a pin tip rather than slide."},
  {id:"TIPC",label:"Tip angle",unit:"rad",get:()=>TIPC,set:null,readonly:true,
   code:{file:"bowling100.html",line:1116,name:"TIPC"},
   doc:"READ ONLY (page const): atan(0.0254/PIN_CG), the angle a pin must reach before it falls on its own."},
  {id:"KREST",label:"Restitution",get:()=>KREST,set:null,readonly:true,
   code:{file:"bowling100.html",line:1116,name:"KREST"},doc:"READ ONLY (page const): bounce energy on pin-pin and pin-ball hits."},
  {id:"CDAMP",label:"Contact damping",get:()=>CDAMP,set:null,readonly:true,
   code:{file:"bowling100.html",line:1116,name:"CDAMP"},doc:"READ ONLY (page const): how fast sliding contact bleeds energy."},
  {id:"FR",label:"Rolling friction",get:()=>0.55,set:null,readonly:true,
   code:{file:"bowling100.html",line:1598,name:"FR"},doc:"READ ONLY: inline literal in the integrator and in the COPY THROW K block."},
  {id:"HOOK",label:"Hook transfer",get:()=>2.1,set:null,readonly:true,
   code:{file:"bowling100.html",line:2446,name:"HOOK"},
   doc:"READ ONLY: inline literal that converts spin + grip into sideways push."}
 ],
 cheats:[
  {id:"liveOverlay",label:"Velocity overlay in live play",toggle:true,
   doc:"draws the pin/ball velocity vectors while the game runs normally (no step mode). Off restores the plain render.",
   on:v=>{live=!!v;window.DBHOOKS.live=live}},
  {id:"forceStrike",label:"Knock every pin down",
   doc:"flattens the current rack (down, dead, no motion) so scoring sees a cleared rack on the next endThrow.",
   run:()=>{for(const p of pins){p.down=1;p.dead=1;p.th=Math.PI/2;p.vx=0;p.vz=0;p.om=0;p.vy=0;p.drop=0.06}}},
  {id:"instantSettle",label:"End the throw now",
   doc:"runs endThrow() immediately from roll/settle: jump straight to scoring and the next ball.",
   run:()=>{if(phase==='roll'||phase==='settle')endThrow()}},
  {id:"resetRack",label:"Stand the rack back up",
   doc:"restores every pin to its rack spot with zero motion, mid-throw.",
   run:()=>{for(const p of pins){p.x=p.x0;p.z=p.z0;p.y=0;p.vx=p.vy=p.vz=0;p.th=p.om=p.drop=0;p.dir=0;p.ah=0;p.down=0;p.dead=0}}},
  {id:"maxPower",label:"Full power, straight down the lane",
   doc:"locks aim/spin to zero and power to 1, then throws: the same path the flick would produce at full strength.",
   run:()=>{if(phase!=='aim')return;aim=0;spin=0;power=1;throwBall()}},
  {id:"noGutter",label:"Widen the lane past the walls",
   doc:"sets lane width and wall offset wide enough that a ball at the rail cannot fall into the gutter; good for isolating pin-chain behaviour.",
   run:()=>{LW=8;LWH=4;WALLX=6}},
  {id:"slowSink",label:"Drop the ball early",
   doc:"gives the ball a pit drop right away — exercises the pit/gutter sinking code without a real throw.",
   run:()=>{if(ball)ball.drop=0.02}},
  {id:"copyThrow",label:"COPY THROW state to clipboard",
   doc:"the throw's full initial state JSON (ball, every pin, physics constants) — paste it to re-simulate or to an LLM.",
   run:()=>copyThrow()},
  {id:"stepEnter",label:"Enter step mode (REPLAY)",
   doc:"the same as the REPLAY button: pause the live sim and walk the recorded frames.",
   run:()=>dbEnter()},
  {id:"stepExit",label:"Exit step mode",
   doc:"resumes normal play from the throw's final recorded frame.",
   run:()=>dbExit()}
 ],
 hooks:[
  {label:"Dump the throw JSON",doc:"console.log the COPY THROW payload (throwSnap).",run:()=>{console.log(throwSnap||"(no throw recorded yet)");return throwSnap}},
  {label:"Dump the frame recorder",doc:"console.table of a compact view of every recorded frame: ball speed, pins standing, drop/dead flags.",
   run:()=>{const rows=rec.map((a,i)=>({f:i,t:+(i/120).toFixed(3),v:+a[6].toFixed(2),x:+a[0].toFixed(2),z:+a[2].toFixed(2),
    gutter:a[3],drop:+(a[4]||0).toFixed(3),dead:a[5]}));console.table(rows);return rows}},
  {label:"Dump pin states",doc:"console.table of each live pin: position, tilt, rotation rate, down/dead.",
   run:()=>{const rows=pins.map((p,i)=>({i:i,x:+p.x.toFixed(3),z:+p.z.toFixed(3),th:+(p.th||0).toFixed(3),
    om:+(p.om||0).toFixed(3),vx:+(p.vx||0).toFixed(2),vz:+(p.vz||0).toFixed(2),down:!!p.down,dead:!!p.dead}));
    console.table(rows);return rows}},
  {label:"List physics constants",doc:"the K block the game stamps into every throw, so you can read the shipped values.",
   run:()=>{const k={PC:PC,PIN_CG:PIN_CG,I_CM:I_CM,TIPC:TIPC,LW:LW,PINZ:RACKZ,PITZ:PITZ,PITEDGE:PITEDGE,
    BALL_R:BALL_R,MBALL:MBALL,PIN_H:PIN_H,PR:PR,MPIN:MPIN,PIN_S:PIN_S,PIN_RZ:PIN_RZ,DT:DT,FR:0.55,HOOK:2.1};
    console.table(k);return k}}
 ],
 layout:[
  {sel:"#hud",label:"HUD strip (status / sheet / info)"},
  {sel:"#status",label:"frame + throw line"},
  {sel:"#sheet",label:"score sheet"},
  {sel:"#info",label:"step hint line"},
  {sel:"#scr",label:"title / menu screen"},
  {sel:"#play",label:"PLAY button"},
  {sel:"#btn",label:"next-action button"},
  {sel:"#skipbtn",label:"SKIP replay button"},
  {sel:"#sbtn",label:"sound toggle"},
  {sel:"#helpbtn",label:"how-to-play button"},
  {sel:"#optbtn",label:"options button"},
  {sel:"#modes",label:"10 / 100 pin mode switch"},
  {sel:"#opts",label:"graphics options panel"},
  {sel:"#end",label:"game-over panel"},
  {sel:"#dbgbtn",label:"REPLAY button (harness only)",note:"created by this harness file, not part of the page"},
  {sel:"#dbar",label:"step-mode bar (harness only)",note:"created by this harness file"}
 ]
});
try{readout()}catch(e){}
})();
