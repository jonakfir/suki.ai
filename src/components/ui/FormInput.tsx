"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-[family-name:var(--font-body)] text-sm";

export function FormInput({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input className={`${inputClass} ${className}`} {...props} />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function FormTextarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        className={`${inputClass} min-h-[80px] resize-y ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
