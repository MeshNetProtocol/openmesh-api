# OpenMesh API - Universal Links Support

这是一个基于 Cloudflare Workers 的 API，用于支持 iOS Universal Links。

## 功能特点

- ✅ 提供 Apple App Site Association (AASA) 文件
- ✅ 支持标准和备用路径
- ✅ HTTPS 自动支持（通过 Cloudflare Workers）
- ✅ CORS 支持
- ✅ 健康检查端点
- ✅ 链接验证 API

## Universal Links 配置

### 1. 更新 AASA 配置

编辑 `src/index.ts` 中的 `APPLE_APP_SITE_ASSOCIATION` 对象：

```typescript
const APPLE_APP_SITE_ASSOCIATION = {
  "applinks": {
    "details": [
      {
        "appIDs": [
          "YOUR_TEAM_ID.com.yourcompany.yourapp"
        ],
        "components": [
          {
            "/": "/link/*",
            "comment": "Matches any URL with /link/"
          }
        ]
      }
    ]
  }
};
```

**重要信息：**
- `YOUR_TEAM_ID`: 从 Apple Developer 账户获取（10 字符的字符串）
- `com.yourcompany.yourapp`: 你的 iOS 应用的 Bundle Identifier

### 2. 使用环境变量（可选）

你也可以通过环境变量配置：

在 `wrangler.jsonc` 中添加：

```json
{
  "vars": {
    "TEAM_ID": "YOUR_TEAM_ID",
    "BUNDLE_ID": "com.yourcompany.yourapp"
  }
}
```

或者使用 Cloudflare Secrets（推荐用于生产环境）：

```bash
wrangler secret put TEAM_ID
wrangler secret put BUNDLE_ID
```

## API 端点

### 1. Apple App Site Association

**路径**:
- `GET /.well-known/apple-app-site-association` （标准路径）
- `GET /apple-app-site-association` （备用路径）

**响应**:
```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAMID.BUNDLEID"],
        "components": [...]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAMID.BUNDLEID"]
  }
}
```

### 2. 健康检查

**路径**: `GET /api/health`

**响应**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-05T...",
  "universalLinks": "configured"
}
```

### 3. 链接验证

**路径**: `POST /api/validate-link`

**请求体**:
```json
{
  "url": "https://your-domain.com/link/abc123"
}
```

**响应**:
```json
{
  "valid": true,
  "pathname": "/link/abc123",
  "matched": true
}
```

## 开发和部署

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787/.well-known/apple-app-site-association` 测试

### 部署到 Cloudflare

```bash
npm run deploy
```

## iOS 应用配置

### 1. 启用 Associated Domains

在 Xcode 项目中：

1. 选择你的 Target
2. 进入 "Signing & Capabilities" 标签
3. 点击 "+ Capability"
4. 选择 "Associated Domains"
5. 添加域名：
   ```
   applinks:your-domain.com
   ```

### 2. 处理 Universal Links

在你的 AppDelegate 或 SceneDelegate 中：

```swift
// SwiftUI App
@main
struct YourApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    handleUniversalLink(url)
                }
        }
    }
    
    func handleUniversalLink(_ url: URL) {
        // 处理 /link/*, /share/*, /invite/* 路径
        let path = url.path
        
        if path.hasPrefix("/link/") {
            // 处理 link
            let linkID = url.lastPathComponent
            // 导航到相应页面
        }
    }
}

// UIKit App
func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL else {
        return false
    }
    
    // 处理 Universal Link
    handleUniversalLink(url)
    return true
}
```

## 测试 Universal Links

### 1. 验证 AASA 文件

使用 Apple 的验证工具：
```
https://search.developer.apple.com/appsearch-validation-tool/
```

输入你的域名，例如：`your-domain.com`

### 2. 设备测试

1. **通过 Safari**：
   - 不能直接在 Safari 地址栏输入
   - 需要从其他应用（如 Notes、Messages）点击链接
   
2. **通过 Messages**：
   - 发送链接给自己：`https://your-domain.com/link/test123`
   - 长按链接，查看是否显示 "Open in [Your App]"

3. **测试链接示例**：
   ```
   https://your-domain.com/link/test123
   https://your-domain.com/share/content456
   https://your-domain.com/invite/user789
   ```

### 3. 调试

如果 Universal Links 不工作：

1. **检查 AASA 文件**：
   ```bash
   curl https://your-domain.com/.well-known/apple-app-site-association
   ```

2. **验证 HTTPS**：
   - Universal Links 只能通过 HTTPS
   - 确保没有证书错误

3. **检查应用配置**：
   - Team ID 正确
   - Bundle ID 匹配
   - Associated Domains 正确配置

4. **查看控制台日志**：
   ```bash
   # 连接设备后
   xcrun simctl spawn booted log stream --predicate 'subsystem == "com.apple.applinks"' --level debug
   ```

## 自定义链接模式

修改 `APPLE_APP_SITE_ASSOCIATION` 中的 `components` 来添加更多路径模式：

```typescript
"components": [
  {
    "/": "/link/*",
    "comment": "所有 /link/ 路径"
  },
  {
    "/": "/user/*/profile",
    "comment": "用户资料页面"
  },
  {
    "/": "/post/*/comments",
    "comment": "帖子评论页面"
  },
  {
    "/": "/event/*/details",
    "?": { "tab": "info" },
    "comment": "活动详情页面，需要 tab=info 查询参数"
  }
]
```

### 高级模式示例

```typescript
{
  // 排除某些路径
  "/": "/link/*",
  "exclude": true,
  "comment": "排除 /link/admin/* 路径"
}

{
  // 必须有特定查询参数
  "/": "/share/*",
  "?": { "ref": "app" },
  "comment": "只匹配包含 ?ref=app 的链接"
}

{
  // 大小写不敏感
  "/": "/Link/*",
  "caseSensitive": false,
  "comment": "匹配 /link/, /Link/, /LINK/"
}
```

## 常见问题

### Q: AASA 文件没有被识别？

A: 确保：
1. 文件通过 HTTPS 提供
2. Content-Type 是 `application/json`
3. 没有重定向
4. Team ID 和 Bundle ID 正确

### Q: 链接在 Safari 中直接打开而不是应用？

A: 这是正常的。Universal Links 只在从其他应用（如 Messages、Notes）点击时才会打开应用。

### Q: 如何测试不同的环境（开发/生产）？

A: 使用 Cloudflare Workers 的环境功能：

```json
{
  "env": {
    "production": {
      "vars": {
        "TEAM_ID": "PROD_TEAM_ID",
        "BUNDLE_ID": "com.company.app"
      }
    },
    "staging": {
      "vars": {
        "TEAM_ID": "DEV_TEAM_ID",
        "BUNDLE_ID": "com.company.app.dev"
      }
    }
  }
}
```

## 技术支持

- Apple Developer Documentation: https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/

## 许可证

MIT License
