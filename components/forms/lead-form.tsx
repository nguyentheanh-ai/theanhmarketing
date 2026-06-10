"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getClientAttribution } from "@/lib/tracking/client-attribution";
import { trackMarketingEvent } from "@/lib/tracking/events";

type LeadFormProps = {
  source: string;
  submitLabel?: string;
};

export function LeadForm({ source, submitLabel = "Gửi thông tin" }: LeadFormProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="mt-10 grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const attribution = getClientAttribution();
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(formData.get("name") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            email: String(formData.get("email") ?? ""),
            message: String(formData.get("need") ?? ""),
            source,
            attribution,
          }),
        });
        const result = (await response.json()) as { ok?: boolean; lead?: { id?: string } };

        setIsSubmitting(false);
        setMessage(
          response.ok && result.ok
            ? "Đã gửi thông tin. Team The Anh Marketing sẽ liên hệ lại."
            : "Chưa gửi được thông tin. Vui lòng thử lại hoặc nhắn trực tiếp Fanpage The Anh Marketing.",
        );

        if (response.ok && result.ok) {
          trackMarketingEvent("Lead", {
            event_id: result.lead?.id,
            content_name: source,
            content_type: "product",
            ...attribution,
          });
          event.currentTarget.reset();
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none placeholder:text-white/35"
          name="name"
          placeholder="Họ và tên"
          required
        />
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none placeholder:text-white/35"
          name="phone"
          placeholder="Số điện thoại"
        />
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none placeholder:text-white/35"
          name="email"
          placeholder="Email"
          type="email"
        />
      </div>
      <input
        className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none placeholder:text-white/35"
        name="need"
        placeholder="Nhu cầu học / lời nhắn"
      />
      <Button className="w-fit" isLoading={isSubmitting} loadingLabel="Đang gửi..." type="submit">
        {submitLabel}
      </Button>
      {message ? (
        <p className="rounded-xl bg-white/8 px-4 py-3 text-sm font-semibold text-white/65">
          {message}
        </p>
      ) : null}
    </form>
  );
}
