import Link from '@docusaurus/Link';
import { Github, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import AnimatedLoco from '../marketing/AnimatedLoco';
import FadeIn from '../ui/FadeIn';

export default function CtaFooter() {
  const [nitroBurst, setNitroBurst] = useState(false);

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-brand-border/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-purple/[0.04] to-transparent pointer-events-none" />
      <FadeIn>
        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div
            className="flex justify-center mb-8"
            animate={nitroBurst ? { x: [0, 600], opacity: [1, 0] } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            onAnimationComplete={() => {
              if (nitroBurst) setTimeout(() => setNitroBurst(false), 300);
            }}
          >
            <AnimatedLoco size={160} enableCursorTracking />
          </motion.div>

          {nitroBurst && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-brand-blue"
                  style={{ left: '50%', top: '40%' }}
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 300,
                    y: (Math.random() - 0.5) * 200,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.6, delay: i * 0.03 }}
                />
              ))}
            </div>
          )}

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to run AI at <span className="gradient-text">turbo speed</span>?
          </h2>
          <p className="text-brand-muted text-lg mb-8 max-w-lg mx-auto">
            Get started in under 5 minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/docs/getting-started/quickstart"
                className="flex items-center gap-2 px-8 py-4 bg-brand-purple hover:bg-brand-deep text-white font-bold text-base rounded-xl transition-colors glow-purple no-underline"
                onClick={() => setNitroBurst(true)}
              >
                Read the quickstart
                <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="https://github.com/locopilot/locopilot"
                className="flex items-center gap-2 px-8 py-4 border border-brand-border hover:border-brand-purple/50 text-white font-medium text-base rounded-xl transition-colors hover:bg-white/5 no-underline"
              >
                <Github size={18} />
                View on GitHub
              </Link>
            </motion.div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
