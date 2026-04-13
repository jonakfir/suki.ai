"use client";

interface SelectionButtonProps<T extends string> {
  value: T;
  label: string;
  selected: boolean;
  onSelect: (value: T) => void;
}

/**
 * Pill-style selection button used by onboarding steps for single-choice
 * options (skin tone, age range, etc.).
 */
export function SelectionButton<T extends string>({
  value,
  label,
  selected,
  onSelect,
}: SelectionButtonProps<T>) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`px-5 py-2.5 rounded-full text-sm transition-all cursor-pointer ${
        selected
          ? "bg-accent/15 text-accent border border-accent/30"
          : "bg-card text-muted border border-card-border hover:border-accent/30"
      }`}
    >
      {label}
    </button>
  );
}
