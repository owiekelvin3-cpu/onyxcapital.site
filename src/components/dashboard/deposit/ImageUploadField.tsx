"use client";

import { Upload, X } from "@/components/icons";
import { cn } from "@/lib/utils";

export function ImageUploadField({
  id,
  label,
  required,
  value,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-text-tertiary mb-2">
        {label}
        {required && <span className="text-red"> *</span>}
      </label>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-primary">
          <img src={URL.createObjectURL(value)} alt="" className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-full bg-bg-primary/90 p-1.5 text-text-tertiary hover:text-red"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="truncate px-3 py-2 text-[11px] text-text-tertiary">{value.name}</p>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border",
            "bg-bg-primary text-text-tertiary transition-colors hover:border-brand/40 hover:text-brand"
          )}
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs font-medium">Upload image</span>
        </label>
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
