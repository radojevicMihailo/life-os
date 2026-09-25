import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return {
 name: "Life OS", short_name: "Life OS", description: "Lični sistem za svakodnevni život",
 start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#0f172a",
 icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
}; }
