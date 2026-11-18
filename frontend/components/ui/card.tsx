import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={clsx(
        "card-lift relative rounded-2xl border border-hair bg-surface/90 p-5 shadow-card backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="animate-fade-up mb-5 flex h-[66px] flex-col justify-end">
      <div className="mono-eyebrow !mb-1">Overview</div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
        <h1 className="font-display text-[clamp(1.45rem,2.2vw,1.9rem)] font-semibold leading-[1.1] tracking-tight2 text-ink">
          {title}
        </h1>
        <p className="max-w-2xl text-xs leading-relaxed text-mute">{description}</p>
      </div>
      <div className="spectrum-rule mt-2.5 w-full origin-left animate-line-grow" />
    </div>
  );
}

export function PrimaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "group magnetic sheen relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-prism px-4 py-2 text-sm font-medium text-white shadow-lift transition-all duration-500 ease-silk hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "w-full rounded-xl border border-hair bg-surface px-3 py-2 text-left text-sm text-body transition-all duration-500 ease-silk hover:border-prism/30 hover:bg-panel hover:text-prism",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
