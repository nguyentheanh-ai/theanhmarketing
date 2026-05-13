type MediaPlaceholderProps = {
  label: string;
  note?: string;
};

export function MediaPlaceholder({ label, note }: MediaPlaceholderProps) {
  return (
    <div className="media-float flex min-h-[280px] items-center justify-center rounded-[2rem] bg-[#f2eadf] p-8 text-center">
      <div>
        <p className="text-sm font-semibold text-[#c77b20]">{label}</p>
        {note ? <p className="mt-3 text-sm leading-6 text-black/55">{note}</p> : null}
      </div>
    </div>
  );
}
