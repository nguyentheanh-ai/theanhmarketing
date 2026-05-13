"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-preview", enabled);
    window.localStorage.setItem("tam-dark-preview", enabled ? "1" : "0");
  }, [enabled]);

  function toggleTheme() {
    const next = !enabled;
    setEnabled(next);
  }

  return (
    <button
      className={`grid size-10 place-items-center rounded-full border border-black/10 bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition ${
        enabled ? "ring-2 ring-[#ffd39d]" : ""
      }`}
      aria-label="Dark mode preview"
      aria-pressed={enabled}
      type="button"
      onClick={toggleTheme}
    >
      <svg
        aria-hidden="true"
        className="size-4"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 14.2A7.2 7.2 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}
