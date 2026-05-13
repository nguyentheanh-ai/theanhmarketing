import { testimonials as mockTestimonials } from "@/data/testimonials";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TestimonialItem = (typeof mockTestimonials)[number] & {
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

function mapDbTestimonial(testimonial: DbTestimonial): TestimonialItem {
  return {
    id: testimonial.id,
    quote: testimonial.content ?? "",
    name: testimonial.student_name,
    title: testimonial.rating ? `${testimonial.rating}/5 sao` : "Học viên",
    avatar: testimonial.avatar ?? "",
    rating: testimonial.rating ?? undefined,
    createdAt: testimonial.created_at ?? undefined,
  };
}

export async function getTestimonials(): Promise<TestimonialItem[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return mockTestimonials;
  }

  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return mockTestimonials;
  }

  return (data as DbTestimonial[]).map(mapDbTestimonial);
}
