import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://xfold.app/sitemap.xml",
    host: "https://xfold.app",
  };
}
