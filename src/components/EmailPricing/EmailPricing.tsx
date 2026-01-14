"use client";

import "./EmailPricing.css";

type Plan = {
  name: string;
  price: string;
  accent: "basic" | "standard" | "pro";
  features: string[];
  cta: string;
};

const plans: Plan[] = [
  {
    name: "Basic",
    price: "450",
    accent: "basic",
    cta: "Get Started",
    features: [
      "Email platform setup (Mailchimp / Klaviyo)",
      "Audience & list cleanup (basic)",
      "1 branded email template",
      "2 campaign emails / month",
      "Basic segmentation (new vs returning)",
      "Basic deliverability checks",
      "Simple reporting (opens, clicks)",
      "One revision round per campaign",
    ],
  },
  {
    name: "Standard",
    price: "900",
    accent: "standard",
    cta: "Get Started",
    features: [
      "Everything in the Basic Plan",
      "2 branded email templates + reusable blocks",
      "4 campaign emails / month",
      "Advanced segmentation (interests, behavior)",
      "A/B testing (subject line or CTA)",
      "Automation setup (Welcome flow)",
      "Basic eCommerce tracking (if needed)",
      "Monthly performance report + next steps",
    ],
  },
  {
    name: "Professional",
    price: "1500",
    accent: "pro",
    cta: "Get Started",
    features: [
      "Everything in the Standard Plan",
      "Full automation system (3–5 flows)",
      "Abandoned cart + browse abandonment",
      "Post-purchase & win-back sequences",
      "Personalized dynamic content (if supported)",
      "Advanced deliverability optimization",
      "8 campaign emails / month",
      "Deep analytics + conversion improvements",
      "Priority support + strategy calls",
    ],
  },
];

export default function EmailPricing() {
  return (
    <section className="emailSection" aria-label="Email Marketing Pricing">
      <div className="emailHeader">
        <div className="emailTag">PRICING</div>
        <h2 className="emailTitle">Email Marketing Price</h2>
        <p className="emailSubtitle">
          Email is still one of the highest ROI channels. Choose a plan to build
          consistent revenue with campaigns, automation, and smart segmentation.
        </p>
      </div>

      <div className="emailGrid">
        {plans.map((plan) => (
          <article key={plan.name} className={`emailCard ${plan.accent}`}>
            <div className="emailTop">
              <h3 className="emailPlan">{plan.name}</h3>
              <div className="emailPriceRow">
                <span className="emailDollar">$</span>
                <span className="emailPrice">{plan.price}</span>
                <span className="emailPer">/month</span>
              </div>
            </div>

            <ul className="emailList">
              {plan.features.map((f, i) => (
                <li key={i}>
                  <span className="emailDot" aria-hidden="true" />
                  <span className="emailText">{f}</span>
                </li>
              ))}
            </ul>

            <button className="emailBtn" type="button">
              {plan.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
