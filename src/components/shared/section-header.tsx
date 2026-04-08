"use client";

interface SectionHeaderProps {
  title: string;
  description?: string | undefined;
  badge?: string | undefined;
}

export function SectionHeader({ title, description, badge }: SectionHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {badge && (
          <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground-muted">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      )}
    </header>
  );
}
