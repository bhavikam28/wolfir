# Nova Sentinel — Hackathon Submission Guide

Where to add what for DevPost, README, blog, and website.

---

## 1. DevPost Submission (Project Details)

### Project Story / About the project

**Add these sections:**

- **Inspiration:** "We've seen security teams drown in alerts. Manual correlation, triage, and remediation take hours at 2am. Existing tools detect — they don't respond. We built Nova Sentinel to close that gap with agentic AI."
- **What we learned:** "Model selection matters. Nova Micro for risk scoring, Nova 2 Lite for reasoning, Nova Act for browser automation. Each model does what it's best at."
- **Challenges:** "Demo mode had to work without a backend for judges. We built client-side fallbacks so the Vercel deployment runs end-to-end."
- **How we built it:** "5 Nova models + Nova Act + Nova Multimodal Embeddings. Strands Agents SDK, 5 AWS MCP servers, DynamoDB for cross-incident memory, MITRE ATLAS for AI pipeline self-monitoring."

### Built with

- Amazon Nova (Nova Pro, Nova 2 Lite, Nova Micro, Nova 2 Sonic, Nova Canvas)
- Nova Act (browser automation)
- Nova Multimodal Embeddings (semantic similarity)
- AWS Bedrock, DynamoDB, CloudTrail, IAM, CloudWatch, Security Hub, S3
- Strands Agents SDK, FastMCP, 5 AWS MCP servers
- React, TypeScript, Vite, Tailwind CSS, Framer Motion
- Python, FastAPI, boto3

### Target audience (mention explicitly)

"SOC analysts, cloud security engineers, incident responders — including teams using AWS IAM Identity Center (SSO)."

---

## 2. README.md

**Already added:**
- "Why We Built This" section
- Target audience in hero
- Nova Act in models table
- Nova Multimodal Embeddings in models table
- Detailed Mermaid architecture diagrams
- Data flow sequence diagram

**Ensure:**
- Quick Start is clear
- IAM policy link is correct
- Demo flow steps are accurate

---

## 3. Blog Post (builder.aws.com)

**Use:** `BLOG_POST_DRAFT.md` as the base.

**Requirements:**
- Publish on https://builder.aws.com/
- Use tag **Amazon-Nova**
- Cover: who it helps, real-world impact, Day 2 plans
- Natural language, not AI-sounding
- 800–1200 words

**Key phrases to include:**
- "SOC analysts, cloud security engineers, incident responders"
- "11,000+ alerts per day, <5% investigated"
- "Agentic incident response pipeline"
- "5 Nova models + Nova Act + Nova Multimodal Embeddings"
- "Cross-incident memory, remediation with proof, AI pipeline self-monitoring"

---

## 4. Website / Landing Page

**Already updated:**
- LandingHero: "Built for SOC analysts, cloud security engineers, and incident responders — including teams using AWS IAM Identity Center (SSO)"
- WhatWhyForWhom: "SOC Analysts, Cloud Security Engineers, Incident Responders"
- FAQ: "Who is Nova Sentinel for?"
- SSO tab: "SSO works today via profiles" with 4-step setup

**Optional additions:**
- One passion line in hero: "We built this because we've seen security teams drown in alerts."
- "Why we built this" in a small callout

---

## 5. Demo Video Checklist

- [ ] ~3 minutes
- [ ] #AmazonNova hashtag in title/description
- [ ] Show UI within first 30 seconds
- [ ] Golden path: Run scenario 1 → Run scenario 2 → Ask Aria "Have we seen this before?"
- [ ] Show Nova Act: Remediation tab → "Generate Nova Act Plan"
- [ ] Show Similar Incidents: Incident History → Sparkles icon
- [ ] Brief passion intro: "We built this because..."
- [ ] Record screen capture + voiceover (avoid live demo issues)

---

## 6. Testing Instructions (Private — for judges)

- **Demo mode:** Go to https://nova-sentinel.vercel.app → Try Demo → Select scenario. No AWS account needed.
- **Real AWS:** Start backend locally (`cd backend && uvicorn main:app --reload`), connect AWS profile, analyze CloudTrail.
- **Repo access:** If private, grant testing@devpost.com and amazon-nova-hackathon@amazon.com

---

## 7. Existing Project (Pre–Feb 2)

If created after Feb 2: "This project was created after February 2nd, 2026. All development occurred during the submission period."
