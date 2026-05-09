import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

interface AnimatedSlugProps {
  size?: number;
  className?: string;
  enableCursorTracking?: boolean;
}

export default function AnimatedSlug({ size = 280, className = '', enableCursorTracking = true }: AnimatedSlugProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const eyeOffsetX = useSpring(useTransform(mouseX, [-400, 400], [-3, 3]), {
    stiffness: 150,
    damping: 15,
  });
  const eyeOffsetY = useSpring(useTransform(mouseY, [-400, 400], [-2, 2]), {
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
          scaleX: isHovered ? [1, 1.04, 1] : [1, 1.02, 1],
          scaleY: isHovered ? [1, 0.97, 1] : [1, 0.99, 1],
        }}
        transition={{
          duration: isHovered ? 0.6 : 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <defs>
          <linearGradient id="qsBodyGrad" x1="60" y1="120" x2="240" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient id="qsShellGrad" x1="110" y1="70" x2="160" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>
          <radialGradient id="qsGloss" cx="0.4" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="white" stopOpacity="0.30" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="qsGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Nitro trail lines (blue) */}
        <motion.g animate={{ opacity: isHovered ? 1 : 0.6 }} transition={{ duration: 0.3 }}>
          {[
            { x1: 10, y1: 110, x2: 70, y2: 110, w: 4, delay: 0 },
            { x1: 5, y1: 125, x2: 60, y2: 125, w: 3, delay: 0.15 },
            { x1: 15, y1: 140, x2: 65, y2: 140, w: 3.5, delay: 0.3 },
            { x1: 20, y1: 155, x2: 55, y2: 155, w: 2.5, delay: 0.45 },
          ].map((line, i) => (
            <motion.line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#3B82F6"
              strokeWidth={line.w}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0, 0.85, 0],
                x1: [line.x1, line.x1 - 15, line.x1],
              }}
              transition={{
                duration: isHovered ? 0.8 : 1.5,
                repeat: Infinity,
                delay: line.delay,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.g>

        {/* Energy particles */}
        {[
          { cx: 55, cy: 100, r: 3, color: '#3B82F6', delay: 0 },
          { cx: 40, cy: 118, r: 2, color: '#A78BFA', delay: 0.2 },
          { cx: 65, cy: 135, r: 2.5, color: '#22D3EE', delay: 0.4 },
          { cx: 30, cy: 130, r: 1.5, color: '#fff', delay: 0.6 },
          { cx: 50, cy: 145, r: 2, color: '#C4B5FD', delay: 0.8 },
        ].map((p, i) => (
          <motion.circle
            key={`particle-${i}`}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={p.color}
            filter="url(#qsGlow)"
            animate={{
              cx: [p.cx, p.cx - 30, p.cx - 60],
              opacity: [0, 1, 0],
              r: [0, p.r, 0],
            }}
            transition={{
              duration: isHovered ? 1 : 2,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Slug body */}
        <motion.ellipse cx="170" cy="135" rx="85" ry="40" fill="url(#qsBodyGrad)" />
        <ellipse cx="170" cy="135" rx="85" ry="40" fill="url(#qsGloss)" />

        {/* Mucus trail */}
        <motion.path
          d="M85 155 Q100 162 115 158 Q130 154 145 160 Q160 166 175 160"
          stroke="#A78BFA"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
          animate={{
            d: [
              'M85 155 Q100 162 115 158 Q130 154 145 160 Q160 166 175 160',
              'M85 157 Q100 160 115 162 Q130 158 145 156 Q160 162 175 158',
              'M85 155 Q100 162 115 158 Q130 154 145 160 Q160 166 175 160',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Shell */}
        <motion.ellipse
          cx="140"
          cy="105"
          rx="40"
          ry="32"
          fill="#4C1D95"
          animate={{ ry: [32, 30, 32] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <ellipse cx="140" cy="105" rx="30" ry="24" fill="url(#qsShellGrad)" />
        <ellipse cx="140" cy="100" rx="18" ry="14" fill="#C4B5FD" opacity="0.5" />
        <motion.path
          d="M130 105 Q135 95 145 98 Q152 100 148 108"
          stroke="#C4B5FD"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
          strokeLinecap="round"
        />

        {/* Eye stalks */}
        <motion.line
          x1="175"
          y1="95"
          x2="170"
          y2="68"
          stroke="#5B21B6"
          strokeWidth="5"
          strokeLinecap="round"
          animate={{ x2: [170, 172, 170], y2: [68, 65, 68] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.line
          x1="195"
          y1="92"
          x2="192"
          y2="65"
          stroke="#5B21B6"
          strokeWidth="5"
          strokeLinecap="round"
          animate={{ x2: [192, 194, 192], y2: [65, 62, 65] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
        />

        {/* Eyes */}
        <circle cx="170" cy="65" r="9" fill="#0B0D17" />
        <circle cx="192" cy="62" r="9" fill="#0B0D17" />

        {/* Pupils */}
        <motion.circle cx="170" cy="63" r="4" fill="white" style={{ x: eyeOffsetX, y: eyeOffsetY }} />
        <motion.circle cx="192" cy="60" r="4" fill="white" style={{ x: eyeOffsetX, y: eyeOffsetY }} />

        {/* Eye shine */}
        <motion.circle cx="172" cy="61" r="1.5" fill="white" opacity="0.95" style={{ x: eyeOffsetX, y: eyeOffsetY }} />
        <motion.circle cx="194" cy="58" r="1.5" fill="white" opacity="0.95" style={{ x: eyeOffsetX, y: eyeOffsetY }} />

        {/* Slug mouth */}
        <motion.path
          d="M220 125 Q225 130 220 133"
          stroke="#5B21B6"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{
            d: ['M220 125 Q225 130 220 133', 'M220 124 Q227 129 220 134', 'M220 125 Q225 130 220 133'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Front antenna */}
        <motion.path
          d="M240 120 Q255 108 260 95"
          stroke="#A78BFA"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{
            d: ['M240 120 Q255 108 260 95', 'M240 118 Q258 105 262 90', 'M240 120 Q255 108 260 95'],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="260"
          cy="95"
          r="3"
          fill="#C4B5FD"
          animate={{ cy: [95, 90, 95], cx: [260, 262, 260] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.svg>
    </div>
  );
}
