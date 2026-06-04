# Mercury 应用打包指南

## 快速开始

### Windows 打包（生成 .exe）

在 Windows 上运行：

```bash
# 方式 1: 打包为安装程序 + 便携版
npm run dist:win

# 方式 2: 仅打包不压缩（用于测试，速度快）
npm run pack
```

**输出文件：**
- `release/Mercury-1.0.0-x64.exe` - NSIS 安装程序（可选安装目录）
- `release/Mercury-1.0.0-Portable.exe` - 便携版（双击直接运行，无需安装）

### macOS 打包（生成 .app）

在 macOS 上运行：

```bash
npm run dist:mac
```

**输出文件：**
- `release/Mercury-1.0.0-x64.dmg` - DMG 安装镜像
- `release/Mercury-1.0.0-x64-mac.zip` - ZIP 压缩包

### Linux 打包

在 Linux 上运行：

```bash
npm run dist:linux
```

**输出文件：**
- `release/Mercury-1.0.0-x86_64.AppImage` - AppImage（双击运行）
- `release/Mercury-1.0.0-amd64.deb` - Debian 安装包

---

## 打包步骤详解

### 1. 准备工作

确保所有代码已编译：

```bash
# 编译前端
npm run build:renderer

# 编译主进程
npm run build:main

# 或者一起编译
npm run build
```

### 2. 选择打包命令

| 命令 | 用途 | 输出 |
|------|------|------|
| `npm run pack` | 快速测试打包（不压缩） | `release/win-unpacked/` 目录 |
| `npm run dist` | 打包当前平台 | 对应平台的安装包 |
| `npm run dist:win` | 打包 Windows 版本 | `.exe` 安装程序 + 便携版 |
| `npm run dist:mac` | 打包 macOS 版本 | `.dmg` + `.zip` |
| `npm run dist:linux` | 打包 Linux 版本 | `.AppImage` + `.deb` |

### 3. 运行打包

**Windows 打包（推荐使用便携版）：**

```bash
cd D:/project/Mercury

# 完整打包
npm run dist:win

# 打包过程需要 5-10 分钟，请耐心等待
# 完成后会在 release/ 目录生成文件
```

**快速测试打包（推荐用于开发测试）：**

```bash
npm run pack

# 输出在 release/win-unpacked/Mercury.exe
# 直接双击运行测试
```

---

## 打包配置说明

配置在 `package.json` 的 `build` 字段：

```json
{
  "build": {
    "appId": "com.mercury.rss",
    "productName": "Mercury",
    "directories": {
      "output": "release"
  },
    "files": [
      "dist/**/*",
      "package.json"
    ],
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

**关键配置：**
- `appId` - 应用唯一标识符
- `productName` - 应用显示名称
- `output` - 输出目录
- `files` - 要打包的文件
- `win.target` - Windows 打包目标（nsis 安装程序 + portable 便携版）

---

## 应用图标

### 当前状态
- ⚠️ 项目中暂无自定义图标
- 使用 Electron 默认图标

### 添加自定义图标

1. 准备图标文件：
   - **Windows**: `build/icon.ico` (256x256, .ico 格式)
   - **macOS**: `build/icon.icns` (.icns 格式)
   - **Linux**: `build/icon.png` (512x512, .png 格式)

2. 推荐工具：
   - [Icon Generator](https://www.favicon-generator.org/)
   - [CloudConvert](https://cloudconvert.com/) - 格式转换

3. 图标要求：
   - Windows: 256x256 像素，.ico 格式
   - macOS: 512x512 或 1024x1024，.icns 格式
   - Linux: 512x512 像素，.png 格式

---

## 常见问题

### Q1: 打包时报错 "Cannot find module 'xxx'"

**原因**: 依赖未安装或编译失败

**解决**:
```bash
# 重新安装依赖
npm install

# 重新编译原生模块
npx @electron/rebuild
```

### Q2: 打包的文件太大（几百 MB）

**原因**: Electron 和 Node.js 运行时包含在内

**说明**:
- 这是正常的，Electron 应用通常 100-300 MB
- 包含完整的 Chromium 浏览器和 Node.js 运行时
- 用户无需安装任何依赖

**优化**:
- 使用 `asar` 压缩（electron-builder 默认启用）
- 排除开发依赖
- 使用 `files` 字段精确控制打包文件

### Q3: Windows 打包后双击闪退

**可能原因**:
1. better-sqlite3 原生模块未正确编译
2. 缺少 VC++ 运行库

**解决**:
```bash
# 重新编译原生模块
npm run build
npx @electron/rebuild

# 重新打包
npm run dist:win
```

### Q4: macOS 提示"应用已损坏"

**原因**: 未签名的应用

**解决**:
- 开发测试：右键点击 → "打开"
- 生产环境：需要 Apple Developer 账号签名

### Q5: 便携版和安装版有什么区别？

**便携版 (Portable)**:
- ✅ 无需安装，双击即用
- ✅ 数据保存在应用目录
- ✅ 可放在 U 盘使用
- ❌ 不创建开始菜单快捷方式

**安装版 (NSIS)**:
- ✅ 正式安装到系统
- ✅ 创建桌面和开始菜单快捷方式
- ✅ 数据保存在用户目录（%APPDATA%）
- ✅ 支持自动更新

---

## 打包后的文件结构
### Windows 便携版

```
release/
└── Mercury-1.0.0-Portable.exe  (约 150-250 MB)
```

双击运行即可，数据保存在：
- Windows: `%APPDATA%/mercury/`

### Windows 安装版

```
release/
└── Mercury-1.0.0-x64.exe  (安装程序)

安装后位置：
C:\Program Files\Mercury\
├── Mercury.exe
├── resources/
│   └── app.asar (压缩的应用代码)
└── ...
```

### macOS

```
release/
├── Mercury-1.0.0-x64.dmg
└── Mercury-1.0.0-x64-mac.zip

应用位置：
/Applications/Mercury.app
```

---

## 测试打包后的应用

### 1. 测试便携版

```bash
# Windows
cd release
./Mercury-1.0.0-Portable.exe

# 或直接在文件管理器中双击
```

### 2. 测试安装版

1. 双击 `Mercury-1.0.0-x64.exe`
2. 选择安装目录
3. 完成安装
4. 从开始菜单或桌面快捷方式启动

### 3. 验证功能

安装后测试以下功能：
- ✅ 应用正常启动
- ✅ 添加 RSS 订阅
- ✅ 刷新 Feed
- ✅ 阅读文章
- ✅ 添加标签
- ✅ 导出 Markdown
- ✅ 配置 LLM 设置
- ✅ 重启后数据保留

---

## 分发

### 推荐分发方式

1. **GitHub Releases**
   ```bash
   # 创建新版本标签
   git tag v1.0.0
   git push origin v1.0.0
   
   # 上传到 GitHub Releases
   # 将 release/ 目录下的文件作为附件上传
   ```

2. **直接分享**
   - 便携版：直接分享 `.exe` 文件
   - 安装版：分享安装程序

3. **网站下载**
   - 上传到文件托管服务
   - 提供下载链接

### 版本号管理

修改 `package.json`:
```json
{
  "version": "1.0.0"  // 按需修改
}
```

版本号规则（语义化版本）：
- `1.0.0` - 主版本.次版本.修订号
- `1.0.1` - Bug 修复
- `1.1.0` - 新功能
- `2.0.0` - 重大更新

---

## 下一步

1. **现在就打包**:
   ```bash
   npm run dist:win
   ```

2. **测试打包结果**:
   - 找到 `release/Mercury-1.0.0-Portable.exe`
   - 双击运行
   - 验证所有功能

3. **添加自定义图标**（可选）

4. **发布到 GitHub Releases**（可选）

**祝打包顺利！** 🎉
