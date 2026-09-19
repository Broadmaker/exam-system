import { useMemo, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { renderDatasets } from '../utils';

function splitMath(raw) {
  const segs = [];
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
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function FallbackMath({ segs }) {
  return (
    <span className="math-text leading-relaxed">
      {segs.map((s, i) => {
        if (s.t === 'text') {
          if (!s.v) return null;
          const sanitized = DOMPurify.sanitize(s.v);
          if (!sanitized) return null;
          return <TextPart key={i} html={sanitized} />;
        }
        return <code key={i} className="font-mono text-[12px] bg-canvas px-1 rounded">{s.v}</code>;
      })}
    </span>
  );
}

function LazyKatex({ segs }) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import('./KatexRenderer.jsx').then(mod => {
      if (cancelled) return;
      const { InlineMath, BlockMath } = mod;
      const C = ({ segs: s }) => (
        <span className="math-text leading-relaxed">
          {s.map((seg, i) => {
            if (seg.t === 'text') {
              if (!seg.v) return null;
              const sanitized = DOMPurify.sanitize(seg.v);
              if (!sanitized) return null;
              return <TextPart key={i} html={sanitized} />;
            }
            return seg.display ? <BlockMath key={i} math={seg.v} /> : <InlineMath key={i} math={seg.v} />;
          })}
        </span>
      );
      setComp(() => C);
    });
    return () => { cancelled = true; };
  }, []);
  if (!Comp) return <FallbackMath segs={segs} />;
  return <Comp segs={segs} />;
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
  return <LazyKatex segs={segs} />;
}

export function MathInline({ text }) {
  const segs = useMemo(() => splitMath(String(text ?? '')), [text]);
  if (!segs.length) return null;
  const hasMath = segs.some(s => s.t === 'math');
  if (!hasMath) {
    const sanitized = DOMPurify.sanitize(String(text ?? ''));
    return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }
  return <LazyKatex segs={segs} />;
}
