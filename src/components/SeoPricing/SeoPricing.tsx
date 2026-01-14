"use client";

import "./SeoPricing.css";

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
    price: "800",
    accent: "basic",
    cta: "Get Started",
    features: [
      "5 Keywords Optimization",
      "Basic On-Page SEO",
      "Website Audit & Fixes",
      "SEO-Optimized Meta Tags",
      "Monthly Report",
      "Social media links",
      "Advanced SEO (optional)",
      "Competitor Research (optional)",
      "Local SEO Optimization (optional)",
    ],
  },
  {
    name: "Standard",
    price: "1,200",
    accent: "standard",
    cta: "Get Started",
    features: [
      "10 Keywords Optimization",
      "Full On-Page SEO & Technical Fixes",
      "Blog Content",
      "High-Quality Backlinks",
      "Competitor Research",
      "Local SEO Optimization",
      "Monthly SEO Report",
      "Conversion Rate Optimization (optional)",
      "Google My Business Optimization (optional)",
    ],
  },
  {
    name: "Professional",
    price: "1500",
    accent: "pro",
    cta: "Get Started",
    features: [
      "Everything in the Standard Plan",
      "20 Keywords Optimization",
      "Advanced On-Page & Technical SEO",
      "Blog Content (8 Articles)",
      "10 High-Quality Backlinks",
      "Complete SEO Audit & Fixes",
      "Google My Business Optimization",
      "Conversion Rate Optimization",
      "Detailed SEO Reports & Analysis",
    ],
  },
];

export default function SeoPricing() {
  return (
    <section className="seoSection" aria-label="SEO Pricing">
      <div className="seoHeader">
        <div className="seoTag">PRICING</div>
        <h2 className="seoTitle">SEO Price</h2>
        <p className="seoSubtitle">
          Choose the SEO plan that fits your goals. Transparent pricing, measurable growth, and clean reporting.
        </p>
      </div>

      <div className="seoGrid">
        {plans.map((plan) => (
          <article key={plan.name} className={`seoCard ${plan.accent}`}>
            <div className="seoTop">
              <h3 className="seoPlan">{plan.name}</h3>
              <div className="seoPriceRow">
                <span className="seoDollar">$</span>
                <span className="seoPrice">{plan.price}</span>
              </div>
            </div>

            <ul className="seoList">
              {plan.features.map((f, i) => (
                <li key={i}>
                  <span className="seoDot" aria-hidden="true" />
                  <span className="seoText">{f}</span>
                </li>
              ))}
            </ul>

            <button className="seoBtn" type="button">
              {plan.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
