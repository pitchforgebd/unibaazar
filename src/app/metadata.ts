import type { Metadata } from "next";
import { loadGeneral } from "@/server/settings/store";

export async function buildRootMetadata(): Promise<Metadata> {
  const general = await loadGeneral();
  return {
    title: {
      default: general.name,
      template: `%s | ${general.name}`,
    },
    description: general.description,
    ...(general.favicon ? { icons: { icon: general.favicon } } : {}),
  };
}
