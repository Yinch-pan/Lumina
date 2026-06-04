# Mercury RSS 阅读器 - Windows 便携版

## 快速开始

### 安装和运行

**便携版（推荐）：**
1. 解压 `Mercury-1.0.0-Portable.exe` 或直接双击运行
2. 首次运行会创建数据目录
3. 开始使用！

**安装版：**
1. 双击 `Mercury-1.0.0-x64.exe` 
2. 选择安装目录
3. 完成安装
4. 从桌面或开始菜单启动

### 数据存储位置

**Windows**:
- 数据库: `%APPDATA%\mercury\mercury.db`
- 配置文件: `%APPDATA%\mercury\`

**实际路径**: `C:\Users\你的用户名\AppData\Roaming\mercury\`

---

## 功能特性

### ✅ 已实现功能

#### 模块 A: 订阅与数据管理
- ✅ RSS/Atom Feed 订阅
- ✅ OPML 导入/导出
- ✅ Feed 刷新和同步
- ✅ 文章去重
- ✅ 已读/未读状态管理

#### 模块 B: 内容清洗与阅读
- ✅ HTML 内容清洗
- ✅ Markdown 转换
- ✅ Reader View 渲染
- ✅ 清晰的阅读界面

#### 模块 C: AI 功能（需配置）
- ⚠️ AI 摘要（需配置 LLM）
- ⚠️ AI 翻译（需配置 LLM）

#### 模块 D: 标签、导出与设置
- ✅ 文章标签管理
- ✅ Markdown 导出
- ✅ LLM 配置
- ✅ 阅读设置

---

## 使用指南

### 1. 添加订阅源

1. 点击左侧边栏的 **"+"** 按钮
2. 输入 RSS Feed URL
3. 点击"添加"
4. 自动刷新获取文章

**示例 RSS 源：**
- Hacker News: `https://news.ycombinator.com/rss`
- 阮一峰的网络日志: `http://www.ruanyifeng.com/blog/atom.xml`
- GitHub Trending: `https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml`

### 2. 导入 OPML

如果你有其他 RSS 阅读器的订阅列表：

1. 点击左侧边栏的 **"导入"** 按钮
2. 选择 `.opml` 文件
3. 选择要导入的订阅源
4. 点击"导入选中的订阅"

### 3. 阅读文章

1. 在左侧选择订阅源
2. 在中间选择文章
3. 右侧显示文章正文
4. 自动标记为已读

### 4. 添加标签

1. 打开一篇文章
2. 点击右侧的 **"🏷️ 添加标签"** 按钮
3. 输入标签名称
4. 标签会显示在文章详情中

### 5. 导出 Markdown

1. 打开要导出的文章
2. 点击右侧的 **"📤 导出"** 按钮
3. 选择保存位置
4. 文件包含：标题、元信息、标签、正文

### 6. 配置 AI 功能（可选）

1. 点击顶部的 **"⚙️"** 设置按钮
2. 在"大语言模型配置"区域填写：
   - **Base URL**: 你的 AI API 地址（例如 `https://api.openai.com/v1`）
   - **API Key**: 你的 API 密钥
   - **Model**: 模型名称（例如 `gpt-4`）
3. 点击"保存 LLM 配置"

**支持的 API：**
- OpenAI
- Azure OpenAI
- OpenAI 兼容接口（本地模型、其他云服务）

---

## 快捷键

| 快捷键 | 功能 |
|----|------|
| `Ctrl+R` | 刷新当前页面 |
| `Ctrl+Shift+I` | 打开开发者工具 |
| `Ctrl+W` | 关闭窗口 |

---

## 常见问题

### Q: 应用无法启动？

**A**: 可能缺少 VC++ 运行库
- 下载并安装 [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### Q: 订阅源添加失败？

**A**: 检查：
- URL 是否正确
- 网络连接是否正常
- 该网站是否提供 RSS Feed

### Q: 文章正文显示空白？

**A**: 
- 等待几秒让内容加载
- 某些网站可能阻止内容抓取
- 点击"查看原文"在浏览器中打开

### Q: AI 功能不可用？

**A**: 
1. 确认已在设置中配置 LLM
2. 检查 API Key 是否有效
3. 检查网络连接
4. 查看控制台错误信息（`Ctrl+Shift+I`）

### Q: 数据如何备份？

**A**: 
- 导出 OPML：保存订阅列表
- 复制数据库文件：`%APPDATA%\mercury\mercury.db`
- 恢复时放回原位置即可

### Q: 如何卸载？

**便携版**:
- 直接删除 `Mercury.exe`
- 手动删除数据目录（如需清理数据）

**安装版**:
- 控制面板 → 程序和功能 → 卸载 Mercury
- 手动删除数据目录（如需清理数据）

---

## 技术规格

- **框架**: Electron 38.8.6
- **前端**: Vue 3 + TypeScript
- **数据库**: SQLite (better-sqlite3)
- **打包大小**: ~200 MB（包含完整运行时）
- **平台支持**: Windows 10/11 (x64)

---

## 开发团队

Mercury 是一个开源项目，由 8 人团队开发：

- **模块 A（订阅与数据）**: 陆锦云、颜泽宇
- **模块 B（清洗与阅读）**: 于海洋、刘昊阳
- **模块 C（AI 功能）**: 林宇轩、孙佳杰
- **模块 D（标签、导出、设置）**: 潘飞扬、张震

---

## 反馈与支持

- **GitHub**: https://github.com/Yinch-pan/Mercury
- **Issues**: https://github.com/Yinch-pan/Mercury/issues

---

## 许可证

ISC License

---

**祝阅读愉快！** 📚✨
