import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("ui-card", className)}>{children}</section>;
}

export function PageTitle({ title, description, eyebrow = "PRISM / OVERVIEW" }: { title: string; description: string; eyebrow?: string }) {
  return (
    <header className="page-title animate-fade-up">
      <div>
        <div className="mono-eyebrow mb-3 text-prism">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <p>{description}</p>
    </header>
  );
}

export function PrimaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={clsx("primary-button magnetic", className)} {...props}>
      <span className="inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export function GhostButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={clsx("ghost-button", className)} {...props}>
      {children}
    </button>
  );
}
