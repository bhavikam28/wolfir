# Building WolfIR: Why Cloud Security Needed Seven Nova Capabilities Instead of One

When I started thinking about what to build for the Amazon Nova hackathon, I kept coming back to the same problem I'd seen across every AWS environment I'd worked with: the gap between detection and action.

AWS gives you a lot of tools. CloudTrail captures every API call. GuardDuty surfaces anomalies. Security Hub aggregates findings. IAM Access Analyzer flags risky policies. CloudWatch catches billing spikes. The tooling exists. What's missing is the layer that connects those signals to actual decisions — figuring out what happened, how bad it is, what needs to change, and making sure that change is documented and auditable.

That investigation-to-remediation workflow is still almost entirely manual. Prophet Security's 2025 AI in SOC Survey puts the average SOC at 960+ alerts per day, with 40% going uninvestigated. The rest sit in queues, get triaged inconsistently, or get missed. The problem isn't data. It's the time cost of turning data into action.

So I built WolfIR — an autonomous incident response pipeline that runs from CloudTrail alert to documented, executed remediation using seven Amazon Nova capabilities working in coordination. This post explains the architecture decisions that shaped it and why each model choice was deliberate, not arbitrary.

---

## Why seven capabilities, and why these seven

The first version of WolfIR was a single-model system. One Nova 2 Lite call received the CloudTrail event set and was asked to produce a timeline, risk score, remediation steps, and documentation. It failed quickly.

The failure wasn't capability — it was focus. A model trying to simultaneously reason about forensic timelines, assign numerical risk scores with consistency, generate executable CLI commands with real resource identifiers, and write Confluence-ready documentation produced outputs that were mediocre at all four things. The context window bloated past 16K tokens on any realistic incident. The remediation steps contradicted the timeline. The documentation used a different severity rating than the risk score.

The insight was that these are genuinely different cognitive tasks. Forensic timeline reconstruction needs deep, sequential text reasoning. Risk classification needs to be fast and deterministic — it should produce the same score for the same event twice, not vary based on sampling temperature. Architecture diagram analysis needs multimodal capability that text models don't have. The model selection in WolfIR followed from this.

**Nova Pro** handles the initial detection and any visual analysis. The multimodal capability matters specifically for STRIDE threat modeling — if you upload an architecture diagram, WolfIR reads it and maps threat vectors across all six STRIDE categories against your actual topology. Text models can't do this.

**Nova 2 Lite** runs the investigation agent (temporal analysis, kill chain reconstruction) and later the remediation agent (generating executable steps) and the documentation agent. It's fast and accurate on the kinds of structured text reasoning these tasks need.

**Nova Micro** runs the risk classifier at `temperature=0.1`. Near-zero temperature was a deliberate choice — risk classification needs to be deterministic. Running it three times in parallel via `asyncio.gather` and returning a confidence interval (83–91/100) rather than a single number turned out to be the right call, because a single number implies a precision LLMs don't actually have.

**Nova 2 Sonic** powers Aria, the voice assistant. Being able to ask "what's the root cause?" or "have we seen this before?" in natural speech and get a conversational response while you're mid-investigation is qualitatively different from typing the same query.

**Nova Canvas** generates the cover image for incident report PDFs. This might seem minor, but generating a visually distinct, context-aware cover image for each incident report using the incident type, severity, and affected services makes the output feel like a real deliverable rather than a text dump.

---

## The architectural decision that makes WolfIR different: cross-incident memory

Most incident response tools handle each alert in isolation. WolfIR persists every incident to DynamoDB with its full context — source IP ranges, IAM usage patterns, timing fingerprints, attack techniques — and uses Nova Multimodal Embeddings to compute similarity scores against every past incident when a new one arrives.

The first time you run the IAM privilege escalation demo, you get a standard analysis. Run the crypto mining demo after it, and WolfIR surfaces a cross-incident correlation: similar source IP range, overlapping IAM enumeration pattern, incidents four days apart.

This was the hardest architectural decision to get right. The naive approach — storing full incident JSON in DynamoDB and doing text similarity — doesn't work well. Incident text is verbose and the signal you care about (behavioral patterns, not prose descriptions) gets diluted. Using embeddings over structured feature vectors extracted from each incident gave us much better correlation quality. The embedding model handles the similarity math; DynamoDB handles the persistence and retrieval.

The practical effect is that WolfIR gets better at correlation the more incidents it processes. The second incident of a campaign is identified faster and with more confidence than the first.

---

## MCP servers as the AWS integration layer

Six MCP servers connect WolfIR's agents to real AWS data: CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, and AI Security. The MCP architecture was a deliberate choice over direct boto3 calls from within agent prompts, for a specific reason.

When you put AWS API calls inside an LLM's tool execution, you get implicit coupling between the agent's reasoning and the AWS API surface. If an API changes, your agent's behavior changes in ways that are hard to predict. If you want to test agent behavior, you need live AWS access.

MCP servers create an explicit contract between the agent and the AWS surface. The agent calls a named tool with typed inputs. The MCP server handles the boto3 call, error handling, retry logic, and response normalization. The agent gets structured output. Testing becomes straightforward because you can swap in a mock MCP server without touching agent logic.

There's also a latency benefit. The CloudTrail MCP server caches event lists for 60 seconds and IAM policy documents for 5 minutes. For a pipeline that might call `get_cloudtrail_events` multiple times in a single incident analysis, caching at the MCP layer eliminates redundant API calls and reduces both latency and cost.

---

## The second security pillar: AI pipeline monitoring via MITRE ATLAS

WolfIR monitors its own Bedrock AI pipeline using six MITRE ATLAS techniques. This was the part of the build I found most interesting from a systems design perspective.

The question driving it: if an adversary can influence what your security AI sees or how it reasons, they can blind your detection layer. Prompt injection, adversarial inputs designed to suppress risk scores, API abuse patterns — these are real attack surfaces for a system like WolfIR, not theoretical ones.

MITRE ATLAS is the adversarial ML threat framework that maps these attack surfaces the way ATT&CK maps traditional infrastructure attacks. The six techniques we monitor — prompt injection (AML.T0051), API abuse (AML.T0040), adversarial inputs (AML.T0043), output-based exfiltration (AML.T0024), inference API information disclosure (AML.T0016), and model behavior shift detection — each have dedicated monitoring logic in the AI Security MCP server.

This runs as a separate security surface alongside the cloud security pipeline. If the AI pipeline security tab shows a WARNING or ALERT, it means WolfIR has detected something anomalous about its own behavior or the inputs it's receiving, not just about your AWS infrastructure.

I'm not aware of other submissions in this hackathon building this. As AI systems get deployed into more security-critical workflows, this becomes a necessary layer, not an optional one.

---

## What the demo doesn't show, and why that's okay

WolfIR's Vercel deployment runs entirely without a backend. Every feature tab works. The five-agent pipeline runs. Cross-incident correlation surfaces. The MITRE ATLAS monitoring is live. This is possible because the demo mode uses pre-computed pipeline outputs — actual Nova model outputs from real pipeline runs, stored and served as structured JSON, not fabricated responses.

The tradeoff is that demo mode results don't change between runs. The real backend, running locally, produces different outputs because the LLMs are non-deterministic and work against your actual CloudTrail data. But the structure, the quality, and the feature set are identical.

That was the design principle: demo mode and real mode use the same UI, the same API contract, the same tab layout. The only difference is the data source. A judge who wants to see the full agentic pipeline should run the backend. A judge who wants to explore the feature surface in 30 seconds without setup can do that on Vercel.

---

The full system — seven Nova capabilities, six MCP servers, 21 Strands tool functions, DynamoDB correlation engine, MITRE ATLAS monitoring, voice assistant, visual report export — took about four weeks to build. The hardest parts weren't the AI. They were the context handoff logic between agents, keeping demo and real modes in sync, and making autonomous remediation trustworthy enough that a security engineer would actually use it.

Those are the parts the next posts cover.

---

*Live demo: [wolfir.vercel.app](https://wolfir.vercel.app) · Code: [github.com/bhavikam28/nova-sentinel](https://github.com/bhavikam28/wolfir)*