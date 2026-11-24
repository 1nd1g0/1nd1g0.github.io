/* ============================================================================
   i18n.js — shared language kit for every page of this site.
   Language code decision tree (identical everywhere, in this order):
     0. any technical problem with this kit -> English
     1. URL ?language=xx      (a region suffix is fine: pt-BR, zh-CN)
     2. localStorage['tll:lang']
     3. the browser's language list (navigator.languages, then navigator.language)
     4. English
   A code outside CODES is dropped, not trusted, so the next level decides. Only
   the picker button writes storage, so a ?language= link never overwrites the
   visitor's saved choice.

   Page usage
     <script src="i18n.js"></script>            BEFORE the game script
     <script>TLI18N.add({en:{k:"Text"},es:{...},pt:{...},ru:{...},zh:{...}})</script>
     markup:  <b data-t="score">SCORE</b>  <button data-tip="help">?</button>
              <input data-ph="name">  <i data-aria="pause">  <img data-alt="car">
     js:      el.textContent=TLI18N.t("gameOver");
              el.innerHTML="<b>"+TLI18N.t("best")+": "+n+"</b>";
              ctx.fillText(TLI18N.t("paused"),x,y);
     canvas / innerHTML redraws: TLI18N.onChange(()=>redrawAll());
     pick a host for the language button: TLI18N.mount("#startPanel")
       (omit it and the kit parks a pill in the lower-left corner)
   Keys missing from a non-English table fall back to English, so a half
   translated table still runs. Values for *Fmt keys carry {placeholders}.
   ========================================================================= */
(function(){
"use strict";
var KEY="tll:lang", CODES=["en","es","pt","ru","zh"];
var LANGS=[ // code · name in its own language · that word for "language" · its flag
 ['en','English','Language','<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><path d="M0,0 60,40M60,0 0,40" stroke="#fff" stroke-width="8"/><path d="M0,0 60,40M60,0 0,40" stroke="#C8102E" stroke-width="3.2"/><path d="M30,0V40M0,20H60" stroke="#fff" stroke-width="13"/><path d="M30,0V40M0,20H60" stroke="#C8102E" stroke-width="8"/></svg>'],
 ['es','Español','Idioma','<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#AA151B"/><path d="M0,10H60M0,30H60" stroke="#F1BF00" stroke-width="20"/>  </svg>'],
 ['pt','Português','Idioma','<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="40" fill="#046A38"/><rect x="24" width="36" height="40" fill="#DA291C"/><circle cx="24" cy="20" r="7.5" fill="#FEDF00" stroke="#046A38" stroke-width="1.4"/><path d="M24,14.5 24,22.5M20.5,17.5H27.5" stroke="#DA291C" stroke-width="2.2" fill="none"/></svg>'],
 ['ru','Русский','Язык','<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#fff"/><rect y="13.34" width="60" height="13.33" fill="#0039A6"/><rect y="26.67" width="60" height="13.33" fill="#D52B1E"/></svg>'],
 ['zh','中文','语言','<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#EE1C25"/><circle cx="10" cy="10" r="5.6" fill="#FFDC00"/><circle cx="21" cy="6" r="2.1" fill="#FFDC00"/><circle cx="26" cy="11.5" r="2.1" fill="#FFDC00"/><circle cx="26" cy="18.5" r="2.1" fill="#FFDC00"/><circle cx="21" cy="24" r="2.1" fill="#FFDC00"/></svg>']
];
/* ---- shared vocabulary: the same word means the same thing in every game.
       Values carry no glyphs — pages keep their ⌂ ▶ ■ icons in the markup. ---- */
var COMMON={
en:{
 paused:"PAUSED",pause:"PAUSE",resume:"RESUME",start:"START",play:"PLAY",home:"HOME",menu:"MENU",
 options:"OPTIONS",settings:"SETTINGS",help:"HELP",howToPlay:"HOW TO PLAY",rules:"RULES",controls:"CONTROLS",
 keys:"KEYS",gamepad:"GAMEPAD",mouse:"MOUSE",touch:"TOUCH",
 sound:"SOUND",music:"MUSIC",sfx:"SOUND FX",on:"ON",off:"OFF",fullscreen:"FULLSCREEN",exitFullscreen:"EXIT FULLSCREEN",
 difficulty:"DIFFICULTY",easy:"EASY",normal:"NORMAL",hard:"HARD",low:"LOW",high:"HIGH",
 score:"SCORE",best:"BEST",hiScore:"HIGH SCORE",level:"LEVEL",lives:"LIVES",time:"TIME",
 speed:"SPEED",round:"ROUND",wave:"WAVE",seed:"SEED",newSeed:"NEW SEED",
 restart:"RESTART",retry:"RETRY",continue:"CONTINUE",tryAgain:"TRY AGAIN",nextLevel:"NEXT LEVEL",
 gameOver:"GAME OVER",youWin:"YOU WIN",youLose:"GAME OVER",clear:"CLEARED",
 fire:"FIRE",jump:"JUMP",back:"BACK",exit:"EXIT",close:"CLOSE",ok:"OK",cancel:"CANCEL",
 loading:"LOADING",shots:"SHOTS",moves:"MOVES",power:"POWER",angle:"ANGLE",
 langTitle:"LANGUAGE",langNote:"Choose your language — it is remembered, and it applies to this game and to the whole catalogue.",
 langBack:"CHANGE LANGUAGE",players:"PLAYERS",player:"PLAYER",you:"YOU",cpu:"CPU",random:"RANDOM"},
es:{
 paused:"PAUSA",pause:"PAUSA",resume:"CONTINUAR",start:"INICIO",play:"JUGAR",home:"INICIO",menu:"MENÚ",
 options:"OPCIONES",settings:"AJUSTES",help:"AYUDA",howToPlay:"CÓMO JUGAR",rules:"REGLAS",controls:"CONTROLES",
 keys:"TECLAS",gamepad:"MANDO",mouse:"RATÓN",touch:"TÁCTIL",
 sound:"SONIDO",music:"MÚSICA",sfx:"EFECTOS",on:"ACTIVO",off:"APAGADO",fullscreen:"PANTALLA COMPLETA",exitFullscreen:"SALIR DE PANTALLA COMPLETA",
 difficulty:"DIFICULTAD",easy:"FÁCIL",normal:"NORMAL",hard:"DIFÍCIL",low:"BAJO",high:"ALTO",
 score:"PUNTOS",best:"RÉCORD",hiScore:"RÉCORD",level:"NIVEL",lives:"VIDAS",time:"TIEMPO",
 speed:"VELOCIDAD",round:"RONDA",wave:"OLEADA",seed:"SEMILLA",newSeed:"NUEVA SEMILLA",
 restart:"REINICIAR",retry:"REINTENTAR",continue:"CONTINUAR",tryAgain:"INTÉNTALO OTRA VEZ",nextLevel:"SIGUIENTE NIVEL",
 gameOver:"FIN DEL JUEGO",youWin:"¡GANASTE!",youLose:"FIN DEL JUEGO",clear:"SUPERADO",
 fire:"DISPARO",jump:"SALTAR",back:"ATRÁS",exit:"SALIR",close:"CERRAR",ok:"ACEPTAR",cancel:"CANCELAR",
 loading:"CARGANDO",shots:"LANZAMIENTOS",moves:"MOVIMIENTOS",power:"FUERZA",angle:"ÁNGULO",
 langTitle:"IDIOMA",langNote:"Elige tu idioma: se recuerda y se aplica a este juego y a todo el catálogo.",
 langBack:"CAMBIAR IDIOMA",players:"JUGADORES",player:"JUGADOR",you:"TÚ",cpu:"CPU",random:"ALEATORIO"},
pt:{
 paused:"PAUSA",pause:"PAUSA",resume:"CONTINUAR",start:"INÍCIO",play:"JOGAR",home:"INÍCIO",menu:"MENU",
 options:"OPÇÕES",settings:"CONFIGURAÇÕES",help:"AJUDA",howToPlay:"COMO JOGAR",rules:"REGRAS",controls:"CONTROLES",
 keys:"TECLAS",gamepad:"CONTROLE",mouse:"MOUSE",touch:"TOQUE",
 sound:"SOM",music:"MÚSICA",sfx:"EFEITOS",on:"LIGADO",off:"DESLIGADO",fullscreen:"TELA CHEIA",exitFullscreen:"SAIR DA TELA CHEIA",
 difficulty:"DIFICULDADE",easy:"FÁCIL",normal:"NORMAL",hard:"DIFÍCIL",low:"BAIXO",high:"ALTO",
 score:"PONTOS",best:"RECORDE",hiScore:"RECORDE",level:"NÍVEL",lives:"VIDAS",time:"TEMPO",
 speed:"VELOCIDADE",round:"RODADA",wave:"ONDA",seed:"SEMENTE",newSeed:"NOVA SEMENTE",
 restart:"REINICIAR",retry:"TENTAR DE NOVO",continue:"CONTINUAR",tryAgain:"TENTE DE NOVO",nextLevel:"PRÓXIMO NÍVEL",
 gameOver:"FIM DE JOGO",youWin:"VOCÊ VENCEU",youLose:"FIM DE JOGO",clear:"COMPLETO",
 fire:"DISPARO",jump:"SALTAR",back:"VOLTAR",exit:"SAIR",close:"FECHAR",ok:"OK",cancel:"CANCELAR",
 loading:"CARREGANDO",shots:"BATIDAS",moves:"JOGADAS",power:"FORÇA",angle:"ÂNGULO",
 langTitle:"IDIOMA",langNote:"Escolha seu idioma: ele é lembrado e vale para este jogo e para todo o catálogo.",
 langBack:"MUDAR IDIOMA",players:"JOGADORES",player:"JOGADOR",you:"VOCÊ",cpu:"CPU",random:"ALEATÓRIO"},
ru:{
 paused:"ПАУЗА",pause:"ПАУЗА",resume:"ПРОДОЛЖИТЬ",start:"СТАРТ",play:"ИГРАТЬ",home:"ДОМОЙ",menu:"МЕНЮ",
 options:"НАСТРОЙКИ",settings:"НАСТРОЙКИ",help:"ПОМОЩЬ",howToPlay:"КАК ИГРАТЬ",rules:"ПРАВИЛА",controls:"УПРАВЛЕНИЕ",
 keys:"КЛАВИШИ",gamepad:"ГЕЙМПАД",mouse:"МЫШЬ",touch:"СЕНСОР",
 sound:"ЗВУК",music:"МУЗЫКА",sfx:"ЗВУКИ",on:"ВКЛ",off:"ВЫКЛ",fullscreen:"НА ВЕСЬ ЭКРАН",exitFullscreen:"ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА",
 difficulty:"СЛОЖНОСТЬ",easy:"ЛЕГКО",normal:"СРЕДНЕ",hard:"СЛОЖНО",low:"НИЗКО",high:"ВЫСОКО",
 score:"ОЧКИ",best:"РЕКОРД",hiScore:"РЕКОРД",level:"УРОВЕНЬ",lives:"ЖИЗНИ",time:"ВРЕМЯ",
 speed:"СКОРОСТЬ",round:"РАУНД",wave:"ВОЛНА",seed:"КОД УР.",newSeed:"НОВЫЙ КОД",
 restart:"ЗАНОВО",retry:"ПОВТОРИТЬ",continue:"ПРОДОЛЖИТЬ",tryAgain:"ПОПРОБУЙ ЕЩЁ",nextLevel:"СЛЕДУЮЩИЙ УРОВЕНЬ",
 gameOver:"ИГРА ОКОНЧЕНА",youWin:"ПОБЕДА",youLose:"ПРОИГРАЛИ",clear:"УРОВЕНЬ ПРОЙДЕН",
 fire:"ОГОНЬ",jump:"ПРЫЖОК",back:"НАЗАД",exit:"ВЫХОД",close:"ЗАКРЫТЬ",ok:"ОК",cancel:"ОТМЕНА",
 loading:"ЗАГРУЗКА",shots:"УДАРЫ",moves:"ХОДЫ",power:"СИЛА",angle:"УГОЛ",
 langTitle:"ЯЗЫК",langNote:"Выберите язык — он запоминается и действует для этой игры и для всего каталога.",
 langBack:"СМЕНИТЬ ЯЗЫК",players:"ИГРОКИ",player:"ИГРОК",you:"ВЫ",cpu:"КОМПЬЮТЕР",random:"СЛУЧАЙНО"},
zh:{
 paused:"暂停",pause:"暂停",resume:"继续",start:"开始",play:"开始游戏",home:"主页",menu:"菜单",
 options:"选项",settings:"设置",help:"帮助",howToPlay:"怎么玩",rules:"规则",controls:"操作",
 keys:"按键",gamepad:"手柄",mouse:"鼠标",touch:"触摸",
 sound:"声音",music:"音乐",sfx:"音效",on:"开",off:"关",fullscreen:"全屏",exitFullscreen:"退出全屏",
 difficulty:"难度",easy:"简单",normal:"普通",hard:"困难",low:"低",high:"高",
 score:"得分",best:"最高分",hiScore:"最高分",level:"关卡",lives:"生命",time:"时间",
 speed:"速度",round:"回合",wave:"波次",seed:"种子",newSeed:"新种子",
 restart:"重新开始",retry:"重试",continue:"继续",tryAgain:"再试一次",nextLevel:"下一关",
 gameOver:"游戏结束",youWin:"胜利",youLose:"游戏结束",clear:"过关",
 fire:"射击",jump:"跳跃",back:"返回",exit:"退出",close:"关闭",ok:"确定",cancel:"取消",
 loading:"加载中",shots:"击球",moves:"步数",power:"力量",angle:"角度",
 langTitle:"语言",langNote:"选择语言：会被记住，并用于这个游戏和整个游戏目录。",
 langBack:"更换语言",players:"玩家",player:"玩家",you:"你",cpu:"电脑",random:"随机"}
};
var PAGE={en:{},es:{},pt:{},ru:{},zh:{}};
function lget(){try{return localStorage.getItem(KEY)}catch(e){return null}}
function lset(v){try{localStorage.setItem(KEY,v)}catch(e){}}
var code=null;
/* A browser language list -> a supported code, or null when it says nothing
   usable. "pt-BR", "ru_RU", "zh-CN" all match on their 2-letter base. */
function fromBrowser(){
 try{
  var list=null;
  if(navigator&&Array.isArray(navigator.languages)&&navigator.languages.length)list=navigator.languages;
  else if(navigator)list=[navigator.language||navigator.userLanguage||""];
  for(var i=0;i<(list||[]).length;i++){
   var c=String(list[i]||"").toLowerCase().slice(0,2);
   if(CODES.indexOf(c)>=0)return c;
  }
 }catch(e){}
 return null;
}
(function(){
 try{
  var c=null,m=/[?&]language=([a-zA-Z]{2,3})/.exec(location.search||"");
  if(m)c=m[1].toLowerCase().slice(0,2);           // ?language=pt-BR counts as pt
  if(c&&CODES.indexOf(c)<0)c=null;
  if(!c){var s=(lget()||"").toLowerCase().slice(0,2);if(CODES.indexOf(s)>=0)c=s;}
  if(!c)c=fromBrowser();
  code=c||"en";
 }catch(e){code="en";} // a broken lookup speaks English, never nothing
})();
function raw(k){
 var t=PAGE[code]?PAGE[code][k]:null; if(t!=null)return t;
 t=COMMON[code]?COMMON[code][k]:null; if(t!=null)return t;
 t=PAGE.en[k]; if(t!=null)return t;
 t=COMMON.en[k]; return t==null?null:t;
}
var hooks=[];
var API={
 version:"2026.11.22.2", codes:CODES.slice(), langs:LANGS,
 lang:function(){return code},
 browserLang:function(){return fromBrowser()},
 t:function(k,v){var s;try{s=raw(k)}catch(e){code="en";try{s=raw(k)}catch(e2){s=null}}
  if(s==null)s=k;var o=v||{};for(var p in o)s=s.split("{"+p+"}").join(String(o[p]));return s},
 flag:function(c){for(var i=0;i<LANGS.length;i++)if(LANGS[i][0]===c)return LANGS[i][3];return ""},
 name:function(c){for(var i=0;i<LANGS.length;i++)if(LANGS[i][0]===c)return LANGS[i][2];return c},
 add:function(tab){for(var c in tab){if(!PAGE[c])continue;for(var k in tab[c])PAGE[c][k]=tab[c][k];}
  try{API.apply()}catch(e){}},
 /* read the tables (the developer harness edits texts through these) */
 keys:function(c){var out=[],seen={};try{var src=[PAGE[c],COMMON[c],PAGE.en,COMMON.en];
  for(var i=0;i<src.length;i++)for(var k in src[i])if(!seen[k]){seen[k]=1;out.push(k)}out.sort();}catch(e){}
  return out},
 table:function(){var o={};try{for(var i=0;i<CODES.length;i++){var c=CODES[i],m={},s=[COMMON[c],PAGE[c],COMMON.en,PAGE.en];
  for(var j=0;j<s.length;j++)for(var k in s[j])if(m[k]==null&&s[j][k]!=null)m[k]=s[j][k];o[c]=m;}}catch(e){}
  return o},
 setKey:function(c,k,v){c=String(c||"").toLowerCase().slice(0,2);if(CODES.indexOf(c)<0)return;
  try{(PAGE[c]=PAGE[c]||{})[k]=String(v);}catch(e){return;}
  try{API.apply()}catch(e){}
  for(var i=0;i<hooks.length;i++)try{hooks[i](code)}catch(e){}},
 onChange:function(f){hooks.push(f)},
 set:function(c){c=String(c||"").toLowerCase().slice(0,2);if(CODES.indexOf(c)<0)return;code=c;lset(c);
  try{API.apply()}catch(e){}for(var i=0;i<hooks.length;i++)try{hooks[i](c)}catch(e){}},
 apply:function(root){
  if(document.documentElement)document.documentElement.lang=code;
  var r=root||document;
  var set=function(e,attr,put){var v=raw(e.getAttribute(attr));if(v!=null)put(e,v);};
  var all=[];
  if(r.nodeType===1)all.push(r);
  if(r.querySelectorAll)all=all.concat([].slice.call(r.querySelectorAll("[data-t],[data-ph],[data-tip],[data-aria],[data-alt]")));
  for(var i=0;i<all.length;i++){var e=all[i];
   try{
    if(e.hasAttribute("data-t"))set(e,"data-t",function(n,v){n.textContent=v});
    if(e.hasAttribute("data-ph"))set(e,"data-ph",function(n,v){n.placeholder=v});
    if(e.hasAttribute("data-tip"))set(e,"data-tip",function(n,v){n.title=v});
    if(e.hasAttribute("data-aria"))set(e,"data-aria",function(n,v){n.setAttribute("aria-label",v)});
    if(e.hasAttribute("data-alt"))set(e,"data-alt",function(n,v){n.alt=v});
   }catch(e2){} // one odd node never aborts the pass
  }
  if(pill){try{pill.innerHTML=API.flag(code)+"<span>"+API.name(code)+"</span>";pill.title=API.t("langTitle");}catch(e){}}
 },
 mount:function(sel){hostSel=sel;ensurePill();},
};
/* ---------------- language button + picker overlay ---------------- */
var hostSel=null,pill=null,ov=null;
var CSS=".tlbtn{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;background:rgba(20,24,22,.72);flex:0 0 auto;align-self:center;"
 +"border:1px solid #3a463f;border-radius:6px;color:#c9d2cb;font:inherit;font-size:12px;letter-spacing:1px;"
 +"cursor:pointer;line-height:1;width:auto;max-width:100%}.tlbtn:hover,.tlbtn:focus{border-color:#ffd76a;color:#f4e9c8;outline:none}"
 +".tlbtn svg{width:22px;height:15px;border:1px solid #2e3a34;border-radius:2px;display:block}"
 +".tlfix{position:fixed;left:12px;bottom:12px;z-index:2147483000}"
 +".tlov{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;"
 +"background:rgba(4,7,6,.86);padding:16px}.tlov[hidden]{display:none}"
 +".tlpanel{max-width:660px;width:100%;background:#141816;border:1px solid #3a463f;border-radius:12px;"
 +"padding:20px 22px;box-shadow:0 24px 60px rgba(0,0,0,.6);color:#c9d2cb;font:inherit;text-align:center}"
 +".tlpanel h2{margin:0 0 6px;font-size:20px;letter-spacing:4px;color:#ffd76a}"
 +".tlpanel p{margin:0 0 16px;font-size:12px;line-height:1.6;color:#8a948e}"
 +".tlgrid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}"
 +".tlb{width:132px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 6px;"
 +"background:rgba(20,24,22,.7);border:1px solid #3a463f;border-radius:8px;cursor:pointer;color:#c9d2cb;font:inherit}"
 +".tlb:hover,.tlb:focus{border-color:#ffd76a;color:#f4e9c8;outline:none;box-shadow:0 0 14px rgba(255,215,106,.18)}"
 +".tlb svg{width:50px;height:34px;border:1px solid #2e3a34;border-radius:4px;display:block}"
 +".tlb b{font-size:13px;color:#f4e9c8}.tlb span{font-size:10px;letter-spacing:1px;color:#8a948e}"
 +".tlx{margin-top:16px;padding:7px 20px;background:none;border:1px solid #3a463f;border-radius:6px;"
 +"color:#c9d2cb;font:inherit;font-size:12px;letter-spacing:2px;cursor:pointer}"
 +".tlx:hover,.tlx:focus{border-color:#ffd76a;color:#f4e9c8;outline:none}";
function style(){if(document.getElementById("tlcss"))return;var s=document.createElement("style");s.id="tlcss";s.textContent=CSS;document.head.appendChild(s);}
function ensurePill(){
 if(pill)return;
 var host=hostSel?document.querySelector(hostSel):null;
 if(!host&&document.readyState==="loading")return; // retried at DOMContentLoaded
 style();
 pill=document.createElement("button");
 pill.type="button";pill.className="tlbtn";pill.setAttribute("aria-haspopup","dialog");
 if(!host){pill.className="tlbtn tlfix";document.body.appendChild(pill);}
 else host.insertBefore(pill,host.firstChild);
 pill.onclick=openOv;
 API.apply();
}
function openOv(){
 if(!ov){
  ov=document.createElement("div");ov.className="tlov";ov.hidden=true;
  var p=document.createElement("div");p.className="tlpanel";
  var h=document.createElement("h2");h.setAttribute("data-t","langTitle");p.appendChild(h);
  var np=document.createElement("p");np.setAttribute("data-t","langNote");p.appendChild(np);
  var g=document.createElement("div");g.className="tlgrid";
  for(var i=0;i<LANGS.length;i++){
   var b=document.createElement("button");b.type="button";b.className="tlb";b.dataset.lang=LANGS[i][0];
   b.innerHTML=LANGS[i][3]+"<b>"+LANGS[i][1]+"</b><span>"+LANGS[i][2]+"</span>";g.appendChild(b);
  }
  p.appendChild(g);
  var x=document.createElement("button");x.type="button";x.className="tlx";x.setAttribute("data-t","close");p.appendChild(x);
  ov.appendChild(p);document.body.appendChild(ov);
  g.onclick=function(e){var b=e.target;while(b&&b!==g&&!b.dataset.lang)b=b.parentNode;if(b&&b.dataset.lang){API.set(b.dataset.lang);closeOv();}};
  x.onclick=closeOv;
  ov.onclick=function(e){if(e.target===ov)closeOv();};
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&ov&&!ov.hidden)closeOv();});
 }
 API.apply(ov);
 ov.hidden=false;
}
function closeOv(){if(ov)ov.hidden=true;}
function boot(){
 try{ensurePill();API.apply();}
 catch(e){code="en";try{ensurePill();API.apply();}catch(e2){}} // rule 0: English on any kit fault
}
/* keep freshly added nodes translated without the page calling apply() */
new MutationObserver(function(ms){
 if(!pill)return;
 try{
  for(var i=0;i<ms.length;i++){var n=ms[i].addedNodes;
   for(var j=0;j<n.length;j++){var e=n[j];
    if(e.nodeType!==1)continue;
    if(e.matches&&e.matches("[data-t],[data-ph],[data-tip],[data-aria],[data-alt]"))API.apply(e);
    else if(e.querySelectorAll&&e.querySelectorAll("[data-t],[data-ph],[data-tip],[data-aria],[data-alt]").length)API.apply(e);
   }}
 }catch(e){}
}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.TLI18N=API;
})();
