"use client";

import { useState, type ReactNode } from "react";

type AdminActionFormProps = {
  children: ReactNode;
  submitLabel: string;
  successMessage: string;
};

type AdminActionButtonProps = {
  children: ReactNode;
  message: string;
  variant?: "primary" | "secondary";
};

export function AdminActionForm({
  children,
  submitLabel,
  successMessage,
}: AdminActionFormProps) {
  const [message, setMessage] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(successMessage);
      }}
    >
      {children}
      <button
        className="w-fit rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 active:scale-[0.98]"
        type="submit"
      >
        {submitLabel}
      </button>
      {message ? (
        <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function AdminActionButton({
  children,
  message,
  variant = "primary",
}: AdminActionButtonProps) {
  const [notice, setNotice] = useState("");

  const className =
    variant === "primary"
      ? "rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 active:scale-[0.98]"
      : "rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 active:scale-[0.98]";

  return (
    <div>
      <button className={className} type="button" onClick={() => setNotice(message)}>
        {children}
      </button>
      {notice ? <p className="mt-3 text-sm font-semibold text-black/55">{notice}</p> : null}
    </div>
  );
}
