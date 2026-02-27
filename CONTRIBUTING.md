# 贡献指南

感谢你对 VireoAI 的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请在 [Issues](https://github.com/yourusername/vireoai/issues) 中创建一个新的 Issue，并包含以下信息：

- Bug 的详细描述
- 复现步骤
- 期望的行为
- 实际的行为
- 截图（如果有）
- 环境信息（操作系统、浏览器、Node.js 版本等）

### 提交功能建议

如果你有新功能的想法，欢迎在 Issues 中提出。请描述：

- 功能的详细说明
- 为什么需要这个功能
- 可能的实现方案

### 提交代码

1. **Fork 项目**

   点击右上角的 Fork 按钮，将项目 Fork 到你的账号下。

2. **克隆到本地**

   ```bash
   git clone https://github.com/你的用户名/vireoai.git
   cd vireoai
   ```

3. **创建分支**

   ```bash
   git checkout -b feature/你的功能名称
   # 或
   git checkout -b fix/你要修复的bug
   ```

4. **安装依赖**

   ```bash
   pnpm install
   ```

5. **进行开发**

   确保你的代码：
   - 遵循项目的代码风格
   - 通过 ESLint 检查
   - 有适当的注释

6. **提交更改**

   ```bash
   git add .
   git commit -m "feat: 添加了某某功能"
   ```

   提交信息请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
   - `feat`: 新功能
   - `fix`: Bug 修复
   - `docs`: 文档更新
   - `style`: 代码格式（不影响代码运行的变动）
   - `refactor`: 重构（既不是新增功能，也不是修复 Bug）
   - `perf`: 性能优化
   - `test`: 测试相关
   - `chore`: 构建过程或辅助工具的变动

7. **推送到远程**

   ```bash
   git push origin feature/你的功能名称
   ```

8. **创建 Pull Request**

   在 GitHub 上创建 Pull Request，描述你的更改内容。

## 开发规范

### 代码风格

- 使用 TypeScript
- 使用 ESLint 进行代码检查
- 组件使用函数式组件 + Hooks
- 使用 Tailwind CSS 进行样式编写

### 目录结构

- `app/` - 页面和 API 路由
- `components/` - React 组件
- `lib/` - 工具函数和配置
- `prisma/` - 数据库模型

### 命名规范

- 组件文件：PascalCase（如 `UserCard.tsx`）
- 工具函数文件：kebab-case（如 `format-date.ts`）
- API 路由：kebab-case（如 `api/user-profile/route.ts`）

## 本地开发

### 环境准备

1. 安装 Node.js 18+
2. 安装 PostgreSQL 14+
3. 复制 `.env.example` 为 `.env` 并配置

### 数据库

```bash
# 推送数据库结构
npx prisma db push

# 初始化数据
npm run init

# 查看数据库
npm run db:studio
```

### 运行开发服务器

```bash
npm run dev
```

## 问题反馈

如果你有任何问题，可以：

- 在 Issues 中提问
- 发送邮件至 contact@vireoai.app

## 行为准则

请尊重所有贡献者，保持友善和专业的交流态度。

再次感谢你的贡献！🎉
