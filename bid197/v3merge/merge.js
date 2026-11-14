const fs=require("fs"),vm=require("vm");
function load(f){const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(f,"utf8").replace(/^\s*var DATA =/m,"window.DATA ="),c);return c;}
const V=load(__dirname+"/sources/dv3_data.js"), O=load(__dirname+"/sources/d196_live_data.js"), B=load(__dirname+"/sources/base_oct27_data.js");
let html=fs.readFileSync(__dirname+"/sources/v3_live.html","utf8");
// 1. timetable: take live-196 Nov 4 corrections for the bids v3 left untouched
const sched=JSON.parse(JSON.stringify(V.SCHED)); const ported=[];
O.SCHED.bids.forEach((b,i)=>{ const changed196=JSON.stringify(b)!==JSON.stringify(B.SCHED.bids[i]); const v3same=JSON.stringify(V.SCHED.bids[i])===JSON.stringify(B.SCHED.bids[i]);
  if(changed196){ if(!v3same) throw new Error("conflict bid "+b.n); sched.bids[i]=b; ported.push(b.n);} });
console.log("ported Nov 4 timetable fixes for bids:",ported.join(", "));
const lines=fs.readFileSync(__dirname+"/sources/dv3_data.js","utf8").split("\n"); const li=lines.findIndex(l=>l.startsWith("window.SCHED = "));
const tail=lines[li].endsWith(";")?";":"";
const oldLine=lines[li]; const newLine="window.SCHED = "+JSON.stringify(sched)+tail;
if(html.split(oldLine).length!==2) throw new Error("SCHED line not unique");
html=html.replace(oldLine,()=>newLine);
// 2. cycle block -> Bid 197 (provisional)
const cyc=fs.readFileSync(__dirname+"/cycle197_merged.js","utf8");
const a=html.indexOf("<script"); const s0=html.indexOf(">",a)+1; const e0=html.indexOf("</script>",s0);
if(!html.slice(s0,e0).includes("Bid 196 v3")) throw new Error("block0 not v3 cycle");
html=html.slice(0,s0)+"\n"+cyc+"\n"+html.slice(e0);

// 4. header wordmark + subline (static in the v3 shell)
{const oldH='<div class="brand-t">Bid 196 <small>v3 · IBU DECKHAND</small></div><div class="brand-s" id="brand-s">Nov 2, 2026 – Feb 28, 2027 · Final-Final sheets · crew Oct 27 · leads Oct 30</div>';
 if(html.split(oldH).length!==2) throw new Error("header");
 const sub="Sheet not issued · showing Bid 196 lines (Nov 2, 2026 – Feb 28, 2027) · crew Oct 27 · leads Oct 30 · times checked Nov 4";
 html=html.replace(oldH,'<div class="brand-t">Bid 197 <small>IBU DECKHAND</small></div><div class="brand-s" id="brand-s">'+sub+'</div>');}
// 3. title
if(html.split("<title>IBU Bid 196 Dashboard v3</title>").length!==2) throw new Error("title");
html=html.replace("<title>IBU Bid 196 Dashboard v3</title>","<title>IBU Bid 197 Dashboard</title>");
{const m=html.match(/.{100}(196 v3|b196v3).{60}/s); if(m) throw new Error("leftover: "+m[0]);}
fs.writeFileSync(__dirname+"/bid197.html",html); console.log("bytes",html.length);
