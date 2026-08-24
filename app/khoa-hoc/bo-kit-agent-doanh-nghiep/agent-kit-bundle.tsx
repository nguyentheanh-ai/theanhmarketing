"use client";

import { useEffect } from "react";

const bundleId = "doi-ngu-nhan-su-ai-bundle";
const bundleSource = "/doi-ngu-nhan-su-ai/assets/index-DglJfGeU.js";

export function AgentKitBundle() {
  useEffect(() => {
    if (document.getElementById(bundleId)) return;

    const script = document.createElement("script");
    script.id = bundleId;
    script.type = "module";
    script.src = bundleSource;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return <div id="root" />;
}
