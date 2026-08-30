import { MIN_ACCOUNT_AGE } from "@/lib/constants";

export type LegalSection = {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
  highlight?: string;
};

export type LegalPage = {
  slug: "terms" | "privacy";
  title: string;
  description: string;
  lastUpdated: string;
  effectiveDate: string;
  contactEmail: string;
  quickFacts: { label: string; value: string }[];
  sections: LegalSection[];
};

export const LEGAL_PAGES: Record<"terms" | "privacy", LegalPage> = {
  terms: {
    slug: "terms",
    title: "Terms of Use",
    description:
      "The rules, rights, and responsibilities that govern your use of Onyx Capital.",
    lastUpdated: "August 8, 2026",
    effectiveDate: "August 8, 2026",
    contactEmail: "legal@onyxcapital.site",
    quickFacts: [
      { label: "Minimum age", value: `${MIN_ACCOUNT_AGE}+` },
      { label: "Jurisdiction", value: "Global access" },
      { label: "Account type", value: "Individual & verified" },
      { label: "Support", value: "24/7" },
    ],
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptance of Terms",
        summary: "Using Onyx Capital means you agree to these terms.",
        paragraphs: [
          "These Terms of Use (\"Terms\") constitute a legally binding agreement between you and Onyx Capital (\"Onyx Capital\", \"we\", \"us\", or \"our\") governing access to and use of our website, mobile experience, APIs, and related services (collectively, the \"Platform\").",
          "By creating an account, accessing the Platform, or executing a transaction, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must not use the Platform.",
        ],
        highlight:
          "Your continued use of Onyx Capital after we publish updated Terms constitutes acceptance of those changes.",
      },
      {
        id: "eligibility",
        title: "2. Eligibility & Registration",
        summary: "Who may open and maintain an account.",
        paragraphs: [
          `You must be at least ${MIN_ACCOUNT_AGE} years old (or the age of majority in your jurisdiction, whichever is higher) and have the legal capacity to enter into binding contracts.`,
          "You represent that you are not located in, ordinarily resident in, or a citizen of any jurisdiction where use of the Platform is prohibited by applicable law, sanctions, or regulatory restriction.",
        ],
        bullets: [
          "Provide accurate, complete, and current registration information.",
          "Complete identity verification (KYC) when requested before accessing withdrawals or higher limits.",
          "Maintain sole control of your credentials and enable two-factor authentication where available.",
          "Notify us immediately of unauthorized access or suspected compromise of your account.",
        ],
      },
      {
        id: "services",
        title: "3. Platform Services",
        summary: "What Onyx Capital provides and what we do not guarantee.",
        paragraphs: [
          "Onyx Capital provides digital asset trading, portfolio tools, deposit and withdrawal workflows, market data, and optional automated or copy-trading features. Availability of specific assets, pairs, or features may vary by region and account status.",
          "We may modify, suspend, or discontinue any part of the Platform for maintenance, compliance, security, or business reasons. We will use reasonable efforts to provide advance notice when practicable.",
          "Market data, charts, and analytics are provided for informational purposes. Onyx Capital does not provide investment, tax, or legal advice.",
        ],
        bullets: [
          "Order execution depends on market liquidity and system availability.",
          "AI-assisted or automated strategies carry additional risk and are not guaranteed to be profitable.",
          "Third-party integrations may be subject to separate terms.",
        ],
      },
      {
        id: "fees",
        title: "4. Fees, Deposits & Withdrawals",
        summary: "How charges apply to your activity.",
        paragraphs: [
          "Applicable trading, withdrawal, and network fees are disclosed on our Fees page and within the Platform at the time of transaction. Fees may change with reasonable notice.",
          "Deposits are credited after required blockchain confirmations and, where applicable, compliance review. Withdrawals are processed subject to security checks, KYC status, and method-specific timelines.",
          "You are solely responsible for providing correct wallet addresses, bank details, or payout instructions. Onyx Capital is not liable for losses caused by incorrect recipient information supplied by you.",
        ],
      },
      {
        id: "risk",
        title: "5. Risk Disclosure",
        summary: "Trading and digital assets involve significant risk.",
        paragraphs: [
          "Digital assets are highly volatile. You may lose some or all of your invested capital. Past performance, simulated returns, leaderboards, and historical charts are not indicative of future results.",
          "Regulatory treatment of digital assets varies globally and may change without notice. Such changes may affect asset availability, pricing, or your ability to use the Platform.",
        ],
        bullets: [
          "Only trade with funds you can afford to lose.",
          "Understand leverage, margin, and liquidation mechanics before using advanced products.",
          "Stablecoins and fiat-pegged assets may still de-peg or fail.",
          "Smart contract, protocol, and counterparty risks apply to on-chain assets.",
        ],
        highlight:
          "By using Onyx Capital, you acknowledge that you assume full responsibility for your trading decisions and outcomes.",
      },
      {
        id: "conduct",
        title: "6. Acceptable Use & Prohibited Conduct",
        summary: "Activities that are not permitted on the Platform.",
        paragraphs: [
          "You agree to use the Platform lawfully and in good faith. We monitor for abuse to protect users and the integrity of our markets.",
        ],
        bullets: [
          "Market manipulation, wash trading, spoofing, or coordinated price distortion.",
          "Money laundering, terrorist financing, fraud, or evasion of sanctions.",
          "Unauthorized access, scraping, reverse engineering, or interference with Platform systems.",
          "Use of the Platform on behalf of undisclosed third parties without approval.",
          "Uploading malware, harassing staff or users, or impersonating Onyx Capital personnel.",
        ],
      },
      {
        id: "ip",
        title: "7. Intellectual Property",
        summary: "Ownership of Onyx Capital brand, software, and content.",
        paragraphs: [
          "The Platform, including its design, logos, software, documentation, and proprietary data feeds, is owned by Onyx Capital or its licensors and protected by intellectual property laws.",
          "We grant you a limited, non-exclusive, non-transferable license to access and use the Platform for personal or authorized business purposes in accordance with these Terms. You may not copy, modify, distribute, or create derivative works without written consent.",
        ],
      },
      {
        id: "liability",
        title: "8. Disclaimers & Limitation of Liability",
        summary: "How liability is allocated between you and Onyx Capital.",
        paragraphs: [
          "THE PLATFORM IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW, Onyx Capital AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, OR GOODWILL.",
          "Our aggregate liability for any claim arising from or related to the Platform shall not exceed the greater of (a) fees paid by you to Onyx Capital in the twelve months preceding the claim or (b) one hundred U.S. dollars (USD $100).",
        ],
      },
      {
        id: "termination",
        title: "9. Suspension & Termination",
        summary: "When accounts may be restricted or closed.",
        paragraphs: [
          "We may suspend or terminate your access immediately if we reasonably believe you violated these Terms, applicable law, or our risk policies, or if required by a regulator or court order.",
          "You may close your account at any time subject to settling open orders, fees, and compliance obligations. Certain records may be retained as required by law.",
        ],
      },
      {
        id: "disputes",
        title: "10. Governing Law & Disputes",
        summary: "How legal disputes are handled.",
        paragraphs: [
          "These Terms are governed by the laws specified in your account jurisdiction notice, without regard to conflict-of-law principles.",
          "Before initiating formal proceedings, you agree to contact legal@onyxcapital.site to attempt good-faith resolution. Where permitted, disputes may be resolved through binding arbitration rather than class action litigation.",
        ],
      },
      {
        id: "changes",
        title: "11. Changes to These Terms",
        summary: "How we update this agreement.",
        paragraphs: [
          "We may revise these Terms to reflect legal, regulatory, or product changes. Material updates will be communicated via email, in-app notice, or a banner on the Platform.",
          "If you disagree with revised Terms, you must stop using the Platform and withdraw eligible balances before the effective date of the changes, subject to compliance review.",
        ],
      },
      {
        id: "contact",
        title: "12. Contact",
        summary: "Reach our legal team.",
        paragraphs: [
          "Questions about these Terms may be directed to legal@onyxcapital.site or Onyx Capital Legal, Onyx Capital, via the Help Center.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    description:
      "How Onyx Capital collects, uses, shares, and protects your personal information.",
    lastUpdated: "August 8, 2026",
    effectiveDate: "August 8, 2026",
    contactEmail: "privacy@onyxcapital.site",
    quickFacts: [
      { label: "Encryption", value: "TLS 1.3 + AES-256" },
      { label: "Data sales", value: "Never" },
      { label: "GDPR ready", value: "Yes" },
      { label: "Retention", value: "Purpose-based" },
    ],
    sections: [
      {
        id: "introduction",
        title: "1. Introduction",
        summary: "Our commitment to your privacy.",
        paragraphs: [
          "Onyx Capital (\"Onyx Capital\", \"we\", \"us\") respects your privacy and is committed to handling personal information responsibly. This Privacy Policy explains what data we collect, why we collect it, how we use and share it, and the choices available to you.",
          "This policy applies to visitors, registered users, and anyone who interacts with our website, dashboard, APIs, support channels, and marketing communications.",
        ],
        highlight:
          "We do not sell your personal information to third-party data brokers.",
      },
      {
        id: "collection",
        title: "2. Information We Collect",
        summary: "Categories of data we process.",
        paragraphs: [
          "The information we collect depends on how you use Onyx Capital. Some data is provided directly by you; other data is collected automatically when you interact with the Platform.",
        ],
        bullets: [
          "Account data: name, email, phone number, username, password hash, and profile preferences.",
          "Identity & compliance: government ID, proof of address, selfies, source-of-funds documentation, and sanctions screening results.",
          "Financial activity: deposit and withdrawal records, wallet addresses, bank or payout details, trade history, balances, and fee payments.",
          "Technical data: IP address, device identifiers, browser type, session logs, cookies, and crash diagnostics.",
          "Communications: support tickets, chat transcripts, survey responses, and marketing opt-in status.",
        ],
      },
      {
        id: "use",
        title: "3. How We Use Your Information",
        summary: "Purposes for processing personal data.",
        paragraphs: [
          "We use personal information to operate, secure, and improve the Platform and to meet legal obligations in the jurisdictions where we operate.",
        ],
        bullets: [
          "Create and manage your account and authenticate sessions.",
          "Process deposits, withdrawals, trades, and portfolio reporting.",
          "Verify identity, prevent fraud, and comply with AML/KYC regulations.",
          "Provide customer support and send service-related notifications.",
          "Analyze usage to improve performance, UX, and product features.",
          "Send marketing communications where you have opted in (you may opt out anytime).",
        ],
      },
      {
        id: "legal-basis",
        title: "4. Legal Basis for Processing",
        summary: "Why we are permitted to use your data.",
        paragraphs: [
          "Where applicable under GDPR and similar laws, we rely on one or more of the following legal bases:",
        ],
        bullets: [
          "Contract: processing necessary to provide services you request.",
          "Legal obligation: compliance with financial, tax, and anti-money-laundering laws.",
          "Legitimate interests: security monitoring, fraud prevention, and product improvement balanced against your rights.",
          "Consent: optional analytics, marketing emails, and non-essential cookies.",
        ],
      },
      {
        id: "sharing",
        title: "5. How We Share Information",
        summary: "Third parties that may receive your data.",
        paragraphs: [
          "We share personal information only when necessary and with appropriate safeguards. We do not sell personal data.",
        ],
        bullets: [
          "Infrastructure providers: cloud hosting, email delivery, and customer support tools under data processing agreements.",
          "Financial partners: payment processors, banking partners, and blockchain analytics for compliance screening.",
          "Professional advisers: auditors, lawyers, and insurers bound by confidentiality duties.",
          "Regulators & law enforcement: when required by valid legal process or to protect rights and safety.",
          "Corporate transactions: in connection with a merger, acquisition, or asset sale with notice where required.",
        ],
      },
      {
        id: "transfers",
        title: "6. International Data Transfers",
        summary: "Cross-border processing safeguards.",
        paragraphs: [
          "Onyx Capital may process and store information in countries other than your country of residence. Where required, we implement Standard Contractual Clauses, adequacy decisions, or other approved transfer mechanisms to protect your data.",
        ],
      },
      {
        id: "retention",
        title: "7. Data Retention",
        summary: "How long we keep your information.",
        paragraphs: [
          "We retain personal information for as long as your account is active and as needed to provide services, resolve disputes, and comply with legal retention requirements (typically five to seven years for financial records, unless a longer period is mandated).",
          "When data is no longer required, we securely delete or anonymize it in accordance with our retention schedule.",
        ],
      },
      {
        id: "security",
        title: "8. Security Measures",
        summary: "How we protect your data.",
        paragraphs: [
          "We employ administrative, technical, and organizational safeguards designed to protect personal information against unauthorized access, alteration, disclosure, or destruction.",
        ],
        bullets: [
          "TLS 1.3 encryption in transit and AES-256 encryption at rest for sensitive fields.",
          "Role-based access controls, security logging, and regular penetration testing.",
          "Cold storage and multi-signature controls for custodied digital assets where applicable.",
          "Employee training and vendor security reviews.",
        ],
        highlight:
          "No method of transmission or storage is 100% secure. Report suspected incidents to security@onyxcapital.site immediately.",
      },
      {
        id: "rights",
        title: "9. Your Privacy Rights",
        summary: "Choices and requests you can make.",
        paragraphs: [
          "Depending on your location, you may have rights to access, correct, delete, restrict, or port your personal data, and to object to certain processing or withdraw consent.",
          "Submit requests to privacy@onyxcapital.site. We may verify your identity before fulfilling a request. You may also lodge a complaint with your local data protection authority.",
        ],
        bullets: [
          "Access & portability: receive a copy of data we hold about you.",
          "Correction: update inaccurate or incomplete information.",
          "Deletion: request erasure where no legal retention obligation applies.",
          "Marketing opt-out: unsubscribe links in emails or account notification settings.",
        ],
      },
      {
        id: "cookies",
        title: "10. Cookies & Tracking Technologies",
        summary: "How we use cookies and similar tools.",
        paragraphs: [
          "We use essential cookies to maintain sessions and security. With your consent, we may use analytics cookies to understand usage patterns and improve the Platform.",
          "You can manage cookie preferences through your browser settings or our in-product cookie banner where available. Disabling essential cookies may limit Platform functionality.",
        ],
        bullets: [
          "Essential: authentication, fraud prevention, load balancing.",
          "Analytics: aggregated usage metrics (optional).",
          "Preference: theme, language, and UI settings.",
        ],
      },
      {
        id: "children",
        title: "11. Children's Privacy",
        summary: "Our services are not directed to minors.",
        paragraphs: [
          `The Platform is not intended for individuals under ${MIN_ACCOUNT_AGE}. We do not knowingly collect personal information from children. If you believe a minor has provided us data, contact privacy@onyxcapital.site and we will take steps to delete it.`,
        ],
      },
      {
        id: "updates",
        title: "12. Changes to This Policy",
        summary: "When and how we update this document.",
        paragraphs: [
          "We may update this Privacy Policy to reflect changes in law, technology, or our practices. The \"Last updated\" date at the top will change, and material revisions will be communicated through the Platform or email.",
        ],
      },
      {
        id: "contact",
        title: "13. Contact Us",
        summary: "Privacy inquiries and data requests.",
        paragraphs: [
          "For privacy questions, data subject requests, or concerns about this policy, contact privacy@onyxcapital.site or write to Onyx Capital Privacy, Onyx Capital, via the Help Center.",
        ],
      },
    ],
  },
};

export function isLegalSlug(slug: string): slug is "terms" | "privacy" {
  return slug === "terms" || slug === "privacy";
}
