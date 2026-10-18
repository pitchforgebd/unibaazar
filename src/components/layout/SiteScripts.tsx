function safeScript(value: string): string {
  return value.replace(/<\/script/gi, "");
}

export function HeaderScript({ script }: { script: string | null }) {
  if (!script) return null;
  return <script dangerouslySetInnerHTML={{ __html: safeScript(script) }} />;
}

export function FooterScript({ script }: { script: string | null }) {
  if (!script) return null;
  return <script dangerouslySetInnerHTML={{ __html: safeScript(script) }} />;
}
