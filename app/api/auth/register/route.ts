import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { isRegistrationAllowed, getUserSettings } from "@/lib/settings";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    // 检查是否允许注册
    const allowRegistration = await isRegistrationAllowed();
    if (!allowRegistration) {
      return NextResponse.json(
        { error: "系统暂不开放注册" },
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

    // 获取用户设置
    const userSettings = await getUserSettings();

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // 如果需要邮箱验证，且用户未验证，允许覆盖注册
      if (userSettings.requireEmailVerification && !existingUser.emailVerified) {
        // 删除旧的未验证用户和相关令牌
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });
        await prisma.user.delete({
          where: { id: existingUser.id },
        });
      } else {
        return NextResponse.json(
          { error: "该邮箱已被注册" },
          { status: 400 }
        );
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 如果需要邮箱验证，生成验证令牌
    let verificationToken: string | null = null;
    let verificationExpires: Date | null = null;

    if (userSettings.requireEmailVerification) {
      verificationToken = crypto.randomBytes(32).toString("hex");
      verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userSettings.defaultRole || "user",
        // 如果需要验证，emailVerified 保持为 null
        emailVerified: userSettings.requireEmailVerification ? null : new Date(),
      },
    });

    // 如果需要邮箱验证，保存验证令牌并发送邮件
    if (userSettings.requireEmailVerification && verificationToken && verificationExpires) {
      // 保存验证令牌到 VerificationToken 表
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: verificationExpires,
        },
      });

      // 发送验证邮件
      const emailSent = await sendVerificationEmail(email, verificationToken, name);

      if (!emailSent) {
        console.error("发送验证邮件失败");
      }

      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        requireVerification: true,
        message: "注册成功，请查收验证邮件并完成邮箱验证",
      });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      requireVerification: false,
      message: "注册成功",
    });
  } catch (error) {
    console.error("注册错误:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
