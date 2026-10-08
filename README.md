# 沿途公交 · BusTrack

React + Vite + Capacitor 7 Android 项目，应用名称为「沿途公交」，Android 包名为 `com.bustrack.app`。

本文说明从 GitHub 下载源码后，如何在 Windows 上构建可直接安装的自用 APK。仓库已包含 Android 工程，**不要重复执行 `cap add android`**。

## 1. 准备环境

| 工具 | 当前项目要求 |
| --- | --- |
| Node.js / npm | 建议 Node.js 22，安装 Node 时一并安装 npm；Capacitor 7 最低要求 Node 20 |
| JDK | **21**，`JAVA_HOME` 指向 JDK 根目录，不能指向 `bin` |
| Android SDK Platform | Android 15 / **API 35** |
| Android SDK Build-Tools | **34.0.0**（Android Gradle Plugin 8.7 的默认版本） |
| Android SDK Platform-Tools | 安装；其中的 adb 可用于安装 APK |
| Gradle | 项目自带 Wrapper 配置，自动下载 **8.11.1**，无需全局安装 |
| Android Gradle Plugin | 项目已配置 **8.7.2**，无需另行安装 |

可以通过 Android Studio 的 SDK Manager 安装上述 SDK 组件；在 SDK Tools 中勾选「Show Package Details」后选择 Build-Tools 34.0.0。安装时按提示接受所需 SDK 许可。使用 Android Studio 打开项目时，请将 Gradle JDK 也设置为 JDK 21。

首次构建需要联网下载 npm、Gradle、Google Maven 和 Maven Central 依赖。公交服务是否可连接，不影响 APK 编译。

在 PowerShell 中设置当前终端使用的路径。**将下面两个示例路径替换为你实际安装的位置**：

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

node --version
npm.cmd --version
java -version
Test-Path "$env:ANDROID_HOME\platforms\android-35\android.jar"
Test-Path "$env:ANDROID_HOME\build-tools\34.0.0\aapt2.exe"
```

后两项应返回 `True`。这些环境变量只对当前 PowerShell 窗口生效；下次打开终端需重新设置，或自行保存到系统环境变量。若 `android/local.properties` 已存在，其中的 `sdk.dir` 也必须指向本机正确的 SDK 目录；不要沿用其他电脑的路径。

## 2. 构建可安装的 APK

下载并解压仓库，在**包含 `package.json` 的项目根目录**打开 PowerShell。不要只下载 `src` 或 `android` 文件夹。

依次执行，每一步成功后再执行下一步：

```powershell
# 按 package-lock.json 安装固定版本的依赖
npm.cmd ci

# 构建 React 前端，并复制到 Android 工程、生成 Capacitor 配置
npm.cmd run android:sync

# 使用项目自带的 Gradle Wrapper 构建 APK
Set-Location android
.\gradlew.bat assembleDebug
```

看到 `BUILD SUCCESSFUL` 后，安装包位于项目根目录下的：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

这是**自动使用调试密钥签名的 debug APK**，可以复制到手机安装，最低支持 Android 6.0（API 23）。不需要自己创建密钥，也不需要单独运行签名命令。此流程不生成正式发布签名包。

安装完成后，App 内的网页资源来自 APK，**不需要保持 Vite 开发服务器运行**；查询公交数据仍需要网络。

如需用 USB 安装，在手机打开 USB 调试、连接电脑并确认授权后，从 `android` 目录执行：

```powershell
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

不同电脑生成的调试密钥可能不同。若覆盖安装报签名不一致，需要使用原签名，或先卸载旧版再安装；卸载会清除应用本地数据。

## 3. 修改代码后重新打包

回到项目根目录，重新执行：

```powershell
npm.cmd run android:sync
Set-Location android
.\gradlew.bat assembleDebug
```

不要跳过同步，否则 APK 可能仍包含旧页面。只有依赖或锁文件发生变化时，才需要先重新执行 `npm.cmd ci`。

也可以在完成 `android:sync` 后，于根目录执行 `npm.cmd run android:open`，用 Android Studio 打开现有工程并构建。无需升级项目的 Gradle 或 AGP 版本。

## 4. 上传到 GitHub

需要保留以下源码和配置，包括以点开头的文件：

```text
src/
android/                       # 保留原生工程源码，排除下面列出的生成文件
  .gitignore
  app/build.gradle
  app/capacitor.build.gradle
  app/src/main/                # Manifest、MainActivity 和 res 资源
  gradle/wrapper/
    gradle-wrapper.jar        # 必须上传，不要遗漏这个二进制文件
    gradle-wrapper.properties
  gradlew
  gradlew.bat
  build.gradle
  settings.gradle
  capacitor.settings.gradle
  variables.gradle
  gradle.properties
.gitignore
capacitor.config.json
index.html
package.json
package-lock.json             # 必须上传，供 npm ci 使用
vite.config.js
README.md
LICENSE
```

不要上传：`node_modules/`、`dist/`、`.git/`、`.idea/`、`.env*`、APK、签名密钥，以及 Android 中的以下本机或生成内容：

- `.gradle/`、各级 `build/`、`local.properties`。
- `capacitor-cordova-android-plugins/`。
- `app/src/main/assets/public/`。
- `app/src/main/assets/capacitor.config.json`、`capacitor.plugins.json`。
- `app/src/main/res/xml/config.xml`。

后四项中的 Capacitor 文件由 `npm.cmd run android:sync` 自动生成，不能因为源码仓库中没有它们就跳过同步步骤。保留工程内对 Capacitor 模块的关联配置。

**GitHub 网页拖拽上传不会自动按 `.gitignore` 排除文件**，请按上述范围选择文件。使用 Git 或 GitHub Desktop 提交时则会应用忽略规则。上传源码不会自动生成 APK；本仓库没有配置 GitHub Actions 打包流程。

## 5. 常见构建问题

| 提示 | 检查方式 |
| --- | --- |
| `npm.ps1 cannot be loaded` | 使用本文的 `npm.cmd` 命令，无需修改 PowerShell 执行策略 |
| `JAVA_HOME` 无效 / `invalid source release: 21` | 确认 JDK 21 路径正确；命令行和 Android Studio 的 Gradle JDK 都使用 21 |
| `SDK location not found` | 配置 `ANDROID_HOME`，或在 Android Studio 中设置本机 SDK 路径 |
| 找不到 `android-35` / `34.0.0` | 用 SDK Manager 安装 API 35 和 Build-Tools 34.0.0，并完成许可确认 |
| 找不到 Capacitor 模块或网页资源 | 回到根目录执行 `npm.cmd ci`，成功后执行 `npm.cmd run android:sync` |
| Gradle 下载超时 / `Connection reset` | 检查当前网络或代理是否允许访问依赖服务器，然后重试同一构建命令；不是公交接口错误 |

## 数据与验证范围

应用默认直接连接 `wss://bus.specialstardream.site`，使用第三方返回数据，没有内置模拟车辆。接收时间不等于车辆定位时间；空车辆列表不等于正式停运。当前无需额外配置 API Key。

如需更换兼容后端，可在根目录创建 `.env.local` 并设置 `VITE_BUS_WS_URL`，之后重新同步并打包。Vite 环境变量会编入前端，不可用于保存秘密。

已完成前端生产构建和 Capacitor Android 资源同步；Android 配置按下列官方文档及项目依赖核对。**尚未完成 APK 编译和真机验证**，最终结果以你本机的 `BUILD SUCCESSFUL` 和安装测试为准。

参考：[Capacitor 7 环境与版本要求](https://capacitorjs.com/docs/v7/updating/7-0)、[AGP 8.7 兼容性](https://developer.android.com/build/releases/agp-8-7-0-release-notes)、[Android 命令行构建 APK](https://developer.android.com/build/building-cmdline)。

## 界面与数据源扩展

首页支持按方向收藏、最近查看（最多 12 个方向）和起终点搜索。收藏与历史仅保存在本机，清除应用数据后会丢失；不会持久保存实时车辆数量。当前仅开放大连昌赫客运，大连主城区与南京显示为暂未接入。

源码分工：
- src/RouteLibrary.jsx：线路列表、收藏、最近查看。
- src/RegionPicker.jsx：城市及运营范围入口。
- src/providers.js：城市、范围、数据源标识与能力配置。
- src/useBus.js：昌赫 WebSocket 协议与连接生命周期。
- src/main.jsx：线路详情、站点与完整车辆信息。

新增数据源时，先验证一条线路的两个方向，再实现协议适配、线路及车辆字段转换，以及切换来源时的连接清理。当前详情仍使用昌赫字段，本次拆分不是完整的通用多数据源实现。不能只将地区配置的 available 改为 true：选择器还需绑定新数据源状态及请求逻辑。

收藏、缓存标识包含数据源、城市、线路、方向，避免编号冲突。缺失的车辆 ID、坐标、预计到站时间保持缺失；定位时间和接收时间分开处理，上地图前确认坐标系。保密密钥或上游签名应由自己的后端处理。
