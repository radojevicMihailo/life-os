"use client";

export const presetColors = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#78716c", "#64748b", "#000000",
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {presetColors.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(value === c ? null : c)}
          style={{ backgroundColor: c }}
          aria-label={`color ${c}`}
          className={`h-6 w-6 rounded-full border-2 ${
            value === c ? "border-foreground" : "border-transparent"
          }`}
        />
      ))}
    </div>
  );
}
