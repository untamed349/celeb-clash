// Celeb Clash game server: serves the game and relays online matches + leaderboard.
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||8080,PUB=path.join(__dirname,'public'),DATA=process.env.DATA_FILE||path.join(__dirname,'leaderboard.json');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.css':'text/css','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent((req.url||'/').split('?')[0]);if(u=='/')u='/index.html';const f=path.normalize(path.join(PUB,u));
 if(!f.startsWith(PUB)){res.writeHead(403);return res.end()}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(b)})});
let LB={};try{LB=JSON.parse(fs.readFileSync(DATA,'utf8'))}catch(e){}
let lbTimer=null;const saveLB=()=>{clearTimeout(lbTimer);lbTimer=setTimeout(()=>fs.writeFile(DATA,JSON.stringify(LB),()=>{}),1000)};
const top=()=>Object.entries(LB).map(([id,v])=>Object.assign({id},v)).sort((a,b)=>(b.rp||0)-(a.rp||0)||(b.w||0)-(a.w||0)).slice(0,25);
const wss=new WebSocketServer({server,path:'/ws',maxPayload:16384});
const rooms=new Map();let seq=0;
const clean=s=>String(s||'').replace(/[\u0000-\u001f<>]/g,'').slice(0,20)||'Player';
const send=(ws,m)=>{if(ws.readyState===1)ws.send(JSON.stringify(m))};
function bcast(room,m,except){const r=rooms.get(room);if(!r)return;const s=JSON.stringify(m);for(const ws of r)if(ws!==except&&ws.readyState===1)ws.send(s)}
function leave(ws,room){const r=rooms.get(room);if(!r||!r.has(ws))return;r.delete(ws);delete ws.pres[room];if(!r.size)rooms.delete(room);bcast(room,{t:'gone',room,peer:ws.peer})}
wss.on('connection',ws=>{ws.peer='k'+(++seq).toString(36)+Math.random().toString(36).slice(2,6);ws.pres={};ws.by=null;ws.name='Player';ws.lb=false;ws.rate=0;
 ws.on('message',buf=>{if(++ws.rate>200)return;let m;try{m=JSON.parse(buf)}catch(e){return}
  if(m.t=='hello'){ws.by=String(m.id||'').slice(0,40);ws.name=clean(m.name);send(ws,{t:'me',peer:ws.peer})}
  else if(m.t=='join'&&/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(m.room||'')){let r=rooms.get(m.room);if(!r){if(rooms.size>2000)return;r=new Set();rooms.set(m.room,r)}if(r.size>=64&&!r.has(ws))return send(ws,{t:'full',room:m.room});
   r.add(ws);ws.pres[m.room]=ws.pres[m.room]||{};const peers=[...r].filter(o=>o!==ws).map(o=>({peer:o.peer,by:o.by,name:o.name,presence:o.pres[m.room]||{}}));send(ws,{t:'joined',room:m.room,peers});bcast(m.room,{t:'p',room:m.room,peer:ws.peer,by:ws.by,name:ws.name,presence:ws.pres[m.room]},ws)}
  else if(m.t=='leave')leave(ws,m.room);
  else if(m.t=='pres'&&rooms.get(m.room)&&rooms.get(m.room).has(ws)){const s=JSON.stringify(m.p||{});if(s.length>4096)return;ws.pres[m.room]=m.p||{};bcast(m.room,{t:'p',room:m.room,peer:ws.peer,by:ws.by,name:ws.name,presence:ws.pres[m.room]},ws)}
  else if(m.t=='lb_sub'){ws.lb=true;send(ws,{t:'lb',rows:top()})}
  else if(m.t=='lb_set'&&ws.by&&m.doc){const d=m.doc,n=v=>Math.max(0,Math.min(1e7,Number(v)||0));LB[ws.by]={name:ws.name,rp:n(d.rp),w:n(d.w),l:n(d.l),xp:n(d.xp),ci:Math.max(0,Math.min(3,d.ci|0)),rank:clean(d.rank),at:Date.now()};saveLB();
   const rows=top();for(const o of wss.clients)if(o.lb)send(o,{t:'lb',rows})}});
 ws.on('close',()=>{for(const room of Object.keys(ws.pres))leave(ws,room)})});
setInterval(()=>{for(const o of wss.clients)o.rate=0},1000);
server.listen(PORT,()=>console.log('Celeb Clash running on http://localhost:'+PORT));
