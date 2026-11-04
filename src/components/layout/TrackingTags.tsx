import { createElement } from "react";
import { googleHeadScript, gtagScriptUrl } from "@/lib/tracking/googleSnippet";
import { parseHeadSnippet, reactProps } from "@/server/tracking/snippets";
import type { TrackingSettings } from "@/server/tracking/config";

function customHeadTags(source: string) {
  try {
    return parseHeadSnippet(source);
  } catch {
    // Validated on save; a value that somehow stops parsing must not take the site down.
    return [];
  }
}

/** Rendered straight into <head>, so crawlers and site verifiers see it in the raw HTML. */
export function TrackingHead({ config }: { config: TrackingSettings }) {
  const script = googleHeadScript(config);
  const library = gtagScriptUrl(config);
  return (
    <>
      {config.searchConsole ? (
        <meta name="google-site-verification" content={config.searchConsole} />
      ) : null}
      {script ? <script dangerouslySetInnerHTML={{ __html: script }} /> : null}
      {library ? <script async src={library} /> : null}
      {customHeadTags(config.customHead).map((tag, index) =>
        createElement(tag.tag, {
          key: index,
          ...reactProps(tag.attrs),
          ...(tag.inner ? { dangerouslySetInnerHTML: { __html: tag.inner } } : {}),
        }),
      )}
    </>
  );
}

/** Rendered first in <body>, where Google requires GTM's noscript fallback. */
export function TrackingBody({ config }: { config: TrackingSettings }) {
  return (
    <>
      {config.gtmId ? (
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(config.gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }}
        />
      ) : null}
      {config.customBody ? (
        <div
          style={{ display: "contents" }}
          dangerouslySetInnerHTML={{ __html: config.customBody }}
        />
      ) : null}
    </>
  );
}
