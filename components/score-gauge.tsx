"use client";

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreGauge({ score, label = "综合评分", size = "md", className }: ScoreGaugeProps) {
  const data = [{ value: score, fill: getScoreColor(score) }];

  const sizeConfig = {
    sm: { width: 120, height: 120, fontSize: "text-2xl", labelSize: "text-xs" },
    md: { width: 160, height: 160, fontSize: "text-3xl", labelSize: "text-sm" },
    lg: { width: 200, height: 200, fontSize: "text-4xl", labelSize: "text-base" },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("relative", className)} style={{ width: config.width, height: config.height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={12}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "rgba(255,255,255,0.1)" }}
            dataKey="value"
            cornerRadius={6}
            angleAxisId={0}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", config.fontSize, getScoreTextColor(score))}>
          {score}
        </span>
        <span className={cn("text-muted-foreground", config.labelSize)}>{label}</span>
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#8b5cf6"; // purple
  if (score >= 40) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

// 多维度评分组件
interface MultiScoreProps {
  scores: {
    label: string;
    value: number;
    description?: string;
  }[];
  className?: string;
}

export function MultiScore({ scores, className }: MultiScoreProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {scores.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={cn("font-medium", getScoreTextColor(item.value))}>
              {item.value}分
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.value}%`,
                backgroundColor: getScoreColor(item.value),
              }}
            />
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
