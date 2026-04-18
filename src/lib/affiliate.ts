// Wrap outbound product links with affiliate tags / redirects.
// Reads public env vars so the bundler can embed them client-side:
//   NEXT_PUBLIC_AMAZON_TAG          e.g. "suki-20"
//   NEXT_PUBLIC_SEPHORA_TAG         e.g. "Vj8Rx3bpmL0"  (RAN / Impact)
//   NEXT_PUBLIC_IHERB_CODE          e.g. "SKI1234"
//   NEXT_PUBLIC_ULTA_TAG            e.g. "impact:..."
//
// If the URL doesn't match a known merchant, it's returned unchanged.

const env = (k: string): string | undefined => {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : undefined;
};

export type AffiliateMerchant =
  | "amazon"
  | "sephora"
  | "iherb"
  | "ulta"
  | "other";

export function detectMerchant(url: string): AffiliateMerchant {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes("amazon.")) return "amazon";
    if (h.includes("sephora.")) return "sephora";
    if (h.includes("iherb.")) return "iherb";
    if (h.includes("ulta.")) return "ulta";
  } catch {
    return "other";
  }
  return "other";
}

function withParam(url: string, key: string, value: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

export function wrapAffiliate(url: string | null | undefined): string | null {
  if (!url) return null;
  const merchant = detectMerchant(url);
  switch (merchant) {
    case "amazon": {
      const tag = env("NEXT_PUBLIC_AMAZON_TAG");
      return tag ? withParam(url, "tag", tag) : url;
    }
    case "iherb": {
      const code = env("NEXT_PUBLIC_IHERB_CODE");
      return code ? withParam(url, "rcode", code) : url;
    }
    case "sephora": {
      const tag = env("NEXT_PUBLIC_SEPHORA_TAG");
      // Sephora uses Impact/RAN — real impl would route via their click URL.
      // We attach a simple attribution param so clicks are traceable even in
      // setups where the real redirect isn't wired up yet.
      return tag ? withParam(url, "ranEAID", tag) : url;
    }
    case "ulta": {
      const tag = env("NEXT_PUBLIC_ULTA_TAG");
      return tag ? withParam(url, "CID", tag) : url;
    }
    default:
      return url;
  }
}

/**
 * Build a "shop this" URL when we don't have a direct buy URL but have a name.
 * Defaults to an Amazon search, which tends to have the broadest coverage.
 */
export function searchUrlFor(name: string, brand?: string): string {
  const q = encodeURIComponent([brand, name].filter(Boolean).join(" "));
  const tag = env("NEXT_PUBLIC_AMAZON_TAG");
  const base = `https://www.amazon.com/s?k=${q}`;
  return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
}

export function merchantLabel(m: AffiliateMerchant): string {
  switch (m) {
    case "amazon":  return "Amazon";
    case "sephora": return "Sephora";
    case "iherb":   return "iHerb";
    case "ulta":    return "Ulta";
    default:        return "Shop";
  }
}
