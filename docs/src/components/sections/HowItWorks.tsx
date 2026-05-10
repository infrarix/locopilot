import { motion } from 'framer-motion';
import FadeIn from '../ui/FadeIn';
import TerminalDemo from '../marketing/TerminalDemo';

const STEPS = [
  {
    n: '01',
    title: 'Install & init',
    desc: 'Install the CLI and run locopilot init. It detects your Ollama setup, initialises a local SQLite database, and writes a default .env.',
    code: `$ npm install -g @infrarix/locopilot
$ locopilot init

🐌 LocoPilot Doctor
  ✔ Ollama
  ✔ SQLite

✔ Ready. Free tier activated.`,
  },
  {
    n: '02',
    title: 'Call the API',
    desc: 'Use the OpenAI SDK, curl, or any HTTP client. No API key needed for local free-tier use — LocoPilot routes to Ollama if the model is available.',
    code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'not-needed',
});

const stream = await client.chat.completions.create({
  model: 'llama3:8b',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
});`,
  },
  {
    n: '03',
    title: 'Fine-tune',
    desc: 'Submit a training job with your JSONL dataset. LocoPilot validates the format, runs it in-process via the local worker, and streams logs live.',
    code: `$ locopilot train \\
  --config train.json

Submitting job...
Job ID: job_7f3a2b
Status: running

[unsloth] Loading llama3:8b ...
[unsloth] Step  50/300 — loss: 1.42
[unsloth] Step 100/300 — loss: 0.98
[unsloth] Training complete ✔`,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-brand-border/40">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Up and running in <span className="gradient-text-purple">three commands</span>
            </h2>
            <p className="text-brand-muted text-lg max-w-xl mx-auto">
              From zero to production-grade inference in under 5 minutes.
            </p>
          </div>
        </FadeIn>

        <div className="space-y-16">
          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.1} direction={i % 2 === 0 ? 'left' : 'right'}>
              <div
                className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 items-center`}
              >
                <div className="flex-1">
                  <motion.div
                    className="text-5xl font-black text-brand-purple/20 mb-2"
                    whileInView={{ opacity: [0, 1], x: [-20, 0] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    {step.n}
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-brand-muted leading-relaxed">{step.desc}</p>
                </div>

                <div className="flex-1 w-full min-w-0">
                  <motion.div
                    className="qs-code-block p-4 sm:p-5 overflow-x-auto"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <div className="flex gap-1.5 mb-4">
                      <div className="w-3 h-3 rounded-full bg-rose-500/70" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                      <div className="w-3 h-3 rounded-full bg-brand-violet/70" />
                    </div>
                    <pre className="text-[11px] sm:text-[13px] text-gray-300 whitespace-pre leading-6 m-0 bg-transparent p-0">
                      {step.code}
                    </pre>
                  </motion.div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2}>
          <div className="mt-20">
            <div className="text-center mb-10">
              <h3 className="text-2xl font-bold text-white mb-3">See it in action</h3>
              <p className="text-brand-muted max-w-lg mx-auto">
                Watch a real init → inference flow. Output streams in real-time, just like the actual CLI.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <TerminalDemo />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
