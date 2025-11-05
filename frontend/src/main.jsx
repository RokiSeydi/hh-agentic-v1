import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import posthog from "posthog-js";

// Initialize PostHog
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: "https://eu.i.posthog.com", // EU host for GDPR compliance
    person_profiles: "identified_only", // Only create profiles for identified users
    capture_pageview: true, // Capture pageviews automatically
    opt_out_capturing_by_default: false, // Respect user privacy
    loaded: (posthog) => {
      // Set project identifier to track multiple projects with same key
      const projectName = import.meta.env.VITE_PROJECT_NAME || "hh-agentic";
      
      // Extract UTM parameters from URL for cohort tracking
      const params = new URLSearchParams(window.location.search);
      const utmData = {
        project: projectName,
        utm_source: params.get("utm_source") || undefined,
        utm_medium: params.get("utm_medium") || undefined,
        utm_campaign: params.get("utm_campaign") || undefined,
        utm_content: params.get("utm_content") || undefined,
        utm_term: params.get("utm_term") || undefined,
      };
      
      // Remove undefined values
      Object.keys(utmData).forEach(key => utmData[key] === undefined && delete utmData[key]);
      
      // Register as super properties (sent with every event)
      posthog.register(utmData);
    },
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
