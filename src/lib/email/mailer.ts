import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { claimNotification } from "@/lib/notify/dedupe";
import { loadIntegrations } from "@/server/settings/store";
import { loadSecret } from "@/server/settings/secret";

async function transporter() {
  const [pass, integrations] = await Promise.all([
    loadSecret("secret.email"),
    loadIntegrations(),
  ]);
  const host = integrations.emailHost || process.env.SMTP_HOST || "";
  const port = Number(integrations.emailPort || process.env.SMTP_PORT || "587");
  const user = integrations.emailUser || process.env.SMTP_USER || "";
  const password = pass || process.env.SMTP_PASS || "";
  if (!host || !user || !password) {
    return null;
  }
  return {
    from: integrations.emailFrom || process.env.SMTP_USER || "no-reply@unibaazar.com",
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    }),
  };
}

/** `dedupeKey`, when passed, makes this call idempotent — see
 * sendSms()'s docs in src/lib/sms/send.ts for the full rationale, same
 * shared mechanism (src/lib/notify/dedupe.ts). */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  dedupeKey?: string,
): Promise<void> {
  if (dedupeKey && !(await claimNotification(`email:${dedupeKey}`))) {
    await prisma.emailLog.create({
      data: {
        to: to.slice(0, 191),
        subject: subject.slice(0, 191),
        body,
        status: "skipped",
      },
    });
    return;
  }
  const log = await prisma.emailLog.create({
    data: {
      to: to.slice(0, 191),
      subject: subject.slice(0, 191),
      body,
      status: "queued",
    },
  });
  try {
    const configured = await transporter();
    if (!configured) {
      await prisma.emailLog.update({ where: { id: log.id }, data: { status: "failed" } });
      return;
    }
    await configured.transport.sendMail({
      from: configured.from,
      to,
      subject,
      text: body,
    });
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: "sent" } });
  } catch {
    await prisma.emailLog
      .update({ where: { id: log.id }, data: { status: "failed" } })
      .catch(() => undefined);
  }
}
