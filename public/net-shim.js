// Connects the game to the Celeb Clash server for online matches and the leaderboard.
(()=>{const cfg=window.CC_SERVER||((location.protocol=='https:'?'wss://':'ws://')+location.host+'/ws');
 if(!/^wss?:\/\//.test(cfg)||location.protocol=='file:'&&!window.CC_SERVER){return}
 let ls;try{ls=window.localStorage}catch(e){}const g=k=>{try{return ls&&ls.getItem(k)}catch(e){return null}},s=(k,v)=>{try{ls&&ls.setItem(k,v)}catch(e){}};
 let id=g('cc_uid');if(!id){id='u'+Math.random().toString(36).slice(2,12);s('cc_uid',id)}
 let name=g('cc_name');if(!name){name='Player'+Math.floor(1000+Math.random()*9000);s('cc_name',name)}
 const NAMES={};NAMES[id]=name;let ws=null,me=null,open=false;const R=new Map(),lbSubs=[];let lbRows=null,lastLb=null;
 function connect(){try{ws=new WebSocket(cfg)}catch(e){return}ws.onopen=()=>{open=true;ws.send(JSON.stringify({t:'hello',id,name}));for(const r of R.values()){ws.send(JSON.stringify({t:'join',room:r.name}));if(Object.keys(r.mine).length)ws.send(JSON.stringify({t:'pres',room:r.name,p:r.mine}))}if(lastLb)ws.send(JSON.stringify({t:'lb_set',doc:lastLb}));if(lbSubs.length)ws.send(JSON.stringify({t:'lb_sub'}))};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}if(m.t=='me'){me=m.peer;return}if(m.t=='lb'){lbRows=m.rows;m.rows.forEach(r=>{if(r.name)NAMES[r.id]=r.name});lbSubs.forEach(f=>f());return}
   const r=R.get(m.room);if(!r)return;if(m.t=='joined'){r.map.clear();m.peers.forEach(p=>{if(p.by)NAMES[p.by]=p.name;r.map.set(p.peer,mk(p))})}else if(m.t=='p'){if(m.by)NAMES[m.by]=m.name;r.map.set(m.peer,mk(m))}else if(m.t=='gone')r.map.delete(m.peer);r.fire()};
  ws.onclose=()=>{open=false;for(const r of R.values()){r.map.clear();r.fire()}setTimeout(connect,2000)}}
 const mk=p=>Object.freeze({peer:p.peer,by:p.by||null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:Object.freeze(p.presence||{}),updatedAt:Date.now()});
 function room(name){if(R.has(name))return R.get(name);const r={name,map:new Map(),mine:{},hs:[],cache:null,
   fire(){r.cache=null;const ps=r.peers();r.hs.forEach(h=>{try{h({peers:ps,joined:[],left:[],updated:[]})}catch(e){}})},
   peers(){if(!r.cache)r.cache=Object.freeze([Object.freeze({peer:me||'me',by:id,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:r.mine,updatedAt:0}),...r.map.values()]);return r.cache},
   async presence(patch){r.mine=Object.assign({},r.mine,patch);for(const k in patch)if(patch[k]===null)delete r.mine[k];r.cache=null;if(open)ws.send(JSON.stringify({t:'pres',room:name,p:r.mine}))},
   onPeers(h){r.hs.push(h);setTimeout(()=>h({peers:r.peers(),joined:r.peers(),left:[],updated:[]}),0);return()=>{r.hs=r.hs.filter(x=>x!==h)}},
   connected:()=>open,onConnection:h=>{setTimeout(()=>h(open),0);return()=>{}},emit:async()=>{},on:()=>()=>{},
   async leave(){R.delete(name);if(open)ws.send(JSON.stringify({t:'leave',room:name}))},
   async join(n){if(!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(n))throw{code:'invalid_argument'};const x=room(n);return x}};
  R.set(name,r);if(open)ws.send(JSON.stringify({t:'join',room:name}));return r}
 const db={collection(path){const q={orderBy(){return q},limit(){return q},onSnapshot(cb){const f=()=>cb({docs:(lbRows||[]).map(r=>({id:r.id,exists:true,data:()=>r}))});lbSubs.push(f);if(open)ws.send(JSON.stringify({t:'lb_sub'}));if(lbRows)f();return()=>{}},
   doc(did){return{async set(d){lastLb=d;if(open)ws.send(JSON.stringify({t:'lb_set',doc:d}))}}}};return q}};
 const user={id:async()=>id,isOwner:async()=>false,canEdit:async()=>false,profiles:async ids=>{const o={};[].concat(ids).forEach(i=>{o[i]={id:i,name:NAMES[i]||'Player',isMe:i===id}});return o},
  me:async()=>({id,name}),setName(n){name=String(n).slice(0,20)||name;NAMES[id]=name;s('cc_name',name);if(open)ws.send(JSON.stringify({t:'hello',id,name}))},name:()=>name};
 window.CCNET={user};connect();const lobby=room('lobby');
 window.claude={use:async n=>n=='room'?lobby:n=='db'?db:n=='user'?user:null}})();
