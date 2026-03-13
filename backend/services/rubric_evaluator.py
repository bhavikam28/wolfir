"""
Rubric-based evaluation for security outputs — remediation plans, timelines
Uses Nova 2 Lite with defined security rubrics for evaluation.
"""
import json
from typing import Dict, Any, List
from services.bedrock_service import BedrockService
from utils.logger import logger

RUBRICS = {
    "remediation_plan": {
        "completeness": "Does the plan address root cause, containment, eradication, recovery?",
        "actionability": "Are steps specific with AWS CLI/API commands?",
        "mitre_alignment": "Do steps map to MITRE ATT&CK mitigations?",
        "rollback_safety": "Are rollback procedures included for destructive steps?",
        "approval_gates": "Are approval gates present for high-risk actions?",
    },
    "timeline": {
        "chronological_accuracy": "Are events in correct order with timestamps?",
        "root_cause_evidence": "Is root cause supported by timeline evidence?",
        "actor_attribution": "Are actors (IAM, IP) identified?",
        "blast_radius": "Is impact scope described?",
    },
}


async def evaluate_remediation_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate a remediation plan against security rubrics.
    Returns overall score (0-100) and per-rubric scores.
    """
    bedrock = BedrockService()
    steps = plan.get("steps") or plan.get("plan", {}).get("steps") or plan.get("plan", {}).get("plan") or []
    plan_json = json.dumps({"steps": steps[:15], "priority": plan.get("priority"), "rollback_plan": plan.get("rollback_plan")}, indent=2)

    rubrics_str = "\n".join([f"- {k}: {v}" for k, v in RUBRICS["remediation_plan"].items()])

    prompt = f"""You are a security quality assessor. Evaluate this remediation plan against these rubrics.
Score each rubric 0-100 (integer). Be strict: incomplete plans get low scores.

RUBRICS:
{rubrics_str}

REMEDIATION PLAN:
{plan_json}

Respond with ONLY valid JSON, no markdown:
{{
  "overall_score": <0-100>,
  "scores": {{
    "completeness": <0-100>,
    "actionability": <0-100>,
    "mitre_alignment": <0-100>,
    "rollback_safety": <0-100>,
    "approval_gates": <0-100>
  }},
  "summary": "<1-2 sentence quality assessment>"
}}"""

    try:
        response = await bedrock.invoke_nova_lite(prompt=prompt, max_tokens=500, temperature=0.1)
        text = response.get("text", "")
        # Extract JSON
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return {
                "overall_score": min(100, max(0, int(data.get("overall_score", 0)))),
                "scores": data.get("scores", {}),
                "summary": data.get("summary", ""),
                "rubrics_used": list(RUBRICS["remediation_plan"].keys()),
            }
    except Exception as e:
        logger.warning(f"Rubric evaluation failed: {e}")
    return {"overall_score": 0, "scores": {}, "summary": "Evaluation unavailable.", "error": str(e)}


async def evaluate_timeline(timeline: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate timeline analysis against rubrics."""
    bedrock = BedrockService()
    tl_json = json.dumps({
        "root_cause": timeline.get("root_cause"),
        "attack_pattern": timeline.get("attack_pattern"),
        "blast_radius": timeline.get("blast_radius"),
        "events_count": len(timeline.get("events") or []),
        "confidence": timeline.get("confidence"),
    }, indent=2)

    rubrics_str = "\n".join([f"- {k}: {v}" for k, v in RUBRICS["timeline"].items()])

    prompt = f"""You are a security quality assessor. Evaluate this timeline analysis against these rubrics.
Score each rubric 0-100 (integer).

RUBRICS:
{rubrics_str}

TIMELINE:
{tl_json}

Respond with ONLY valid JSON:
{{
  "overall_score": <0-100>,
  "scores": {{
    "chronological_accuracy": <0-100>,
    "root_cause_evidence": <0-100>,
    "actor_attribution": <0-100>,
    "blast_radius": <0-100>
  }},
  "summary": "<1-2 sentence assessment>"
}}"""

    try:
        response = await bedrock.invoke_nova_lite(prompt=prompt, max_tokens=400, temperature=0.1)
        text = response.get("text", "")
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return {
                "overall_score": min(100, max(0, int(data.get("overall_score", 0)))),
                "scores": data.get("scores", {}),
                "summary": data.get("summary", ""),
                "rubrics_used": list(RUBRICS["timeline"].keys()),
            }
    except Exception as e:
        logger.warning(f"Timeline rubric evaluation failed: {e}")
    return {"overall_score": 0, "scores": {}, "summary": "Evaluation unavailable.", "error": str(e)}
