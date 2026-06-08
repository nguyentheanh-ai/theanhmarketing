"use client";

import { useEffect } from "react";

type EmailOpenClientProps = {
  targetUrl: string;
};

export function EmailOpenClient({ targetUrl }: EmailOpenClientProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.assign(targetUrl);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [targetUrl]);

  return null;
}
