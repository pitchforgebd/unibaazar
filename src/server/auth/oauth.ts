import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { ApiError } from "@/server/http";
import { loadSecret } from "@/server/settings/secret";
import { loadSocial, saveSetting } from "@/server/settings/store";
import { siteOrigin } from "@/server/tracking/config";

export type OAuthProvider = "google" | "facebook";

export type PendingOAuth = {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
};

const pendingCookie = "ub_oauth";

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  return new TextEncoder().encode(value || "unibaazar-dev-secret");
}

export async function oauthConfigured(provider: OAuthProvider): Promise<boolean> {
  const social = await loadSocial();
  if (provider === "google") {
    return Boolean(social.googleClientId && (await loadSecret("secret.google")));
  }
  return Boolean(social.facebookAppId && (await loadSecret("secret.facebook")));
}

export async function oauthStartUrl(provider: OAuthProvider): Promise<string> {
  const social = await loadSocial();
  const origin = siteOrigin();
  if (provider === "google") {
    const clientId = social.googleClientId;
    const clientSecret = await loadSecret("secret.google");
    if (!clientId || !clientSecret) {
      throw new ApiError(400, "Google sign-in is not configured");
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", `${origin}/api/v1/auth/oauth/google/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }
  const appId = social.facebookAppId;
  const appSecret = await loadSecret("secret.facebook");
  if (!appId || !appSecret) {
    throw new ApiError(400, "Facebook sign-in is not configured");
  }
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", `${origin}/api/v1/auth/oauth/facebook/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "email,public_profile");
  return url.toString();
}

async function googleProfile(code: string): Promise<PendingOAuth> {
  const social = await loadSocial();
  const origin = siteOrigin();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: social.googleClientId,
      client_secret: await loadSecret("secret.google"),
      redirect_uri: `${origin}/api/v1/auth/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    throw new ApiError(400, "Google did not accept that sign-in");
  }
  const tokenBody = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenBody.access_token) {
    throw new ApiError(400, "Google did not accept that sign-in");
  }
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokenBody.access_token}` },
  });
  if (!profileResponse.ok) {
    throw new ApiError(400, "Google profile could not be loaded");
  }
  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    name?: string;
  };
  if (!profile.sub) {
    throw new ApiError(400, "Google profile was incomplete");
  }
  return {
    provider: "google",
    providerAccountId: profile.sub,
    email: (profile.email || "").trim().toLowerCase(),
    name: (profile.name || "Customer").trim() || "Customer",
  };
}

async function facebookProfile(code: string): Promise<PendingOAuth> {
  const social = await loadSocial();
  const origin = siteOrigin();
  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", social.facebookAppId);
  tokenUrl.searchParams.set("client_secret", await loadSecret("secret.facebook"));
  tokenUrl.searchParams.set(
    "redirect_uri",
    `${origin}/api/v1/auth/oauth/facebook/callback`,
  );
  tokenUrl.searchParams.set("code", code);
  const tokenResponse = await fetch(tokenUrl);
  if (!tokenResponse.ok) {
    throw new ApiError(400, "Facebook did not accept that sign-in");
  }
  const tokenBody = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenBody.access_token) {
    throw new ApiError(400, "Facebook did not accept that sign-in");
  }
  const profileUrl = new URL("https://graph.facebook.com/me");
  profileUrl.searchParams.set("fields", "id,name,email");
  profileUrl.searchParams.set("access_token", tokenBody.access_token);
  const profileResponse = await fetch(profileUrl);
  if (!profileResponse.ok) {
    throw new ApiError(400, "Facebook profile could not be loaded");
  }
  const profile = (await profileResponse.json()) as {
    id?: string;
    email?: string;
    name?: string;
  };
  if (!profile.id) {
    throw new ApiError(400, "Facebook profile was incomplete");
  }
  return {
    provider: "facebook",
    providerAccountId: profile.id,
    email: (profile.email || "").trim().toLowerCase(),
    name: (profile.name || "Customer").trim() || "Customer",
  };
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
): Promise<PendingOAuth> {
  return provider === "google" ? googleProfile(code) : facebookProfile(code);
}

export async function signPendingOAuth(pending: PendingOAuth): Promise<string> {
  return new SignJWT(pending)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret());
}

export async function readPendingOAuth(token: string): Promise<PendingOAuth | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      (payload.provider !== "google" && payload.provider !== "facebook") ||
      typeof payload.providerAccountId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return {
      provider: payload.provider,
      providerAccountId: payload.providerAccountId,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export const oauthPendingCookie = {
  name: pendingCookie,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  },
};

async function customerRoleId(): Promise<string> {
  const role = await prisma.role.findUnique({ where: { slug: "customer" } });
  if (!role) {
    throw new ApiError(500, "The customer role is missing. Run the database seed.");
  }
  return role.id;
}

export async function loginWithExistingOAuth(
  pending: PendingOAuth,
): Promise<{ userId: string; role: string } | null> {
  const linked = await prisma.socialAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: pending.provider,
        providerAccountId: pending.providerAccountId,
      },
    },
    include: { user: { include: { role: true } } },
  });
  if (linked?.user.status === "ACTIVE") {
    return { userId: linked.user.id, role: linked.user.role.slug };
  }
  if (!pending.email) {
    return null;
  }
  const byEmail = await prisma.user.findUnique({
    where: { email: pending.email },
    include: { role: true, socialAccounts: true },
  });
  if (!byEmail || byEmail.status !== "ACTIVE") {
    return null;
  }
  if (
    !byEmail.socialAccounts.some(
      (row) =>
        row.provider === pending.provider &&
        row.providerAccountId === pending.providerAccountId,
    )
  ) {
    await prisma.socialAccount.create({
      data: {
        userId: byEmail.id,
        provider: pending.provider,
        providerAccountId: pending.providerAccountId,
      },
    });
  }
  return { userId: byEmail.id, role: byEmail.role.slug };
}

export async function completeOAuthRegistration(
  pending: PendingOAuth,
  phoneInput: string,
): Promise<{ userId: string; role: string }> {
  const phone = normalizeBdPhone(phoneInput);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) {
    throw new ApiError(409, "An account already uses that phone");
  }
  if (pending.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: pending.email },
    });
    if (existingEmail) {
      throw new ApiError(
        409,
        "An account already uses that email. Sign in first, then link social login.",
      );
    }
  }
  const roleId = await customerRoleId();
  const user = await prisma.user.create({
    data: {
      roleId,
      name: pending.name,
      phone,
      email: pending.email || null,
      passwordHash: null,
      customer: {
        create: {
          name: pending.name,
          phone,
          email: pending.email || null,
        },
      },
      socialAccounts: {
        create: {
          provider: pending.provider,
          providerAccountId: pending.providerAccountId,
        },
      },
    },
    include: { role: true },
  });
  return { userId: user.id, role: user.role.slug };
}

export async function facebookPageToken(): Promise<string> {
  return loadSecret("secret.facebookPage");
}

export async function postProductToFacebook(input: {
  name: string;
  slug: string;
  description: string;
}): Promise<void> {
  const [social, token] = await Promise.all([loadSocial(), facebookPageToken()]);
  if (!social.autoPostProducts || !token || !social.facebookAppId) {
    return;
  }
  const pageId =
    social.facebook.replace(/.*facebook\.com\//, "").replace(/\/$/, "") || "me";
  await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/feed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `${input.name}\n${input.description}\n${siteOrigin()}/product/${input.slug}`,
      access_token: token,
    }),
  }).catch(() => undefined);
}

export async function saveOAuthSecret(
  key: "secret.google" | "secret.facebook" | "secret.facebookPage",
  value: string,
): Promise<void> {
  const next = value.trim();
  if (!next) {
    return;
  }
  await saveSetting(key, next, true);
}
