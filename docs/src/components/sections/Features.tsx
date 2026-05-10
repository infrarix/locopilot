import { Cpu, Zap, GitBranch, Shield, RefreshCw, Terminal, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import FadeIn from '../ui/FadeIn';

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

const FEATURES: Feature[] = [
  {
    icon: Cpu,
    title: 'Local-first inference',
    desc: 'Run any Ollama-compatible model on your hardware. Zero latency, zero cost per token, complete data privacy.',
    color: 'text-brand-violet',
    bg: 'bg-brand-purple/10',
  },
  {
    icon: Zap,
    title: 'Smart GPU fallback',
    desc: "When a model isn't local, requests automatically route to RunPod Serverless GPUs with a 90-second SLA.",
    color: 'text-brand-blue',
    bg: 'bg-brand-blue/10',
  },
  {
    icon: GitBranch,
    title: 'Fine-tune on your data',
    desc: 'Submit Unsloth, Axolotl, or MLX training jobs via the CLI. Alpaca and ShareGPT datasets supported out of the box.',
    color: 'text-brand-cyan',
    bg: 'bg-brand-cyan/10',
  },
  {
    icon: Shield,
    title: 'OpenAI-compatible API',
    desc: 'Drop-in replacement for OpenAI. Point any SDK at LocoPilot and it just works — no code changes needed.',
    color: 'text-brand-sky',
    bg: 'bg-brand-sky/10',
  },
  {
    icon: RefreshCw,
    title: 'Automatic failover',
    desc: 'RunPod timeout? LocoPilot retries locally. Both down? It returns a clean 503. No hanging requests ever.',
    color: 'text-brand-violet',
    bg: 'bg-brand-violet/10',
  },
  {
    icon: Terminal,
    title: 'Developer CLI',
    desc: '`locopilot init`, `doctor`, `start`, `train`, `logs`, `expose` — everything you need from one command.',
    color: 'text-white',
    bg: 'bg-white/5',
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <FadeIn delay={index * 0.08} direction="up">
      <motion.div
        className="group p-6 bg-brand-card border border-brand-border rounded-2xl hover:border-brand-purple/40 transition-all hover:bg-brand-card/80 h-full"
        whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      >
        <motion.div
          className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${feature.bg} mb-5`}
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
          transition={{ duration: 0.5 }}
        >
          <feature.icon size={22} className={feature.color} />
        </motion.div>
        <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
        <p className="text-sm text-brand-muted leading-relaxed">{feature.desc}</p>
      </motion.div>
    </FadeIn>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to run AI in production
            </h2>
            <p className="text-brand-muted text-lg max-w-2xl mx-auto">
              No more wrestling with fragmented tools. LocoPilot is a unified runtime for local inference, remote GPU,
              and fine-tuning.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
