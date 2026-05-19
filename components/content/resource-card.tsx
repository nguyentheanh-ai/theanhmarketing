import { SoftCard } from "@/components/ui/soft-card";
import { ButtonLink } from "@/components/ui/button-link";

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
    <SoftCard className="h-full hover:border-[#77d7ff]/35">
      <p className="ai-kicker">
        {resource.type} · {resource.access}
      </p>
      <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
        {resource.title}
      </h2>
      <p className="ai-muted mt-4 leading-7">{resource.description}</p>
      <ButtonLink
        href={requestHref}
        target={resource.fileUrl ? "_blank" : undefined}
        rel={resource.fileUrl ? "noreferrer" : undefined}
        className="mt-7"
        size="md"
      >
        Nhận tài liệu
      </ButtonLink>
    </SoftCard>
  );
}
