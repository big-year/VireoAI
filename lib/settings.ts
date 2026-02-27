import prisma from "@/lib/prisma";

// 系统设置类型定义
export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
  };
  ai: {
    defaultGenerateCount: number;
    maxTokens: number;
    temperature: number;
    enableStreaming: boolean;
  };
  user: {
    allowRegistration: boolean;
    defaultRole: string;
    requireEmailVerification: boolean;
    maxIdeasPerDay: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpFrom: string;
    smtpFromName: string;
    smtpSecure: boolean;
  };
}

// 默认设置
export const defaultSettings: SystemSettings = {
  general: {
    siteName: "Vireo AI",
    siteDescription: "AI驱动的创意生成与创业者社交平台",
    siteUrl: "",
  },
  ai: {
    defaultGenerateCount: 3,
    maxTokens: 4096,
    temperature: 0.7,
    enableStreaming: true,
  },
  user: {
    allowRegistration: true,
    defaultRole: "user",
    requireEmailVerification: false,
    maxIdeasPerDay: 10,
  },
  email: {
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
    smtpFromName: "Vireo AI",
    smtpSecure: false,
  },
};

// 解析设置值
function parseValue(value: string, type: string): unknown {
  switch (type) {
    case "number":
      return parseFloat(value);
    case "boolean":
      return value === "true";
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

// 获取所有系统设置
export async function getAllSettings(): Promise<SystemSettings> {
  try {
    const settings = await prisma.systemSetting.findMany();

    const result: Record<string, Record<string, unknown>> = {
      general: { ...defaultSettings.general },
      ai: { ...defaultSettings.ai },
      user: { ...defaultSettings.user },
      email: { ...defaultSettings.email },
    };

    settings.forEach((setting) => {
      // 解析 key，格式为 "group.key" 或直接 "key"
      const parts = setting.key.split(".");
      const group = parts.length > 1 ? parts[0] : setting.group;
      const key = parts.length > 1 ? parts[1] : setting.key;

      if (result[group]) {
        result[group][key] = parseValue(setting.value, setting.type);
      }
    });

    return result as unknown as SystemSettings;
  } catch (error) {
    console.error("获取系统设置失败:", error);
    return defaultSettings;
  }
}

// 获取单个设置值
export async function getSetting<T = string>(key: string, defaultValue?: T): Promise<T> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return defaultValue as T;
    }

    return parseValue(setting.value, setting.type) as T;
  } catch (error) {
    console.error(`获取设置 ${key} 失败:`, error);
    return defaultValue as T;
  }
}

// 获取某个分组的所有设置
export async function getSettingsByGroup<T = Record<string, unknown>>(group: string): Promise<T> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        OR: [
          { group },
          { key: { startsWith: `${group}.` } },
        ],
      },
    });

    const defaults = (defaultSettings as unknown as Record<string, Record<string, unknown>>)[group] || {};
    const result: Record<string, unknown> = { ...defaults };

    settings.forEach((setting) => {
      const parts = setting.key.split(".");
      const key = parts.length > 1 ? parts[1] : setting.key;
      result[key] = parseValue(setting.value, setting.type);
    });

    return result as T;
  } catch (error) {
    console.error(`获取设置组 ${group} 失败:`, error);
    return (defaultSettings as unknown as Record<string, unknown>)[group] as T;
  }
}

// 设置单个值
export async function setSetting(
  key: string,
  value: unknown,
  options?: { type?: string; group?: string; label?: string }
): Promise<boolean> {
  try {
    const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
    const type = options?.type || (typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string");

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: {
        key,
        value: stringValue,
        type,
        group: options?.group || "general",
        label: options?.label,
      },
    });

    return true;
  } catch (error) {
    console.error(`设置 ${key} 失败:`, error);
    return false;
  }
}

// 快捷方法：获取用户设置
export async function getUserSettings() {
  return getSettingsByGroup<SystemSettings["user"]>("user");
}

// 快捷方法：获取AI设置
export async function getAISettings() {
  return getSettingsByGroup<SystemSettings["ai"]>("ai");
}

// 快捷方法：获取邮件设置
export async function getEmailSettings() {
  return getSettingsByGroup<SystemSettings["email"]>("email");
}

// 快捷方法：检查是否允许注册
export async function isRegistrationAllowed(): Promise<boolean> {
  const settings = await getUserSettings();
  return settings.allowRegistration !== false;
}

// 快捷方法：检查是否需要邮箱验证
export async function isEmailVerificationRequired(): Promise<boolean> {
  const settings = await getUserSettings();
  return settings.requireEmailVerification === true;
}
