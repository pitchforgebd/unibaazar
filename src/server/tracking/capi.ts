import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { toMeta, toTiktok, type TrackData } from "@/lib/tracking/ecommerce";
import type { TrackName } from "@/lib/tracking/names";

export type ServerEventUser = {
  phone?: string;
  email?: string;
  externalId?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string | null;
  fbc?: string | null;
  ttp?: string | null;
  ttclid?: string | null;
};

export type ServerEvent = {
  name: TrackName;
  eventId: string;
  url: string;
  data: TrackData;
  user: ServerEventUser;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase());
}

/**
 * Digits with the country code and no leading zero, which is what Meta and
 * TikTok hash on their side. A local 01XXXXXXXXX hashes to something neither
 * platform can ever match, however often it's sent.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.startsWith("880") ? digits : `880${digits}`;
}

function validIp(ip?: string): string | undefined {
  return ip && isIP(ip) ? ip : undefined;
}

/** One entry of Meta's `data` array, or null for events Meta has no name for. */
export function metaEvent(event: ServerEvent): Record<string, unknown> | null {
  const mapped = toMeta(event.name, event.data);
  if (!mapped) {
    return null;
  }
  const { user } = event;
  const ip = validIp(user.ip);
  return {
    event_name: mapped.event,
    event_time: Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    action_source: "website",
    event_source_url: event.url,
    user_data: {
      ...(user.phone ? { ph: [sha256(normalizePhone(user.phone))] } : {}),
      ...(user.email ? { em: [hashEmail(user.email)] } : {}),
      ...(user.externalId ? { external_id: [sha256(user.externalId)] } : {}),
      ...(ip ? { client_ip_address: ip } : {}),
      ...(user.userAgent ? { client_user_agent: user.userAgent } : {}),
      ...(user.fbp ? { fbp: user.fbp } : {}),
      ...(user.fbc ? { fbc: user.fbc } : {}),
    },
    custom_data: mapped.params,
  };
}

/** One entry of TikTok's `data` array, or null for events TikTok has no name for. */
export function tiktokEvent(event: ServerEvent): Record<string, unknown> | null {
  const mapped = toTiktok(event.name, event.data);
  if (!mapped) {
    return null;
  }
  const { user } = event;
  const ip = validIp(user.ip);
  return {
    event: mapped.event,
    event_time: Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    user: {
      ...(user.phone ? { phone: sha256(`+${normalizePhone(user.phone)}`) } : {}),
      ...(user.email ? { email: hashEmail(user.email) } : {}),
      ...(user.externalId ? { external_id: sha256(user.externalId) } : {}),
      ...(ip ? { ip } : {}),
      ...(user.userAgent ? { user_agent: user.userAgent } : {}),
      ...(user.ttp ? { ttp: user.ttp } : {}),
      ...(user.ttclid ? { ttclid: user.ttclid } : {}),
    },
    page: { url: event.url },
    properties: mapped.params,
  };
}
