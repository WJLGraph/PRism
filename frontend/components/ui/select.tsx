"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export interface AppSelectOption {
  value: string;
  label: string;
}

/**
 * 自定义下拉选择：替代原生 <select>（原生弹层由浏览器渲染，无法样式化）。
 * props 与原生用法对齐：value / onChange(value) / options，迁移成本最低。
 */
export function AppSelect({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<AppSelectOption>;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-hair bg-surface px-3 py-2 text-sm text-body transition-all duration-500 ease-silk hover:border-prism/40 disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-prism/50 shadow-glow"
        )}
      >
        <span className={clsx("truncate", !selected && "text-dim")}>{selected?.label ?? value}</span>
        <ChevronDown
          size={14}
          className={clsx("shrink-0 text-dim transition-transform duration-500 ease-silk", open && "rotate-180 text-prism")}
        />
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 max-h-60 w-full animate-fade-up overflow-y-auto rounded-xl border border-hair bg-surface p-1.5 shadow-float">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={clsx(
                "block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition-all duration-300",
                option.value === value
                  ? "bg-prism/10 font-medium text-prism"
                  : "text-body hover:bg-surface-2 hover:text-ink"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
