import { InlineMath as RInline, BlockMath as RBlock } from 'react-katex';
import 'katex/dist/katex.min.css';

export function InlineMath({ math }) {
  try { return <RInline math={math} />; } catch { return <code className="font-mono text-[12px] bg-canvas px-1 rounded">{math}</code>; }
}
export function BlockMath({ math }) {
  try { return <RBlock math={math} />; } catch { return <code className="font-mono text-[12px] bg-canvas px-1 rounded">{math}</code>; }
}
