# The Orchestration Problems Nobody Warned Me About

Building a multi-agent system with seven Nova capabilities sounds clean on paper. The reality involved a series of failures that taught me more about the architecture than any of the successes did. This is an honest account of what broke and what we did about it.

---

## The first failure: token bloat

The first orchestration approach passed the full output of each pipeline step to the next one. Temporal analysis finishes, its full output — narrative timeline, raw event data, pattern summary — flows into the risk classifier. Risk classifier finishes, its full output plus the full timeline flows into the remediation agent. And so on.

This collapses quickly. A realistic CloudTrail incident has 20–80 events. By the time you've built a detailed forensic timeline over 80 events and attached risk classifications to each one, you're well past 16K tokens before the remediation agent even starts reading. The model starts contradicting its earlier outputs. Remediation steps reference resources that aren't in the timeline. Risk scores assigned at the beginning of the context get "forgotten" by the time the documentation agent needs them.

The fix was a context pruning layer between each agent handoff. Instead of passing full outputs forward, each step extracts a compact, typed object containing only what the next step needs:

```python
# After temporal analysis completes
timeline_handoff = {
    "events": [
        {
            "time": e["eventTime"],
            "action": e["eventName"], 
            "resource": e["requestParameters"],
            "risk_signal": e["flagged"]
        }
        for e in full_timeline
    ],
    "attack_pattern": result["identified_pattern"],
    "pivot_resource": result["lateral_movement_origin"]
}
# This goes to risk classifier — not the 80-event raw payload
```

The temporal agent output drops from ~12K tokens to ~800 tokens at handoff. Risk classification operates on clean, structured data. Remediation agent gets timeline plus scores, not raw CloudTrail JSON. Documentation agent gets the executive summary plus structured findings, not the full intermediate reasoning from every prior step.

Context size dropped by roughly 60% across the pipeline. The hallucination-from-bloat problems disappeared.

---

## The second failure: Strands SDK isn't designed for explicit multi-agent handoffs

Strands Agents SDK is excellent for what it's designed for: a single agent with tool use capabilities that reasons autonomously through a problem. It handles tool selection, execution, error handling, and retry logic cleanly.

What it doesn't have native support for is explicit multi-agent pipelines where you need deterministic handoffs — step A must complete and produce a specific structured output before step B starts, and the orchestrator controls exactly what context flows between them.

We adapted by running each specialized model as a standalone `bedrock_client.converse()` call inside `@tool`-decorated functions, all managed by a top-level Strands agent acting as orchestrator. The `@tool` decorator is where the context handoffs happen. Each tool receives serialized JSON, calls Bedrock directly, and returns structured output. The orchestrator agent calls the tools in sequence and manages state.

```python
@tool
def run_temporal_analysis(cloudtrail_events: str) -> str:
    """
    Performs forensic timeline reconstruction over CloudTrail events.
    Returns structured timeline JSON with attack pattern identification.
    """
    response = bedrock_client.converse(
        modelId="amazon.nova-lite-v2:0",
        messages=[{"role": "user", "content": [{"text": build_temporal_prompt(cloudtrail_events)}]}],
        system=[{"text": TEMPORAL_AGENT_SYSTEM_PROMPT}]
    )
    return extract_structured_timeline(response)
```

This is not the architecture Strands advertises. But it gave us what we needed: deterministic execution order, inspectable inputs and outputs at every step, and the ability to test each step in isolation by calling its `@tool` function directly with synthetic inputs.

The tradeoff is that we're using Strands primarily as an execution framework and a clean interface for the orchestrator's tool calls, rather than leaning on its autonomous agent reasoning for the pipeline itself. That's the right call for a security pipeline where you need to be able to audit exactly what each step received and returned.

---

## The third failure: open tool selection in the autonomous agent

The Autonomous Agent tab is architecturally different from the fixed pipeline. It's a genuine Strands agent that selects its own tools from 22 MCP-registered functions across five services — CloudTrail, IAM, CloudWatch, Security Hub, AI Security — and reasons freely about which tools to call and in what order.

The failure mode with open tool selection is wrong tool choices. Early testing showed the agent calling `cloudwatch_get_anomalies` in response to IAM-specific questions, or calling `get_cloudtrail_events` when the user asked about current Security Hub findings. Not wrong enough to produce obviously broken output, but wrong enough to add latency and produce answers that addressed a different question than what was asked.

The root cause was vague tool descriptions. "Returns IAM user list" tells the agent what the tool produces, not when to use it. We rewrote every tool description to encode usage intent:

```
Before: "get_iam_users: Returns list of IAM users in the account"

After: "get_iam_users: Use when the user asks about IAM users, who has 
access to the account, user creation or deletion events, access key 
status, or MFA compliance. Returns structured user list with last 
activity, attached policies, and access key age."
```

Wrong tool selections dropped significantly. The agent now has enough signal in the description to pre-select the right tool category before generating reasoning tokens.

The second layer of protection is intent inference. Before the agent runs, a Nova Micro one-shot classification maps the user's query to likely tool categories (IAM, CloudTrail, CloudWatch, Security Hub). This biases tool selection without removing agent autonomy — the agent can still make different choices if it has good reason to, but it's starting from a better prior.

---

## Prompt injection as a real attack surface

The Autonomous Agent accepts free-text user queries. That's a prompt injection attack surface, and for a security tool that has IAM API access, this isn't theoretical.

We added three layers of protection. First, Bedrock Guardrails with prompt attack blocking, which catches known injection patterns at the infrastructure level before they reach the model. Second, MITRE ATLAS technique AML.T0051 monitoring in the AI Security MCP — this watches for response behavior that deviates from what the query would predict, flagging potential successful injection even if Guardrails didn't catch the input. Third, output validation that checks whether the agent's tool selections are semantically consistent with the user's stated query.

The guardrail status indicator in the Autonomous Agent UI isn't decoration. It's a live status signal from the AML.T0051 monitor.

---

## Latency management: demo mode vs real mode

Five Nova calls per incident, plus DynamoDB reads for historical correlation, plus embeddings for similarity scoring. The full pipeline runs in 30–45 seconds. That's a reasonable response time for a security investigation workflow. For a demo, it's a long wait.

The solution was pre-computing demo mode outputs rather than faking them. Each demo scenario — IAM Privilege Escalation, Cryptocurrency Mining, S3 Data Exfiltration, Unauthorized Access, CloudTrail Manipulation — has a full pipeline output computed with the real backend, stored in `quickDemoResult.ts`. Judges on Vercel see results in 2 seconds because those results already exist. The structure is accurate because they came from actual Nova model calls.

When the backend runs locally against real CloudTrail data, the pipeline runs for real and produces different outputs — because the LLMs are non-deterministic and the actual events differ. But the feature set, the tab layout, the API contract: identical in both modes.

The cost math on real mode: Nova Micro classification is cheap and fast. Nova 2 Lite does the heavy reasoning. Embeddings run once per incident and are cached in DynamoDB with TTL. Measured per-incident Bedrock cost from actual token counts across the pipeline: $0.005–0.015. That's the real number, not an estimate.

---

## What I'd do differently

The biggest architectural regret is that the pipeline is sequential when several steps could run concurrently. Risk classification doesn't need the full timeline to start — it can begin on the first 20 events while the temporal agent processes events 21–80. Running these in parallel would cut wall-clock time by 30–40%.

The second regret is not building streaming responses from the start. The current experience is: trigger the pipeline, wait, see results. A streaming approach that emits timeline events as they're discovered, risk scores as they're computed, would make the pipeline's reasoning visible in real time. That's both more useful for analysts and more compelling for a demo. It's on the roadmap for v2.

---

*Live demo: [wolfir.vercel.app](https://wolfir.vercel.app) · Code: [github.com/bhavikam28/nova-sentinel](https://github.com/bhavikam28/wolfir)*