import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "验证令牌不能为空" },
        { status: 400 }
      );
    }

    // 查找验证令牌
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "无效的验证链接" },
        { status: 400 }
      );
    }

    // 检查是否过期
    if (verificationToken.expires < new Date()) {
      // 删除过期的令牌
      await prisma.verificationToken.delete({
        where: { token },
      });

      return NextResponse.json(
        { error: "验证链接已过期，请重新注册或申请新的验证邮件" },
        { status: 400 }
      );
    }

    // 更新用户的 emailVerified 字段
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 更新用户验证状态
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    // 删除已使用的验证令牌
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({
      success: true,
      message: "邮箱验证成功，现在可以登录了",
    });
  } catch (error) {
    console.error("邮箱验证错误:", error);
    return NextResponse.json(
      { error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// 重新发送验证邮件
export async function PUT(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "邮箱不能为空" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "邮箱已验证，无需重复验证" },
        { status: 400 }
      );
    }

    // 检查是否有现有的令牌，以及是否在60秒冷却期内
    const existingToken = await prisma.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: "desc" },
    });

    if (existingToken) {
      // 计算令牌创建时间（过期时间 - 24小时）
      const tokenCreatedAt = new Date(existingToken.expires.getTime() - 24 * 60 * 60 * 1000);
      const timeSinceCreation = Date.now() - tokenCreatedAt.getTime();
      const cooldownMs = 60 * 1000; // 60秒冷却

      if (timeSinceCreation < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceCreation) / 1000);
        return NextResponse.json(
          { error: `请等待 ${remainingSeconds} 秒后再重新发送` },
          { status: 429 }
        );
      }

      // 删除旧的验证令牌
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });
    }

    // 生成新的验证令牌
    const crypto = await import("crypto");
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: verificationExpires,
      },
    });

    // 发送验证邮件
    const { sendVerificationEmail } = await import("@/lib/email");
    const emailSent = await sendVerificationEmail(email, verificationToken, user.name || undefined);

    if (!emailSent) {
      return NextResponse.json(
        { error: "发送验证邮件失败，请检查邮件服务配置" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "验证邮件已发送，请查收",
    });
  } catch (error) {
    console.error("重发验证邮件错误:", error);
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}
