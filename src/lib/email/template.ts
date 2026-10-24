import { siteConfig } from "@/config/site";

// Email clients don't read this app's live theme-token CSS (no custom
// properties, no per-request <style> injection — see src/lib/theme/) —
// an email is sent once as static HTML, so this hardcodes the Bazaar
// preset's AA-compliant primary (src/lib/theme/presets.ts) rather than
// trying to be theme-aware. Inline styles throughout: email clients
// (Outlook especially) strip <style> blocks and most CSS features
// unpredictably, so only inline styles and basic table layout are safe.
const BRAND_PRIMARY = "#AA3B06";
const INK = "#111827";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converts the plain-text templates (notify.ts, accounts.ts) into
 * paragraphs — they use "\n\n" between sections and a single "\n" for a
 * soft line break within one, matching how they're already written. */
function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:${INK};font-size:15px;line-height:1.6;">${escapeHtml(
          paragraph,
        ).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export type EmailAction = { label: string; href: string };

/**
 * Wraps a plain-text-style body in a branded, responsive HTML layout —
 * table-based for email-client compatibility, works down to a ~375px
 * viewport. Every send still also sets the plain-text `body` as the
 * `text` part (sendEmail does this); this is the `html` part alongside
 * it, which HTML-capable clients prefer and the rest fall back from.
 */
export function brandedEmailHtml(body: string, action?: EmailAction): string {
  const actionHtml = action
    ? `<tr><td style="padding:8px 0 0;">
        <a href="${escapeHtml(action.href)}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(
          action.label,
        )}</a>
      </td></tr>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(siteConfig.name)}</title>
  </head>
  <body style="margin:0;padding:24px 16px;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 0 24px;text-align:center;">
                <span style="font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">${escapeHtml(
                  siteConfig.name,
                )}</span>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid ${BORDER};">
                ${bodyToHtml(body)}
                <table role="presentation" cellpadding="0" cellspacing="0">${actionHtml}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 8px 0;text-align:center;color:${MUTED};font-size:12px;line-height:1.6;">
                ${escapeHtml(siteConfig.name)} &middot; ${escapeHtml(siteConfig.contact.address)}<br>
                ${escapeHtml(siteConfig.contact.phoneDisplay)} &middot; ${escapeHtml(siteConfig.contact.email)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
