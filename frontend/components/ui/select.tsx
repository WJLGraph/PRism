"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";

export interface AppSelectOption {
  value: string;
  label: string;
}

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
  const [placement, setPlacement] = useState<"up" | "down">("down");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  function toggle() {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPlacement(spaceBelow < 250 && rect.top > spaceBelow ? "up" : "down");
    }
    setOpen((current) => !current);
  }

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
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) toggle();
          }
        }}
        className={clsx("app-select-trigger", open && "is-open")}
      >
        <span className={clsx("truncate", !selected && "text-dim")}>{selected?.label ?? value}</span>
        <ChevronDown size={14} strokeWidth={1.5} className={clsx("shrink-0 text-dim transition-transform duration-300", open && "rotate-180 text-prism")} />
      </button>
      {open && (
        <div role="listbox" aria-label={ariaLabel} className={clsx("app-select-menu", placement === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5")}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={clsx("app-select-option", option.value === value && "is-selected")}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check size={13} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
