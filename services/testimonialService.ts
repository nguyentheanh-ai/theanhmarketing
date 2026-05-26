import { testimonials as fallbackTestimonials } from "@/data/testimonials";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TestimonialItem = (typeof fallbackTestimonials)[number] & {
  id?: string;
  avatar?: string;
  rating?: number;
  createdAt?: string;
};

type DbTestimonial = {
  id: string;
  student_name: string;
  content: string | null;
  avatar: string | null;
  rating: number | null;
  created_at: string | null;
};

const testimonialSelectFields = "id,student_name,content,avatar,rating,created_at" as const;

const legacyNameToCaseLabel: Record<string, string> = {
  "Minh Anh": "Case SME ngành bán lẻ",
  "Quốc Huy": "Case Solopreneur",
  "Thu Trang": "Case team nội bộ",
};

function mapDbTestimonial(testimonial: DbTestimonial): TestimonialItem {
  const displayName = legacyNameToCaseLabel[testimonial.student_name] ?? testimonial.student_name;

  return {
    id: testimonial.id,
    quote: testimonial.content ?? "",
    name: displayName,
    title: testimonial.rating ? `${testimonial.rating}/5 sao` : "Case triển khai",
    avatar: testimonial.avatar ?? "",
    rating: testimonial.rating ?? undefined,
    createdAt: testimonial.created_at ?? undefined,
  };
}

async function fetchTestimonials(): Promise<TestimonialItem[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallbackTestimonials;
  }

  const { data, error } = await supabase
    .from("testimonials")
    .select(testimonialSelectFields)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return fallbackTestimonials;
  }

  return (data as DbTestimonial[]).map(mapDbTestimonial);
}

export const getTestimonials = unstable_cache(fetchTestimonials, ["testimonials"], {
  revalidate: 120,
  tags: ["content", "testimonials"],
});
