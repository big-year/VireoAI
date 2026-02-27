"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

interface RadarData {
  dimension: string;
  value: number;
  fullMark?: number;
}

interface AnalysisRadarProps {
  data: RadarData[];
  className?: string;
}

export function AnalysisRadar({ data, className }: AnalysisRadarProps) {
  const chartData = data.map((item) => ({
    ...item,
    fullMark: item.fullMark || 100,
  }));

  return (
    <div className={cn("w-full h-64", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#333" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#888", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "#666", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value}分`, "评分"]}
          />
          <Radar
            name="评分"
            dataKey="value"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 预设的分析维度
export function getDefaultRadarData(analysis: {
  marketSize?: string;
  growthRate?: string;
  entryBarriers?: string;
  competitors?: string[];
}): RadarData[] {
  // 根据分析数据生成评分（简化逻辑，实际可以更复杂）
  const parseMarketScore = (size?: string): number => {
    if (!size) return 50;
    if (size.includes("千亿") || size.includes("万亿")) return 95;
    if (size.includes("百亿")) return 85;
    if (size.includes("十亿") || size.includes("几十亿")) return 70;
    return 60;
  };

  const parseGrowthScore = (rate?: string): number => {
    if (!rate) return 50;
    const match = rate.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 30) return 90;
      if (num >= 20) return 80;
      if (num >= 10) return 70;
      return 60;
    }
    return 50;
  };

  const parseBarrierScore = (barrier?: string): number => {
    if (!barrier) return 50;
    if (barrier.includes("高") || barrier.includes("较高")) return 40;
    if (barrier.includes("中")) return 60;
    if (barrier.includes("低") || barrier.includes("较低")) return 80;
    return 50;
  };

  const parseCompetitionScore = (competitors?: string[]): number => {
    if (!competitors) return 50;
    const count = competitors.length;
    if (count <= 2) return 85;
    if (count <= 5) return 70;
    if (count <= 10) return 55;
    return 40;
  };

  return [
    { dimension: "市场规模", value: parseMarketScore(analysis.marketSize) },
    { dimension: "增长潜力", value: parseGrowthScore(analysis.growthRate) },
    { dimension: "进入难度", value: parseBarrierScore(analysis.entryBarriers) },
    { dimension: "竞争程度", value: parseCompetitionScore(analysis.competitors) },
    { dimension: "创新空间", value: 70 }, // 默认值，可以根据其他因素计算
    { dimension: "盈利能力", value: 65 }, // 默认值
  ];
}
