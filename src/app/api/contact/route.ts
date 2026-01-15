import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  plan: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ContactPayload>;

    if (
      !body.firstName ||
      !body.lastName ||
      !body.email ||
      !body.phone ||
      !body.service ||
      !body.plan
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const smtpHost = requiredEnv("SMTP_HOST");
    const smtpPort = Number(requiredEnv("SMTP_PORT"));
    const smtpUser = requiredEnv("SMTP_USER");
    const smtpPass = requiredEnv("SMTP_PASS");
    const smtpFrom = process.env.SMTP_FROM || smtpUser;
    const contactTo = process.env.CONTACT_TO || "williampetersencop@gmail.com";

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const subject = `New lead: ${body.firstName} ${body.lastName} (${body.service})`;
    const text = [
      `Name: ${body.firstName} ${body.lastName}`,
      `Email: ${body.email}`,
      `Phone: ${body.phone}`,
      `Service: ${body.service}`,
      `Plan: ${body.plan}`,
    ].join("\n");

    const html = `
      <h2>New Contact Request</h2>
      <p><strong>Name:</strong> ${body.firstName} ${body.lastName}</p>
      <p><strong>Email:</strong> ${body.email}</p>
      <p><strong>Phone:</strong> ${body.phone}</p>
      <p><strong>Service:</strong> ${body.service}</p>
      <p><strong>Plan:</strong> ${body.plan}</p>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to: contactTo,
      replyTo: body.email,
      subject,
      text,
      html,
    });

    const customerSubject = `Thanks, ${body.firstName}! I received your request`;
    const customerText = [
      `Hi ${body.firstName},`,
      "",
      "Thanks for reaching out. I received your request and will contact you within the next 8 hours.",
      "",
      "Summary:",
      `Service: ${body.service}`,
      `Plan: ${body.plan}`,
      "",
      "Talk soon,",
      "Trust Web Ads",
    ].join("\n");

    const customerHtml = `
      <p>Hi ${body.firstName},</p>
      <p>Thanks for reaching out. I received your request and will contact you within the next 8 hours.</p>
      <p><strong>Summary</strong></p>
      <p>Service: ${body.service}<br />Plan: ${body.plan}</p>
      <p>Talk soon,<br />Trust Web Ads</p>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to: body.email,
      subject: customerSubject,
      text: customerText,
      html: customerHtml,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
