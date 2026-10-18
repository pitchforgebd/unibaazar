import type { Metadata } from "next";
import { loadGeneral } from "@/server/settings/store";
import { loadTracking } from "@/server/tracking/config";

export async function buildRootMetadata(): Promise<Metadata> {
  const [general, tracking] = await Promise.all([loadGeneral(), loadTracking()]);
  return {
    title: {
      default: general.name,
      template: `%s | ${general.name}`,
    },
    description: general.description,
    ...(general.favicon ? { icons: { icon: general.favicon } } : {}),
    ...(tracking.searchConsole
      ? { verification: { google: tracking.searchConsole } }
      : {}),
  };
}
