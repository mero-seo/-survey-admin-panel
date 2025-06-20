import * as React from "react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, label, id, className, disabled }: TimePickerProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>}
      <input
        type="time"
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary bg-white"
        disabled={disabled}
      />
    </div>
  );
} 