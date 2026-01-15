import SeoPricing from "@/components/SeoPricing/SeoPricing";
import { Column, Heading, Text, Meta, Schema } from "@once-ui-system/core";
import { baseURL, about, person } from "@/resources";

const pageTitle = "SEO Pricing";
const pageDescription =
  "Transparent SEO packages focused on technical fixes, content growth, and measurable rankings.";

export async function generateMetadata() {
  return Meta.generate({
    title: pageTitle,
    description: pageDescription,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(pageTitle)}`,
    path: "/seo",
  });
}

export default function SeoPricingPage() {
  return (
    <Column maxWidth="m" paddingY="24" gap="xl" horizontal="center">
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/seo"
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
        <Heading variant="display-strong-l">SEO Growth Plans</Heading>
        <Text variant="heading-default-l" onBackground="neutral-weak" wrap="balance">
          {pageDescription}
        </Text>
      </Column>
      <SeoPricing />
    </Column>
  );
}
