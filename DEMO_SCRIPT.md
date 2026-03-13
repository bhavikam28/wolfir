# wolfir - 2-Minute Demo Script

## Pre-Demo Setup (30 seconds)
- [ ] Backend running on localhost:8000
- [ ] Frontend running on localhost:5173
- [ ] AWS credentials configured (or demo scenario ready)
- [ ] Browser tab open to landing page

## Demo Flow (2 minutes)

### 0:00 - 0:15 | Opening Hook
**Say:** "Security teams spend 2+ hours manually investigating incidents. wolfir resolves them in under 1 minute using 5 Amazon Nova AI models working together."

**Show:** Landing page → "Try Live Demo" button

**Click:** "Try Live Demo"

---

### 0:15 - 0:45 | Real AWS Account Analysis (PRIMARY FLOW)
**Say:** "Let me show you how it works with a real AWS account. Users connect their own AWS CLI profiles — credentials never leave their machine."

**Show:** Real AWS Account tab

**Say:** "I'll test the connection first..."
**Click:** "Test AWS Connection"
**Wait:** 2-3 seconds for connection test

**Say:** "Great! Connected to AWS account. Now let's analyze real CloudTrail events from the past 7 days."
**Click:** "Analyze Real CloudTrail Events"

**Show:** Loading state with agent progress

**Say:** "While that's running, you can see all 5 Nova agents working together:
- Nova 2 Lite is analyzing the timeline
- Nova Micro is scoring risk
- Nova Pro is ready for visual analysis
- And more..."

---

### 0:45 - 1:30 | Results Analysis
**Wait for:** Analysis to complete (should be ~30-45 seconds)

**Say:** "Analysis complete in 47 seconds. Let me show you what we found."

**Show:** Insight Cards
**Say:** "Nova 2 Lite identified the root cause, attack pattern, and blast radius with 95% confidence."

**Scroll to:** Attack Path Diagram
**Say:** "Here's the visual attack path - you can see the critical path from the security group to the database."

**Scroll to:** Timeline
**Say:** "The detailed timeline shows each event with significance analysis. This would take a security analyst 45+ minutes to build manually."

---

### 1:30 - 1:50 | Additional Features (Quick Highlights)
**Say:** "We also support visual analysis - upload an architecture diagram and Nova Pro will detect configuration drift."

**Show:** Visual Analysis Upload section (don't actually upload, just point)

**Say:** "And remediation planning - Nova generates AWS CLI commands to fix the issues, with approval gates for safety."

**Show:** Remediation Plan section (if visible)

---

### 1:50 - 2:00 | Closing & Metrics
**Say:** "So to summarize: What takes security teams 2+ hours, wolfir does in under 1 minute using 5 Nova models. That's a 99.5% time reduction."

**Show:** Back to landing page or results summary

**Say:** "Thank you! Questions?"

---

## Fallback Demo (If AWS Connection Fails)

### 0:00 - 0:15 | Opening (Same)
**Say:** "Security teams spend 2+ hours manually investigating incidents. wolfir resolves them in under 1 minute."

**Click:** "Try Live Demo"

---

### 0:15 - 0:30 | Demo Scenario Selection
**Say:** "Let me show you with a demo scenario - a cryptocurrency mining attack."

**Show:** Demo Scenarios tab
**Click:** "Cryptocurrency Mining Attack" card

---

### 0:30 - 1:15 | Analysis Results
**Wait for:** Analysis (should be instant with demo data)

**Say:** "Analysis complete. Nova 2 Lite identified the root cause: a temporary IAM role that was never deleted, leading to privilege escalation."

**Show:** Insight Cards, Attack Path, Timeline

**Say:** "The system analyzed 9 CloudTrail events, built a complete timeline, identified the attack pattern, and calculated blast radius - all in under 1 minute."

---

### 1:15 - 2:00 | Architecture & Closing
**Say:** "This uses 5 Nova models: Pro for visual analysis, 2 Lite for reasoning, Micro for fast scoring, Sonic for voice, and 2 Lite for documentation."

**Show:** Features section or architecture diagram

**Say:** "The key differentiator is thoughtful model selection - each Nova model is matched to its optimal use case."

**Say:** "Thank you! Questions?"

---

## Key Talking Points (Memorize These)

1. **Problem:** "2+ hours manual investigation → 1 minute automated"
2. **Solution:** "5 Nova models working together, each matched to its optimal task"
3. **Differentiator:** "Real AWS account integration + thoughtful model selection"
4. **Metrics:** "99.5% time reduction, 95% confidence, under 1 minute resolution"
5. **Architecture:** "Nova Pro for visual, 2 Lite for reasoning, Micro for speed, Sonic for voice"

---

## Demo Checklist

- [ ] Test full flow 10+ times before demo
- [ ] Have fallback demo scenario ready
- [ ] Know exact click sequence
- [ ] Practice timing (2 minutes exactly)
- [ ] Prepare for questions about Nova Act usage
- [ ] Have metrics ready (47 seconds vs 45 minutes)
- [ ] Test AWS connection beforehand
- [ ] Have backup plan if something breaks

---

## Common Questions & Answers

**Q: Why 5 models?**
A: Each Nova model is optimized for different tasks. Nova Micro for fast scoring, Nova Pro for visual understanding, Nova 2 Lite for complex reasoning. We match the model to the task.

**Q: How does it connect to AWS?**
A: Users use their own AWS CLI profiles. Credentials never leave their machine — all AWS calls are made directly from the backend using their local credentials.

**Q: What about Nova Act?**
A: Currently using Nova 2 Lite for documentation content generation. Nova Act is designed for browser automation - that's a future enhancement to actually post to JIRA/Slack via browser automation.

**Q: How accurate is it?**
A: We're seeing 95%+ confidence scores on root cause identification. The temporal reasoning with Nova 2 Lite is very strong.

**Q: What's the cost?**
A: Estimated $2-5/month for light usage. Each user uses their own AWS account.
