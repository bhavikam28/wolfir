/** NIST AI RMF — full evidence for each quadrant */
export const NIST_QUADRANTS_FULL: Array<{
  key: string;
  label: string;
  summary: string;
  evidence: string[];
  refUrl: string;
}> = [
  {
    key: 'GOVERN',
    label: 'Govern',
    summary: 'Multi-agent oversight with human-in-loop approval gates.',
    evidence: [
      'Approval Manager enforces 3-tier execution model (Auto-Execute / Human Approval / Manual Only)',
      'All remediation steps classified by Nova Micro before execution',
      'Complete audit trail with CloudTrail confirmation',
    ],
    refUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
  },
  {
    key: 'MAP',
    label: 'Map',
    summary: 'Threat taxonomy mapped to MITRE ATLAS (6 techniques).',
    evidence: [
      '6 MITRE ATLAS techniques actively monitored',
      'Threat taxonomy covers prompt injection, capability theft, API abuse, adversarial inputs, data exfiltration',
      'Real-time scanning on every agent invocation',
    ],
    refUrl: 'https://atlas.mitre.org/',
  },
  {
    key: 'MEASURE',
    label: 'Measure',
    summary: 'Risk scoring on every incident 0-100 via Nova Micro.',
    evidence: [
      'Nova Micro (temperature=0.1) provides deterministic risk scoring',
      'Confidence intervals tracked per assessment',
      'Cross-incident baseline comparison via DynamoDB memory',
    ],
    refUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
  },
  {
    key: 'MANAGE',
    label: 'Manage',
    summary: 'Autonomous + human-approved remediation with rollback.',
    evidence: [
      'Autonomous remediation executes safe actions in <2 seconds',
      'Human approval gates for risky actions',
      'Every execution generates a rollback command. CloudTrail audit proves every action taken',
    ],
    refUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
  },
];

/** OWASP LLM Top 10 — description, example, what we tested */
export const OWASP_LLM_DETAILS: Record<string, { description: string; example: string; whatWeTested: string }> = {
  LLM01: {
    description: 'Manipulating input prompts through API calls to get models to reveal sensitive data or model logic. GenAI apps with access to internal systems or that can trigger actions are most vulnerable.',
    example: 'Microsoft Bing Chat injection incident — a student coerced Bing into disclosing its hidden instructions.',
    whatWeTested: 'Pattern matching against 12 injection signatures ("ignore previous instructions", base64, unicode obfuscation). Bedrock Guardrails prompt-attack filtering when configured.',
  },
  LLM02: {
    description: 'APIs exposing training data, customer information, or business logic in LLM output. Critical where AI agents are customized with business-specific training data.',
    example: 'NVIDIA Triton Inference Server breach — error handling flaw potentially allowed unauthorized sensitive information disclosure.',
    whatWeTested: 'Output validation scans for AWS account IDs, access keys, secrets, PII patterns. Guardrails PII redaction when active.',
  },
  LLM03: {
    description: 'Compromised models, plugins, or training data from supply chain. Third-party models and SDKs can introduce vulnerabilities.',
    example: 'Hugging Face pipeline poisoning discovered by Wiz — malicious data could potentially open infrastructure to attacks.',
    whatWeTested: 'Foundation models via Bedrock API only. No custom fine-tuning pipeline. Supply chain risk reduced to AWS-managed models.',
  },
  LLM04: {
    description: 'Poisoned data flows through training or inference pipelines via APIs, corrupting datasets or models. Aimed at skewing output.',
    example: 'Hugging Face pipeline poisoning — malicious data in training pipelines.',
    whatWeTested: 'N/A — wolfir uses foundation models without custom fine-tuning. No training pipeline to attack.',
  },
  LLM05: {
    description: 'Unsanitized model outputs cause downstream harm — code execution, XSS, or unintended API calls.',
    example: 'Output containing eval() or exec() leading to remote code execution.',
    whatWeTested: 'Output validation checks for suspicious executable content, unexpected URLs. Structured response validation.',
  },
  LLM06: {
    description: 'Agent performs unintended actions due to excessive tool permissions or overly broad IAM roles.',
    example: 'Bedrock Agent with S3 DeleteObject permission accidentally wiping buckets.',
    whatWeTested: 'Bedrock Agent inventory. Recommend auditing agent IAM roles and tool permissions. No automatic execution without approval gates.',
  },
  LLM07: {
    description: 'System instructions or prompts exposed in model output, revealing internal logic.',
    example: 'Jailbreak prompts causing model to output its system prompt.',
    whatWeTested: 'Output scan for system prompt patterns. Guardrails help when active. No system prompt in agent responses.',
  },
  LLM08: {
    description: 'Plugins or tools with excessive permissions, insecure design, or lack of input validation.',
    example: 'Plugin that reads arbitrary files or executes shell commands.',
    whatWeTested: 'MCP tools and Strands agent tools have defined schemas. No arbitrary plugin loading.',
  },
  LLM09: {
    description: 'Hallucinated or manipulated content causing misinformation, reputational risk, or wrong decisions.',
    example: 'Model generating false security findings or incorrect remediation steps.',
    whatWeTested: 'Nova Micro (temperature=0.1) for deterministic classification. Human-in-loop for critical remediation.',
  },
  LLM10: {
    description: 'Unauthorized model extraction, weights theft, or API abuse to replicate model behavior.',
    example: 'Adversary querying model at scale to extract training data or replicate capabilities.',
    whatWeTested: 'Rate monitoring, invocation baseline. Bedrock API access controls. No model weights exposed.',
  },
};
