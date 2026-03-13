"""
Incident Memory Service — DynamoDB-backed persistent cross-incident memory.

DynamoDB Table: "wolfir-incident-memory"
- Partition Key: account_id (String)
- Sort Key: incident_id (String)
- GSI: severity-index (severity as partition key, timestamp as sort key)
- GSI: attack-type-index (attack_type as partition key, timestamp as sort key)

This service does THREE things:
1. STORE: After every incident analysis completes, save a structured summary
2. CORRELATE: Before any new analysis, query past incidents for pattern matches
3. INJECT: Feed correlation context into Aria's system prompt

Uses boto3 directly — no ORM. Kept simple for reliability.
"""
import json
import hashlib
import re
import asyncio
import threading
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger

# Lock for in-memory fallback (thread-safe when DynamoDB unavailable)
_IN_MEMORY_LOCK = threading.Lock()


@dataclass
class CorrelationResult:
    pattern_matches: List[Dict[str, Any]]
    technique_overlaps: List[Dict[str, Any]]
    ioc_matches: List[Dict[str, Any]]
    campaign_probability: float
    correlation_summary: str


TABLE_NAME = "wolfir-incident-memory"
DEFAULT_ACCOUNT = "demo-account"

# In-memory fallback when DynamoDB unavailable (e.g. local demo without AWS)
_in_memory_incidents: Dict[str, List[Dict[str, Any]]] = {}


def _extract_mitre_techniques(data: Dict[str, Any]) -> List[str]:
    """Extract MITRE technique IDs from analysis results."""
    techniques = set()
    for item in data.get("results", {}).get("risk_scores", []) or []:
        r = item.get("risk", item) if isinstance(item.get("risk"), dict) else item
        tid = r.get("mitre_technique_id") if isinstance(r, dict) else None
        if tid and isinstance(tid, str) and tid.startswith("T"):
            techniques.add(tid)
    for e in (data.get("results", {}).get("timeline", {}) or {}).get("events", []) or []:
        tid = e.get("mitre_technique_id") or (e.get("mitre", {}) or {}).get("mitre_technique_id")
        if tid and isinstance(tid, str) and tid.startswith("T"):
            techniques.add(tid)
    return list(techniques)


_IP_PATTERN = re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b")


def _extract_iocs(data: Dict[str, Any]) -> List[str]:
    """Extract IOCs: IPs, IAM roles, resource ARNs from timeline events."""
    iocs = []
    events = data.get("results", {}).get("timeline", {}).get("events", []) or []
    for e in events:
        actor = str(e.get("actor", "") or "")
        resource = str(e.get("resource", "") or "")
        for m in _IP_PATTERN.findall(actor):
            iocs.append(m)
        for m in _IP_PATTERN.findall(resource):
            iocs.append(m)
        if "arn:aws:iam:" in actor:
            iocs.append(actor)
        if "arn:aws:iam:" in resource:
            iocs.append(resource)
    return list(set(i for i in iocs if i))


def _correlation_fingerprint(attack_type: str, mitre_techniques: List[str]) -> str:
    return hashlib.sha256(
        (attack_type + "|" + "|".join(sorted(mitre_techniques))).encode()
    ).hexdigest()[:32]


def _risk_level_to_score(level: str) -> int:
    """Map risk_level string to numeric score (matches frontend SecurityPostureDashboard)."""
    s = (level or "").upper()
    if s == "CRITICAL": return 95
    if s == "HIGH": return 75
    if s == "MEDIUM": return 50
    if s == "LOW": return 25
    return 0


def _extract_risk_score(incident_data: Dict[str, Any]) -> int:
    """Extract average risk score from risk_scores. Matches frontend avg risk logic."""
    scores = incident_data.get("results", {}).get("risk_scores", []) or []
    if not scores:
        return int(incident_data.get("risk_score", 50))

    total = 0
    count = 0
    for item in scores:
        if not isinstance(item, dict):
            continue
        # Direct numeric: { risk_score: 65 } (demo)
        if isinstance(item.get("risk_score"), (int, float)):
            total += int(item["risk_score"])
            count += 1
            continue
        if isinstance(item.get("score"), (int, float)):
            total += int(item["score"])
            count += 1
            continue
        # Nested: { event: "X", risk: { risk_level: "MEDIUM" } } (real AWS)
        risk = item.get("risk") or item
        if isinstance(risk, dict):
            level = risk.get("risk_level") or risk.get("severity")
            if level:
                total += _risk_level_to_score(level)
                count += 1

    if count > 0:
        return int(round(total / count))
    return int(incident_data.get("risk_score", 50))


class IncidentMemoryService:
    def __init__(self):
        self.settings = get_settings()
        import boto3
        session = boto3.Session(profile_name=self.settings.aws_profile) if self.settings.aws_profile and self.settings.aws_profile != "default" else boto3.Session()
        self.client = session.client("dynamodb", region_name=self.settings.aws_region)
        self._table_checked = False

    async def _ensure_table_exists(self):
        if self._table_checked:
            return
        try:
            await asyncio.to_thread(self.client.describe_table, TableName=TABLE_NAME)
            logger.info(f"DynamoDB table {TABLE_NAME} exists")
            self._table_checked = True
            return
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                logger.info(f"Creating DynamoDB table {TABLE_NAME}")
                try:
                    await asyncio.to_thread(
                        self.client.create_table,
                        TableName=TABLE_NAME,
                        KeySchema=[
                            {"AttributeName": "account_id", "KeyType": "HASH"},
                            {"AttributeName": "incident_id", "KeyType": "RANGE"},
                        ],
                        AttributeDefinitions=[
                            {"AttributeName": "account_id", "AttributeType": "S"},
                            {"AttributeName": "incident_id", "AttributeType": "S"},
                        ],
                        BillingMode="PAY_PER_REQUEST",
                    )
                    waiter = self.client.get_waiter("table_exists")
                    await asyncio.to_thread(waiter.wait, TableName=TABLE_NAME)
                    logger.info(f"Table {TABLE_NAME} is ACTIVE")
                    self._table_checked = True
                except Exception as ex:
                    logger.warning(f"Table creation failed: {ex} — will retry on next request")
                    # Do NOT set _table_checked so we retry create on next call
            else:
                logger.error(f"Error checking table: {e}")
                # Do NOT set _table_checked when we had AccessDenied etc — retry after policy fix

    def _build_incident_dict(
        self, incident_id: str, account_id: str, timeline: Dict, events: List, mitre_techniques: List,
        attack_type: str, severity: str, ioc_indicators: List, affected: List, incident_data: Dict
    ) -> Dict[str, Any]:
        """Build incident dict for API response (used by in-memory fallback)."""
        return {
            "incident_id": incident_id,
            "account_id": account_id,
            "timestamp": datetime.utcnow().isoformat(),
            "severity": severity,
            "attack_type": attack_type[:200],
            "mitre_techniques": mitre_techniques,
            "affected_resources": affected,
            "risk_score": _extract_risk_score(incident_data),
            "summary": (timeline.get("root_cause") or timeline.get("analysis_summary") or "Security incident")[:500],
            "remediation_status": "generated",
            "ioc_indicators": ioc_indicators,
        }

    async def save_incident(self, incident_data: Dict[str, Any], account_id: str = DEFAULT_ACCOUNT) -> bool:
        """Store incident summary after analysis completes."""
        incident_id = incident_data.get("incident_id", "INC-UNKNOWN")
        timeline = incident_data.get("results", {}).get("timeline", incident_data.get("timeline", {}))
        if isinstance(timeline, str):
            timeline = {}
        events = timeline.get("events", []) or []
        mitre_techniques = _extract_mitre_techniques(incident_data)
        attack_type = (incident_data.get("metadata", {}).get("incident_type") or
                      (timeline.get("attack_pattern", "")[:80] if timeline.get("attack_pattern") else "Security Incident"))
        severity = "LOW"
        for e in events:
            s = (e.get("severity") or "").upper()
            if s == "CRITICAL":
                severity = "CRITICAL"
                break
            elif s == "HIGH" and severity != "CRITICAL":
                severity = "HIGH"
            elif s == "MEDIUM" and severity not in ("CRITICAL", "HIGH"):
                severity = "MEDIUM"
        ioc_indicators = _extract_iocs(incident_data)
        affected = list({e.get("resource", "") for e in events if e.get("resource")})[:20]
        try:
            await self._ensure_table_exists()
            fingerprint = _correlation_fingerprint(attack_type, mitre_techniques)
            timestamp = datetime.utcnow().isoformat()
            item = {
                "account_id": {"S": account_id},
                "incident_id": {"S": incident_id},
                "timestamp": {"S": timestamp},
                "severity": {"S": severity},
                "attack_type": {"S": attack_type[:200]},
                "mitre_techniques": {"S": json.dumps(mitre_techniques)},
                "affected_resources": {"S": json.dumps(affected)},
                "risk_score": {"N": str(_extract_risk_score(incident_data))},
                "summary": {"S": (timeline.get("root_cause") or timeline.get("analysis_summary") or "Security incident")[:1000]},
                "remediation_status": {"S": "generated"},
                "attack_vector": {"S": (timeline.get("attack_pattern") or "")[:500]},
                "entry_point": {"S": (events[0].get("actor", "") if events else "")[:200]},
                "ttps_observed": {"S": json.dumps(mitre_techniques)},
                "correlation_fingerprint": {"S": fingerprint},
                "ioc_indicators": {"S": json.dumps(ioc_indicators)},
            }
            await asyncio.to_thread(self.client.put_item, TableName=TABLE_NAME, Item=item)
            logger.info(f"Saved incident {incident_id} to memory (account={account_id})")
            return True
        except Exception as e:
            logger.warning(f"DynamoDB save failed, using in-memory fallback: {e}")
            incident_dict = self._build_incident_dict(
                incident_id, account_id, timeline, events, mitre_techniques,
                attack_type, severity, ioc_indicators, affected, incident_data
            )
            with _IN_MEMORY_LOCK:
                _in_memory_incidents.setdefault(account_id, []).insert(0, incident_dict)
            return True

    async def get_recent_incidents(self, account_id: str = DEFAULT_ACCOUNT, limit: int = 5) -> List[Dict[str, Any]]:
        """Query most recent incidents for an account."""
        out: List[Dict[str, Any]] = []
        try:
            await self._ensure_table_exists()
            resp = await asyncio.to_thread(
                self.client.query,
                TableName=TABLE_NAME,
                KeyConditionExpression="account_id = :aid",
                ExpressionAttributeValues={":aid": {"S": account_id}},
                Limit=limit * 5,
            )
            items = resp.get("Items", [])
            items_sorted = sorted(items, key=lambda i: i.get("timestamp", {}).get("S", ""), reverse=True)
            for it in items_sorted[:limit]:
                out.append(self._item_to_incident(it))
        except ClientError as e:
            logger.warning(f"get_recent_incidents DynamoDB failed: {e}")
        with _IN_MEMORY_LOCK:
            in_mem = list(_in_memory_incidents.get(account_id, []))
        merged = {i["incident_id"]: i for i in (in_mem + out)}
        return sorted(merged.values(), key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]

    def _item_to_incident(self, it: Dict[str, Any]) -> Dict[str, Any]:
        """Convert DynamoDB item to incident dict."""
        return {
            "incident_id": it["incident_id"]["S"],
            "account_id": it.get("account_id", {}).get("S", "demo-account"),
            "timestamp": it["timestamp"]["S"],
            "severity": it.get("severity", {}).get("S", "LOW"),
            "attack_type": it.get("attack_type", {}).get("S", "Unknown"),
            "mitre_techniques": json.loads(it.get("mitre_techniques", {}).get("S", "[]")),
            "affected_resources": json.loads(it.get("affected_resources", {}).get("S", "[]")),
            "risk_score": int(it.get("risk_score", {}).get("N", 50)),
            "summary": it.get("summary", {}).get("S", "")[:500],
            "remediation_status": it.get("remediation_status", {}).get("S", "generated"),
            "ioc_indicators": json.loads(it.get("ioc_indicators", {}).get("S", "[]")),
        }

    async def get_incident_by_id(
        self, incident_id: str, account_id: str = DEFAULT_ACCOUNT
    ) -> Optional[Dict[str, Any]]:
        """Get a single incident by ID."""
        with _IN_MEMORY_LOCK:
            for inc in _in_memory_incidents.get(account_id, []):
                if inc.get("incident_id") == incident_id:
                    return inc
        await self._ensure_table_exists()
        try:
            resp = await asyncio.to_thread(
                self.client.get_item,
                TableName=TABLE_NAME,
                Key={
                    "account_id": {"S": account_id},
                    "incident_id": {"S": incident_id},
                },
            )
            item = resp.get("Item")
            if not item:
                return None
            return self._item_to_incident(item)
        except ClientError as e:
            logger.warning(f"get_incident_by_id failed: {e}")
            return None

    async def list_all_incidents(
        self, account_id: str = DEFAULT_ACCOUNT, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List incidents for API (paginated)."""
        return await self.get_recent_incidents(account_id=account_id, limit=limit)

    async def correlate_incident(
        self, current_incident: Dict[str, Any], account_id: str = DEFAULT_ACCOUNT
    ) -> CorrelationResult:
        """Correlate current incident with past incidents."""
        await self._ensure_table_exists()
        pattern_matches = []
        technique_overlaps = []
        ioc_matches = []
        try:
            recent = await self.get_recent_incidents(account_id, limit=20)
            timeline = current_incident.get("results", {}).get("timeline", current_incident.get("timeline", {})) or {}
            events = timeline.get("events", []) or []
            cur_mitre = _extract_mitre_techniques(current_incident)
            cur_iocs = _extract_iocs(current_incident)
            attack_type = (current_incident.get("metadata", {}).get("incident_type") or
                          (timeline.get("attack_pattern", "")[:80] if timeline.get("attack_pattern") else "Security Incident"))
            cur_fp = _correlation_fingerprint(attack_type, cur_mitre)
            now = datetime.utcnow()
            for inc in recent:
                mitre = inc.get("mitre_techniques", [])
                fp = _correlation_fingerprint(inc.get("attack_type", ""), mitre)
                if fp == cur_fp and inc["incident_id"] != current_incident.get("incident_id"):
                    pattern_matches.append(inc)
                overlap = set(cur_mitre) & set(mitre)
                if len(overlap) >= 2:
                    technique_overlaps.append({**inc, "shared_techniques": list(overlap)})
            campaign_prob = min(0.95, 0.3 + 0.2 * len(pattern_matches) + 0.15 * len(technique_overlaps) + 0.1 * len(ioc_matches))
            summary_parts = []
            if pattern_matches:
                summary_parts.append(f"Pattern Match: {pattern_matches[0]['incident_id']} used identical attack fingerprint.")
            if technique_overlaps:
                summary_parts.append(f"Technique Overlap: {len(technique_overlaps)} incidents share 2+ MITRE techniques.")
            if campaign_prob > 0.6:
                summary_parts.append(f"Campaign Assessment: {int(campaign_prob*100)}% probability this is a coordinated campaign.")
            correlation_summary = " ".join(summary_parts) if summary_parts else "No strong correlations found with past incidents."
        except Exception as e:
            logger.warning(f"Correlate failed: {e}")
            correlation_summary = "Correlation analysis unavailable."
            campaign_prob = 0.0
        return CorrelationResult(
            pattern_matches=pattern_matches,
            technique_overlaps=technique_overlaps,
            ioc_matches=ioc_matches,
            campaign_probability=campaign_prob,
            correlation_summary=correlation_summary,
        )

    async def get_correlation_context_for_aria(
        self, account_id: str, current_incident: Dict[str, Any]
    ) -> str:
        """Format memory context for Aria's system prompt."""
        recent = await self.get_recent_incidents(account_id, limit=5)
        corr = await self.correlate_incident(current_incident, account_id)
        lines = [
            "=== INCIDENT MEMORY CONTEXT ===",
            f"You have access to {len(recent)} past incidents from this account.",
            "Recent incidents:",
        ]
        for i, inc in enumerate(recent, 1):
            ts = inc.get("timestamp", "")[:19].replace("T", " ")
            lines.append(f"{i}. {inc['incident_id']} ({ts}): {inc['severity']} - {inc.get('attack_type', 'Unknown')} via {', '.join(inc.get('mitre_techniques', [])[:3]) or 'N/A'}")
        lines.extend([
            "",
            "CORRELATION ANALYSIS for current incident:",
            f"- {corr.correlation_summary}",
            "=== END MEMORY CONTEXT ===",
        ])
        return "\n".join(lines)


_incident_memory: Optional[IncidentMemoryService] = None


def get_incident_memory() -> IncidentMemoryService:
    global _incident_memory
    if _incident_memory is None:
        _incident_memory = IncidentMemoryService()
    return _incident_memory
