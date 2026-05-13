"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { TestimonialItem } from "@/services/testimonialService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const emptyTestimonial: TestimonialItem = {
  quote: "",
  name: "",
  title: "Học viên",
  avatar: "",
  rating: 5,
};

function getKey(testimonial: TestimonialItem) {
  return testimonial.id ?? `${testimonial.name}-${testimonial.title}`;
}

export function TestimonialManager({
  testimonials,
}: {
  testimonials: TestimonialItem[];
}) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState(
    testimonials[0] ? getKey(testimonials[0]) : "new",
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedTestimonial = useMemo(() => {
    return (
      testimonials.find((testimonial) => getKey(testimonial) === selectedKey) ??
      emptyTestimonial
    );
  }, [testimonials, selectedKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Feedback chưa được lưu.");
      setIsSaving(false);
      return;
    }

    const payload = {
      student_name: String(formData.get("name") ?? ""),
      content: String(formData.get("quote") ?? ""),
      avatar: String(formData.get("avatar") ?? ""),
      rating: Number(formData.get("rating") ?? 5),
    };

    const query = selectedTestimonial.id
      ? supabase
          .from("testimonials")
          .update(payload)
          .eq("id", selectedTestimonial.id)
      : supabase.from("testimonials").insert(payload);

    const { error } = await query;
    setIsSaving(false);

    if (error) {
      setMessage(
        `Chưa lưu được feedback: ${error.message}. Nếu thiếu quyền ghi, cập nhật policy testimonials trong docs/DATABASE_SETUP.md.`,
      );
      return;
    }

    setMessage("Đã lưu feedback vào Supabase.");
    router.refresh();
  }

  async function handleDelete() {
    if (!selectedTestimonial.id) {
      setMessage("Feedback fallback từ file tĩnh chưa có id Supabase để xóa.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase.");
      return;
    }

    const { error } = await supabase
      .from("testimonials")
      .delete()
      .eq("id", selectedTestimonial.id);

    if (error) {
      setMessage(`Chưa xóa được feedback: ${error.message}`);
      return;
    }

    setSelectedKey("new");
    setMessage("Đã xóa feedback.");
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid content-start gap-3">
        <button
          className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
            selectedKey === "new"
              ? "bg-black text-white"
              : "border border-black/10 bg-white text-black/65"
          }`}
          type="button"
          onClick={() => setSelectedKey("new")}
        >
          + Tạo feedback mới
        </button>
        {testimonials.map((testimonial) => {
          const key = getKey(testimonial);

          return (
            <button
              className={`rounded-2xl px-4 py-3 text-left transition ${
                selectedKey === key
                  ? "bg-black text-white"
                  : "border border-black/10 bg-white text-black/65 hover:text-black"
              }`}
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
            >
              <span className="block text-sm font-bold">
                {testimonial.name || "Feedback chưa đặt tên"}
              </span>
              <span className="mt-1 block text-xs opacity-70">
                {testimonial.rating ?? 5}/5 sao · {testimonial.title}
              </span>
            </button>
          );
        })}
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedTestimonial.name}
            key={`name-${selectedKey}`}
            name="name"
            placeholder="Tên học viên"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedTestimonial.avatar}
            key={`avatar-${selectedKey}`}
            name="avatar"
            placeholder="Avatar URL"
          />
          <select
            className="min-h-12 rounded-2xl border border-black/10 bg-white px-4"
            defaultValue={selectedTestimonial.rating ?? 5}
            key={`rating-${selectedKey}`}
            name="rating"
          >
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating}/5 sao
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="min-h-36 rounded-2xl border border-black/10 p-4"
          defaultValue={selectedTestimonial.quote}
          key={`quote-${selectedKey}`}
          name="quote"
          placeholder="Nội dung feedback"
          required
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
            Lưu feedback
          </Button>
          {selectedTestimonial.id ? (
            <Button className="w-fit" variant="danger" type="button" onClick={handleDelete}>
              Xóa feedback
            </Button>
          ) : null}
        </div>
        {message ? (
          <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
