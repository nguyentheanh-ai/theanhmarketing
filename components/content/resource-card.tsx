import { SoftCard } from "@/components/ui/soft-card";

type Resource = {
  title: string;
  type: string;
  access: string;
  description: string;
  fileUrl?: string;
};

export function ResourceCard({ resource }: { resource: Resource }) {
  const requestHref =
    resource.fileUrl ||
    `mailto:theanhmarketing@gmail.com?subject=${encodeURIComponent(
      `Nhận tài liệu: ${resource.title}`,
    )}`;

  return (
    <SoftCard className="h-full hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,0,0,0.08)]">
      <p className="text-sm font-semibold text-[#c77b20]">
        {resource.type} · {resource.access}
      </p>
      <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
        {resource.title}
      </h2>
      <p className="mt-4 leading-7 text-black/60">{resource.description}</p>
      <a
        href={requestHref}
        target={resource.fileUrl ? "_blank" : undefined}
        rel={resource.fileUrl ? "noreferrer" : undefined}
        className="mt-7 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
      >
        Nhận tài liệu
      </a>
    </SoftCard>
  );
}
