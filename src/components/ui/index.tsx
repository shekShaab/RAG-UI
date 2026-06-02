import type { DocStatus } from "@/lib/types";

// ── Status dot ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DocStatus, string> = {
  processed:  "bg-green-500",
  processing: "bg-blue-500 animate-pulse",
  pending:    "bg-amber-400",
  failed:     "bg-red-500",
};

export function StatusDot({ status }: { status: DocStatus }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${STATUS_STYLES[status]}`} />
      <span className="capitalize text-sm text-slate-600">{status}</span>
    </span>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  policies:       "bg-violet-100 text-violet-700",
  workflows:      "bg-teal-100 text-teal-700",
  business_rules: "bg-amber-100 text-amber-700",
  faqs:           "bg-sky-100 text-sky-700",
  general:        "bg-slate-100 text-slate-600",
};

export function CategoryBadge({ category }: { category: string }) {
  const style = CAT_COLORS[category] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${style}`}>
      {category.replace(/_/g, " ")}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BTN: Record<ButtonVariant, string> = {
  primary:   "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
  danger:    "bg-red-600 text-white hover:bg-red-700",
  ghost:     "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}

export function Button({
  variant = "primary", size = "md", className = "", children, ...rest
}: ButtonProps) {
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed ${BTN[variant]} ${sz} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      className="animate-spin text-brand-600"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────

export function PageHeader({
  title, description, action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-medium text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, icon: Icon, color = "text-brand-600",
}: {
  label: string;
  value: string | number;
  sub?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<any>;
  color?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-medium text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </Card>
  );
}
