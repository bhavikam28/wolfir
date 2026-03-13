# The Hard Parts of Multi-Agent Security Orchestration

Orchestrating five Nova models plus an autonomous agent sounds simple on paper. In practice, it’s a maze of state management, tool selection, and failure modes. Here’s what we learned building wolfir.

## Challenge 1: Shared State Across Agents

Each agent (Detect, Investigate, Classify, Remediate, Document) needs context from the previous step. A timeline from the temporal agent. Risk scores from the classifier. The remediation agent can’t work without both.

**What we did:** Strands Agents SDK with a single orchestration run. State flows through the pipeline as a shared context object. No handoffs between services — one process, sequential steps, with each agent reading and writing to the same structure.

**Gotcha:** Token limits. Passing a 50-event timeline plus remediation steps plus documentation to the final agent can blow context. We truncate strategically and use structured outputs so the document agent gets summaries, not raw logs.

## Challenge 2: Tool Selection Without Hallucination

The Agentic Query agent picks from 23 MCP tools across five AWS servers (CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas). It can run IAM audits, CloudTrail lookups, Security Hub checks — but it has to pick the right ones.

**What we did:** Pattern matching on user intent (“audit IAM users” → IAM User Audit tool) plus Strands tool descriptions. The agent gets clear docstrings and examples. We also added fallbacks: if the agent doesn’t know, it says so instead of guessing.

**Gotcha:** Tool chaining. “Find similar incidents” requires embeddings + DynamoDB. The agent has to know to call multiple tools in sequence. We exposed a single “similar incidents” tool that does the full flow internally.

## Challenge 3: Latency and Cost

Five Nova calls per incident. Plus embeddings for similarity. Plus optional visual analysis. A single run can hit 10+ Bedrock invocations.

**What we did:** Nova Micro for classification (fast, cheap). Nova 2 Lite for heavy reasoning. Parallel calls where possible (e.g., compliance mapping and cost impact can run after the main pipeline). Caching for repeated queries.

**Gotcha:** Streaming. Aria uses Nova 2 Sonic for voice. We had to wire WebSocket streaming from Bedrock through FastAPI to the frontend. One dropped frame and the UX breaks.

## Challenge 4: Credentials and Security

We never store AWS credentials. The backend reads from the user’s local `~/.aws/credentials`. But we still need to assume roles for cross-account, support SSO, and handle “backend offline” for Vercel-only demos.

**What we did:** Profile-based auth. Optional `AWS_TARGET_ROLE_ARN` for cross-account. Demo mode with client-side fallbacks so the frontend works even when the API isn’t running. For real analysis, credentials stay on the user’s machine.

**Gotcha:** SSO token expiry. AWS SSO sessions expire. We surface clear errors and point users to `aws sso login`.

## The Payoff

When it works, it’s magic. One click, and you get a timeline, attack path, remediation plan, and docs. The challenges above are why most teams stick to dashboards. We chose the harder path — and it’s paying off.
