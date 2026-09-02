#!/usr/bin/env node
// Test AI Assist grading - deterministic + fallback similarity
// Replicates worker/index.js helpers (no AI env) to verify 0.85 threshold and 0.5 partial

const REL_TOL = 1e-6, ABS_TOL = 1e-9;
const FUNCS = { abs: Math.abs, sqrt: Math.sqrt, cbrt: Math.cbrt, exp: Math.exp, expm1: Math.expm1, ln: Math.log, log10: Math.log10, log2: Math.log2, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign };
function isFuncOrConst(w){ return !!FUNCS[w] || w==='pi'||w==='tau'||w==='e';}
function insertStars(s){ s=s.replace(/([0-9])(?=[a-z](?![0-9]))/g,'$1*'); s=s.replace(/([0-9)])(?=\()/g,'$1*'); s=s.replace(/([a-z][a-z0-9_]*)(?=\()/g,m=>isFuncOrConst(m)?m:m+'*'); return s; }
function canonicalizeSequence(s){
  s=s.replace(/[\u2212\u2013\u2014\u2296]/g,'-').replace(/[\u00d7\u00b7\u2219\u2297]/g,'*').replace(/\u00f7/g,'/').replace(/\u00b0/g,'');
  const sup={'\u00b2':2,'\u00b3':3,'\u00b9':1,'\u2070':0,'\u2074':4,'\u2075':5,'\u2076':6,'\u2077':7,'\u2078':8,'\u2079':9};
  s=s.replace(/[\u00b2\u00b3\u00b9\u2070\u2074\u2075\u2076\u2077\u2078\u2079]/g,d=>'^'+sup[d]);
  s=s.replace(/\u221a([0-9]+(?:[.,][0-9]+)?|\([^()]*\)|[a-z][a-z0-9_]*)/g,(_,g)=>'sqrt('+(g[0]==='('?g.slice(1,-1):g)+')');
  s=s.replace(/[\u03c0\u03a0]/g,'pi').replace(/\u03c4/g,'tau'); return s;
}
function canonicalize(input){ if(input==null)return ''; let s=String(input).toLowerCase().trim(); s=canonicalizeSequence(s); s=s.replace(/\s+/g,''); s=s.replace(/^[a-z][a-z0-9_]*=/g,''); s=insertStars(s); return s; }
function tokenize(expr){
  const tokens=[]; let i=0,len=expr.length;
  while(i<len){ const ch=expr[i]; if('+-*/%^()'.includes(ch)){tokens.push({t:ch});i++;continue;}
    if(/[0-9.]/.test(ch)){ let j=i; while(j<len&&/[0-9.,]/.test(expr[j]))j++; let numStr=expr.slice(i,j).replace(/,/g,''); let k=j;
      if(expr[k]==='e'||expr[k]==='E'){let m=k+1,sign=''; if(expr[m]==='+'||expr[m]==='-'){sign=expr[m];m++;} let d=''; while(m<len&&/[0-9]/.test(expr[m])){d+=expr[m];m++;} if(d){numStr+='e'+sign+d;k=m;} }
      const val=Number(numStr); if(isNaN(val))throw new Error('bad number'); tokens.push({t:'num',v:val}); i=k; continue; }
    if(/[a-z]/.test(ch)){ let w=''; while(i<len&&/[a-z0-9_]/.test(expr[i])){w+=expr[i];i++;} tokens.push({t:'id',v:w}); continue; }
    throw new Error('bad char: '+ch);
  } return tokens;
}
function analyzeExpr(expr){ const tokens=tokenize(expr); const vars=new Set(); for(let idx=0;idx<tokens.length;idx++){ const tok=tokens[idx]; if(tok.t!=='id')continue; const isFunc=!!FUNCS[tok.v]&&tokens[idx+1]&&tokens[idx+1].t==='('; if(isFunc||tok.v==='pi'||tok.v==='e'||tok.v==='tau')continue; vars.add(tok.v);} return {tokens,vars};}
function evalTokens(tokens, vars){
  let pos=0; const peek=()=>tokens[pos]; const next=()=>tokens[pos++]; const expect=(op)=>{const t=next(); if(!t||t.t!==op)throw new Error('expected '+op);};
  const expression=()=>{let l=term(); while(peek()&&(peek().t==='+'||peek().t==='-')){const op=next().t; const r=term(); l=op==='+'?l+r:l-r;} return l;};
  const term=()=>{let l=unary(); while(peek()&&(peek().t==='*'||peek().t==='/' )){const op=next().t; const r=unary(); l=op==='*'?l*r:l/r;} return l;};
  const unary=()=>{if(peek()&&peek().t==='-'){next(); return -unary();} if(peek()&&peek().t==='+'){next(); return unary();} return power();};
  const power=()=>{const b=atom(); if(peek()&&peek().t==='^'){next(); const e=power(); return Math.pow(b,e);} return b;};
  const atom=()=>{const t=next(); if(!t)throw new Error('unexpected end'); if(t.t==='num'){if(peek()&&peek().t==='%'){next(); return t.v/100;} return t.v;} if(t.t==='('){const v=expression(); expect(')'); return v;} if(t.t==='id'){if(peek()&&peek().t==='('){if(!FUNCS[t.v])throw new Error('unknown func'); next(); const a=expression(); expect(')'); return FUNCS[t.v](a);} if(t.v==='pi')return Math.PI; if(t.v==='tau')return 2*Math.PI; if(t.v==='e')return Math.E; const v=vars&&Object.prototype.hasOwnProperty.call(vars,t.v)?vars[t.v]:undefined; if(v===undefined)throw new Error('unknown var'); return v;} throw new Error('unexpected token');};
  const v=expression(); if(peek())throw new Error('trailing'); return v;
}
function almostEqual(a,b){ if(!isFinite(a)||!isFinite(b))return false; const d=Math.abs(a-b); return d<=ABS_TOL||d<=REL_TOL*Math.max(Math.abs(a),Math.abs(b));}
function numericCompare(sExpr,cExpr){ let si,ci; try{ si=analyzeExpr(sExpr); ci=analyzeExpr(cExpr); if(si.vars.size>0||ci.vars.size>0)return null; const a=evalTokens(si.tokens,null); const b=evalTokens(ci.tokens,null); return almostEqual(a,b);}catch{return null;}}
function samplePoints(){ const pts=[-1000,-100,-12,-10,-3,-2,-1,-0.5,0.5,1,2,3,10,12,48,100,500,1000]; let r=123456789; for(let i=0;i<24;i++){r=(1103515245*r+12345)>>>0; pts.push((r/4294967296)*400-200);} return pts;}
const SAMPLE_POINTS=samplePoints();
function sampleCompare(sExpr,cExpr){ let si,ci; try{ si=analyzeExpr(sExpr); ci=analyzeExpr(cExpr);}catch{return null;} if(si.vars.size!==ci.vars.size)return null; for(const v of si.vars)if(!ci.vars.has(v))return null; const varList=[...si.vars]; let compared=0; for(const pt of SAMPLE_POINTS){ const vars={}; varList.forEach(v=>{vars[v]=pt;}); let a,b; try{a=evalTokens(si.tokens,vars); b=evalTokens(ci.tokens,vars);}catch{continue;} compared++; if(!almostEqual(a,b))return false; if(compared>=12)break;} return compared>=8;}
function sortFactors(s){ return s.split('*').filter(Boolean).sort().join('*');}
function matchesAnswer(sa,ca){ const s=canonicalize(sa), c=canonicalize(ca); if(!c)return false; if(!s)return false; if(s===c)return true; const n=numericCompare(s,c); if(n!==null)return n; const samp=sampleCompare(s,c); if(samp!==null)return samp; return sortFactors(s)===sortFactors(c);}

// AI fallback helpers
const AI_THRESHOLD=0.85, AI_PARTIAL=0.5;
function levenshtein(a,b){ const m=a.length,n=b.length; if(!m)return n; if(!n)return m; let prev=[...Array(n+1).keys()],cur=Array(n+1); for(let i=1;i<=m;i++){cur[0]=i; for(let j=1;j<=n;j++){const cost=a[i-1]===b[j-1]?0:1; cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+cost);} const t=prev;prev=cur;cur=t;} return prev[n];}
function stringSimilarity(a,b){
  const sa=String(a||'').toLowerCase().trim(), sb=String(b||'').toLowerCase().trim();
  if(!sa||!sb)return 0; if(sa===sb)return 1;
  if(/^[0-9.\-+e*\/^()]+$/.test(sa)&&/^[0-9.\-+e*\/^()]+$/.test(sb))return 0;
  return 1-levenshtein(sa,sb)/Math.max(sa.length,sb.length);
}
function getSimilaritySync(student, correct){
  if(matchesAnswer(student,correct))return 1;
  return stringSimilarity(student,correct);
}

// ComputeScore simulation
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return Math.abs(h); }
function seededRandom(seed){ let s=seed; return ()=>{ s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };}
function shuffleWithSeed(arr,seed){ const a=[...arr]; const rand=seededRandom(seed); for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;}
function parseChoices(c){ return typeof c==='string'?JSON.parse(c):c;}

function computeScoreSync(questions, sub, overrides={}){
  const aiScores={};
  for(const q of questions){
    if((q.type||'multiple_choice')!=='fill_blank')continue;
    const sa=(typeof sub.answers==='string'?JSON.parse(sub.answers):sub.answers)[q.id]||'';
    if(matchesAnswer(sa,q.answer))continue;
    aiScores[q.id]=getSimilaritySync(sa,q.answer);
  }
  const studentSeed=Number(sub.seed);
  const submittedAnswers=typeof sub.answers==='string'?JSON.parse(sub.answers):sub.answers;
  const shuffledQs=shuffleWithSeed(questions,studentSeed);
  let correctCount=0; const perQuestion=[];
  shuffledQs.forEach((q,idx)=>{
    let autoScore=0, aiSim=null, aiSuggested=false; let autoCorrect=false;
    if((q.type||'multiple_choice')==='fill_blank'){
      const sa=submittedAnswers[q.id]||''; autoCorrect=matchesAnswer(sa,q.answer);
      if(autoCorrect) autoScore=1; else { const sim=aiScores[q.id]; aiSim=sim; if(sim>=AI_THRESHOLD){autoScore=AI_PARTIAL; aiSuggested=true;}}
    } else {
      const choices=parseChoices(q.choices);
      if(sub.answer_scheme==='fixed'){ autoCorrect=!!submittedAnswers[q.id]&&submittedAnswers[q.id]===q.answer; } else {
        const cs=studentSeed+idx*7919; const sh=shuffleWithSeed(choices,cs).map((c,ci)=>({...c,displayKey:String.fromCharCode(65+ci)}));
        const correctDisplayKey=sh.find(c=>c.key===q.answer).displayKey; autoCorrect=submittedAnswers[q.id]===correctDisplayKey;
      }
      autoScore=autoCorrect?1:0;
    }
    const verdict=overrides[q.id]; let finalScore; if(verdict==='correct')finalScore=1; else if(verdict==='incorrect')finalScore=0; else finalScore=autoScore;
    correctCount+=finalScore;
    perQuestion.push({question_id:q.id, autoCorrect, autoScore, aiSim, aiSuggested, finalScore});
  });
  correctCount=Math.round(correctCount*2)/2;
  return {correctCount, perQuestion, aiScores};
}

// ---- TEST CASES ----
let pass=0, fail=0;
function test(name, fn){
  try{ fn(); console.log(`✅ PASS: ${name}`); pass++; } catch(e){ console.log(`❌ FAIL: ${name} - ${e.message}`); fail++; }
}
function assertEq(a,b,msg){ if(a!==b) throw new Error(`${msg} expected ${b} got ${a}`); }
function assertClose(a,b,eps=1e-9,msg=''){ if(Math.abs(a-b)>eps) throw new Error(`${msg} expected ${b} got ${a}`); }

// Use cases
test('Exact match case-insensitive: Photosynthesis', ()=>{ assertEq(matchesAnswer('Photosynthesis','photosynthesis'), true, 'case'); });
test('Whitespace Manila', ()=>{ assertEq(matchesAnswer(' Manila ','manila'), true, 'ws'); });
test('Numeric 2 vs 2.0', ()=>{ assertEq(matchesAnswer('2','2.0'), true, 'numeric'); });
test('Numeric 0.5 vs 1/2', ()=>{ assertEq(matchesAnswer('0.5','1/2'), true, 'fraction'); });
test('Math x=2 vs 2', ()=>{ assertEq(matchesAnswer('x=2','2'), true, 'x='); });
test('Math 2x vs 2*x', ()=>{ assertEq(matchesAnswer('2x','2*x'), true, '2x'); });
test('Wrong numeric 3.14 vs 3.15 -> not equal and no AI partial', ()=>{
  assertEq(matchesAnswer('3.14','3.15'), false, 'numeric not equal');
  const sim=getSimilaritySync('3.14','3.15'); assertEq(sim,0,'numeric guard should be 0'); if(sim>=0.85) throw new Error('should not give partial for numeric');
});
test('Typo photosyntesis -> partial 0.5', ()=>{
  const sim=getSimilaritySync('photosyntesis','photosynthesis'); // 0.928
  if(sim<0.85) throw new Error(`sim ${sim} <0.85`);
  const questions=[{id:'q1', type:'fill_blank', answer:'photosynthesis'}];
  const sub={seed:'123', answers:{q1:'photosyntesis'}, answer_scheme:'fixed'};
  const {correctCount}=computeScoreSync(questions,sub);
  assertClose(correctCount,0.5,1e-9,'should be 0.5 partial');
});
test('Typo philippines -> phillipines partial', ()=>{
  const sim=getSimilaritySync('phillipines','philippines'); // 0.818 -> actually <0.85, so should be 0
  // But our earlier calc 0.818, so this should NOT give partial with fallback (strict)
  const questions=[{id:'q1', type:'fill_blank', answer:'philippines'}];
  const sub={seed:'1', answers:{q1:'phillipines'}, answer_scheme:'fixed'};
  const {correctCount}=computeScoreSync(questions,sub);
  assertClose(correctCount,0,1e-9,'0.818 <0.85 so 0');
});
test('Jonh vs John -> fallback 0.5 -> no partial (needs embeddings for semantic)', ()=>{
  const sim=getSimilaritySync('Jonh','John'); // 0.5
  assertClose(sim,0.5,1e-9,'jonh');
  const qs=[{id:'q1', type:'fill_blank', answer:'John'}];
  const sub={seed:'1', answers:{q1:'Jonh'}, answer_scheme:'fixed'};
  const {correctCount}=computeScoreSync(qs,sub);
  assertClose(correctCount,0,1e-9,'no partial fallback');
  // With AI embeddings, this would be ~0.9 -> partial, but local dev gives 0, admin can still override
});
test('USA vs United States -> fallback low, no auto partial (needs AI embeddings)', ()=>{
  const sim=getSimilaritySync('USA','United States of America');
  if(sim>=0.85) throw new Error('fallback should be low');
  const qs=[{id:'q1', type:'fill_blank', answer:'United States of America'}];
  const sub={seed:'1', answers:{q1:'USA'}, answer_scheme:'fixed'};
  const {correctCount}=computeScoreSync(qs,sub);
  assertClose(correctCount,0,1e-9,'USA no partial fallback');
});
test('Apple vs Banana -> 0', ()=>{
  const sim=getSimilaritySync('apple','banana'); // ~0.16
  if(sim>=0.85) throw new Error('should not partial');
});
test('Empty vs correct -> 0', ()=>{
  assertEq(matchesAnswer('','answer'), false, 'empty');
  const qs=[{id:'q1', type:'fill_blank', answer:'answer'}];
  const sub={seed:'1', answers:{q1:''}, answer_scheme:'fixed'};
  const {correctCount}=computeScoreSync(qs,sub);
  assertClose(correctCount,0,1e-9,'empty 0');
});
test('Mixed exam 4Q: 1 exact, 1 typo partial, 1 wrong, 1 empty -> total 1.5', ()=>{
  const qs=[
    {id:'q1', type:'fill_blank', answer:'photosynthesis'},
    {id:'q2', type:'fill_blank', answer:'photosynthesis'},
    {id:'q3', type:'fill_blank', answer:'Manila'},
    {id:'q4', type:'fill_blank', answer:'John'},
  ];
  const sub={seed:'42', answers:{q1:'photosynthesis', q2:'photosyntesis', q3:'Cebu', q4:''}, answer_scheme:'fixed'};
  const {correctCount, perQuestion}=computeScoreSync(qs,sub);
  // q1 1, q2 0.5, q3 0, q4 0 => 1.5
  assertClose(correctCount,1.5,1e-9,'mixed 1.5');
  if(!perQuestion.find(p=>p.question_id==='q2').aiSuggested) throw new Error('q2 should be aiSuggested');
});
test('Manual override correct upgrades 0.5 -> 1.0', ()=>{
  const qs=[{id:'q1', type:'fill_blank', answer:'photosynthesis'}];
  const sub={seed:'1', answers:{q1:'photosyntesis'}, answer_scheme:'fixed'};
  const {correctCount: c1}=computeScoreSync(qs,sub,{}); assertClose(c1,0.5,1e-9,'auto 0.5');
  const {correctCount: c2}=computeScoreSync(qs,sub,{q1:'correct'}); assertClose(c2,1,1e-9,'override 1');
  const {correctCount: c3}=computeScoreSync(qs,sub,{q1:'incorrect'}); assertClose(c3,0,1e-9,'override 0');
});
test('MCQ fixed scheme unaffected', ()=>{
  const qs=[{id:'q1', type:'multiple_choice', choices:JSON.stringify([{key:'A',text:'a'},{key:'B',text:'b'}]), answer:'A'}];
  const sub={seed:'1', answers:{q1:'A'}, answer_scheme:'fixed'};
  const {correctCount}=computeScoreSync(qs,sub); assertClose(correctCount,1,1e-9,'mcq correct');
  const sub2={seed:'1', answers:{q1:'B'}, answer_scheme:'fixed'};
  const {correctCount: c2}=computeScoreSync(qs,sub2); assertClose(c2,0,1e-9,'mcq wrong');
});

console.log(`\nTOTAL: ${pass} passed, ${fail} failed out of ${pass+fail}`);
if(fail>0) process.exit(1);
console.log('All deterministic tests passed. With Workers AI embeddings, USA/John cases would gain 0.5 as well (fallback is strict, AI semantic is higher).');
