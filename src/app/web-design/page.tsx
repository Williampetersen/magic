import PricingBento from "@/components/PricingBento/PricingBento";
import { Column, Heading, Text, Meta, Schema } from "@once-ui-system/core";
import { baseURL, about, person } from "@/resources";

const pageTitle = "Web Design & Development Pricing";
const pageDescription =
  "Clear, conversion-focused web design packages built to launch fast and scale with your business.";

export async function generateMetadata() {
  return Meta.generate({
    title: pageTitle,
    description: pageDescription,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(pageTitle)}`,
    path: "/web-design",
  });
}

export default function WebDesignPricingPage() {
  return (
    <Column maxWidth="m" paddingY="24" gap="xl" horizontal="center">
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/web-design"
        title={pageTitle}
        description={pageDescription}
        image={`/api/og/generate?title=${encodeURIComponent(pageTitle)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <Column maxWidth="s" horizontal="center" align="center" gap="12">
        <Heading variant="display-strong-l">Web Design &amp; Development</Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak" wrap="balance">
          {pageDescription}
        </Text>
      </Column>
      <PricingBento />
    </Column>
  );
}
