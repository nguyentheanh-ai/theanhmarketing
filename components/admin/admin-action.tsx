"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
      <Button className="w-fit" type="submit">
        {submitLabel}
      </Button>
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

  return (
    <div>
      <Button
        type="button"
        variant={variant === "primary" ? "primary" : "secondary"}
        onClick={() => setNotice(message)}
      >
        {children}
      </Button>
      {notice ? <p className="mt-3 text-sm font-semibold text-black/55">{notice}</p> : null}
    </div>
  );
}
