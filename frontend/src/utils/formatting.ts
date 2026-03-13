/**
 * Utility functions for formatting data
 */
import { format, parseISO } from 'date-fns';
import type { SeverityLevel } from '../types/incident';

/**
 * Format timestamp to readable date/time
 */
export const formatTimestamp = (timestamp: string): string => {
  try {
    return format(parseISO(timestamp), 'MMM dd, yyyy HH:mm:ss');
  } catch {
    return timestamp;
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp: string): string => {
  try {
    const date = parseISO(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return timestamp;
  }
};

/**
 * Get color class for severity level
 */
export const getSeverityColor = (severity?: SeverityLevel): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'HIGH':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'LOW':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

/**
 * Get badge color for severity
 */
export const getSeverityBadgeColor = (severity?: SeverityLevel): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-600 text-white';
    case 'HIGH':
      return 'bg-orange-500 text-white';
    case 'MEDIUM':
      return 'bg-yellow-500 text-white';
    case 'LOW':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

/**
 * Format analysis time (ms to human readable)
 */
export const formatAnalysisTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
};

/**
 * Format latest analysis timestamp for display (e.g. "Feb 4, 2025, 2:23 AM")
 * Uses the most recent event timestamp from timeline, or current time if none
 */
export const formatLastAnalyzed = (timeline?: { events?: Array<{ timestamp?: string }> } | null): string => {
  const events = timeline?.events?.filter(e => e.timestamp) || [];
  if (events.length === 0) return format(new Date(), 'MMM d, yyyy, h:mm a');
  const latest = events.reduce((a, b) =>
    (a.timestamp && b.timestamp && a.timestamp > b.timestamp) ? a : b
  );
  try {
    return format(parseISO(latest.timestamp!), 'MMM d, yyyy, h:mm a');
  } catch {
    return latest.timestamp || format(new Date(), 'MMM d, yyyy, h:mm a');
  }
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Mask AWS account ID for display — shows last 4 digits only to reduce screenshot/social engineering risk.
 * Full ID available on hover via title.
 */
export const maskAccountId = (accountId: string | null | undefined): string => {
  if (!accountId || accountId.length < 4) return '••••';
  return `••••${accountId.slice(-4)}`;
};
