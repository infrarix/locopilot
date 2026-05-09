import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const LINES = [
  { text: '$ quickslug init', type: 'cmd' as const, delay: 0 },
  { text: '', type: 'blank' as const, delay: 300 },
  { text: '🐌 QuickSlug Doctor', type: 'heading' as const, delay: 500 },
  { text: '  ✔ Ollama           running on :11434', type: 'success' as const, delay: 800 },
  { text: '  ✔ SQLite           ~/.quickslug/db.sqlite', type: 'success' as const, delay: 1100 },
  { text: '', type: 'blank' as const, delay: 1400 },
  { text: '✔ Ready. Free tier activated.', type: 'success' as const, delay: 1700 },
  { text: '', type: 'blank' as const, delay: 1900 },
  { text: '$ curl localhost:8080/v1/chat/completions \\', type: 'cmd' as const, delay: 2400 },
  { text: '  -d \'{"model":"llama3:8b","messages":[...]}\'', type: 'dim' as const, delay: 2600 },
  { text: '', type: 'blank' as const, delay: 2800 },
  { text: 'data: {"choices":[{"delta":{"content":"Hello"}}]}', type: 'stream' as const, delay: 3100 },
  { text: 'data: {"choices":[{"delta":{"content":"! How"}}]}', type: 'stream' as const, delay: 3250 },
  { text: 'data: {"choices":[{"delta":{"content":" can I"}}]}', type: 'stream' as const, delay: 3400 },
  { text: 'data: {"choices":[{"delta":{"content":" help"}}]}', type: 'stream' as const, delay: 3550 },
  { text: 'data: {"choices":[{"delta":{"content":" you?"}}]}', type: 'stream' as const, delay: 3700 },
  { text: 'data: [DONE]', type: 'done' as const, delay: 4000 },
  { text: '', type: 'blank' as const, delay: 4200 },
  { text: '⚡ 340ms · llama3:8b · local · 12 tokens', type: 'stats' as const, delay: 4400 },
];

function colorForType(type: string): string {
  switch (type) {
    case 'cmd':
      return 'text-brand-violet';
    case 'heading':
      return 'text-white font-semibold';
    case 'success':
      return 'text-brand-cyan';
    case 'dim':
      return 'text-gray-500';
    case 'stream':
      return 'text-brand-sky';
    case 'done':
      return 'text-brand-violet font-semibold';
    case 'stats':
      return 'text-brand-cyan font-medium';
    default:
      return 'text-gray-400';
  }
}

export default function TerminalDemo({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [visibleLines, setVisibleLines] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!isInView) return;

    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setVisibleLines(0);

    LINES.forEach((line, i) => {
      const t = setTimeout(() => setVisibleLines(i + 1), line.delay);
      timeouts.current.push(t);
    });

    return () => timeouts.current.forEach(clearTimeout);
  }, [isInView]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="qs-code-block overflow-hidden">
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-brand-border/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-brand-violet/70" />
          </div>
          <span className="text-[11px] text-brand-muted ml-2 font-mono">terminal — quickslug</span>
        </div>

        <div className="px-4 sm:px-5 py-4 min-h-[280px] sm:min-h-[320px] max-h-[400px] overflow-y-auto overflow-x-auto">
          {LINES.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={`font-mono text-[11px] sm:text-[13px] leading-6 whitespace-pre ${colorForType(line.type)}`}
            >
              {line.text || ' '}
            </motion.div>
          ))}

          {visibleLines < LINES.length && isInView && (
            <span className="inline-block w-2 h-4 bg-brand-violet qs-cursor align-middle" />
          )}
        </div>
      </div>

      <div className="absolute -inset-4 bg-brand-purple/10 rounded-3xl blur-2xl pointer-events-none -z-10" />
    </div>
  );
}
