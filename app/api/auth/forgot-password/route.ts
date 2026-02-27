import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { getEmailSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
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

    // 即使用户不存在也返回成功，防止邮箱枚举攻击
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // 生成重置令牌
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1小时后过期

    // 删除旧的重置令牌
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // 保存令牌到数据库
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // 检查邮件服务是否配置
    const emailSettings = await getEmailSettings();
    if (emailSettings.smtpHost && emailSettings.smtpUser) {
      // 发送重置密码邮件
      const sent = await sendPasswordResetEmail(email, token, user.name || undefined);
      if (!sent) {
        console.error("发送重置密码邮件失败");
        // 不返回错误，避免泄露信息
      }
    } else {
      // 邮件服务未配置，仅在控制台输出
      console.log(`[邮件服务未配置] Password reset link: /reset-password?token=${token}&email=${email}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("忘记密码错误:", error);
    return NextResponse.json(
      { error: "发送失败" },
      { status: 500 }
    );
  }
}
