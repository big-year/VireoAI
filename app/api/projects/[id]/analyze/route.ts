import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";

// AI 分析项目
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    // 获取项目信息
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      include: {
        idea: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 构建分析提示
    const prompt = `作为创业项目分析专家，请对以下项目进行全面评估：

项目名称：${project.name}
项目描述：${project.description || "无"}
${project.idea ? `关联创意：${project.idea.title}\n创意描述：${project.idea.description}` : ""}
当前阶段：${project.stage}

请从以下维度进行评分（1-100分）和分析：

1. **可行性评分 (feasibility)**：技术实现难度、资源需求、时间周期
2. **市场潜力评分 (potential)**：市场规模、增长趋势、竞争格局
3. **团队完整度评分 (teamScore)**：所需技能、团队配置建议
4. **风险等级 (riskLevel)**：low/medium/high

同时提供 3-5 条关键洞察 (insights)，格式如下：
- type: "warning" | "opportunity" | "suggestion"
- text: 具体内容

请以 JSON 格式返回：
{
  "feasibility": 数字,
  "potential": 数字,
  "teamScore": 数字,
  "riskLevel": "low" | "medium" | "high",
  "insights": [
    { "type": "warning", "text": "..." },
    { "type": "opportunity", "text": "..." }
  ]
}`;

    const result = await generateWithAI(
      [{ role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 2000 }
    );

    if (!result?.content) {
      return NextResponse.json(
        { error: "AI 分析失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 解析 AI 返回的 JSON
    let analysis;
    try {
      // 尝试提取 JSON
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法解析 AI 返回内容");
      }
    } catch {
      console.error("解析 AI 返回失败:", result.content);
      return NextResponse.json(
        { error: "AI 返回格式错误" },
        { status: 500 }
      );
    }

    // 更新项目
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        feasibility: analysis.feasibility,
        potential: analysis.potential,
        teamScore: analysis.teamScore,
        riskLevel: analysis.riskLevel,
        insights: JSON.stringify(analysis.insights || []),
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            tags: true,
          },
        },
        tasks: true,
      },
    });

    return NextResponse.json({
      project: {
        ...updatedProject,
        idea: updatedProject.idea
          ? {
              ...updatedProject.idea,
              tags: JSON.parse(updatedProject.idea.tags),
            }
          : null,
        insights: analysis.insights || [],
      },
      analysis,
    });
  } catch (error) {
    console.error("项目分析错误:", error);
    return NextResponse.json({ error: "分析失败" }, { status: 500 });
  }
}
