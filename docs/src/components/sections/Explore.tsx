import Link from '@docusaurus/Link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import FadeIn from '../ui/FadeIn';

const CARDS = [
  {
    tag: 'CLI',
    title: 'Command-line interface',
    desc: 'Manage your whole stack from the terminal. Init, start, fine-tune, expose — all in one binary.',
    links: [
      { label: 'quickslug init', href: '/docs/cli/init' },
      { label: 'quickslug train', href: '/docs/cli/train' },
      { label: 'quickslug expose', href: '/docs/cli/expose' },
    ],
    accent: 'border-brand-purple/30 hover:border-brand-purple/60',
    tagColor: 'bg-brand-purple/15 text-brand-violet',
  },
  {
    tag: 'API',
    title: 'OpenAI-compatible REST API',
    desc: 'POST /v1/chat/completions, GET /v1/models — identical surface to OpenAI so any existing SDK works instantly.',
    links: [
      { label: '/v1/chat/completions', href: '/docs/api/chat-completions' },
      { label: '/v1/models', href: '/docs/api/models' },
      { label: '/v1/quickslug/health', href: '/docs/api/health' },
    ],
    accent: 'border-brand-blue/30 hover:border-brand-blue/60',
    tagColor: 'bg-brand-blue/15 text-brand-sky',
  },
  {
    tag: 'Training',
    title: 'Fine-tuning pipeline',
    desc: 'Submit Unsloth, Axolotl, or MLX jobs via the training API. Live log streaming via SSE while your model trains.',
    links: [
      { label: 'Configuration', href: '/docs/training/configuration' },
      { label: 'Datasets', href: '/docs/training/datasets' },
      { label: 'Adapters', href: '/docs/training/adapters' },
    ],
    accent: 'border-brand-cyan/30 hover:border-brand-cyan/60',
    tagColor: 'bg-brand-cyan/15 text-brand-cyan',
  },
  {
    tag: 'SDK',
    title: 'Works with any OpenAI SDK',
    desc: 'Python, Node.js, Go, Rust — if it supports a custom baseURL, it works with QuickSlug out of the box.',
    links: [
      { label: 'Quickstart', href: '/docs/getting-started/quickstart' },
      { label: 'Architecture', href: '/docs/architecture/overview' },
      { label: 'Chat completions', href: '/docs/api/chat-completions' },
    ],
    accent: 'border-brand-violet/30 hover:border-brand-violet/60',
    tagColor: 'bg-brand-violet/15 text-brand-violet',
  },
];

export default function Explore() {
  return (
    <section id="explore" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-brand-border/40">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Explore QuickSlug</h2>
            <p className="text-brand-muted text-lg max-w-xl mx-auto">
              Every surface is designed for developers. Pick your entry point.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CARDS.map((card, i) => (
            <FadeIn key={card.title} delay={i * 0.1} direction="up">
              <motion.div
                className={`group p-7 bg-brand-card border rounded-2xl transition-all ${card.accent} h-full`}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${card.tagColor}`}>{card.tag}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-6">{card.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {card.links.map((l) => (
                    <Link
                      key={l.label}
                      to={l.href}
                      className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 bg-brand-dark border border-brand-border rounded-lg text-brand-muted hover:text-white hover:border-brand-purple/50 transition-colors no-underline"
                    >
                      {l.label}
                      <ArrowRight size={11} />
                    </Link>
                  ))}
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3}>
          <div className="mt-10 text-center">
            <Link
              to="/docs/intro"
              className="inline-flex items-center gap-2 text-brand-muted hover:text-white text-sm transition-colors no-underline"
            >
              Read the full documentation
              <ArrowRight size={14} />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
