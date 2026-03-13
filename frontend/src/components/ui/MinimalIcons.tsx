/**
 * Minimal geometric icons — premium professional (LayoutDashboard-style)
 * Avoids overdone Lucide icons (clock, lightning, shield) used by AI-built apps
 */

const iconClass = 'w-5 h-5';

export const IconOverview = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconTimeline = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

export const IconAttackPath = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="12" r="2" />
    <circle cx="6" cy="18" r="2" />
    <path d="M8 6h6M8 18h6M14 12h2" />
  </svg>
);

export const IconAgent = () => (
  <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 9h6M9 13h4M9 17h2" />
  </svg>
);

export const IconHistory = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </svg>
);

export const IconCompliance = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

export const IconCost = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12M15 9H9.5a2.5 2.5 0 010 5h5a2.5 2.5 0 010 5H9" />
  </svg>
);

export const IconRemediation = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconVisual = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);

export const IconVoice = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M10 10h4M10 14h4" />
  </svg>
);

export const IconDocumentation = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

export const IconExport = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export const IconAIPipeline = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="12" height="12" rx="1" />
    <rect x="10" y="2" width="12" height="12" rx="1" />
    <path d="M8 12h12" />
  </svg>
);

/* Use Cases — minimal geometric icons for Built for Real Security Incidents */
export const IconCryptoMining = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 9h6v6H9z" />
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
  </svg>
);

export const IconDataExfil = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="10" height="12" rx="1" />
    <path d="M14 4h6v14h-6M18 8l-2 2 2 2M16 10h4" />
  </svg>
);

export const IconPrivEsc = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3" />
    <path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
    <path d="M12 16v-6M10 12l2-2 2 2" />
  </svg>
);

export const IconUnauthAccess = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

export const IconComplianceAudit = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

export const IconHealthCheck = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const IconSecurityIncidents = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
  </svg>
);

/* AI Pipeline Security — minimal premium icons */
export const IconShield = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
  </svg>
);

export const IconLock = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export const IconMap = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6l4-2 4 2 4-2v12l-4 2-4-2-4 2V6z" />
    <path d="M8 4v12M12 6v12M16 4v12" />
  </svg>
);

export const IconBarChart = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="8" width="4" height="12" rx="1" />
    <rect x="17" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const IconSettings = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

export const IconSparkles = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M6 15l1 3 3 1-1-3-3-1zM18 6l1 3 3 1-1-3-3-1z" />
  </svg>
);

/* MCP Server cards — premium minimal icons */
export const IconCloudTrail = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h16M4 8h12M4 16h8" />
    <circle cx="18" cy="12" r="2" />
  </svg>
);

export const IconIAM = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3" />
    <path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
  </svg>
);

export const IconCloudWatch = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="8" width="4" height="12" rx="1" />
    <rect x="17" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const IconSecurityHub = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
  </svg>
);

export const IconNovaCanvas = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);

/** ChangeSet — CloudFormation stack diff / attack path risk */
export const IconChangeSet = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9M12 9v12" />
    <path d="M9 12l3-3 3 3" />
  </svg>
);

/** Security Graph — nodes and edges (AI asset relationships) */
export const IconGraph = ({ className }: { className?: string }) => (
  <svg className={className || iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="6" r="2.5" />
    <circle cx="12" cy="4" r="2.5" />
    <circle cx="19" cy="8" r="2.5" />
    <circle cx="5" cy="18" r="2.5" />
    <circle cx="19" cy="18" r="2.5" />
    <path d="M7.5 7l3.5-1.5 4 3M7.5 16l3.5 1.5 4-3" />
  </svg>
);
