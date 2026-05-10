import { type ReactNode, useEffect } from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import Hero from '../components/sections/Hero';
import Features from '../components/sections/Features';
import HowItWorks from '../components/sections/HowItWorks';
import Explore from '../components/sections/Explore';
import CtaFooter from '../components/sections/CtaFooter';

const SCROLL_THRESHOLD = 80;

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  useEffect(() => {
    document.body.classList.add('qs-home-page');

    let frame = 0;
    const update = () => {
      frame = 0;
      const scrolled = window.scrollY > SCROLL_THRESHOLD;
      document.body.classList.toggle('qs-scrolled', scrolled);
    };

    const onScroll = () => {
      // rAF-throttle so we never block scrolling — repeated calls within a
      // frame collapse to a single class toggle.
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      document.body.classList.remove('qs-home-page', 'qs-scrolled');
    };
  }, []);

  return (
    <Layout
      title={siteConfig.title}
      description="LocoPilot is an OpenAI-compatible local-first AI platform. Run models on your hardware via Ollama, fall back to remote GPU automatically, and fine-tune on your data — all from one CLI."
    >
      <main className="qs-marketing">
        <Hero />
        <Features />
        <HowItWorks />
        <Explore />
        <CtaFooter />
      </main>
    </Layout>
  );
}
