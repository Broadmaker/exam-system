export function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  const rand = seededRandom(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderDatasets(text, seed, qIdx) {
  return text.replace(/\{\{DATA:([\d,]+)\}\}/g, (_, nums) => {
    const arr = nums.split(',').map(Number);
    const shuffled = shuffleWithSeed(arr, seed + qIdx * 31337 + 99991);
    return shuffled.map((n) => (n >= 1000 ? n.toLocaleString('en-PH') : String(n))).join(',  ');
  });
}

export function parseChoices(choices) {
  return typeof choices === 'string' ? JSON.parse(choices) : choices;
}

// ── Fill-in-the-blank equivalence engine ──
// Layers, in order:
//   1. Canonicalize (unicode, whitespace, lowercase, strip leading "x =")
//   2. Numeric equivalence via a safe arithmetic evaluator (no eval())
//   3. Symbolic equivalence by sampling shared variables
//   4. Fallback: reorder-insensitive text compare

const REL_TOL = 1e-6;
const ABS_TOL = 1e-9;

// ── 1. Canonicalize ──
function isFuncOrConst(w) {
  return !!FUNCS[w] || w === 'pi' || w === 'tau' || w === 'e';
}

function insertStars(s) {
  s = s.replace(/([0-9])(?=[a-z](?![0-9]))/g, '$1*');   // "2x" → "2*x" (but not "2e5")
  s = s.replace(/([0-9)])(?=\()/g, '$1*');              // "2(%", ")(x" → ")*(x"
  s = s.replace(/([a-z][a-z0-9_]*)(?=\()/g, m => isFuncOrConst(m) ? m : m + '*'); // "x(2)" → "x*(2)", keeps "sqrt(", "sin("
  return s;
}

function canonicalizeSequence(s) {
  s = s
    .replace(/[\u2212\u2013\u2014\u2296]/g, '-')  // − – — (minus signs)
    .replace(/[\u00d7\u00b7\u2219\u2297]/g, '*')  // × · ⊗ (multiply)
    .replace(/\u00f7/g, '/')                     // ÷
    .replace(/\u00b0/g, '');                     // ° (degree sign)
  const sup = { '\u00b2': 2, '\u00b3': 3, '\u00b9': 1, '\u2070': 0, '\u2074': 4, '\u2075': 5, '\u2076': 6, '\u2077': 7, '\u2078': 8, '\u2079': 9 };
  s = s.replace(/[\u00b2\u00b3\u00b9\u2070\u2074\u2075\u2076\u2077\u2078\u2079]/g, d => '^' + sup[d]); // ²³⁹ → ^n
  s = s.replace(/\u221a([0-9]+(?:[.,][0-9]+)?|\([^()]*\)|[a-z][a-z0-9_]*)/g, (_, g) => 'sqrt(' + (g[0] === '(' ? g.slice(1, -1) : g) + ')'); // √4 → sqrt(4)
  s = s.replace(/[\u03c0\u03a0]/g, 'pi').replace(/\u03c4/g, 'tau'); // π τ
  return s;
}

function canonicalize(input) {
  if (input === null || input === undefined) return '';
  let s = String(input).toLowerCase().trim();
  s = canonicalizeSequence(s);
  s = s.replace(/\s+/g, '');                     // remove ALL whitespace
  s = s.replace(/^[a-z][a-z0-9_]*=/g, '');       // strip leading "x =" → "2"
  s = insertStars(s);
  return s;
}

// ── 2/3. Safe arithmetic evaluator (no eval()) ──
const FUNCS = {
  abs: Math.abs, sqrt: Math.sqrt, cbrt: Math.cbrt, exp: Math.exp, expm1: Math.expm1,
  ln: Math.log, log10: Math.log10, log2: Math.log2,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
};

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const len = expr.length;
  while (i < len) {
    const ch = expr[i];
    if ('+-*/%^()'.includes(ch)) { tokens.push({ t: ch }); i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < len && /[0-9.,]/.test(expr[j])) j++;
      let numStr = expr.slice(i, j).replace(/,/g, '');
      let k = j;
      if (expr[k] === 'e' || expr[k] === 'E') { // scientific notation
        let m = k + 1;
        let sign = '';
        if (expr[m] === '+' || expr[m] === '-') { sign = expr[m]; m++; }
        let digits = '';
        while (m < len && /[0-9]/.test(expr[m])) { digits += expr[m]; m++; }
        if (digits) { numStr += 'e' + sign + digits; k = m; }
      }
      const val = Number(numStr);
      if (isNaN(val)) throw new Error('bad number');
      tokens.push({ t: 'num', v: val });
      i = k;
      continue;
    }
    if (/[a-z]/.test(ch)) {
      let word = '';
      while (i < len && /[a-z0-9_]/.test(expr[i])) { word += expr[i]; i++; }
      tokens.push({ t: 'id', v: word });
      continue;
    }
    throw new Error('bad char: ' + ch);
  }
  return tokens;
}

function analyzeExpr(expr) {
  const tokens = tokenize(expr);
  const vars = new Set();
  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    if (tok.t !== 'id') continue;
    const isFunc = !!FUNCS[tok.v] && tokens[idx + 1] && tokens[idx + 1].t === '(';
    if (isFunc || tok.v === 'pi' || tok.v === 'e' || tok.v === 'tau') continue;
    vars.add(tok.v);
  }
  return { tokens, vars };
}

function evalTokens(tokens, vars) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (op) => { const t = next(); if (!t || t.t !== op) throw new Error('expected ' + op); };

  const expression = () => {
    let left = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const right = term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };
  const term = () => {
    let left = unary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = next().t;
      const right = unary();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };
  const unary = () => {
    if (peek() && peek().t === '-') { next(); return -unary(); }
    if (peek() && peek().t === '+') { next(); return unary(); }
    return power();
  };
  const power = () => {
    const base = atom();
    if (peek() && peek().t === '^') {
      next();
      const exponent = power(); // right-assoc: 2^3^2 = 2^(3^2)
      return Math.pow(base, exponent);
    }
    return base;
  };
  const atom = () => {
    const t = next();
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') {
      if (peek() && peek().t === '%') { next(); return t.v / 100; }
      return t.v;
    }
    if (t.t === '(') {
      const value = expression();
      expect(')');
      return value;
    }
    if (t.t === 'id') {
      if (peek() && peek().t === '(') {
        if (!FUNCS[t.v]) throw new Error('unknown function: ' + t.v);
        next(); // (
        const arg = expression();
        expect(')');
        return FUNCS[t.v](arg);
      }
      if (t.v === 'pi') return Math.PI;
      if (t.v === 'tau') return 2 * Math.PI;
      if (t.v === 'e') return Math.E;
      const value = vars && Object.prototype.hasOwnProperty.call(vars, t.v) ? vars[t.v] : undefined;
      if (value === undefined) throw new Error('unknown variable: ' + t.v);
      return value;
    }
    throw new Error('unexpected token');
  };

  const value = expression();
  if (peek()) throw new Error('trailing tokens');
  return value;
}

function almostEqual(a, b) {
  if (!isFinite(a) || !isFinite(b)) return false;
  const diff = Math.abs(a - b);
  return diff <= ABS_TOL || diff <= REL_TOL * Math.max(Math.abs(a), Math.abs(b));
}

// Both parse as plain numbers (no variables) → compare numerically. null if inconclusive.
function numericCompare(sExpr, cExpr) {
  let sInfo, cInfo;
  try {
    sInfo = analyzeExpr(sExpr);
    cInfo = analyzeExpr(cExpr);
    if (sInfo.vars.size > 0 || cInfo.vars.size > 0) return null;
    const a = evalTokens(sInfo.tokens, null);
    const b = evalTokens(cInfo.tokens, null);
    return almostEqual(a, b);
  } catch {
    return null;
  }
}

function samplePoints() {
  const pts = [-1000, -100, -12, -10, -3, -2, -1, -0.5, 0.5, 1, 2, 3, 10, 12, 48, 100, 500, 1000];
  let r = 123456789;
  for (let i = 0; i < 24; i++) {
    r = (1103515245 * r + 12345) >>> 0;
    pts.push((r / 4294967296) * 400 - 200);
  }
  return pts;
}
const SAMPLE_POINTS = samplePoints();

// Evaluate both at shared sample points. true → equivalent, false → diff, null → inconclusive.
function sampleCompare(sExpr, cExpr) {
  let sInfo, cInfo;
  try {
    sInfo = analyzeExpr(sExpr);
    cInfo = analyzeExpr(cExpr);
  } catch {
    return null;
  }
  if (sInfo.vars.size !== cInfo.vars.size) return null;
  for (const v of sInfo.vars) if (!cInfo.vars.has(v)) return null;

  // If either contains no variables (parses as a number), numericCompare already decided.
  const varList = [...sInfo.vars];
  let compared = 0;
  for (const pt of SAMPLE_POINTS) {
    const vars = {};
    varList.forEach(v => { vars[v] = pt; });
    let a, b;
    try {
      a = evalTokens(sInfo.tokens, vars);
      b = evalTokens(cInfo.tokens, vars);
    } catch {
      continue; // undefined at this point (e.g. division by zero) — skip it
    }
    compared++;
    if (!almostEqual(a, b)) return false;
    if (compared >= 12) break;
  }
  return compared >= 8; // need enough valid points to trust an "equal" verdict
}

// Reorder-fallback: "(x-1)*(x+2)" → "1+2)*(x-1)" sorted
function sortFactors(s) {
  return s.split('*').filter(Boolean).sort().join('*');
}

export function matchesAnswer(studentAnswer, correctAnswer) {
  const s = canonicalize(studentAnswer);
  const c = canonicalize(correctAnswer);
  if (!c) return false;         // no answer key
  if (!s) return false;         // student left it blank
  if (s === c) return true;     // identical after canonicalization

  const numeric = numericCompare(s, c);
  if (numeric !== null) return numeric;

  const sampled = sampleCompare(s, c);
  if (sampled !== null) return sampled;

  return sortFactors(s) === sortFactors(c);
}

// Assessment type metadata (Upscale.md §9) — shared across admin + student views.
export const EXAM_TYPE_LABELS = {
  quiz: 'Quiz', major_exam: 'Major Exam', long_exam: 'Long Exam', midterm: 'Midterm',
  final: 'Final', diagnostic: 'Diagnostic', pretest: 'Pre-Test', posttest: 'Post-Test',
  practice: 'Practice Test', assignment: 'Assignment', survey: 'Survey', custom: 'Custom',
};

export function examTypeLabel(t) {
  return EXAM_TYPE_LABELS[t] || t || 'Exam';
}

// Lifecycle status colors/labels (Upscale.md §48).
export const EXAM_STATUS_TONES = {
  draft: 'neutral', scheduled: 'info', active: 'success', closed: 'danger', archived: 'neutral',
};
export const EXAM_STATUS_LABELS = {
  draft: 'Draft', scheduled: 'Scheduled', active: 'Active', closed: 'Closed', archived: 'Archived',
};

// Question metadata (Upscale.md §13) — difficulty labels + tag helpers.
export const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function difficultyLabel(d) {
  return DIFFICULTY_LABELS[d] || d || '';
}

// Split a comma-separated tag string into a trimmed, deduped array.
export function splitTags(s) {
  return Array.from(new Set(String(s || '').split(',').map(t => t.trim()).filter(Boolean)));
}

// Parse a tags field that may be a JSON array string, an actual array, or ''.
export function parseTags(q) {
  if (Array.isArray(q)) return q;
  if (typeof q === 'string' && q) {
    try { const a = JSON.parse(q); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  return [];
}