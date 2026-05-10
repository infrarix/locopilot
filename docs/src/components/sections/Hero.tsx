import Link from '@docusaurus/Link';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { ArrowRight, Terminal, Star } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import AnimatedLoco from '../marketing/AnimatedLoco';
import ParticleField from '../marketing/ParticleField';
import FadeIn from '../ui/FadeIn';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

const INSTALL_CMD = 'npm install -g @infrarix/locopilot && locopilot init';

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { copied, copy } = useCopyToClipboard();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const logoY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const particleY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section
      ref={sectionRef}
      className="relative pt-28 sm:pt-32 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden min-h-[100vh] flex items-center"
    >
      {/* Background grid */}
      <motion.div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          y: gridY,
        }}
      />

      {/* Radial glows (purple + blue) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div className="absolute inset-0" style={{ y: particleY }}>
        <BrowserOnly>{() => <ParticleField />}</BrowserOnly>
      </motion.div>

      <div className="relative max-w-5xl mx-auto text-center w-full">
        <FadeIn delay={0.1}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-purple/30 bg-brand-purple/10 text-brand-violet text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse" />
            Open-source · OpenAI-compatible · Zero cloud lock-in
          </div>
        </FadeIn>

        <FadeIn delay={0.2} direction="none">
          <motion.div className="flex justify-center mb-6" style={{ y: logoY }}>
            <AnimatedLoco
              size={typeof window !== 'undefined' && window.innerWidth < 640 ? 200 : 280}
              enableCursorTracking
            />
          </motion.div>
        </FadeIn>

        <FadeIn delay={0.35}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Run AI locally. <span className="gradient-text">Scale globally.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="text-base sm:text-lg md:text-xl text-brand-muted max-w-2xl mx-auto mb-10 leading-relaxed px-2 sm:px-0">
            LocoPilot is an OpenAI-compatible inference platform that runs models locally via Ollama, falls back to
            remote GPU automatically, and fine-tunes on your data — all from one CLI.
          </p>
        </FadeIn>

        <FadeIn delay={0.65}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/docs/getting-started/quickstart"
                className="flex items-center gap-2 px-7 py-3.5 bg-brand-purple hover:bg-brand-deep text-white font-bold text-base rounded-xl transition-colors glow-purple no-underline"
              >
                Get started
                <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="#how-it-works"
                className="flex items-center gap-2 px-7 py-3.5 border border-brand-border hover:border-brand-purple/60 text-white font-medium text-base rounded-xl transition-colors hover:bg-white/5 no-underline"
              >
                See how it works
              </Link>
            </motion.div>
          </div>
        </FadeIn>

        <FadeIn delay={0.8}>
          <div className="flex items-center justify-center gap-2 mb-12 text-sm text-brand-muted">
            <Star size={14} className="text-brand-violet fill-brand-violet" />
            <span>Open source on GitHub</span>
            <span className="text-brand-border">·</span>
            <span>MIT licensed</span>
            <span className="text-brand-border">·</span>
            <span>No vendor lock-in</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.9}>
          <motion.div
            className="inline-flex max-w-full items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 bg-[#08090F] border border-brand-border rounded-xl qs-code-block group hover:border-brand-purple/50 transition-colors cursor-pointer overflow-x-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => copy(INSTALL_CMD)}
          >
            <Terminal size={15} className="text-brand-violet flex-shrink-0" />
            <code className="text-xs sm:text-sm text-gray-300 whitespace-nowrap">
              <span className="text-brand-muted">$</span> <span className="text-brand-violet">npm</span> install -g
              @infrarix/locopilot &amp;&amp; <span className="text-brand-violet">locopilot</span>{' '}
              <span className="text-brand-blue">init</span>
            </code>
            <span className="hidden sm:inline text-[10px] text-brand-muted group-hover:opacity-100 opacity-0 transition-opacity ml-2 flex-shrink-0">
              {copied ? '✔ Copied!' : 'Copy'}
            </span>
          </motion.div>
        </FadeIn>
      </div>
    </section>
  );
}
