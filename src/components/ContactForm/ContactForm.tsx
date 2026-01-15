"use client";

import { useMemo, useState } from "react";
import { Button, Column, Heading, Input, Row, Text } from "@once-ui-system/core";
import "./ContactForm.css";

type ServiceId = "web" | "seo" | "email";

type PlanOption = {
  value: string;
  label: string;
};

type ServiceOption = {
  id: ServiceId;
  label: string;
  plans: PlanOption[];
};

const services: ServiceOption[] = [
  {
    id: "web",
    label: "Website Development",
    plans: [
      { value: "Basic - $1,500", label: "Basic - $1,500" },
      { value: "Standard - $2,500", label: "Standard - $2,500" },
      { value: "Professional - $3,900", label: "Professional - $3,900" },
    ],
  },
  {
    id: "seo",
    label: "SEO Website",
    plans: [
      { value: "Basic - $800", label: "Basic - $800" },
      { value: "Standard - $1,200", label: "Standard - $1,200" },
      { value: "Professional - $1500", label: "Professional - $1500" },
    ],
  },
  {
    id: "email",
    label: "Email Marketing",
    plans: [
      { value: "Basic - $450 / month", label: "Basic - $450 / month" },
      { value: "Standard - $900 / month", label: "Standard - $900 / month" },
      { value: "Professional - $1500 / month", label: "Professional - $1500 / month" },
    ],
  },
];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: ServiceId | "";
  plan: string;
  company: string;
};

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  service: "",
  plan: "",
  company: "",
};

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");

  const planOptions = useMemo(() => {
    return services.find((service) => service.id === form.service)?.plans ?? [];
  }, [form.service]);

  const handleChange = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatus("idle");
    setError("");
  };

  const handleServiceChange = (value: string) => {
    const nextService = value as ServiceId;
    const nextPlans = services.find((service) => service.id === nextService)?.plans ?? [];
    setForm((prev) => ({
      ...prev,
      service: nextService,
      plan: nextPlans[0]?.value ?? "",
    }));
    setStatus("idle");
    setError("");
  };

  const validate = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      return "Please fill in all required fields.";
    }
    if (!form.service || !form.plan) {
      return "Please choose a service and plan.";
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.email)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }

    if (form.company) {
      return;
    }

    try {
      setStatus("sending");
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          service: services.find((s) => s.id === form.service)?.label ?? form.service,
          plan: form.plan,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      setForm(initialState);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <Column
      fillWidth
      padding="xl"
      radius="l"
      marginBottom="m"
      horizontal="center"
      align="center"
      background="surface"
      border="neutral-alpha-weak"
      className="contactWrap"
    >
      <Column maxWidth="s" horizontal="center" align="center" className="contactHeader">
        <Heading marginBottom="s" variant="display-strong-xs">
          Request a Quote
        </Heading>
        <Text wrap="balance" marginBottom="l" variant="body-default-l" onBackground="neutral-weak">
          Share your details and the plan you want. I will confirm and reach out within 8 hours.
        </Text>
      </Column>

      <form className="contactForm" onSubmit={handleSubmit}>
        <div className="contactGrid">
          <div className="contactField">
            <label className="contactLabel" htmlFor="firstName">
              First name
            </label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="First name"
              required
              value={form.firstName}
              onChange={(e) => handleChange("firstName")(e.target.value)}
            />
          </div>
          <div className="contactField">
            <label className="contactLabel" htmlFor="lastName">
              Last name
            </label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Last name"
              required
              value={form.lastName}
              onChange={(e) => handleChange("lastName")(e.target.value)}
            />
          </div>
          <div className="contactField">
            <label className="contactLabel" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@email.com"
              required
              value={form.email}
              onChange={(e) => handleChange("email")(e.target.value)}
            />
          </div>
          <div className="contactField">
            <label className="contactLabel" htmlFor="phone">
              Phone
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              required
              value={form.phone}
              onChange={(e) => handleChange("phone")(e.target.value)}
            />
          </div>
        </div>

        <div className="contactGrid contactGridSingle">
          <div className="contactField">
            <label className="contactLabel" htmlFor="service">
              Service
            </label>
            <select
              id="service"
              name="service"
              className="contactSelect"
              required
              value={form.service}
              onChange={(e) => handleServiceChange(e.target.value)}
            >
              <option value="" disabled>
                Select a service
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.label}
                </option>
              ))}
            </select>
          </div>
          <div className="contactField">
            <label className="contactLabel" htmlFor="plan">
              Plan
            </label>
            <select
              id="plan"
              name="plan"
              className="contactSelect"
              required
              value={form.plan}
              onChange={(e) => handleChange("plan")(e.target.value)}
              disabled={!form.service}
            >
              {!form.service && <option value="">Choose a service first</option>}
              {planOptions.map((plan) => (
                <option key={plan.value} value={plan.value}>
                  {plan.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <input
          type="text"
          name="company"
          value={form.company}
          onChange={(e) => handleChange("company")(e.target.value)}
          className="contactHoneypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {status === "success" ? (
          <Row className="contactStatus success" horizontal="center">
            Thanks! Your request was sent. Check your inbox for confirmation.
          </Row>
        ) : (
          error && (
            <Row className="contactStatus error" horizontal="center">
              {error}
            </Row>
          )
        )}

        <Row horizontal="center" className="contactAction">
          <Button
            type="submit"
            size="m"
            fillWidth
            className="contactButton"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Get a Quote"}
          </Button>
        </Row>
      </form>
    </Column>
  );
}
