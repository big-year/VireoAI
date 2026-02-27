import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取推荐的创业者列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const location = searchParams.get("location");
    const lookingFor = searchParams.get("lookingFor");

    // 获取当前用户已发送的连接请求、收到的连接请求和已连接的用户
    const [sentLikes, receivedLikes, matches] = await Promise.all([
      prisma.userLike.findMany({
        where: { fromUserId: session.user.id },
        select: { toUserId: true, ignored: true },
      }),
      prisma.userLike.findMany({
        where: { toUserId: session.user.id },
        select: { fromUserId: true },
      }),
      prisma.userMatch.findMany({
        where: {
          OR: [
            { user1Id: session.user.id },
            { user2Id: session.user.id },
          ],
        },
      }),
    ]);

    // 构建连接状态映射
    const sentLikeMap = new Map(sentLikes.map((l) => [l.toUserId, l.ignored]));
    const receivedLikeSet = new Set(receivedLikes.map((l) => l.fromUserId));
    const matchedUserIds = new Set(
      matches.map((m) =>
        m.user1Id === session.user.id ? m.user2Id : m.user1Id
      )
    );

    const userId = session.user.id;

    // 只排除自己
    const excludeIds = [userId];

    // 构建查询条件（只显示已验证邮箱的用户）
    const where: {
      id: { notIn: string[] };
      emailVerified: { not: null };
      location?: string;
      lookingFor?: { contains: string };
    } = {
      id: { notIn: excludeIds },
      emailVerified: { not: null },
    };

    if (location) {
      where.location = location;
    }

    if (lookingFor) {
      where.lookingFor = { contains: lookingFor };
    }

    // 获取当前用户信息用于计算匹配度
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        skills: true,
        interests: true,
        lookingFor: true,
      },
    });

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          title: true,
          location: true,
          skills: true,
          interests: true,
          lookingFor: true,
          experience: true,
          achievements: true,
          verified: true,
          createdAt: true,
          _count: {
            select: { ideas: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // 计算匹配度
    const calculateMatchScore = (user: typeof users[0]) => {
      let score = 50; // 基础分

      if (!currentUser) return score;

      try {
        const currentSkills = currentUser.skills
          ? JSON.parse(currentUser.skills)
          : [];
        const currentInterests = currentUser.interests
          ? JSON.parse(currentUser.interests)
          : [];
        const userSkills = user.skills ? JSON.parse(user.skills) : [];
        const userInterests = user.interests ? JSON.parse(user.interests) : [];

        // 技能互补性
        const skillOverlap = currentSkills.filter((s: string) =>
          userSkills.includes(s)
        ).length;
        score += skillOverlap * 5;

        // 兴趣相似度
        const interestOverlap = currentInterests.filter((i: string) =>
          userInterests.includes(i)
        ).length;
        score += interestOverlap * 8;

        // 寻找匹配
        if (
          currentUser.lookingFor &&
          user.lookingFor &&
          user.lookingFor.includes(currentUser.lookingFor)
        ) {
          score += 15;
        }

        // 认证用户加分
        if (user.verified) {
          score += 10;
        }
      } catch {
        // 解析错误，使用默认分数
      }

      return Math.min(100, score);
    };

    // 计算连接状态
    // connectionStatus: "none" | "pending" | "connected" | "received"
    const getConnectionStatus = (userId: string) => {
      if (matchedUserIds.has(userId)) {
        return "connected";
      }
      if (sentLikeMap.has(userId)) {
        // 如果被忽略了，恢复为 none
        if (sentLikeMap.get(userId)) {
          return "none";
        }
        return "pending";
      }
      if (receivedLikeSet.has(userId)) {
        return "received";
      }
      return "none";
    };

    return NextResponse.json({
      founders: users.map((user) => ({
        id: user.id,
        name: user.name || "未设置昵称",
        title: user.title || "创业者",
        image: user.image,
        initials: user.name?.[0] || "U",
        location: user.location || "未知",
        bio: user.bio || "",
        skills: user.skills ? JSON.parse(user.skills) : [],
        interests: user.interests ? JSON.parse(user.interests) : [],
        lookingFor: user.lookingFor ? JSON.parse(user.lookingFor) : [],
        experience: user.experience || "",
        achievements: user.achievements ? JSON.parse(user.achievements) : [],
        verified: user.verified,
        ideasCount: user._count.ideas,
        matchScore: calculateMatchScore(user),
        connectionStatus: getConnectionStatus(user.id),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取推荐列表错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
