/**
 * Nova Sentinel Logo - Concentric Circles Design
 * Elegant, minimal, represents layered security and AI intelligence
 */
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const NovaSentinelLogo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      fill="none" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="novaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      
      {/* Outer circle */}
      <circle 
        cx="20" 
        cy="20" 
        r="18" 
        stroke="url(#novaGradient)" 
        strokeWidth="2" 
        fill="none"
        opacity="0.3"
      />
      
      {/* Middle circle */}
      <circle 
        cx="20" 
        cy="20" 
        r="12" 
        stroke="url(#novaGradient)" 
        strokeWidth="2" 
        fill="none"
        opacity="0.6"
      />
      
      {/* Inner circle - solid */}
      <circle 
        cx="20" 
        cy="20" 
        r="6" 
        fill="url(#novaGradient)"
      />
    </svg>
  );
};

export default NovaSentinelLogo;
