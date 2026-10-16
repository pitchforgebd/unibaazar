"use server";

import { revalidatePath } from "next/cache";
import {
  redirectDeleteSchema,
  redirectSchema,
  robotsSchema,
} from "@/lib/validation/admin-seo";
import { requireSettings } from "@/server/admin/access";
import { deleteRedirect, saveRedirect, saveRobots } from "@/server/admin/seo";
import { actionError, type ActionResult } from "@/server/admin/result";

function refresh(): void {
  revalidatePath("/admin/seo");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
}

export async function robotsAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = robotsSchema.parse(input);
    await saveRobots(session.userId, parsed.robots);
    refresh();
    return { ok: true, message: "Robots file saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function redirectAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = redirectSchema.parse(input);
    await saveRedirect(session.userId, parsed);
    refresh();
    return { ok: true, message: "Redirect saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteRedirectAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSettings();
    const parsed = redirectDeleteSchema.parse(input);
    await deleteRedirect(session.userId, parsed.id);
    refresh();
    return { ok: true, message: "Redirect removed." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
