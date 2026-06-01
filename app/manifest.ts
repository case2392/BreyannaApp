import type { MetadataRoute } from "next";

// Lets visitors install Dwell to their home screen as an app-like experience.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dwell Studio",
    short_name: "Dwell",
    description:
      "A Christ-centered movement studio for women — book classes and manage your membership.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F1EC",
    theme_color: "#F4F1EC",
    icons: [
      { src: "/icon", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
