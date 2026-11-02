import type { MetadataRoute } from "next";

/** Makes the app installable ("Add to Home Screen") on phones and desktops. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Decision Inbox",
    short_name: "Inbox",
    description: "Capture everything. Decide what matters. Work on less.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#1c1917",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/today" },
      { name: "Planner", url: "/planner" },
      { name: "Focus", url: "/focus" },
    ],
  };
}
