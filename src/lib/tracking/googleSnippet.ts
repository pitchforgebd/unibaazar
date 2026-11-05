import { consentKey } from "@/lib/tracking/consentKey";

export type GoogleIds = {
  gtmId: string;
  ga4Id: string;
  adsId: string;
  adsLabel: string;
};

/**
 * GA4/Ads set directly in admin get their own data layer. gtag commands pushed
 * to `dataLayer` are read by GTM as events too, so an `add_to_cart` sent
 * through gtag would fire every GTM tag listening for it a second time.
 */
export const GTAG_LAYER = "ubGtagLayer";

/** Safe inside an inline <script>: a value can't close the tag or break the string. */
function js(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Everything Google says must run before its tags, in the order it requires:
 * the data layer, consent defaults (all denied, then the shopper's saved
 * choice), and only then the tags themselves. Returns "" when nothing Google
 * is configured.
 */
export function googleHeadScript(ids: GoogleIds): string {
  const { gtmId, ga4Id, adsId, adsLabel } = ids;
  if (!gtmId && !ga4Id && !adsId) {
    return "";
  }
  const direct = Boolean(ga4Id || adsId);
  const lines = [
    "window.dataLayer=window.dataLayer||[];",
    `window.${GTAG_LAYER}=window.${GTAG_LAYER}||[];`,
    "function gtmGtag(){dataLayer.push(arguments);}",
    `function ubGtag(){${GTAG_LAYER}.push(arguments);}`,
    "window.ubGtag=ubGtag;",
    // Consent goes to both layers; events only ever to one.
    `function gtag(){gtmGtag.apply(null,arguments);${direct ? "ubGtag.apply(null,arguments);" : ""}}`,
    "window.gtag=gtag;",
    `window.__ubGoogle={ga4:${js(ga4Id)},ads:${js(adsId)},adsLabel:${js(adsLabel)}};`,
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});",
    `(function(){var r=null,c=null;try{r=localStorage.getItem(${js(consentKey)});c=r==='accept'?{analytics:true,marketing:true}:r==='reject'?null:JSON.parse(r)}catch(e){}`,
    "if(c){var a=c.analytics===true,m=c.marketing===true;gtag('consent','update',{analytics_storage:a?'granted':'denied',ad_storage:m?'granted':'denied',ad_user_data:m?'granted':'denied',ad_personalization:m?'granted':'denied'})}})();",
  ];
  if (gtmId) {
    lines.push(
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${js(gtmId)});`,
    );
  }
  if (direct) {
    lines.push("ubGtag('js',new Date());");
    if (ga4Id) {
      lines.push(`ubGtag('config',${js(ga4Id)});`);
    }
    if (adsId) {
      lines.push(`ubGtag('config',${js(adsId)});`);
    }
  }
  return lines.join("\n");
}

/** The gtag.js library URL, or null when only GTM is in use. */
export function gtagScriptUrl(ids: GoogleIds): string | null {
  const id = ids.ga4Id || ids.adsId;
  return id
    ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}&l=${GTAG_LAYER}`
    : null;
}
