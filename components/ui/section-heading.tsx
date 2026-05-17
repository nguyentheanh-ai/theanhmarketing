type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? (
        <p className="text-sm font-semibold text-[#c77b20]">{eyebrow}</p>
      ) : null}
      <h2 className="mt-4 text-3xl font-black leading-[1.08] tracking-[-0.03em] sm:text-5xl sm:tracking-[-0.05em] lg:text-6xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-base leading-8 text-black/65 sm:mt-6 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
