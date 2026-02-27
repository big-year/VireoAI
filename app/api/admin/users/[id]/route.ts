import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 检查管理员权限
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "未登录", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, id: true },
  });

  if (user?.role !== "admin") {
    return { error: "无权限", status: 403 };
  }

  return { user: session.user, adminId: user.id };
}

// 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        skills: true,
        interests: true,
        lookingFor: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ideas: true,
            projects: true,
            conversations: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        ideasCount: user._count.ideas,
        projectsCount: user._count.projects,
        conversationsCount: user._count.conversations,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error("获取用户详情错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { id } = await params;
    const { role, name } = await request.json();

    // 不能修改自己的角色
    if (adminCheck.adminId === id && role) {
      return NextResponse.json(
        { error: "不能修改自己的角色" },
        { status: 400 }
      );
    }

    const updateData: { role?: string; name?: string } = {};
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("更新用户错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { id } = await params;

    // 不能删除自己
    if (adminCheck.adminId === id) {
      return NextResponse.json({ error: "不能删除自己" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除用户错误:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
