import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import posthog from "posthog-js";

// Initialize PostHog
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: "https://app.posthog.com",
    // Capture pageviews automatically
    capture_pageview: true,
    // Respect user privacy
    opt_out_capturing_by_default: false,
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
