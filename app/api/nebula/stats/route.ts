import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取平台统计数据
export async function GET() {
  try {
    // 基础统计（只统计已验证邮箱用户的数据）
    const [totalIdeas, totalUsers, todayIdeas] = await Promise.all([
      // 只统计已验证用户的公开创意
      prisma.idea.count({
        where: {
          isPublic: true,
          user: { emailVerified: { not: null } },
        },
      }),
      // 只统计已验证邮箱的用户
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.idea.count({
        where: {
          isPublic: true,
          user: { emailVerified: { not: null } },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // 尝试获取匹配数，表可能不存在
    let totalMatches = 0;
    try {
      totalMatches = await prisma.userMatch.count();
    } catch {
      // 表不存在，使用默认值
    }

    return NextResponse.json({
      stats: {
        totalIdeas,
        totalUsers,
        todayIdeas,
        totalMatches,
      },
    });
  } catch (error) {
    console.error("获取统计数据错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
