# 角色宇宙 · AI Character Chat

与 220+ AI 角色实时对话的网页应用。每位角色有独立的性格、表达方式和知识偏好。

## 页面截图

### 角色广场

![角色广场](home-page.png)

### 聊天页

![聊天页](chat-page.png)

## 技术栈

| 层     | 技术                               |
| ------ | ---------------------------------- |
| 前端   | React 19 + TypeScript + Vite       |
| 后端   | Express 5 + TypeScript             |
| 数据库 | SQLite（通过 Sequelize ORM）       |
| AI     | LangChain + LangGraph + OpenRouter |
| 包管理 | npm Workspaces（monorepo）         |

## 项目结构

```
ai-chat/
├── client/             # React 前端
│   └── src/
│       ├── components/ # Avatar, Sidebar, MessageBubble ...
│       ├── pages/      # ChatPage, HistoryPage
│       ├── api.ts      # 后端 API 调用
│       └── styles.css  # 全局样式
├── server/             # Express 后端
│   └── src/
│       ├── ai/         # LangChain AI 回复逻辑
│       ├── characters.ts
│       ├── conversations.ts
│       ├── database.ts
│       └── seed.ts     # 220 个预设角色
└── package.json        # 根 workspace 配置
```

## 快速开始

### 1. 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9

### 2. 克隆并安装

```bash
git clone <repo-url> ai-chat
cd ai-chat
npm install
```

### 3. 配置 API Key

在项目根目录创建 `.env` 文件：

```env
PORT=3001
OPENROUTER_API_KEY=你的_openrouter_api_key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=deepseek/deepseek-v4-flash
```

> 去 [openrouter.ai](https://openrouter.ai/) 注册账号获取免费 API Key。`.env` 文件不会被提交到 git。

### 4. 启动开发

```bash
npm run dev
```

一条命令同时启动前后端：

| 服务     | 地址                  |
| -------- | --------------------- |
| 前端页面 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |

前端 Vite 会自动将 `/api` 请求代理到后端，无需额外配置。

### 5. 打开浏览器

访问 **http://localhost:5173** 即可看到角色广场，点击任意角色开始聊天。

## 常用命令

```bash
# 同时启动前后端
npm run dev

# 只启动前端
npm run dev:client

# 只启动后端
npm run dev:server

# 运行测试
npm test -w client
npm test -w server

# 构建生产版本
npm run build
```

## 页面说明

| 页面     | 功能                                         |
| -------- | -------------------------------------------- |
| 角色广场 | 浏览 220 个 AI 角色，分页加载                |
| 聊天页   | 与角色实时对话，支持 Markdown 渲染和流式输出 |
| 聊天历史 | 查看所有聊过的角色，点击继续对话             |

## API 文档

基础地址：`http://localhost:3001`

### 角色

#### `GET /api/characters`

分页获取角色列表。

**Query Parameters**

| 参数       | 类型   | 默认值 | 说明               |
| ---------- | ------ | ------ | ------------------ |
| `page`     | number | 1      | 页码（从 1 开始）  |
| `pageSize` | number | 24     | 每页数量（上限60） |

**Response** `200`

```json
{
  "items": [
    {
      "id": 1,
      "name": "知心姐姐",
      "description": "温暖细腻的知心大姐姐，擅长倾听和共情。",
      "avatarColor": "#7257ff",
      "avatarUrl": null,
      "greeting": "嗨，今天心情怎么样？",
      "createdAt": "1970-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 24,
  "total": 220,
  "hasMore": true
}
```

#### `GET /api/characters/:id`

获取单个角色详情。

**Response** `200` — 角色对象同上。

**Response** `404`

```json
{ "error": "Character not found" }
```

---

### 对话

对话消息围绕一个角色编号 (`characterId`) 组织。

#### `POST /api/conversations/:characterId/ensure-greeting`

初始化对话（幂等）。首次调用创建开场白，重复调用返回已有消息。

**Response** `200` — `Message[]`

```json
[
  {
    "id": 1,
    "characterId": 31,
    "role": "assistant",
    "content": "咔嚓！刚才那一瞬间太美了。你平时喜欢拍什么题材？",
    "createdAt": "2026-06-25T12:00:00.000Z"
  }
]
```

**Response** `404` — 角色不存在。

#### `GET /api/conversations/:characterId/messages`

获取某个对话的全部消息。

**Response** `200` — `Message[]`

#### `POST /api/conversations/:characterId/messages`

发送用户消息（不触发 AI 回复）。

**Request Body**

```json
{ "content": "你好，很高兴认识你" }
```

**Response** `201` — 创建的 `Message` 对象。

**Response** `400`

```json
{ "error": "Message content is required" }
```

#### `POST /api/conversations/:characterId/stream`

发送用户消息并以 **SSE（Server-Sent Events）** 流式返回 AI 回复。

**Request Body**

```json
{ "content": "你好" }
```

**Response** `200` — `Content-Type: text/event-stream`

```
data: {"token":"你"}
data: {"token":"好"}
data: {"token":"！"}
data: [DONE]
```

每条 `data:` 行是一个 JSON 对象，可能包含：

| 字段     | 类型   | 说明                  |
| -------- | ------ | --------------------- |
| `token`  | string | 流式输出的单个 token  |
| `error`  | string | 出错时返回错误信息    |
| `[DONE]` | —      | 流结束信号（非 JSON） |

#### `DELETE /api/conversations/:characterId`

清空某个对话的所有消息。

**Response** `204` — No Content。

---

### 聊天历史

#### `GET /api/conversations`

列出所有有过对话的角色，按最近消息排序。

**Response** `200`

```json
[
  {
    "character": {
      "id": 42,
      "name": "真话篓子",
      "description": "嘴上没把门的，有啥说啥。",
      "avatarColor": "#1da1f2",
      "avatarUrl": null,
      "greeting": "我说句实话你别不爱听啊...",
      "createdAt": "1970-01-01T00:00:00.000Z"
    },
    "latestMessage": {
      "id": 42,
      "characterId": 42,
      "role": "user",
      "content": "今天怎么样？",
      "createdAt": "2026-06-25T12:30:00.000Z"
    }
  }
]
```

---

### 健康检查

#### `GET /api/health`

```json
{ "ok": true, "service": "ai-character-chat-server" }
```

---

## AI 配置

默认使用 OpenRouter 的 `deepseek/deepseek-v4-flash` 模型。可以在 `.env` 中修改 `AI_MODEL` 切换模型，例如：

```env
AI_MODEL=openai/gpt-4o
AI_MODEL=anthropic/claude-sonnet-4-6
```

支持所有 [OpenRouter 上的模型](https://openrouter.ai/models)。

## 开发约定

- **一次只做一件事**，拆成小闭环完成
- 写业务代码前先写测试
- 每完成一步停下来 review

---

Made with ❤️
