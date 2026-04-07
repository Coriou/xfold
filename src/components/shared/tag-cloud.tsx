"use client";

interface Tag {
  label: string;
  weight?: number;
  variant?: "default" | "disabled" | "danger" | "accent";
}

interface TagCloudProps {
  tags: Tag[];
}

const SIZE_CLASSES = ["text-xs", "text-sm", "text-base"] as const;

export function TagCloud({ tags }: TagCloudProps) {
  const maxWeight = Math.max(...tags.map((t) => t.weight ?? 1), 1);

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => {
        const normalized = (tag.weight ?? 1) / maxWeight;
        const sizeIdx =
          normalized > 0.66 ? 2 : normalized > 0.33 ? 1 : 0;
        const sizeClass = SIZE_CLASSES[sizeIdx];

        const variantClasses =
          tag.variant === "disabled"
            ? "border-border/50 text-foreground-muted/50 line-through"
            : tag.variant === "danger"
              ? "border-danger/30 text-danger"
              : tag.variant === "accent"
                ? "border-accent/30 text-accent"
                : "border-border text-foreground";

        return (
          <span
            key={i}
            className={`inline-block rounded-lg border px-2.5 py-1 ${sizeClass} ${variantClasses}`}
          >
            {tag.label}
          </span>
        );
      })}
    </div>
  );
}
