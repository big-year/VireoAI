"use client";

import { useState } from "react";
import {
  Heart,
  Users,
  Megaphone,
  Handshake,
  DollarSign,
  Package,
  Zap,
  Building2,
  Wallet,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CanvasData {
  valueProposition: string;
  customerSegments: string;
  channels: string;
  customerRelationships: string;
  revenueStreams: string;
  keyResources: string;
  keyActivities: string;
  keyPartners: string;
  costStructure: string;
}

interface BusinessCanvasProps {
  data: CanvasData;
  className?: string;
}

const canvasConfig = [
  { key: "keyPartners", icon: Building2, title: "关键伙伴", color: "purple" },
  { key: "keyActivities", icon: Zap, title: "关键活动", color: "blue" },
  { key: "valueProposition", icon: Heart, title: "价值主张", color: "red" },
  { key: "customerRelationships", icon: Handshake, title: "客户关系", color: "green" },
  { key: "customerSegments", icon: Users, title: "客户细分", color: "cyan" },
  { key: "keyResources", icon: Package, title: "核心资源", color: "amber" },
  { key: "channels", icon: Megaphone, title: "渠道通路", color: "pink" },
  { key: "costStructure", icon: Wallet, title: "成本结构", color: "gray" },
  { key: "revenueStreams", icon: DollarSign, title: "收入来源", color: "emerald" },
];

export function BusinessCanvas({ data, className }: BusinessCanvasProps) {
  const [selectedCell, setSelectedCell] = useState<{
    title: string;
    content: string;
    color: string;
    icon: React.ElementType;
  } | null>(null);

  const handleCellClick = (key: string) => {
    const config = canvasConfig.find((c) => c.key === key);
    if (config) {
      setSelectedCell({
        title: config.title,
        content: data[key as keyof CanvasData],
        color: config.color,
        icon: config.icon,
      });
    }
  };

  return (
    <>
      <div className={cn("grid grid-cols-5 gap-2 text-sm", className)}>
        {/* 第一行 */}
        <CanvasCell
          icon={Building2}
          title="关键伙伴"
          content={data.keyPartners}
          color="purple"
          className="row-span-2"
          onClick={() => handleCellClick("keyPartners")}
        />
        <CanvasCell
          icon={Zap}
          title="关键活动"
          content={data.keyActivities}
          color="blue"
          onClick={() => handleCellClick("keyActivities")}
        />
        <CanvasCell
          icon={Heart}
          title="价值主张"
          content={data.valueProposition}
          color="red"
          className="row-span-2"
          onClick={() => handleCellClick("valueProposition")}
        />
        <CanvasCell
          icon={Handshake}
          title="客户关系"
          content={data.customerRelationships}
          color="green"
          onClick={() => handleCellClick("customerRelationships")}
        />
        <CanvasCell
          icon={Users}
          title="客户细分"
          content={data.customerSegments}
          color="cyan"
          className="row-span-2"
          onClick={() => handleCellClick("customerSegments")}
        />

        {/* 第二行 */}
        <CanvasCell
          icon={Package}
          title="核心资源"
          content={data.keyResources}
          color="amber"
          onClick={() => handleCellClick("keyResources")}
        />
        <CanvasCell
          icon={Megaphone}
          title="渠道通路"
          content={data.channels}
          color="pink"
          onClick={() => handleCellClick("channels")}
        />

        {/* 第三行 */}
        <CanvasCell
          icon={Wallet}
          title="成本结构"
          content={data.costStructure}
          color="gray"
          className="col-span-2"
          onClick={() => handleCellClick("costStructure")}
        />
        <CanvasCell
          icon={DollarSign}
          title="收入来源"
          content={data.revenueStreams}
          color="emerald"
          className="col-span-3"
          onClick={() => handleCellClick("revenueStreams")}
        />
      </div>

      {/* 详情弹窗 */}
      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCell && (
                <>
                  <selectedCell.icon className={cn("h-5 w-5", getIconColor(selectedCell.color))} />
                  {selectedCell.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {selectedCell?.content}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CanvasCellProps {
  icon: React.ElementType;
  title: string;
  content: string;
  color: string;
  className?: string;
  onClick?: () => void;
}

function CanvasCell({ icon: Icon, title, content, color, className, onClick }: CanvasCellProps) {
  const colors = getColorConfig(color);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-lg",
        colors.bg,
        colors.border,
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", colors.icon)} />
        <span className={cn("font-medium text-xs", colors.title)}>{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
        {content}
      </p>
      {content.length > 100 && (
        <p className={cn("text-xs mt-1", colors.title)}>点击查看更多...</p>
      )}
    </div>
  );
}

function getColorConfig(color: string) {
  const colorMap: Record<string, { bg: string; border: string; icon: string; title: string }> = {
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      icon: "text-purple-500",
      title: "text-purple-400",
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      icon: "text-blue-500",
      title: "text-blue-400",
    },
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      icon: "text-red-500",
      title: "text-red-400",
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      icon: "text-green-500",
      title: "text-green-400",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      icon: "text-cyan-500",
      title: "text-cyan-400",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: "text-amber-500",
      title: "text-amber-400",
    },
    pink: {
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      icon: "text-pink-500",
      title: "text-pink-400",
    },
    gray: {
      bg: "bg-gray-500/10",
      border: "border-gray-500/30",
      icon: "text-gray-500",
      title: "text-gray-400",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      icon: "text-emerald-500",
      title: "text-emerald-400",
    },
  };

  return colorMap[color] || colorMap.gray;
}

function getIconColor(color: string): string {
  const colorMap: Record<string, string> = {
    purple: "text-purple-500",
    blue: "text-blue-500",
    red: "text-red-500",
    green: "text-green-500",
    cyan: "text-cyan-500",
    amber: "text-amber-500",
    pink: "text-pink-500",
    gray: "text-gray-500",
    emerald: "text-emerald-500",
  };
  return colorMap[color] || "text-gray-500";
}
