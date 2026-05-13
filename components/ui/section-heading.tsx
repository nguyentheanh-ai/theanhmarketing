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
      <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-6 text-lg leading-8 text-black/65">{description}</p>
      ) : null}
    </div>
  );
}
