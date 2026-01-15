import EmailPricing from "@/components/EmailPricing/EmailPricing";
import { Column, Heading, Text, Meta, Schema } from "@once-ui-system/core";
import { baseURL, about, person } from "@/resources";

const pageTitle = "Email Marketing Pricing";
const pageDescription =
  "Campaigns, automations, and optimization packages that turn email into a revenue channel.";

export async function generateMetadata() {
  return Meta.generate({
    title: pageTitle,
    description: pageDescription,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(pageTitle)}`,
    path: "/email-marketing",
  });
}

export default function EmailMarketingPricingPage() {
  return (
    <Column maxWidth="m" paddingY="24" gap="xl" horizontal="center">
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/email-marketing"
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
        <Heading variant="display-strong-l">Email Marketing</Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak" wrap="balance">
          {pageDescription}
        </Text>
      </Column>
      <EmailPricing />
    </Column>
  );
}
