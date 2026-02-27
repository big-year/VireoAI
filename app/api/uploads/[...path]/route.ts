import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// 支持的图片 MIME 类型
const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join("/");

    // 安全检查：防止路径遍历攻击
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return NextResponse.json({ error: "无效路径" }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), "public", "uploads", filePath);

    // 检查文件是否存在
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    // 获取文件扩展名
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = mimeTypes[ext];

    if (!mimeType) {
      return NextResponse.json({ error: "不支持的文件类型" }, { status: 400 });
    }

    // 读取文件
    const fileBuffer = await readFile(fullPath);

    // 返回图片
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("读取文件错误:", error);
    return NextResponse.json({ error: "读取文件失败" }, { status: 500 });
  }
}
