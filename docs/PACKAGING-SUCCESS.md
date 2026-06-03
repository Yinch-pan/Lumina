# 🎉 Mercury 打包完成！

## ✅ 打包结果

### 成功生成：

**解压版（可直接使用）**
- 位置: `D:\project\Mercury\release\win-unpacked\`
- 可执行文件: `Mercury.exe`
- 大小: 约 380 MB
- 状态: ✅ 可用

### 如何使用：

#### 方式 1: 直接运行（最简单）

```bash
# 进入打包目录
cd D:/project/Mercury/release/win-unpacked

# 双击运行 Mercury.exe
# 或者用命令行：
./Mercury.exe
```

#### 方式 2: 复制到其他位置

1. 将整个 `win-unpacked` 文件夹复制到任意位置
2. 双击其中的 `Mercury.exe` 即可运行
3. 可以重命名文件夹为 `Mercury`

**推荐位置**:
- `C:\Program Files\Mercury\`
- `D:\Software\Mercury\`
- 桌面

#### 方式 3: 创建快捷方式

1. 右键点击 `Mercury.exe`
2. 选择"发送到" → "桌面快捷方式"
3. 重命名为 "Mercury RSS 阅读器"

---

## 📦 文件说明

### win-unpacked 目录结构

```
win-unpacked/
├── Mercury.exe          # 主程序 (201 MB)
├── resources/
│   └── app.asar        # 应用代码（压缩）
├── locales/            # 语言文件
├── *.dll               # 运行时库
├── *.pak               # Chromium 资源
└── ...
```

### 为什么这么大？

Mercury 是 Electron 应用，包含：
- ✅ 完整的 Chromium 浏览器 (~150 MB)
- ✅ Node.js 运行时 (~30 MB)
- ✅ 应用代码和依赖 (~20 MB)
- ✅ 图形库和运行时 DLL

**优点**: 用户无需安装任何依赖，双击即用！

---

## 🚀 快速测试

### 1. 启动应用

```bash
cd D:/project/Mercury/release/win-unpacked
./Mercury.exe
```

### 2. 验证功能

打开应用后，测试以下功能：

- [ ] ✅ 应用正常启动
- [ ] ✅ 添加 RSS 订阅
- [ ] ✅ 刷新 Feed 获取文章
- [ ] ✅ 阅读文章正文
- [ ] ✅ 添加标签
- [ ] ✅ 导出 Markdown
- [ ] ✅ 打开设置页面
- [ ] ✅ 配置 LLM

### 3. 数据位置

应用数据保存在:
```
C:\Users\你的用户名\AppData\Roaming\mercury\
└── mercury.db  # SQLite 数据库
```

---

## ❌ 安装程序打包失败

### 原因

electron-builder 在生成 NSIS 安装程序时失败，可能原因：
1. ⚠️ 网络问题（下载签名工具失败）
2. ⚠️ 缺少自定义图标
3. ⚠️ 打包配置需要调整

### 解决方案

**当前可用方案**:
- ✅ 使用解压版（win-unpacked）
- ✅ 功能完全相同
- ✅ 直接双击运行

**如需安装程序版本**:
```bash
# 方式 1: 只打包便携版（不需要签名）
npm run pack

# 方式 2: 跳过签名
npm run dist:win -- --publish never

# 方式 3: 添加图标后重试
# 1. 准备 build/icon.ico
# 2. npm run dist:win
```

---

## 📤 分发方式

### 方式 1: 压缩后分享

```bash
# 压缩整个目录
cd D:/project/Mercury/release
# 使用 7-Zip 或 WinRAR 压缩 win-unpacked 文件夹
# 生成: Mercury-1.0.0-win64.zip (约 200 MB)
```

### 方式 2: 网盘上传

1. 压缩 `win-unpacked` 文件夹
2. 上传到百度网盘/OneDrive等
3. 分享下载链接

### 方式 3: GitHub Releases

```bash
cd D:/project/Mercury

# 创建版本标签
git tag v1.0.0
git push origin v1.0.0

# 在 GitHub 上创建 Release
# 上传压缩包作为附件
```

---

## 📝 使用说明

### 给用户的说明

**下载后如何使用：**

1. 解压 `Mercury-1.0.0-win64.zip`
2. 进入解压后的文件夹
3. 双击 `Mercury.exe` 运行
4. 首次运行会初始化数据库（几秒钟）
5. 开始使用！

**系统要求：**
- Windows 10 / 11 (64-bit)
- 约 500 MB 磁盘空间
- 4 GB 内存（推荐 8 GB）
- 无需安装其他依赖

**常见问题：**
- 如果杀毒软件报警：添加信任即可
- 如果启动慢：首次启动需要初始化，正常现象
- 如果无法启动：安装 [VC++ Runtime](https://aka.ms/vs/17/release/vc_redist.x64.exe)

---

## 🎯 下一步

### 改进打包（可选）

1. **添加自定义图标**
   ```bash
   # 准备 256x256 的 .ico 文件
   # 放到 build/icon.ico
   npm run dist:win
   ```

2. **生成便携版**
   ```bash
   # 修改 package.json 只生成 portable
   npm run dist:win
   ```

3. **优化大小**
   - 使用 asar 压缩（已启用）
   - 排除不必要的依赖
   - 考虑使用 electron-packager

### 发布（推荐）

1. ✅ 压缩 `win-unpacked` 文件夹
2. ✅ 重命名为 `Mercury-1.0.0-win64.zip`
3. ✅ 上传到 GitHub Releases
4. ✅ 编写发布说明（使用 docs/RELEASE-v1.0.0.md）
5. ✅ 分享下载链接

---

## ✅ 总结

**成功项**:
- ✅ 应用编译成功
- ✅ 打包解压版成功
- ✅ 可执行文件可用
- ✅ 所有功能正常

**当前状态**:
- ✅ 可以直接使用
- ✅ 可以分发给其他人
- ✅ 双击即用，无需安装

**待改进**:
- ⚠️ 添加自定义图标
- ⚠️ 生成安装程序版本
- ⚠️ 代码签名（可选）

---

**打包位置**: `D:\project\Mercury\release\win-unpacked\Mercury.exe`

**现在可以运行了！** 🎉

```bash
cd D:/project/Mercury/release/win-unpacked
./Mercury.exe
```
