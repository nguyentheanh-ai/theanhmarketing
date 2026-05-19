type MediaPlaceholderProps = {
  label: string;
  note?: string;
};

export function MediaPlaceholder({ label, note }: MediaPlaceholderProps) {
  return (
    <div className="ai-panel flex min-h-[280px] items-center justify-center p-8 text-center">
      <div>
        <span className="ai-orb mx-auto mb-5 block size-12" />
        <p className="ai-kicker">{label}</p>
        {note ? <p className="ai-muted mt-3 text-sm leading-6">{note}</p> : null}
      </div>
    </div>
  );
}
