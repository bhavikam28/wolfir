/**
 * wolfir Logo — "Pack Logic" (Gemini-inspired)
 * Three interlocking geometric shards: Ear/Back, Snout, Eye/Bridge
 * Negative-space pupil = "finding truth in the logs"
 * Sharp, industrial-strength, flat colors (no gradients)
 */
import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const WolfirLogo: React.FC<LogoProps> = ({ size = 40, className = '', animated = true }) => {
  const Wrapper = animated ? motion.svg : 'svg' as any;

  return (
    <Wrapper
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...(animated ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: 0.5, ease: 'easeOut' }
      } : {})}
    >
      {/* Shard 1: Ear/Back — dynamic angled triangle */}
      <path d="M9.6 14.4 L24 4.8 L31.2 19.2 Z" fill="#6366F1" fillOpacity="0.95" />
      {/* Shard 2: Snout — long pointed wedge */}
      <path d="M24 41 L39 21 L26.4 19.2 Z" fill="#8B5CF6" />
      {/* Shard 3: Eye/Bridge — center micro-disruption */}
      <path d="M14.4 21.6 L26.4 16.8 L21.6 31.2 Z" fill="#6366F1" fillOpacity="0.75" />
      {/* The "Truth" pupil — negative space */}
      <circle cx="23" cy="21.5" r="1.5" fill="white" />
    </Wrapper>
  );
};

/** Wordmark: "wolf" in dark + "ir" in accent purple. Use with logo in nav/header. */
export const WolfirWordmark: React.FC<{
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean; // true = for dark backgrounds (sidebar)
}> = ({ className = '', size = 'md', dark = false }) => {
  const base = dark ? 'text-white' : 'text-slate-900';
  const accent = dark ? 'text-indigo-300' : 'text-indigo-600';
  const sizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';
  return (
    <span className={`font-bold tracking-tight ${sizeClass} ${className}`}>
      <span className={base}>wolf</span>
      <span className={accent}>ir</span>
    </span>
  );
};

export default WolfirLogo;
