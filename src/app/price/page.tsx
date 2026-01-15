import { Column, Row, Heading, Text, Button, Meta, Schema } from "@once-ui-system/core";
import { baseURL, about, person } from "@/resources";
import styles from "./PricePage.module.css";
import PricingCards from "./PricingCards";

const pageTitle = "Pricing";
const pageDescription =
  "Choose a service tier and explore full pricing details for web design, SEO, and email marketing.";

const pricingOptions = [
  {
    title: "Web Design & Development",
    price: "From $1,500",
    description: "Modern, fast websites built for conversions and brand credibility.",
    href: "/web-design",
    icon: "grid",
    bestFor: "Startups and growing brands that need a strong online presence fast.",
    timeline: "2-4 weeks",
    highlights: [
      "Custom design + responsive build",
      "SEO-ready structure + speed optimization",
      "Launch support and handoff training",
    ],
  },
  {
    title: "SEO Growth",
    price: "From $800",
    description: "Technical fixes, content strategy, and ranking improvements that compound.",
    href: "/seo",
    icon: "rocket",
    bestFor: "Businesses ready to rank higher and generate steady organic leads.",
    timeline: "3+ months",
    highlights: [
      "On-page + technical SEO fixes",
      "Keyword research + content roadmap",
      "Monthly reporting with clear KPIs",
    ],
  },
  {
    title: "Email Marketing",
    price: "From $450 / month",
    description: "Campaigns and automation that turn subscribers into loyal customers.",
    href: "/email-marketing",
    icon: "email",
    bestFor: "Ecommerce and service brands that want repeat sales and retention.",
    timeline: "Ongoing",
    highlights: [
      "Branded templates + campaign strategy",
      "Segmentation + automation sequences",
      "Performance optimization & testing",
    ],
  },
];

export async function generateMetadata() {
  return Meta.generate({
    title: pageTitle,
    description: pageDescription,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(pageTitle)}`,
    path: "/price",
  });
}

export default function PricePage() {
  return (
    <Column maxWidth="m" paddingY="24" gap="xl" horizontal="center" className={styles.page}>
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/price"
        title={pageTitle}
        description={pageDescription}
        image={`/api/og/generate?title=${encodeURIComponent(pageTitle)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <Column maxWidth="s" horizontal="center" align="center" gap="12" className={styles.hero}>
        <Heading variant="display-strong-l">{pageTitle}</Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak" wrap="balance">
          {pageDescription}
        </Text>
      </Column>

      <PricingCards options={pricingOptions} />

      <Row
        fillWidth
        padding="20"
        radius="l"
        background="brand-alpha-weak"
        border="brand-alpha-medium"
        vertical="center"
        horizontal="between"
        data-border="rounded"
        s={{ direction: "column" }}
        className={styles.callout}
      >
        <Text variant="heading-default-m" onBackground="neutral-weak">
          Not sure which plan fits? We can build a custom package around your goals.
        </Text>
        <Button href={about.calendar.link} variant="primary" arrowIcon>
          Book a call
        </Button>
      </Row>
    </Column>
  );
}
