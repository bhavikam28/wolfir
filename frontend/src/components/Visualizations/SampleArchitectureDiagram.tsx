/**
 * Sample AWS Architecture Diagram — Visual Analysis demo
 * Represents a VPC layout that Nova Pro "analyzed" with security annotations:
 * - Red: compromised components
 * - Orange: at-risk components
 * - Green: monitored / healthy
 */
import React from 'react';

const SampleArchitectureDiagram: React.FC = () => (
  <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
    <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
      <span className="text-xs font-bold text-slate-700">Sample AWS Architecture · Nova Pro Analysis</span>
      <span className="flex items-center gap-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Compromised
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> At-risk
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Monitored
        </span>
      </span>
    </div>
    <div className="p-4 flex justify-center items-center min-h-[280px]">
      <svg
        viewBox="0 0 520 280"
        className="w-full max-w-lg h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* VPC rectangle */}
        <rect x="20" y="20" width="480" height="240" rx="8" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
        <text x="260" y="42" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="600">VPC (10.0.0.0/16)</text>

        {/* Public subnet */}
        <rect x="40" y="60" width="140" height="100" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
        <text x="110" y="78" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="500">Public Subnet</text>

        {/* Internet Gateway - green */}
        <rect x="75" y="90" width="70" height="30" rx="3" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
        <text x="110" y="108" textAnchor="middle" fill="#065F46" fontSize="8" fontWeight="500">IGW</text>

        {/* ALB - orange at-risk */}
        <rect x="65" y="130" width="90" height="28" rx="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
        <text x="110" y="148" textAnchor="middle" fill="#92400E" fontSize="8" fontWeight="500">ALB</text>

        {/* Private subnet */}
        <rect x="200" y="60" width="180" height="100" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
        <text x="290" y="78" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="500">Private Subnet</text>

        {/* EC2 - red compromised */}
        <rect x="225" y="90" width="50" height="55" rx="3" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" />
        <text x="250" y="115" textAnchor="middle" fill="#991B1B" fontSize="8" fontWeight="500">EC2</text>
        <text x="250" y="138" textAnchor="middle" fill="#DC2626" fontSize="7">Compromised</text>

        {/* RDS - orange at-risk */}
        <rect x="295" y="95" width="70" height="45" rx="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
        <text x="330" y="118" textAnchor="middle" fill="#92400E" fontSize="8" fontWeight="500">RDS</text>
        <text x="330" y="135" textAnchor="middle" fill="#B45309" fontSize="7">At-risk</text>

        {/* Data subnet */}
        <rect x="400" y="60" width="90" height="100" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
        <text x="445" y="78" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="500">Data</text>

        {/* S3 - green monitored */}
        <rect x="415" y="90" width="60" height="55" rx="3" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
        <text x="445" y="118" textAnchor="middle" fill="#065F46" fontSize="8" fontWeight="500">S3</text>
        <text x="445" y="138" textAnchor="middle" fill="#047857" fontSize="7">Monitored</text>

        {/* Connection lines */}
        <line x1="110" y1="120" x2="110" y2="130" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="180" y1="144" x2="225" y2="144" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="275" y1="117" x2="295" y2="117" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="365" y1="117" x2="400" y2="117" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />

        {/* Bottom note */}
        <text x="260" y="265" textAnchor="middle" fill="#64748B" fontSize="9">
          Upload your diagram → Nova Pro identifies security risks
        </text>
      </svg>
    </div>
  </div>
);

export default SampleArchitectureDiagram;
