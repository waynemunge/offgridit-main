// Store-wide facts used by pages, SEO tags, the sitemap and emails.

export const SITE_URL = "https://www.offgridit.store";
export const SITE_NAME = "OffGridIt";
export const SITE_TAGLINE = "Premium Gadgets & Tech in Kenya";
export const SITE_DESCRIPTION =
  "Shop genuine phones, laptops, audio, wearables and accessories at OffGridIt. Warranty included, pay with M-Pesa. Order online and we'll call or WhatsApp you to arrange pickup or delivery.";

/** Store phone — WhatsApp and calls. */
export const WHATSAPP_NUMBER = "254799844180";
export const PHONE_DISPLAY = "+254 799 844 180";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/** How orders are fulfilled — shown wherever shipping used to be mentioned. */
export const FULFILMENT_NOTE =
  "Pickup or delivery is arranged with you by call or WhatsApp after you order — nothing extra is charged here.";
export const FULFILMENT_SHORT = "Pickup or delivery arranged by call or WhatsApp";

/** Absolute URL for a site path, for canonical links and social previews. */
export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const DEFAULT_OG_IMAGE = absoluteUrl("/og-image.jpg");

interface SeoInput {
  title: string;
  description: string;
  /** Site path of the page, e.g. "/shop". Sets the canonical URL and og:url. */
  path: string;
  image?: string;
  type?: "website" | "product";
}

/**
 * Title, description, canonical link and social-preview tags for a route's head().
 * Child routes override the root's tags with the same name/property.
 */
export function seo({ title, description, path, image, type = "website" }: SeoInput) {
  const url = absoluteUrl(path);
  const img = image ? (image.startsWith("http") ? image : absoluteUrl(image)) : DEFAULT_OG_IMAGE;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: type },
      { property: "og:image", content: img },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** For pages that should never appear in search results (cart, checkout, account). */
export const NO_INDEX = { name: "robots", content: "noindex, nofollow" };
