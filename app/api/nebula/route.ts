import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取公开创意列表（星云）
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = searchParams.get("sort") || "hot"; // hot, recent, rising
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");

    const where: {
      isPublic: boolean;
      user?: { emailVerified: { not: null } };
      tags?: { contains: string };
      OR?: Array<{ title?: { contains: string }; description?: { contains: string } }>;
    } = {
      isPublic: true,
      // 只显示已验证邮箱用户的创意
      user: { emailVerified: { not: null } },
    };

    if (tag) {
      where.tags = { contains: tag };
    }

    // 搜索功能
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // 排序逻辑
    let orderBy: { likes?: "desc"; createdAt?: "desc" } = {};
    if (sort === "hot" || sort === "likes") {
      orderBy = { likes: "desc" };
    } else if (sort === "recent") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "rising") {
      // 最近7天内点赞最多
      orderBy = { likes: "desc" };
    }

    // 支持 offset 或 page 分页
    const skip = offset > 0 ? offset : (page - 1) * limit;

    const [ideas, total] = await Promise.all([
      prisma.idea.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              ideaComments: true,
              collaborators: true,
            },
          },
        },
      }),
      prisma.idea.count({ where }),
    ]);

    // 检查当前用户是否点赞
    let userLikes: string[] = [];
    if (session?.user?.id) {
      const likes = await prisma.ideaLike.findMany({
        where: {
          userId: session.user.id,
          ideaId: { in: ideas.map((i) => i.id) },
        },
        select: { ideaId: true },
      });
      userLikes = likes.map((l) => l.ideaId);
    }

    return NextResponse.json({
      ideas: ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        tags: JSON.parse(idea.tags),
        score: idea.score,
        likes: idea.likes,
        comments: idea._count.ideaComments,
        collaborators: idea._count.collaborators,
        createdAt: idea.createdAt,
        author: {
          id: idea.user.id,
          name: idea.user.name,
          image: idea.user.image,
          initials: idea.user.name?.[0] || "U",
        },
        isLiked: userLikes.includes(idea.id),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取星云创意错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 发布创意到星云（设为公开）
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { ideaId } = await request.json();

    if (!ideaId) {
      return NextResponse.json({ error: "创意 ID 不能为空" }, { status: 400 });
    }

    // 检查创意是否属于当前用户
    const idea = await prisma.idea.findFirst({
      where: { id: ideaId, userId: session.user.id },
    });

    if (!idea) {
      return NextResponse.json({ error: "创意不存在" }, { status: 404 });
    }

    // 设为公开
    const updatedIdea = await prisma.idea.update({
      where: { id: ideaId },
      data: { isPublic: true },
    });

    // 检查是否已有群组，没有则创建
    const existingGroup = await prisma.ideaGroup.findUnique({
      where: { ideaId },
    });

    if (!existingGroup) {
      // 创建群组并将作者加入
      await prisma.ideaGroup.create({
        data: {
          ideaId,
          name: `${idea.title} 协作群`,
          members: {
            create: {
              userId: session.user.id,
              role: "owner",
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      idea: {
        ...updatedIdea,
        tags: JSON.parse(updatedIdea.tags),
      },
    });
  } catch (error) {
    console.error("发布创意错误:", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}

// 取消发布创意（设为私有）
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("ideaId");

    if (!ideaId) {
      return NextResponse.json({ error: "创意 ID 不能为空" }, { status: 400 });
    }

    // 检查创意是否属于当前用户
    const idea = await prisma.idea.findFirst({
      where: { id: ideaId, userId: session.user.id },
    });

    if (!idea) {
      return NextResponse.json({ error: "创意不存在" }, { status: 404 });
    }

    // 设为私有
    const updatedIdea = await prisma.idea.update({
      where: { id: ideaId },
      data: { isPublic: false },
    });

    return NextResponse.json({
      success: true,
      idea: {
        ...updatedIdea,
        tags: JSON.parse(updatedIdea.tags),
      },
    });
  } catch (error) {
    console.error("取消发布创意错误:", error);
    return NextResponse.json({ error: "取消发布失败" }, { status: 500 });
  }
}
