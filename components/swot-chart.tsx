"use client";

import { TrendingUp, TrendingDown, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface SwotChartProps {
  data: SwotData;
  className?: string;
}

export function SwotChart({ data, className }: SwotChartProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {/* 优势 - 左上 */}
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <h4 className="font-semibold text-green-500">优势</h4>
            <p className="text-xs text-muted-foreground">Strengths</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {data.strengths.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 劣势 - 右上 */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-500">劣势</h4>
            <p className="text-xs text-muted-foreground">Weaknesses</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {data.weaknesses.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-amber-500 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 机会 - 左下 */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-500">机会</h4>
            <p className="text-xs text-muted-foreground">Opportunities</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {data.opportunities.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 威胁 - 右下 */}
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h4 className="font-semibold text-red-500">威胁</h4>
            <p className="text-xs text-muted-foreground">Threats</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {data.threats.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
