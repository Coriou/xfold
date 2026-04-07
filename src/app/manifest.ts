import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "xfold — See what X knows about you",
    short_name: "xfold",
    description:
      "Upload your X/Twitter data archive and see everything they collected about you. 100% client-side, open source, no tracking. Your archive never leaves your browser.",
    start_url: "/",
    display: "standalone",
    background_color: brand.background,
    theme_color: brand.background,
    orientation: "any",
    categories: ["utilities", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
