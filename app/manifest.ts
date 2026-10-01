import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return {
 name: "Life OS", short_name: "Life OS", description: "Lični sistem za svakodnevni život",
 id: "/", scope: "/",
 start_url: "/", display: "standalone", background_color: "#050b18", theme_color: "#050b18",
 icons: [
   { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
   { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
   { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
 ],
}; }
