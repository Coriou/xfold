"use client";

interface ScoreRingProps {
  score: number;
  grade: string;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({
  score,
  grade,
  size = 160,
  strokeWidth = 10,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const offset = circumference - filled;

  // Color based on score: low=accent, mid=foreground, high=danger
  const strokeColor =
    score <= 30
      ? "var(--accent)"
      : score <= 60
        ? "var(--foreground)"
        : "var(--danger)";

  const gradeColor =
    score <= 30
      ? "text-accent"
      : score <= 60
        ? "text-foreground"
        : "text-danger";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${gradeColor}`}>{grade}</span>
        <span className="mt-0.5 font-mono text-xs text-foreground-muted">
          {score}/100
        </span>
      </div>
    </div>
  );
}
