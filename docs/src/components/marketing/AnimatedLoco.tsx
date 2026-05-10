import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

interface AnimatedLocoProps {
  size?: number;
  className?: string;
  enableCursorTracking?: boolean;
}

export default function AnimatedLoco({ size = 280, className = '', enableCursorTracking = true }: AnimatedLocoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Pupils inside the eyes follow the cursor
  const pupilOffsetX = useSpring(useTransform(mouseX, [-400, 400], [-3, 3]), {
    stiffness: 150,
    damping: 15,
  });
  const pupilOffsetY = useSpring(useTransform(mouseY, [-400, 400], [-2, 2]), {
    stiffness: 150,
    damping: 15,
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || !enableCursorTracking) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseX.set(e.clientX - cx);
      mouseY.set(e.clientY - cy);
    },
    [mouseX, mouseY, enableCursorTracking],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Each eye blinks independently every ~4s — wrap in its own group with a transform origin
  // so the squash is centered on each eye.
  const blinkAnim = {
    animate: { scaleY: [1, 0.05, 1] as number[] },
    transition: { duration: 0.18, repeat: Infinity, repeatDelay: 4.2, ease: 'easeInOut' as const },
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          boxShadow: isHovered
            ? '0 0 80px 30px rgba(139,92,246,0.32), 0 0 120px 60px rgba(59,130,246,0.18)'
            : '0 0 40px 15px rgba(139,92,246,0.18), 0 0 60px 30px rgba(59,130,246,0.10)',
        }}
        transition={{ duration: 0.4 }}
      />

      <motion.svg
        width={size}
        height={size * (200 / 300)}
        viewBox="0 0 300 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          scaleX: isHovered ? [1, 1.03, 1] : [1, 1.015, 1],
          scaleY: isHovered ? [1, 0.98, 1] : [1, 0.99, 1],
        }}
        transition={{
          duration: isHovered ? 0.6 : 1.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <defs>
          <linearGradient id="lpBodyGrad" x1="80" y1="80" x2="220" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient id="lpCapGrad" x1="80" y1="22" x2="220" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <filter id="lpGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Floating energy particles */}
        {[
          { cx: 50,  cy: 60,  r: 3,   color: '#3B82F6', delay: 0,    rangeX: 18,  rangeY: -22 },
          { cx: 250, cy: 50,  r: 2.5, color: '#A78BFA', delay: 0.4,  rangeX: -16, rangeY: 18 },
          { cx: 40,  cy: 150, r: 2,   color: '#22D3EE', delay: 0.8,  rangeX: 22,  rangeY: -14 },
          { cx: 260, cy: 150, r: 2.5, color: '#C4B5FD', delay: 0.2,  rangeX: -20, rangeY: -16 },
          { cx: 22,  cy: 110, r: 1.5, color: '#fff',    delay: 1.0,  rangeX: 14,  rangeY: 12 },
          { cx: 278, cy: 100, r: 1.5, color: '#fff',    delay: 0.6,  rangeX: -14, rangeY: -10 },
        ].map((p, i) => (
          <motion.circle
            key={`particle-${i}`}
            r={p.r}
            fill={p.color}
            filter="url(#lpGlow)"
            animate={{
              cx: [p.cx, p.cx + p.rangeX, p.cx],
              cy: [p.cy, p.cy + p.rangeY, p.cy],
              opacity: [0, 0.9, 0],
            }}
            transition={{
              duration: isHovered ? 1.6 : 2.8,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Robot — gentle vertical bob */}
        <motion.g
          animate={{ y: isHovered ? [0, -4, 0] : [0, -2, 0] }}
          transition={{ duration: isHovered ? 1.2 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Side ear modules — small rounded blocks with a single LED dot each */}
          <rect x="62" y="120" width="20" height="28" rx="9" fill="#4C1D95" />
          <rect x="218" y="120" width="20" height="28" rx="9" fill="#4C1D95" />
          <motion.circle
            cx="72"
            cy="134"
            r="3"
            fill="#22D3EE"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.circle
            cx="228"
            cy="134"
            r="3"
            fill="#22D3EE"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />

          {/* Robot head — very rounded squircle */}
          <rect x="80" y="80" width="140" height="118" rx="44" fill="url(#lpBodyGrad)" />
          <rect x="92" y="92" width="50" height="30" rx="14" fill="#FFFFFF" opacity="0.10" />

          {/* Pilot cap dome */}
          <path d="M 80 92 Q 80 24 150 24 Q 220 24 220 92 Z" fill="url(#lpCapGrad)" />
          {/* Cap brim */}
          <path d="M 70 92 L 230 92 L 234 102 L 66 102 Z" fill="#1E3A8A" />

          {/* Cap stitch */}
          <motion.path
            d="M 92 84 Q 150 96 208 84"
            stroke="#60A5FA"
            strokeWidth="1.5"
            fill="none"
            opacity="0.55"
            strokeDasharray="3 3"
            animate={{ strokeDashoffset: [0, -12] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          {/* Pilot wing badge */}
          <motion.g
            animate={{ scale: isHovered ? [1, 1.1, 1] : [1, 1.04, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '150px 56px', transformBox: 'fill-box' }}
          >
            <path d="M 124 56 L 150 50 L 176 56 L 162 64 L 150 62 L 138 64 Z" fill="#FBBF24" />
            <circle cx="150" cy="58" r="4" fill="#F59E0B" />
            <motion.circle
              cx="150"
              cy="58"
              r="2"
              fill="#FFFFFF"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.g>

          {/* Left eye — independent blink group */}
          <motion.g
            animate={blinkAnim.animate}
            transition={blinkAnim.transition}
            style={{ transformOrigin: '118px 132px', transformBox: 'fill-box' }}
          >
            <ellipse cx="118" cy="132" rx="16" ry="20" fill="#0B0D17" />
            <ellipse cx="124" cy="124" rx="5" ry="7" fill="#FFFFFF" />
            <circle cx="113" cy="138" r="2.5" fill="#FFFFFF" opacity="0.85" />
            {/* Pupil tracks the cursor */}
            <motion.ellipse
              cx="118"
              cy="132"
              rx="2.5"
              ry="3"
              fill="#A78BFA"
              style={{ x: pupilOffsetX, y: pupilOffsetY }}
            />
          </motion.g>

          {/* Right eye — independent blink group */}
          <motion.g
            animate={blinkAnim.animate}
            transition={blinkAnim.transition}
            style={{ transformOrigin: '182px 132px', transformBox: 'fill-box' }}
          >
            <ellipse cx="182" cy="132" rx="16" ry="20" fill="#0B0D17" />
            <ellipse cx="188" cy="124" rx="5" ry="7" fill="#FFFFFF" />
            <circle cx="177" cy="138" r="2.5" fill="#FFFFFF" opacity="0.85" />
            <motion.ellipse
              cx="182"
              cy="132"
              rx="2.5"
              ry="3"
              fill="#A78BFA"
              style={{ x: pupilOffsetX, y: pupilOffsetY }}
            />
          </motion.g>

          {/* Cheek blush — gentle pulse */}
          <motion.ellipse
            cx="100"
            cy="160"
            rx="9"
            ry="6"
            fill="#F472B6"
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.ellipse
            cx="200"
            cy="160"
            rx="9"
            ry="6"
            fill="#F472B6"
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />

          {/* Cute smile — widens on hover */}
          <motion.path
            stroke="#0B0D17"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: isHovered
                ? ['M 132 168 Q 150 182 168 168', 'M 132 168 Q 150 186 168 168', 'M 132 168 Q 150 182 168 168']
                : ['M 132 168 Q 150 178 168 168', 'M 132 168 Q 150 181 168 168', 'M 132 168 Q 150 178 168 168'],
            }}
            transition={{ duration: isHovered ? 1.2 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Status LED on chin — heartbeat pulse */}
          <motion.circle
            cx="150"
            cy="190"
            r="2.5"
            fill="#22D3EE"
            animate={{ opacity: [0.4, 1, 0.4], r: [2.2, 2.8, 2.2] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Antenna shaft + LED ball */}
          <line x1="150" y1="24" x2="150" y2="6" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          <motion.circle
            cx="150"
            cy="5"
            r="4"
            fill="#22D3EE"
            filter="url(#lpGlow)"
            animate={{ opacity: [0.55, 1, 0.55], r: [3.5, 4.5, 3.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx="150" cy="5" r="1.5" fill="#FFFFFF" />
        </motion.g>
      </motion.svg>
    </div>
  );
}
