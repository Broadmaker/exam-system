import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { renderDatasets } from '../utils';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Split text into text/math segments on $...$, $$...$$, \(...\), \[...\]
// Keeps delimiters out of the rendered output, decides display vs inline.
function splitMath(raw) {
  const segs = [];
  // $$...$$ must be checked before $...$; escape \$ not treated as delimiter
  const re = /(\$\$[\s\S]+?\$\$|(?<!\\)\$[^$]+?(?<!\\)\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segs.push({ t: 'text', v: raw.slice(last, m.index) });
    const tok = m[0];
    let math = '';
    let display = false;
    if (tok.startsWith('$$')) { math = tok.slice(2, -2); display = true; }
    else if (tok.startsWith('$')) { math = tok.slice(1, -1); display = false; }
    else if (tok.startsWith('\\[')) { math = tok.slice(2, -2); display = true; }
    else if (tok.startsWith('\\(')) { math = tok.slice(2, -2); display = false; }
    // Unescape \$ inside math that was not a delimiter
    math = math.replace(/\\\$/g, '$');
    if (math.trim()) segs.push({ t: 'math', v: math.trim(), display });
    else segs.push({ t: 'text', v: tok });
    last = re.lastIndex;
  }
  if (last < raw.length) segs.push({ t: 'text', v: raw.slice(last) });
  if (segs.length === 0 && raw) segs.push({ t: 'text', v: raw });
  return segs;
}

function TextPart({ html }) {
  // html is already sanitized, may contain <em> etc from existing content
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MathText({ text, seed, index }) {
  const segs = useMemo(() => {
    const rendered = typeof seed === 'number' && typeof index === 'number'
      ? renderDatasets(String(text ?? ''), seed, index)
      : String(text ?? '');
    return splitMath(rendered);
  }, [text, seed, index]);

  if (!segs.length) return null;

  const hasMath = segs.some(s => s.t === 'math');
  if (!hasMath) {
    const sanitized = DOMPurify.sanitize(segs[0].v);
    return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }

  return (
    <span className="math-text leading-relaxed">
      {segs.map((s, i) => {
        if (s.t === 'text') {
          if (!s.v) return null;
          const sanitized = DOMPurify.sanitize(s.v);
          if (!sanitized) return null;
          return <TextPart key={i} html={sanitized} />;
        }
        // math
        try {
          return s.display
            ? <BlockMath key={i} math={s.v} />
            : <InlineMath key={i} math={s.v} />;
        } catch {
          // fallback: show raw if KaTeX throws (throwOnError false in react-katex, but guard)
          return <code key={i} className="font-mono text-[12px] bg-canvas px-1 rounded">{s.v}</code>;
        }
      })}
    </span>
  );
}

// For choice texts or plain strings without dataset seeding
export function MathInline({ text }) {
  const segs = useMemo(() => splitMath(String(text ?? '')), [text]);
  if (!segs.length) return null;
  const hasMath = segs.some(s => s.t === 'math');
  if (!hasMath) {
    const sanitized = DOMPurify.sanitize(String(text ?? ''));
    return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }
  return (
    <span className="math-inline">
      {segs.map((s, i) => {
        if (s.t === 'text') {
          if (!s.v) return null;
          const sanitized = DOMPurify.sanitize(s.v);
          if (!sanitized) return null;
          return <TextPart key={i} html={sanitized} />;
        }
        try {
          return s.display ? <BlockMath key={i} math={s.v} /> : <InlineMath key={i} math={s.v} />;
        } catch {
          return <code key={i} className="font-mono text-[12px] bg-canvas px-1 rounded">{s.v}</code>;
        }
      })}
    </span>
  );
}
