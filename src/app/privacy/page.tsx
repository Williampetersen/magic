import { CookieSettingsButton } from "@/components/tracking/CookieSettingsButton";
import { hasDb } from "@/lib/tracking/db";
import { getSettings, num } from "@/lib/tracking/settings";
import { baseURL, person } from "@/resources";
import { Column, Heading, Meta, SmartLink, Text } from "@once-ui-system/core";

const title = "Privacy policy";
const description = "What this website collects about visitors, why, and how long it is kept.";

// Re-read the retention period from the admin settings once an hour.
export const revalidate = 3600;

async function retentionDays() {
  try {
    if (!hasDb()) return 90;
    return num(await getSettings(), "retention_days", 1, 3650);
  } catch {
    return 90;
  }
}

export async function generateMetadata() {
  return Meta.generate({ title, description, baseURL, path: "/privacy" });
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Column gap="8">
      <Heading as="h2" variant="heading-strong-l">
        {heading}
      </Heading>
      {children}
    </Column>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text as="p" variant="body-default-m" onBackground="neutral-medium">
      {children}
    </Text>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <Column as="ul" gap="4" paddingLeft="20">
      {items.map((item) => (
        <Text as="li" key={item} variant="body-default-m" onBackground="neutral-medium">
          {item}
        </Text>
      ))}
    </Column>
  );
}

export default async function PrivacyPage() {
  const email = person.email.toLowerCase();
  const days = await retentionDays();
  return (
    <Column maxWidth="s" gap="32" paddingY="24">
      <Column gap="8">
        <Heading variant="display-strong-s">{title}</Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Last updated: November 2026
        </Text>
      </Column>

      <Section heading="Who is responsible">
        <P>
          This website is run by {person.name} (Trust Web Ads), Denmark. Questions about your data:{" "}
          <SmartLink href={`mailto:${email}`}>{email}</SmartLink>.
        </P>
      </Section>

      <Section heading="Visitor statistics (every visit)">
        <P>
          I collect the following about every visit, to understand which content and social media
          posts work. This is done without cookies and nothing is saved on your device for it:
        </P>
        <List
          items={[
            "Pages you view, time spent on each page, how far you scroll, and which buttons and links you click.",
            "Where you came from: the referring website and campaign tags in the link (for example an Instagram story or bio link).",
            "Approximate location from your IP address: country, region, city and postal code. This is the location of your internet connection, not your exact position.",
            "Device details sent by your browser: device type and model, operating system, browser, language, screen size and connection type, and the name of your internet provider.",
            "A shortened IP address (for example 85.191.xxx.xxx) and a one-way encrypted fingerprint of the IP address. The full IP address is never stored.",
            "Whether you started or sent the contact form.",
          ]}
        />
        <P>
          A later visit from the same internet connection and the same browser can be recognised as
          a return visit, using the encrypted IP fingerprint.
        </P>
        <P>
          Instagram does not tell this website who you are. I never receive your Instagram username,
          profile, age or gender.
        </P>
      </Section>

      <Section heading="Cookies (only if you allow them)">
        <P>
          If you choose “Allow cookie” in the banner, two first-party cookies are set: a random
          visitor ID kept for up to 1 year, to recognise your browser when you come back, and a
          visit ID that lasts a few hours. If you choose “No cookies”, no cookies are set. Your
          choice is remembered in your browser so you are not asked again, and you can change it
          below at any time.
        </P>
      </Section>

      <Section heading="Contact form">
        <P>
          When you send the contact form I store your name, email, phone number and the service you
          asked about, so I can answer you. The request is linked to your visit (for example which
          pages you looked at before writing). You also get a confirmation email.
        </P>
      </Section>

      <Section heading="Why, and the legal basis">
        <P>
          Visitor statistics are based on my legitimate interest in knowing how the website and my
          social media posts perform (GDPR article 6(1)(f)). You can object to this at any time by
          writing to me, and I will delete your data. The cookies are based on your consent (article
          6(1)(a) and the Danish cookie rules). Contact requests are handled to answer your enquiry
          (article 6(1)(b)).
        </P>
      </Section>

      <Section heading="How long it is kept">
        <P>
          Visit statistics are deleted automatically after {days} days. Contact requests are kept
          for as long as needed to handle your enquiry and any customer relationship that follows,
          and are deleted on request.
        </P>
      </Section>

      <Section heading="Who receives the data">
        <P>
          The data is not sold and not used for advertising. It is processed by the service
          providers that run this website: Vercel (hosting), Neon (database, stored in the EU) and
          the email provider used to send notifications. If the optional internet-provider lookup is
          active, your IP address is sent to IPinfo for that lookup and is not stored by this
          website.
        </P>
      </Section>

      <Section heading="Your rights">
        <P>
          You can ask to see, correct or delete your data, object to the visitor statistics, and
          withdraw your cookie consent at any time. Write to{" "}
          <SmartLink href={`mailto:${email}`}>{email}</SmartLink>. You can also complain to the
          Danish Data Protection Agency (Datatilsynet, datatilsynet.dk).
        </P>
        <CookieSettingsButton />
      </Section>
    </Column>
  );
}
