// Online play + leaderboard on Firebase (used automatically when the game is served by Firebase Hosting).
// Rooms and the leaderboard live in the Realtime Database; players sign in anonymously so the
// security rules can make sure everyone only writes their own data.
(()=>{const h=location.hostname;const onFB=window.CC_FIREBASE===true||/\.web\.app$|\.firebaseapp\.com$/.test(h);if(!onFB)return;window.CC_FB=true;
 const V='10.12.2',src=n=>'https://www.gstatic.com/firebasejs/'+V+'/firebase-'+n+'-compat.js';
 const load=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('load '+u));document.head.appendChild(s)});
 let ls;try{ls=window.localStorage}catch(e){}const g=k=>{try{return ls&&ls.getItem(k)}catch(e){return null}},sv=(k,v)=>{try{ls&&ls.setItem(k,v)}catch(e){}};
 let name=g('cc_name');if(!name){name='Player'+Math.floor(1000+Math.random()*9000);sv('cc_name',name)}
 const NAMES={};let id=g('cc_uid')||'pending',DB=null,open=false;const R=new Map(),openHs=[];
 const key=n=>n.replace(/\./g,',');const pp=x=>{if(!x)return{};if(typeof x=='string'){try{return JSON.parse(x)||{}}catch(e){return{}}}return x};
 const ready=(async()=>{await load(src('app'));await Promise.all([load(src('auth')),load(src('database'))]);
  const cfg=await (await fetch('/__/firebase/init.json')).json();firebase.initializeApp(cfg);
  const cred=await firebase.auth().signInAnonymously();id=cred.user.uid;sv('cc_uid',id);NAMES[id]=name;DB=firebase.database();
  DB.ref('.info/connected').on('value',s=>{open=!!s.val();openHs.forEach(f=>f(open));if(open)for(const r of R.values())r._attach()});
  for(const r of R.values())r._attach()})().catch(e=>console.warn('[firebase]',e));
 const mk=(k,v)=>Object.freeze({peer:k,by:v.by||null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:Object.freeze(pp(v.p)),updatedAt:v.t||Date.now()});
 function room(rn){if(R.has(rn))return R.get(rn);const r={name:rn,map:new Map(),mine:{},hs:[],cache:null,me:null,ref:null,meRef:null,
   fire(){r.cache=null;const ps=r.peers();r.hs.forEach(f=>{try{f({peers:ps,joined:[],left:[],updated:[]})}catch(e){}})},
   peers(){if(!r.cache)r.cache=Object.freeze([Object.freeze({peer:r.me||'me',by:id,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:r.mine,updatedAt:0}),...r.map.values()]);return r.cache},
   _attach(){if(!DB||r.ref)return;r.ref=DB.ref('rooms/'+key(rn));r.meRef=r.ref.push();r.me=r.meRef.key;r.meRef.onDisconnect().remove();r._write();
    const up=s=>{if(s.key===r.me)return;const v=s.val()||{};if(v.by)NAMES[v.by]=v.name||NAMES[v.by];r.map.set(s.key,mk(s.key,v));r.fire()};
    r.ref.on('child_added',up);r.ref.on('child_changed',up);r.ref.on('child_removed',s=>{r.map.delete(s.key);r.fire()})},
   _write(){if(r.meRef&&open!==null)r.meRef.set({by:id,name,p:JSON.stringify(r.mine),t:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{})},
   async presence(patch){r.mine=Object.assign({},r.mine,patch);for(const k in patch)if(patch[k]===null)delete r.mine[k];r.cache=null;r._write()},
   onPeers(f){r.hs.push(f);setTimeout(()=>f({peers:r.peers(),joined:r.peers(),left:[],updated:[]}),0);return()=>{r.hs=r.hs.filter(x=>x!==f)}},
   connected:()=>open,onConnection:f=>{openHs.push(f);setTimeout(()=>f(open),0);return()=>{const i=openHs.indexOf(f);if(i>=0)openHs.splice(i,1)}},emit:async()=>{},on:()=>()=>{},
   async leave(){R.delete(rn);if(r.ref){r.ref.off();r.meRef.onDisconnect().cancel();await r.meRef.remove().catch(()=>{})}},
   async join(n){if(!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(n))throw{code:'invalid_argument'};const x=room(n);return x}};
  R.set(rn,r);r._attach();return r}
 const num=v=>Math.max(0,Math.min(1e7,Number(v)||0));
 const db={collection(){const q={orderBy(){return q},limit(){return q},
   onSnapshot(cb){let off=()=>{};ready.then(()=>{if(!DB)return;const ref=DB.ref('lb').orderByChild('rp').limitToLast(25);const f=s=>{const rows=[];s.forEach(c=>{const v=c.val()||{};if(v.name)NAMES[c.key]=v.name;rows.push(Object.assign({id:c.key},v))});
     rows.sort((a,b)=>(b.rp||0)-(a.rp||0)||(b.w||0)-(a.w||0));cb({docs:rows.map(r=>({id:r.id,exists:true,data:()=>r}))})};ref.on('value',f);off=()=>ref.off('value',f)});return()=>off()},
   doc(){return{async set(d){await ready;if(!DB)return;await DB.ref('lb/'+id).set({name,rp:num(d.rp),w:num(d.w),l:num(d.l),xp:num(d.xp),ci:Math.max(0,Math.min(3,d.ci|0)),rank:String(d.rank||'').slice(0,20),at:firebase.database.ServerValue.TIMESTAMP}).catch(e=>console.warn('[lb]',e))}}}};return q}};
 const user={id:async()=>{await ready;return id},isOwner:async()=>false,canEdit:async()=>false,
  profiles:async ids=>{const o={};[].concat(ids).forEach(i=>{o[i]={id:i,name:NAMES[i]||'Player',isMe:i===id}});return o},
  me:async()=>{await ready;return{id,name}},
  setName(n){name=String(n).replace(/[\u0000-\u001f<>]/g,'').slice(0,20)||name;NAMES[id]=name;sv('cc_name',name);for(const r of R.values())r._write();
   if(DB)DB.ref('lb/'+id+'/name').once('value').then(s=>{if(s.exists())DB.ref('lb/'+id+'/name').set(name)})},name:()=>name};
 window.CCNET={user,names:NAMES,get id(){return id}};const lobby=room('lobby');
 window.claude={use:async n=>{await ready;return n=='room'?lobby:n=='db'?db:n=='user'?user:null}}})();
