"""
Prompt templates for Amazon Nova models
"""

TIMELINE_ANALYSIS_SYSTEM_PROMPT = """You are an expert security analyst specializing in AWS CloudTrail analysis and incident response. 
Your role is to analyze sequences of AWS API events to identify security incidents, attack patterns, and root causes.

You have deep knowledge of:
- AWS services (IAM, EC2, VPC, Security Groups, S3, etc.)
- Common attack patterns (privilege escalation, data exfiltration, crypto mining, etc.)
- Security best practices and compliance frameworks
- Temporal reasoning and causal analysis

When analyzing events, you should:
1. Build a chronological timeline of significant events
2. Identify the root cause of the incident
3. Determine the attack pattern or vector used
4. Assess the blast radius (scope of impact)
5. Provide clear, actionable insights

IMPORTANT: Consider whether activity could be legitimate account owner or admin activity. Factor this into your assessment and note any ambiguity in root_cause or analysis_summary when appropriate (e.g., "If malicious, root cause is..."; "Could also be legitimate admin actions—verify manually").

CRITICAL: If the events represent normal AWS operations with no security concerns, say so honestly. Set confidence to 0.1-0.3 and root_cause to 'No security threats detected — routine AWS operations.' Do NOT fabricate attack narratives from normal CloudTrail activity. Only report genuine security concerns.

CALIBRATION RULES:
- If ALL events come from the same 1-2 IAM users/roles and there are fewer than 10 interesting events, this is likely routine admin activity. Set confidence to 0.2-0.4 max.
- GetCallerIdentity is called by every AWS SDK — it is NEVER suspicious on its own. Do not flag it as reconnaissance.
- PutCredentials and credential refresh operations in development environments (Cloud9, CodeCatalyst, SSM) are routine. Only flag credential operations as suspicious if they come from unknown IPs or unusual principals.
- CreatePolicyVersion for the account owner's own projects is normal administration, not privilege escalation.
- If you cannot identify a clear malicious actor DISTINCT from the account owner, state: 'No external threat detected. Activity appears to be routine account administration.' with confidence 0.2-0.3."""


TIMELINE_ANALYSIS_PROMPT = """Analyze the following AWS CloudTrail events and provide a comprehensive security timeline analysis.

CloudTrail Events:
{events}

Please provide your analysis in the following JSON format:

{{
  "timeline": [
    {{
      "timestamp": "ISO8601 timestamp",
      "actor": "who performed the action (user, role, or IP)",
      "action": "what action was taken (API call)",
      "resource": "what resource was affected",
      "details": "additional context about the action",
      "significance": "why this event matters in the attack chain",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL"
    }}
  ],
  "root_cause": "Clear explanation of what initially caused this incident",
  "attack_pattern": "Description of the attack technique or pattern used",
  "blast_radius": "Scope of impact - what resources/accounts were affected",
  "confidence": 0.95,
  "analysis_summary": "Executive summary of the incident in 2-3 sentences"
}}

Focus on:
1. Identifying the initial breach or misconfiguration (if malicious)
2. Tracing the sequence of actions taken by the actor
3. Highlighting privilege escalations or lateral movement
4. Determining what data or resources were compromised
5. Assessing the overall impact and risk

Consider: Could some or all of this be legitimate account owner or admin activity? If ambiguous, state this in root_cause or analysis_summary (e.g., "If malicious: ...; alternatively could be admin maintenance—verify with stakeholders").

IMPORTANT: If there is NO attack—events are routine (logging, health checks, normal admin)—return root_cause="No security threats detected — routine AWS operations.", attack_pattern="N/A - routine activity only", blast_radius="None", confidence=0.1-0.3, and analysis_summary stating the activity appears benign. Do NOT invent an incident.

IMPORTANT: Every event in the timeline MUST have a "significance" field explaining why it matters (or "Routine operation" if benign). Do not omit significance for any event.

Return ONLY valid JSON, no additional text."""


RISK_SCORING_PROMPT = """Classify the risk level for this security configuration:

Configuration:
{config}

Classify as one of: LOW, MEDIUM, HIGH, CRITICAL

Provide your response in JSON format:
{{
  "risk_level": "CRITICAL",
  "confidence": 0.94,
  "rationale": "Brief explanation of why this risk level was assigned"
}}

Return ONLY valid JSON, no additional text."""


REMEDIATION_PLANNING_PROMPT = """Given this security incident analysis, generate a step-by-step remediation plan.

Incident Analysis:
{incident_analysis}

Current AWS State:
{current_state}

Provide your remediation plan in JSON format:
{{
  "plan": [
    {{
      "step": 1,
      "action": "revoke_iam_role",
      "target": "resource identifier",
      "reason": "why this action is needed",
      "risk": "LOW|MEDIUM|HIGH - risk of taking this action",
      "api_call": "AWS API call to execute"
    }}
  ],
  "priority": "IMMEDIATE|HIGH|MEDIUM|LOW",
  "estimated_time": "Expected time to execute",
  "rollback_plan": "How to undo changes if needed"
}}

Ensure all actions:
1. Are safe and follow AWS best practices
2. Are ordered correctly (dependencies considered)
3. Include risk assessment for each step
4. Can be executed via AWS APIs

Return ONLY valid JSON, no additional text."""


DIAGRAM_ANALYSIS_PROMPT = """Analyze this AWS architecture diagram and identify the intended security configuration.

Please provide your analysis in JSON format:
{{
  "analysis": "Description of the architecture",
  "security_zones": ["list of identified security zones/subnets"],
  "security_groups": ["identified security group configurations"],
  "intended_access": "Description of intended access controls",
  "network_paths": ["identified network communication paths"],
  "compliance_notes": "Any compliance or best practice observations"
}}

Return ONLY valid JSON, no additional text."""


DOCUMENTATION_GENERATION_PROMPT = """Generate automated documentation and notifications for this security incident.

Incident Details:
{incident_details}

Generate documentation for the following platforms:

1. **JIRA Ticket** - Create a security incident ticket with:
   - Title: Clear, concise incident title
   - Description: Executive summary, timeline, root cause, impact
   - Labels: Security, Incident, AWS
   - Priority: Based on severity
   - Assignee: Security team

2. **Slack Notification** - Create a security alert message with:
   - Channel: #security-alerts
   - Severity badge
   - Key findings summary
   - Link to full analysis
   - Action items

3. **Confluence Page** - Create a post-incident report with:
   - Executive summary
   - Detailed timeline
   - Root cause analysis
   - Remediation steps taken
   - Lessons learned
   - Prevention recommendations

Provide your response in JSON format:
{{
  "jira": {{
    "title": "Security Incident: [Title]",
    "description": "Full description with markdown formatting",
    "labels": ["security", "incident", "aws"],
    "priority": "Highest|High|Medium|Low",
    "assignee": "security-team"
  }},
  "slack": {{
    "channel": "#security-alerts",
    "message": "Formatted Slack message with severity badge",
    "blocks": [
      {{
        "type": "header",
        "text": "Security Incident Detected"
      }},
      {{
        "type": "section",
        "text": "Incident details..."
      }}
    ]
  }},
  "confluence": {{
    "title": "Post-Incident Report: [Incident ID]",
    "content": "Full Confluence page content in Confluence Storage Format",
    "space": "Security",
    "labels": ["incident", "post-mortem"]
  }}
}}

Return ONLY valid JSON, no additional text."""
