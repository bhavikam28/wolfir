/**
 * Attack Path Visualization for Landing Page
 * Animated with Framer Motion - Stunning modern design
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Key,
  Globe,
  Network,
  Wifi,
  Server,
  User,
  Database,
} from 'lucide-react';

interface SecurityNodeProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  color: string;
  delay: number;
}

const SecurityNode: React.FC<SecurityNodeProps> = ({ icon: Icon, label, color, delay }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay, duration: 0.4 }}
    className="flex flex-col items-center"
  >
    <motion.div
      whileHover={{ scale: 1.1 }}
      className="relative"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl opacity-40"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />
      
      {/* Node circle */}
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl border-4 border-white"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-10 h-10 text-white" strokeWidth={2} />
      </div>
    </motion.div>
    
    <div className="mt-3 text-sm font-semibold text-slate-700 text-center whitespace-nowrap">
      {label}
    </div>
  </motion.div>
);

interface AnimatedArrowProps {
  delay: number;
  color?: string;
}

const AnimatedArrow: React.FC<AnimatedArrowProps> = ({ delay, color = '#EF4444' }) => (
  <motion.svg
    width="80"
    height="40"
    viewBox="0 0 80 40"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.3 }}
    className="flex-shrink-0"
  >
    <defs>
      <marker
        id={`arrowhead-lp-${delay}`}
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="3"
        orient="auto"
      >
        <polygon points="0 0, 10 3, 0 6" fill={color} />
      </marker>
    </defs>
    
    <motion.path
      d="M 0 20 L 70 20"
      stroke={color}
      strokeWidth="3"
      fill="none"
      markerEnd={`url(#arrowhead-lp-${delay})`}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay, duration: 0.8, ease: "easeInOut" }}
    />
    
    {/* Animated dot flowing through arrow */}
    <motion.circle
      r="4"
      fill={color}
      initial={{ cx: 0, cy: 20 }}
      animate={{ cx: 70, cy: 20 }}
      transition={{
        delay: delay + 0.8,
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 2,
      }}
    />
  </motion.svg>
);

interface VerticalArrowProps {
  delay: number;
  color?: string;
}

const VerticalArrow: React.FC<VerticalArrowProps> = ({ delay, color = '#EF4444' }) => (
  <motion.svg
    width="40"
    height="80"
    viewBox="0 0 40 80"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.3 }}
    className="flex-shrink-0"
  >
    <defs>
      <marker
        id={`arrowhead-v-lp-${delay}`}
        markerWidth="10"
        markerHeight="10"
        refX="3"
        refY="9"
        orient="auto"
      >
        <polygon points="0 0, 6 10, 3 0" fill={color} />
      </marker>
    </defs>
    
    <motion.path
      d="M 20 0 L 20 70"
      stroke={color}
      strokeWidth="3"
      fill="none"
      markerEnd={`url(#arrowhead-v-lp-${delay})`}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay, duration: 0.8, ease: "easeInOut" }}
    />
    
    <motion.circle
      r="4"
      fill={color}
      initial={{ cx: 20, cy: 0 }}
      animate={{ cx: 20, cy: 70 }}
      transition={{
        delay: delay + 0.8,
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 2,
      }}
    />
  </motion.svg>
);

const AttackPathVisualization: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-professional-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Security Attack Path
        </h2>
        <p className="text-slate-600">
          Visual representation of the critical attack chain
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-12 overflow-x-auto">
        {/* Top Row */}
        <div className="flex items-center justify-center gap-6 mb-16 flex-wrap">
          <SecurityNode
            icon={Shield}
            label="Security Group"
            color="#EF4444"
            delay={0.5}
          />
          <AnimatedArrow delay={0.9} color="#EF4444" />
          <SecurityNode
            icon={AlertTriangle}
            label="SSH Exposed"
            color="#EF4444"
            delay={0.6}
          />
          <AnimatedArrow delay={1.0} color="#F97316" />
          <SecurityNode
            icon={Key}
            label="Secret"
            color="#F97316"
            delay={0.7}
          />
        </div>

        {/* Vertical Connectors */}
        <div className="flex items-start justify-center gap-6 mb-8 flex-wrap">
          <div style={{ width: 80, marginLeft: 100 }} className="hidden md:block" />
          <VerticalArrow delay={1.1} color="#EF4444" />
          <div style={{ width: 80 }} className="hidden md:block" />
          <VerticalArrow delay={1.2} color="#EF4444" />
          <div style={{ width: 80 }} className="hidden md:block" />
          <VerticalArrow delay={1.3} color="#F97316" />
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <SecurityNode
            icon={Globe}
            label="Internet"
            color="#F97316"
            delay={0.1}
          />
          <AnimatedArrow delay={0.5} color="#8B5CF6" />
          <SecurityNode
            icon={Network}
            label="Gateway"
            color="#8B5CF6"
            delay={0.2}
          />
          <AnimatedArrow delay={0.6} color="#F97316" />
          <SecurityNode
            icon={Wifi}
            label="Network"
            color="#F97316"
            delay={0.3}
          />
          <AnimatedArrow delay={0.7} color="#EF4444" />
          <SecurityNode
            icon={Server}
            label="EC2 Instance"
            color="#EF4444"
            delay={0.4}
          />
          <AnimatedArrow delay={0.8} color="#EF4444" />
          <SecurityNode
            icon={User}
            label="IAM Role"
            color="#EF4444"
            delay={0.5}
          />
          <AnimatedArrow delay={0.9} color="#EF4444" />
          <SecurityNode
            icon={Database}
            label="Database"
            color="#F97316"
            delay={0.6}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-8 justify-center mt-8 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-slate-700">Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-violet-500" />
          <span className="text-sm font-medium text-slate-700">Attack Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500" />
          <span className="text-sm font-medium text-slate-700">High Severity</span>
        </div>
      </div>
    </div>
  );
};

export default AttackPathVisualization;
