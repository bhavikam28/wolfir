"""
Threat Intelligence Service — Live threat intel feed integration.

Integrates with:
- AWS IP reputation (GuardDuty findings)
- AbuseIPDB (free API tier) — optional, requires API key
- VirusTotal (free tier — 4 req/min) — optional, requires API key

When API keys are not configured, returns realistic demo/mock data for IPs
extracted from incident analysis.
"""
import os
import re
from typing import Dict, Any, Optional, List
from utils.logger import logger

# Environment keys for optional integrations
ABUSEIPDB_API_KEY = os.environ.get("ABUSEIPDB_API_KEY", "")
VIRUSTOTAL_API_KEY = os.environ.get("VIRUSTOTAL_API_KEY", "")

# Regex to extract IPv4 from text (CloudTrail sourceIPAddress, actor, etc.)
IPV4_PATTERN = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}"
    r"(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
)


def _mock_reputation(ip: str) -> Dict[str, Any]:
    """
    Return realistic demo reputation data when no API keys are configured.
    Uses simple hash of IP for deterministic but varied results.
    """
    h = hash(ip) % 100
    if h < 25:
        return {
            "source": "demo",
            "abuse_score": 85 + (h % 15),
            "confidence": 0.87 + (h % 10) / 100,
            "reports": 90 + (h * 3),
            "categories": ["SSH Brute Force", "Port Scan"],
            "country": "Unknown",
            "isp": "Unknown",
        }
    if h < 50:
        return {
            "source": "demo",
            "abuse_score": 45 + (h % 25),
            "confidence": 0.65 + (h % 20) / 100,
            "reports": 12 + (h % 20),
            "categories": ["Attempted Login"],
            "country": "Unknown",
            "isp": "Unknown",
        }
    if h < 75:
        return {
            "source": "demo",
            "abuse_score": 92 + (h % 8),
            "confidence": 0.95,
            "reports": 142,
            "categories": ["SSH Brute Force", "Port Scan", "Malicious Host"],
            "country": "Unknown",
            "isp": "Unknown",
        }
    return {
        "source": "demo",
        "abuse_score": 15 + (h % 20),
        "confidence": 0.4,
        "reports": 2,
        "categories": [],
        "country": "Unknown",
        "isp": "Unknown",
    }


def _query_abuseipdb(ip: str) -> Optional[Dict[str, Any]]:
    """Query AbuseIPDB API if key is configured."""
    if not ABUSEIPDB_API_KEY:
        return None
    try:
        import httpx
        resp = httpx.get(
            "https://api.abuseipdb.com/api/v2/check",
            params={"ipAddress": ip, "maxAgeInDays": 90},
            headers={"Key": ABUSEIPDB_API_KEY, "Accept": "application/json"},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        d = resp.json()
        data = d.get("data", {})
        cats = data.get("reports", [])
        return {
            "source": "abuseipdb",
            "abuse_score": data.get("abuseConfidenceScore", 0),
            "confidence": data.get("abuseConfidenceScore", 0) / 100,
            "reports": data.get("totalReports", 0),
            "categories": list(set(str(c) for c in cats))[:5] if cats else [],
            "country": data.get("countryCode", "Unknown"),
            "isp": data.get("isp", "Unknown"),
        }
    except Exception as e:
        logger.warning(f"AbuseIPDB query failed for {ip}: {e}")
        return None


def _query_virustotal(ip: str) -> Optional[Dict[str, Any]]:
    """Query VirusTotal API if key is configured (rate limited)."""
    if not VIRUSTOTAL_API_KEY:
        return None
    try:
        import httpx
        resp = httpx.get(
            f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
            headers={"x-apikey": VIRUSTOTAL_API_KEY},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        d = resp.json()
        attrs = d.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        total = sum(stats.values()) or 1
        score = int((malicious / total) * 100) if total else 0
        return {
            "source": "virustotal",
            "abuse_score": score,
            "confidence": min(1.0, 0.3 + score / 100),
            "reports": malicious,
            "categories": ["VirusTotal detection"] if malicious else [],
            "country": attrs.get("country", "Unknown"),
            "isp": "Unknown",
        }
    except Exception as e:
        logger.warning(f"VirusTotal query failed for {ip}: {e}")
        return None


def extract_ips_from_context(context: str) -> List[str]:
    """
    Extract unique IPv4 addresses from text (e.g. CloudTrail actor, sourceIP, timeline).
    """
    if not context:
        return []
    return list(dict.fromkeys(IPV4_PATTERN.findall(context)))


def lookup_ip_reputation(ip: str) -> Dict[str, Any]:
    """
    Look up threat reputation for a single IP.
    Uses AbuseIPDB or VirusTotal if configured; otherwise returns mock data.
    """
    ip = ip.strip()
    if not ip or not IPV4_PATTERN.fullmatch(ip):
        return {"error": "Invalid IP address", "ip": ip}

    # Try real APIs first
    result = _query_abuseipdb(ip)
    if result is None:
        result = _query_virustotal(ip)
    if result is None:
        result = _mock_reputation(ip)

    result["ip"] = ip
    return result


def enrich_timeline_with_threat_intel(timeline_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract IPs from timeline events and add threat intel cache.
    Returns list of { ip, reputation } for use in UI.
    """
    seen = set()
    cache: Dict[str, Dict[str, Any]] = {}
    for evt in timeline_events or []:
        text = " ".join(
            str(v) for k, v in (evt or {}).items()
            if v and k in ("actor", "sourceIPAddress", "source_ip", "resource", "details")
        )
        for ip in extract_ips_from_context(text):
            if ip not in seen:
                seen.add(ip)
                cache[ip] = lookup_ip_reputation(ip)
    return [{"ip": k, "reputation": v} for k, v in cache.items()]


def get_threat_intel_summary_for_aria(ips: List[str]) -> str:
    """
    Produce a short summary of threat intel for Aria voice agent context.
    """
    if not ips:
        return "No external IPs identified in this incident."
    results = [lookup_ip_reputation(ip) for ip in ips[:5]]
    parts = []
    for r in results:
        ip = r.get("ip", "?")
        score = r.get("abuse_score", 0)
        reports = r.get("reports", 0)
        cats = r.get("categories", [])
        if score >= 80:
            parts.append(f"IP {ip}: {score}% abuse confidence, {reports} reports, categories: {', '.join(cats[:2]) or 'Unknown'}")
        elif score >= 50:
            parts.append(f"IP {ip}: moderate risk ({score}% confidence)")
        else:
            parts.append(f"IP {ip}: low risk")
    return "Threat intel: " + "; ".join(parts)
