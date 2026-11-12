// Simulated tab strip following Firefox's move rules (read from Firefox source):
//  tabs.move: no-op if already there; moving left lands in front of the tab at
//    the index, moving right lands behind it; either way the tab joins that
//    neighbor's group (or none)
//  tabs.ungroup: first tab of group goes just before the group, else just after
//  tabGroups.move: whole group, refused in the middle of another group
const fs=require('fs'),vm=require('vm');
let tabs=[],titles={};
// spec: name[*][!][:group]   * selected, ! pinned
const mk=(spec)=>spec.map((s,i)=>{const [n,g]=s.split(':');return {id:i+1,windowId:1,title:n.replace(/[*!]/g,''),url:'https://x/'+n,highlighted:n.includes('*'),pinned:n.includes('!'),groupId:g?+g:-1,lastAccessed:0,cookieStoreId:''};});
const idx=id=>tabs.findIndex(t=>t.id===id);
function moveOne(id,index){const from=idx(id);if(from===index)return;const t=tabs[from];const nb=tabs[index];t.groupId=nb?nb.groupId:-1;tabs.splice(from,1);tabs.splice(index,0,t);}
const browser={runtime:{onStartup:{addListener(){}}},storage:{local:{get:async d=>d,set:async()=>{}}},
 tabGroups:{query:async()=>[...new Set(tabs.map(t=>t.groupId).filter(g=>g!==-1))].map(id=>({id,title:titles[id]})),
  move:async(gid,{index})=>{const first=tabs.findIndex(t=>t.groupId===gid);const m=tabs.filter(t=>t.groupId===gid);let ti=index;if(ti>first)ti+=m.length;const p=tabs[ti-1],n=tabs[ti];if(n&&n.pinned)throw new Error('pinned');if(p&&n&&n.groupId!==-1&&p.groupId===n.groupId&&n.groupId!==gid)throw new Error('middle of another group');if(index>first)throw new Error('test mock: rightward group move unexpected');tabs.splice(first,m.length);tabs.splice(index,0,...m);}},
 tabs:{query:async q=>tabs.map((t,i)=>({...t,index:i})).filter(t=>(q.pinned===undefined||t.pinned===q.pinned)&&(q.highlighted===undefined||t.highlighted===q.highlighted)),
  move:async(ids,{index})=>{ids=[].concat(ids);let last=null;for(const id of ids){let ip;if(last===null)ip=Math.min(index,tabs.length-1);else if(idx(id)<=last)ip=last;else ip=last+1;moveOne(id,ip);last=idx(id);}},
  ungroup:async id=>{const i=idx(id),t=tabs[i],g=t.groupId;if(g===-1)return;const first=tabs.findIndex(x=>x.groupId===g);const lastI=tabs.map(x=>x.groupId).lastIndexOf(g);tabs.splice(i,1);t.groupId=-1;tabs.splice(i===first?first:lastI,0,t);}}};
const ctx={browser,console:{log(){},trace:(e)=>{console.log('ERROR',e&&e.message);process.exitCode=1;}},URL};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2]||require("path").join(__dirname,"../src/background.js"),'utf8'),ctx);
const show=()=>tabs.map(t=>t.title+(t.groupId!==-1?':'+t.groupId:'')).join(' ');
async function run(name,spec,fn,expect,t={}){tabs=mk(spec);titles=t;await fn();const got=show();const ok=got===expect;console.log(ok?'PASS':'FAIL',name,'|',spec.join(' '),'=>',got,ok?'':'(expected '+expect+')');if(!ok)process.exitCode=1;}
const by=(s)=>()=>ctx.sortTabsComparatorName('sort-by-title-asc',s);
const SEL={"settings-sort-selected":true,"settings-sort-pinned":false}, ALL={"settings-sort-selected":false,"settings-sort-pinned":false};
(async()=>{
await run('selected basic',['z*','m','a*','q','c*'],by(SEL),'a m c q z');
await run('one selected',['z','y','x*','w','v'],by(SEL),'z y x w v');
await run('pinned untouched',['p2!*','p1!*','d*','b','a*'],by(SEL),'p2 p1 a b d');
await run('pinned included',['p2!*','p1!*','d*','b','a*'],by({...SEL,"settings-sort-pinned":true}),'p1 p2 a b d');
await run('selected across a group',['z*','g2*:5','g1*:5','a*'],by(SEL),'a g1:5 g2:5 z');
await run('ungrouped lands before group',['z*','g1:5','g2:5','a*'],by(SEL),'a g1:5 g2:5 z');
await run('ungrouped between two groups',['c*','h1:6','h2:6','b*','g1:5','g2:5','a*'],by(SEL),'a h1:6 h2:6 b g1:5 g2:5 c');
await run('selected in two groups',['y*:5','x*:5','m','d*:6','c:6','b*:6'],by(SEL),'x:5 y:5 m b:6 c:6 d:6');
await run('all selected reversed',['f*','e*','d*','c*','b*','a*'],by(SEL),'a b c d e f');
await run('all tabs (original)',['c','b','a'],by(ALL),'a b c');
await run('all tabs with group island',['d','c','y:5','x:5','b','a'],by(ALL),'c d x:5 y:5 a b');
await run('within group',['z','d:5','b:5','c:5','a:5','y','q:6','p:6'],by({...ALL,"scope-group-id":5}),'z a:5 b:5 c:5 d:5 y q:6 p:6');
await run('within group, selected only',['z*','d*:5','b:5','c*:5','a:5','y*'],by({...SEL,"scope-group-id":5}),'z c:5 b:5 d:5 a:5 y');
await run('within group, one tab',['z','d:5','y'],by({...ALL,"scope-group-id":5}),'z d:5 y');
const T={5:'Work',6:'banking',7:'Zoo',8:''};
await run('groups asc',['u1','w1:5','w2:5','u2','z1:7','b1:6','b2:6','b3:6','u3'],()=>ctx.sortGroupsByName('asc'),'u1 b1:6 b2:6 b3:6 u2 w1:5 w2:5 z1:7 u3',T);
await run('groups desc',['u1','w1:5','w2:5','u2','z1:7','b1:6','b2:6','b3:6','u3'],()=>ctx.sortGroupsByName('desc'),'u1 z1:7 u2 w1:5 w2:5 b1:6 b2:6 b3:6 u3',T);
await run('groups, unnamed last',['n1:8','n2:8','z1:7','u','b1:6'],()=>ctx.sortGroupsByName('asc'),'b1:6 z1:7 u n1:8 n2:8',T);
await run('groups desc, unnamed last',['n1:8','b1:6','z1:7'],()=>ctx.sortGroupsByName('desc'),'z1:7 b1:6 n1:8',T);
await run('groups with pinned',['p!','z1:7','u','b1:6','b2:6'],()=>ctx.sortGroupsByName('asc'),'p b1:6 b2:6 u z1:7',T);
await run('one group only',['u','z1:7','z2:7'],()=>ctx.sortGroupsByName('asc'),'u z1:7 z2:7',T);
})();
