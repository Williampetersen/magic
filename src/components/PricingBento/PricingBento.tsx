"use client";

import "./PricingBento.css";

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
    price: "1,500",
    accent: "basic",
    cta: "Get Started",
    features: [
      "1 Custom WordPress website",
      "1 Basic theme installation",
      "Up to 5 pages",
      "Mobile-responsive design",
      "Basic support for 1 month",
      "Social media links",
      "Advanced SEO (optional)",
      "Google Analytics setup (optional)",
    ],
  },
  {
    name: "Standard",
    price: "2,500",
    accent: "standard",
    cta: "Get Started",
    features: [
      "Everything in the Basic Plan",
      "Up to 10 pages",
      "Custom theme design",
      "Basic eCommerce integration",
      "Advanced SEO",
      "Google Analytics setup",
      "Support for 3 months",
      "Email marketing integration (optional)",
      "Unlimited pages (optional)",
    ],
  },
  {
    name: "Professional",
    price: "3,900",
    accent: "pro",
    cta: "Get Started",
    features: [
      "Everything in the Standard Plan",
      "Unlimited pages",
      "Premium theme and plugins",
      "Full eCommerce setup",
      "Advanced SEO + local SEO",
      "Email marketing integration",
      "Maintenance for 6 months",
      "Priority support (24/7)",
      "Blog or news section setup",
    ],
  },
];

export default function PricingBento() {
  return (
    <section className="pbSection" aria-label="Pricing - Web Design & Development">
      <div className="pbHeader">
        <div className="pbTag">PRICING</div>
        <h2 className="pbTitle">Web Design &amp; Development</h2>
        <p className="pbSubtitle">
          Choose the plan that fits your business. Clean design, fast performance, and real results.
        </p>
      </div>

      <div className="pbGrid">
        {plans.map((plan) => (
          <article key={plan.name} className={`pbCard ${plan.accent}`}>
            <div className="pbTop">
              <h3 className="pbPlan">{plan.name}</h3>
              <div className="pbPriceRow">
                <span className="pbDollar">$</span>
                <span className="pbPrice">{plan.price}</span>
              </div>
            </div>

            <ul className="pbList">
              {plan.features.map((f, i) => (
                <li key={i}>
                  <span className="pbDot" aria-hidden="true" />
                  <span className="pbText">{f}</span>
                </li>
              ))}
            </ul>

            <button className="pbBtn" type="button">
              {plan.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
