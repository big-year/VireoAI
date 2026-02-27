import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

// 检查是否需要初始化（是否存在管理员）
export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: "admin" },
    });

    return NextResponse.json({
      needsSetup: adminCount === 0,
    });
  } catch (error) {
    console.error("检查初始化状态错误:", error);
    return NextResponse.json(
      { error: "检查失败" },
      { status: 500 }
    );
  }
}

// 创建初始管理员账号
export async function POST(request: NextRequest) {
  try {
    // 检查是否已有管理员
    const adminCount = await prisma.user.count({
      where: { role: "admin" },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "系统已初始化，无法重复设置" },
        { status: 403 }
      );
    }

    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码不能为空" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少6位" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // 如果用户已存在，将其升级为管理员
      await prisma.user.update({
        where: { email },
        data: { role: "admin" },
      });

      return NextResponse.json({
        message: "已将现有用户设置为管理员",
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员用户
    const user = await prisma.user.create({
      data: {
        name: name || "管理员",
        email,
        password: hashedPassword,
        role: "admin",
        emailVerified: new Date(), // 管理员默认已验证
      },
    });

    return NextResponse.json({
      message: "管理员账号创建成功",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("创建管理员错误:", error);
    return NextResponse.json(
      { error: "创建失败，请稍后重试" },
      { status: 500 }
    );
  }
}
