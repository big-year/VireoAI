import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取当前用户资料
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        skills: true,
        interests: true,
        lookingFor: true,
        location: true,
        title: true,
        experience: true,
        achievements: true,
        verified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 单独查询统计数据
    const [ideasCount, projectsCount] = await Promise.all([
      prisma.idea.count({ where: { userId: session.user.id } }),
      prisma.project.count({ where: { userId: session.user.id } }),
    ]);

    // 尝试查询新表的数据，如果失败则返回0
    let likesCount = 0;
    let matchesCount = 0;
    try {
      likesCount = await prisma.userLike.count({ where: { fromUserId: session.user.id } });
      const m1 = await prisma.userMatch.count({ where: { user1Id: session.user.id } });
      const m2 = await prisma.userMatch.count({ where: { user2Id: session.user.id } });
      matchesCount = m1 + m2;
    } catch {
      // 表可能不存在
    }

    // 解析 JSON 字段
    const profile = {
      ...user,
      location: user.location || "",
      title: user.title || "",
      experience: user.experience || "",
      achievements: user.achievements ? JSON.parse(user.achievements) : [],
      verified: user.verified || false,
      skills: user.skills ? JSON.parse(user.skills) : [],
      interests: user.interests ? JSON.parse(user.interests) : [],
      lookingFor: user.lookingFor ? JSON.parse(user.lookingFor) : [],
      initials: user.name?.[0] || "U",
      // 判断资料是否完整（用于强制编辑）
      isProfileComplete: !!(user.name && user.bio && user.skills),
      stats: {
        ideas: ideasCount,
        projects: projectsCount,
        likes: likesCount,
        matches: matchesCount,
      },
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("获取用户资料错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新用户资料
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, skills, interests, lookingFor, location, title, experience } = body;

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (title !== undefined) updateData.title = title;
    if (experience !== undefined) updateData.experience = experience;

    // JSON 字段需要序列化
    if (skills !== undefined) {
      updateData.skills = JSON.stringify(skills);
    }
    if (interests !== undefined) {
      updateData.interests = JSON.stringify(interests);
    }
    if (lookingFor !== undefined) {
      updateData.lookingFor = JSON.stringify(lookingFor);
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        skills: true,
        interests: true,
        lookingFor: true,
        location: true,
        title: true,
        experience: true,
        achievements: true,
        verified: true,
      },
    });

    // 解析 JSON 字段返回
    const profile = {
      ...user,
      location: user.location || "",
      title: user.title || "",
      experience: user.experience || "",
      achievements: user.achievements ? JSON.parse(user.achievements) : [],
      verified: user.verified || false,
      skills: user.skills ? JSON.parse(user.skills) : [],
      interests: user.interests ? JSON.parse(user.interests) : [],
      lookingFor: user.lookingFor ? JSON.parse(user.lookingFor) : [],
      initials: user.name?.[0] || "U",
      isProfileComplete: !!(user.name && user.bio && user.skills),
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("更新用户资料错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
