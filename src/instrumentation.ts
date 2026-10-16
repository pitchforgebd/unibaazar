export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  const loadModule = new Function("return import('module')") as () => Promise<{
    createRequire: (path: string) => (id: string) => { installSeoHook: () => void };
  }>;
  const { createRequire } = await loadModule();
  const require = createRequire(`${process.cwd()}/package.json`);
  await require("./seo-hook.cjs").installSeoHook();
}
