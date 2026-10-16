import { redirect } from "next/navigation";
import { readSession, type Session } from "@/server/auth/session";
import { ensurePermissionCache, roleAllows } from "@/server/security/permissions";

export async function usersAccess(): Promise<Session | null> {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  await ensurePermissionCache();
  if (!roleAllows(session.role, "users.manage")) {
    return null;
  }
  return session;
}

export async function requireUsers(): Promise<Session> {
  const session = await usersAccess();
  if (!session) {
    throw new Error("You do not have access to users");
  }
  return session;
}

export async function catalogAccess(): Promise<Session | null> {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  if (!roleAllows(session.role, "catalog.manage")) {
    return null;
  }
  return session;
}

export async function requireCatalog(): Promise<Session> {
  const session = await catalogAccess();
  if (!session) {
    throw new Error("You do not have access to the catalog");
  }
  return session;
}

export async function ordersAccess(): Promise<Session | null> {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  if (!roleAllows(session.role, "orders.manage")) {
    return null;
  }
  return session;
}

export async function requireOrders(): Promise<Session> {
  const session = await ordersAccess();
  if (!session) {
    throw new Error("You do not have access to orders");
  }
  return session;
}

export async function customersAccess(): Promise<Session | null> {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  if (!roleAllows(session.role, "customers.manage")) {
    return null;
  }
  return session;
}

export async function requireCustomers(): Promise<Session> {
  const session = await customersAccess();
  if (!session) {
    throw new Error("You do not have access to customers");
  }
  return session;
}

export async function contentAccess(): Promise<Session | null> {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  if (!roleAllows(session.role, "content.manage")) {
    return null;
  }
  return session;
}

export async function requireContent(): Promise<Session> {
  const session = await contentAccess();
  if (!session) {
    throw new Error("You do not have access to content");
  }
  return session;
}

export async function reportsAccess(): Promise<Session | null> {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  if (!roleAllows(session.role, "reports.view")) {
    return null;
  }
  return session;
}

export async function requireReports(): Promise<Session> {
  const session = await reportsAccess();
  if (!session) {
    throw new Error("You do not have access to reports");
  }
  return session;
}

export async function settingsAccess(): Promise<Session | null> {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  if (!roleAllows(session.role, "settings.manage")) {
    return null;
  }
  return session;
}

export async function requireSettings(): Promise<Session> {
  const session = await settingsAccess();
  if (!session) {
    throw new Error("You do not have access to settings");
  }
  return session;
}
