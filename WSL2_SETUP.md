# WSL2 Electron 开发环境设置指南

## 问题现象

```
error while loading shared libraries: libasound.so.2: cannot open shared object file: No such file or directory
```

## 原因

WSL2 默认是一个最小化的 Linux 环境，缺少 Electron/Chromium 运行所需的图形和音频库。

## 解决方案

### 步骤 1：安装系统依赖

在 WSL2 终端中运行：

```bash
sudo apt-get update && sudo apt-get install -y \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libnss3 \
  libnspr4 \
  libgtk-3-0 \
  libgdk-pixbuf2.0-0
```

### 步骤 2：配置 X11 显示（GUI 支持）

#### 方案 A：使用 WSLg（Windows 11 推荐）

如果你使用 **Windows 11**，WSLg 已内置 GUI 支持，无需额外配置。

检查 WSLg 是否可用：
```bash
echo $DISPLAY
# 应该输出类似：:0 或 :1
```

如果为空，更新 WSL：
```powershell
# 在 Windows PowerShell 中运行
wsl --update
wsl --shutdown
# 重新启动 WSL
```

#### 方案 B：使用 X Server（Windows 10）

1. **在 Windows 上安装 X Server**

   推荐 VcXsrv：
   - 下载：https://sourceforge.net/projects/vcxsrv/
   - 安装后启动 XLaunch
   - 配置：
     - Display settings: Multiple windows
     - Start no client
     - 勾选 "Disable access control"

2. **配置 WSL2 DISPLAY 变量**

   ```bash
   # 添加到 ~/.bashrc
   echo 'export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk "{print \$2}"):0' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **配置 Windows 防火墙**

   允许 VcXsrv 通过防火墙（首次启动时会提示）。

### 步骤 3：验证环境

```bash
# 检查 DISPLAY 变量
echo $DISPLAY

# 测试 X11（如果安装了 x11-apps）
sudo apt-get install -y x11-apps
xeyes
# 应该弹出一个眼睛窗口
```

### 步骤 4：运行 Mercury

```bash
cd /home/yinch/Projects/Mercury
./dev.sh
```

## 替代方案：无头模式开发

如果 GUI 配置困难，可以使用无头模式开发（仅开发 UI，不运行 Electron）：

```bash
# 只启动 Vite 开发服务器
npm run dev

# 在 Windows 浏览器中访问
# http://localhost:5173
```

然后在 Windows 浏览器中开发 UI，最后再配置 Electron 环境进行集成测试。

## 常见问题

### Q1: 安装依赖时提示权限不足

```bash
sudo apt-get update
# 输入你的 WSL 用户密码
```

### Q2: DISPLAY 变量设置后仍然无法显示

检查 X Server 是否在 Windows 上运行：
```powershell
# Windows PowerShell
Get-Process vcxsrv
```

### Q3: 防火墙阻止连接

在 Windows 防火墙中允许 VcXsrv：
- 控制面板 → Windows Defender 防火墙 → 允许应用通过防火墙
- 找到 VcXsrv，勾选"专用"和"公用"

### Q4: WSL2 IP 地址变化

WSL2 的 IP 地址每次重启会变化，使用 `$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')` 可以动态获取。

## 推荐开发方式

### 方式 1：完整 Electron 开发（需要 GUI）
- 适合：需要测试完整应用体验
- 要求：配置好 X11 显示

### 方式 2：浏览器开发 + 定期 Electron 测试
- 适合：主要开发 UI 界面
- 流程：
  1. `npm run dev` 启动 Vite
  2. 在 Windows 浏览器中开发
  3. 定期在 Electron 中测试

### 方式 3：Windows 原生开发
- 在 Windows 上安装 Node.js
- 直接在 Windows 中运行项目
- 无需 WSL2

## 检查清单

- [ ] 安装了所有系统依赖
- [ ] DISPLAY 变量已设置
- [ ] X Server 正在运行（Windows 10）或 WSLg 可用（Windows 11）
- [ ] 防火墙允许 X Server
- [ ] 可以运行 `xeyes` 测试

## 获取帮助

如果仍有问题，请提供：
1. Windows 版本（Win10/Win11）
2. WSL 版本：`wsl --version`
3. DISPLAY 变量：`echo $DISPLAY`
4. 错误信息完整输出
