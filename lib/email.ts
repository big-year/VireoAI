import nodemailer from "nodemailer";
import { getEmailSettings, getSetting } from "@/lib/settings";

// 获取站点URL，优先使用环境变量
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

// 邮件发送选项
interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

// 创建邮件传输器
async function createTransporter() {
  const emailSettings = await getEmailSettings();

  if (!emailSettings.smtpHost || !emailSettings.smtpUser) {
    return null;
  }

  return nodemailer.createTransport({
    host: emailSettings.smtpHost,
    port: emailSettings.smtpPort || 587,
    secure: emailSettings.smtpSecure || false,
    auth: {
      user: emailSettings.smtpUser,
      pass: emailSettings.smtpPassword,
    },
  });
}

// 发送邮件
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  try {
    const transporter = await createTransporter();

    if (!transporter) {
      console.error("邮件服务未配置");
      return false;
    }

    const emailSettings = await getEmailSettings();
    const siteName = await getSetting("general.siteName", "Vireo AI");

    await transporter.sendMail({
      from: `"${emailSettings.smtpFromName || siteName}" <${emailSettings.smtpFrom || emailSettings.smtpUser}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error("发送邮件失败:", error);
    return false;
  }
}

// 发送密码重置邮件
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName?: string
): Promise<boolean> {
  const siteName = await getSetting("general.siteName", "Vireo AI");
  const siteUrl = getAppUrl();

  const resetUrl = siteUrl
    ? `${siteUrl}/reset-password?token=${resetToken}`
    : `/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        .warning { color: #666; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #8b5cf6; margin: 0;">${siteName}</h1>
        </div>
        <div class="content">
          <p>你好${userName ? ` ${userName}` : ""}，</p>
          <p>我们收到了重置你账户密码的请求。点击下面的按钮来设置新密码：</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">重置密码</a>
          </p>
          <p>或者复制以下链接到浏览器：</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p class="warning">
            如果你没有请求重置密码，请忽略此邮件。此链接将在1小时后失效。
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: `[${siteName}] 重置密码`,
    html,
    text: `你好${userName ? ` ${userName}` : ""}，\n\n我们收到了重置你账户密码的请求。请访问以下链接来设置新密码：\n\n${resetUrl}\n\n如果你没有请求重置密码，请忽略此邮件。此链接将在1小时后失效。\n\n${siteName}`,
  });
}

// 发送欢迎邮件
export async function sendWelcomeEmail(
  email: string,
  userName?: string
): Promise<boolean> {
  const siteName = await getSetting("general.siteName", "Vireo AI");
  const siteUrl = getAppUrl();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        .feature { padding: 10px 0; }
        .feature-icon { display: inline-block; width: 24px; height: 24px; margin-right: 10px; vertical-align: middle; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #8b5cf6; margin: 0;">${siteName}</h1>
        </div>
        <div class="content">
          <p>你好${userName ? ` ${userName}` : ""}，</p>
          <p>欢迎加入 ${siteName}！我们很高兴你成为我们社区的一员。</p>
          <p>在这里，你可以：</p>
          <div class="feature">✨ 使用 AI 生成创业点子</div>
          <div class="feature">📊 自动分析市场和生成商业画布</div>
          <div class="feature">🧠 与 AI 智囊团专家对话</div>
          <div class="feature">🤝 发现并匹配创业合伙人</div>
          <p style="text-align: center;">
            <a href="${siteUrl || '/'}" class="button">开始探索</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: `欢迎加入 ${siteName}！`,
    html,
    text: `你好${userName ? ` ${userName}` : ""}，\n\n欢迎加入 ${siteName}！我们很高兴你成为我们社区的一员。\n\n在这里，你可以：\n- 使用 AI 生成创业点子\n- 自动分析市场和生成商业画布\n- 与 AI 智囊团专家对话\n- 发现并匹配创业合伙人\n\n${siteName}`,
  });
}

// 发送系统通知邮件
export async function sendNotificationEmail(
  email: string,
  title: string,
  content: string,
  link?: string
): Promise<boolean> {
  const siteName = await getSetting("general.siteName", "Vireo AI");
  const siteUrl = getAppUrl();

  const fullLink = link ? (link.startsWith("http") ? link : `${siteUrl}${link}`) : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #8b5cf6; margin: 0;">${siteName}</h1>
        </div>
        <div class="content">
          <h2>${title}</h2>
          <p>${content}</p>
          ${fullLink ? `<p style="text-align: center;"><a href="${fullLink}" class="button">查看详情</a></p>` : ""}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: `[${siteName}] ${title}`,
    html,
    text: `${title}\n\n${content}${fullLink ? `\n\n查看详情: ${fullLink}` : ""}\n\n${siteName}`,
  });
}

// 测试SMTP连接
export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await createTransporter();

    if (!transporter) {
      return { success: false, error: "邮件服务未配置" };
    }

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "连接失败" };
  }
}

// 发送邮箱验证邮件
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  userName?: string
): Promise<boolean> {
  const siteName = await getSetting("general.siteName", "Vireo AI");
  const siteUrl = getAppUrl();

  const verifyUrl = siteUrl
    ? `${siteUrl}/verify-email?token=${verificationToken}`
    : `/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
        .content { padding: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        .warning { color: #666; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #8b5cf6; margin: 0;">${siteName}</h1>
        </div>
        <div class="content">
          <p>你好${userName ? ` ${userName}` : ""}，</p>
          <p>感谢你注册 ${siteName}！请点击下面的按钮验证你的邮箱地址：</p>
          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">验证邮箱</a>
          </p>
          <p>或者复制以下链接到浏览器：</p>
          <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          <p class="warning">
            如果你没有注册账户，请忽略此邮件。此链接将在24小时后失效。
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: `[${siteName}] 验证你的邮箱`,
    html,
    text: `你好${userName ? ` ${userName}` : ""}，\n\n感谢你注册 ${siteName}！请访问以下链接验证你的邮箱地址：\n\n${verifyUrl}\n\n如果你没有注册账户，请忽略此邮件。此链接将在24小时后失效。\n\n${siteName}`,
  });
}
