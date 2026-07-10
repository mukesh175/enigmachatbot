/**
 * Figures out where a chat visitor came from, so clients can see in the
 * dashboard whether their leads are coming from Google Ads, Meta/Facebook
 * ads, organic search/social, or direct traffic — without needing any
 * external analytics tool wired up.
 */
export function detectTrafficSource(pageUrl: string | null, referrerUrl: string | null) {
  let utmSource: string | null = null;
  let utmMedium: string | null = null;
  let utmCampaign: string | null = null;

  if (pageUrl) {
    try {
      const url = new URL(pageUrl);
      utmSource = url.searchParams.get("utm_source");
      utmMedium = url.searchParams.get("utm_medium");
      utmCampaign = url.searchParams.get("utm_campaign");
      // Google Ads' auto-tagging param — treat as a Google Ads signal even
      // if the client didn't manually add utm_source
      if (!utmSource && url.searchParams.get("gclid")) {
        utmSource = "google";
        utmMedium = "cpc";
      }
      // Meta/Facebook Ads' auto-tagging param
      if (!utmSource && url.searchParams.get("fbclid")) {
        utmSource = "facebook";
        utmMedium = "paid_social";
      }
    } catch {
      // invalid URL, ignore
    }
  }

  let trafficSource = "direct";

  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (s.includes("google") && (utmMedium || "").toLowerCase().includes("cpc")) {
      trafficSource = "google_ads";
    } else if (s.includes("google")) {
      trafficSource = "organic_search";
    } else if (s.includes("facebook") || s.includes("meta") || s.includes("instagram")) {
      trafficSource = "meta_ads";
    } else {
      trafficSource = "other";
    }
  } else if (referrerUrl) {
    try {
      const host = new URL(referrerUrl).hostname.replace("www.", "");
      if (host.includes("google.")) trafficSource = "organic_search";
      else if (host.includes("bing.") || host.includes("yahoo.")) trafficSource = "organic_search";
      else if (host.includes("facebook.") || host.includes("instagram.") || host.includes("l.facebook.")) {
        trafficSource = "organic_social";
      } else if (host.includes("linkedin.") || host.includes("twitter.") || host.includes("x.com")) {
        trafficSource = "organic_social";
      } else {
        trafficSource = "other";
      }
    } catch {
      // invalid referrer URL, keep as direct
    }
  }

  return { utmSource, utmMedium, utmCampaign, trafficSource };
}
