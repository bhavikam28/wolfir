/**
 * FAQ Section — Aegis-style premium design
 * White cards, subtle shadows, Q: icon, clear hierarchy
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, DollarSign } from 'lucide-react';

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'What is wolfir?',
      a: 'wolfir is an agentic incident response pipeline powered by Amazon Nova. It orchestrates 5 Nova models plus Nova Act to go from security alert to remediation plan to documentation — autonomously, with human-in-the-loop approval for risky actions.',
    },
    {
      q: 'Who is wolfir for?',
      a: 'Built for SOC analysts, cloud security engineers, and incident responders — including teams using AWS IAM Identity Center (SSO). If you\'re drowning in alerts and need autonomous response, wolfir is for you.',
    },
    {
      q: 'What is Demo mode vs. real AWS analysis?',
      a: 'Demo mode is a preview only — it shows how wolfir looks and works when connected to a real AWS account. It uses sample data (no real CloudTrail, no real IAM). Use it to explore the UI, workflow, and features. For actual incident response and security analysis, connect your AWS account and run real analysis against your CloudTrail logs.',
      badges: [
        { icon: CheckCircle2, text: 'Demo: Preview only — sample data, no AWS account', color: 'bg-amber-50 border-amber-200 text-amber-700' },
        { icon: CheckCircle2, text: 'Real AWS: Your CloudTrail, your IAM — actual analysis', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
      ],
    },
    {
      q: 'Do I need an AWS account?',
      a: 'No — for Demo mode. Yes — for real security analysis. Demo lets you explore the product without signing in. To analyze your own CloudTrail events, IAM activity, and security posture, you must connect an AWS account with the required permissions.',
    },
    {
      q: 'What will real AWS analysis cost?',
      a: 'You pay only for your own AWS Bedrock usage — roughly $0.01–0.10 per incident depending on event volume. Demo mode is free and incurs no charges. Credentials stay on your machine; we never store or transmit them.',
      badges: [
        { icon: DollarSign, text: 'Bedrock usage only — no subscription or platform fees', color: 'bg-slate-100 border-slate-200 text-slate-700' },
      ],
    },
    {
      q: 'What AWS permissions do I need for real analysis?',
      a: 'CloudTrail read (LookupEvents), IAM read (ListUsers, GetUser, ListRoles, GetRole, etc.), and optionally Security Hub and CloudWatch for richer findings. The README lists the exact IAM policy. Credentials stay local; nothing is sent to our servers.',
    },
    {
      q: 'Is it safe to use my AWS credentials?',
      a: 'Yes. We use your local AWS CLI profile or AWS SSO. No keys are stored on disk or transmitted. You can audit our open-source code on GitHub.',
    },
    {
      q: 'Does wolfir use Amazon Bedrock Guardrails?',
      a: 'wolfir uses MITRE ATLAS for AI pipeline security — prompt injection detection, API abuse monitoring, output validation. Amazon Bedrock Guardrails add a complementary layer: content filters, prompt-attack blocking, PII masking at the API level. We recommend enabling Guardrails for defense in depth. See the AI Pipeline Security tab for details.',
    },
    {
      q: 'What agents does wolfir use?',
      a: 'wolfir uses 5 specialized pipeline agents (Detect, Investigate, Classify, Remediate, Document) plus an Agentic Query agent that autonomously picks tools from 6 AWS MCP servers (CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, AI Security). Security Health Check runs 5 agent queries with no incident required. All orchestrated via Strands Agents SDK.',
    },
    {
      q: 'What does "agentic" mean?',
      a: 'Multiple AI models work together with shared state. wolfir uses 5 Nova models: Temporal (timeline), Risk Scorer (severity), Remediation (action plan), Documentation (JIRA/Slack/Confluence), plus an Autonomous Agent that picks its own tools. Each does what it\'s best at — no manual triage.',
    },
    {
      q: 'How fast is the analysis?',
      a: 'Risk classification runs in under 1 second (Nova Micro). Full orchestration — timeline, attack path, remediation plan, documentation — completes in one pipeline run. Time varies with CloudTrail event volume (typically 20–60 seconds for 50–100 events).',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/80 border-y border-slate-200/80" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-slate-600 text-sm">
            Demo vs. real AWS, permissions, costs, and how it works
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full px-6 py-5 flex items-start gap-4 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white font-bold text-sm">Q</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 ml-2 inline-block align-middle transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0 pl-[4.5rem]">
                        <p className="text-slate-600 text-sm leading-relaxed mb-3">
                          {item.a}
                        </p>
                        {item.badges && (
                          <div className="flex flex-wrap gap-2">
                            {item.badges.map((badge, j) => {
                              const Icon = badge.icon;
                              return (
                                <span
                                  key={j}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${badge.color}`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {badge.text}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
