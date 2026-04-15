# GratefulCo MVP — 感恩花园设计规格

**版本：** 1.0  
**日期：** 2026-04-15  
**范围：** MVP，无用户系统，个人使用

---

## 1. 产品定位

一个把感恩记录变成生长花园的 Web 应用。每条记录自动分类，在花园里种下对应的植物。花园是历史，历史是花园——不惩罚缺席，不强制打卡。

访问 URL 即可使用，无需注册登录。

---

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite + TypeScript |
| 样式 | Tailwind CSS |
| 后端 | Vercel Serverless Functions（API Routes）|
| 数据库 | Supabase PostgreSQL |
| 部署 | Vercel |
| 植物渲染 | 内联 SVG（程序生成）|

---

## 3. 数据模型

### 表：`entries`

```sql
CREATE TABLE entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body        text NOT NULL CHECK (char_length(body) BETWEEN 3 AND 280),
  category    text NOT NULL DEFAULT 'default',
  plant_type  text NOT NULL,
  plant_stage int  NOT NULL DEFAULT 1 CHECK (plant_stage IN (1, 2, 3)),
  grid_x      int  NOT NULL,
  grid_y      int  NOT NULL,
  local_date  date NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX entries_created ON entries(created_at DESC);
CREATE INDEX entries_local_date ON entries(local_date);
CREATE UNIQUE INDEX entries_grid_pos ON entries(grid_x, grid_y);
```

**字段说明：**
- `category`：枚举值 `people | health | work | moments | nature | learning | default`
- `plant_type`：类别内的具体植物变体（如 `rose`, `tulip`, `sunflower`）
- `plant_stage`：1=嫩芽，2=幼苗，3=盛放（由该类别累计记录数决定）
- `grid_x / grid_y`：在 24×24 花园网格中的坐标，从中心 (12,12) 向外分配
- `local_date`：写入时的本地日期（用于按天分组）

---

## 4. 分类系统

关键词匹配，优先级从上到下，首个匹配的类别胜出：

| 类别 | 关键词（中英文） | 植物类型 | 视觉特征 |
|------|----------------|---------|---------|
| `people` | 朋友、家人、妈妈、爸爸、老师、同事、friend, mom, family | 鲜花（玫瑰/郁金香/向日葵）| 暖色花朵 |
| `health` | 身体、睡眠、运动、吃、食物、健康、sleep, exercise, food | 绿叶植物（蕨类/阔叶）| 郁郁葱葱 |
| `work` | 工作、项目、完成、升职、学校、考试、work, project, done | 乔木（橡树/竹子/松树）| 高大挺拔 |
| `moments` | 咖啡、阳光、笑、小事、天气、music, coffee, sunshine | 香草/蘑菇（薰衣草/薄荷/伞菇）| 小巧精灵 |
| `nature` | 天空、海、雨、山、树、自然、sky, ocean, rain, forest | 野花（罂粟/雏菊）| 草甸散落 |
| `learning` | 读、学、发现、意识、书、think, learn, realize | 多肉（仙人掌/芦荟）| 几何感 |
| `default` | 未匹配 | 混合野花 | 随机 |

**植物阶段计算：**
- 同类别累计 1–2 条 → `plant_stage = 1`（嫩芽）
- 同类别累计 3–9 条 → `plant_stage = 2`（幼苗）
- 同类别累计 10+ 条 → `plant_stage = 3`（盛放）

---

## 5. REST API

所有端点前缀 `/api/v1`，响应格式统一：

```json
{ "data": { ... }, "error": null }
// 错误时：
{ "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
```

### 5.1 记录

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/entries` | 创建记录，服务端分类 + 分配坐标 |
| `DELETE` | `/api/v1/entries/:id` | 删除记录（硬删除，坐标释放）|

**POST 请求体：**
```json
{ "body": "今天阳光很好", "localDate": "2026-04-15" }
```

**POST 响应：**
```json
{
  "data": {
    "id": "uuid",
    "body": "今天阳光很好",
    "category": "moments",
    "plantType": "lavender",
    "plantStage": 2,
    "gridX": 12,
    "gridY": 11,
    "localDate": "2026-04-15",
    "createdAt": "2026-04-15T08:00:00Z"
  }
}
```

### 5.2 花园

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/garden` | 获取所有植物（仅视觉字段）|
| `GET` | `/api/v1/garden?from=YYYY-MM-DD&to=YYYY-MM-DD` | 按日期范围过滤 |

**GET 响应：**
```json
{
  "data": {
    "plants": [
      {
        "entryId": "uuid",
        "x": 12, "y": 11,
        "category": "moments",
        "plantType": "lavender",
        "plantStage": 2,
        "body": "今天阳光很好",
        "localDate": "2026-04-15"
      }
    ],
    "total": 42
  }
}
```

---

## 6. 前端组件结构

```
App
├── GardenView（主视图，默认）
│   ├── GardenCanvas（SVG 花园，24×24 网格）
│   │   └── Plant × N（SVG 植物，可点击）
│   ├── PlantPopup（点击植物弹出，显示记录内容）
│   ├── MonthFilter（底部时间轴，按月高亮）
│   └── AddButton（右下角 + 按钮，固定）
├── EntryModal（写记录全屏弹窗）
│   ├── Textarea（280字限制，自动获焦）
│   ├── PlantPreview（实时预览将种下的植物）
│   └── SubmitButton（「种下去」）
└── BottomNav（今天 / 花园，移动端底部固定）
```

**状态管理：** React useState + useEffect，无需引入状态库。

---

## 7. 花园渲染

- **视角：** 纯 2D 俯视（SVG），不做 2.5D 等距（降低 MVP 复杂度）
- **网格：** 24×24，单元格 40px，花园总尺寸 960×960px
- **坐标分配：** 螺旋算法从中心 (12,12) 向外找最近空格
- **植物：** 内联 SVG，每种植物 3 个阶段对应 3 套路径，共约 7×3=21 个 SVG 变体
- **交互：** 点击植物 → 弹出浮动卡片显示记录；双指/滚轮缩放；拖拽平移
- **历史高亮：** 选中月份外的植物透明度降至 30%，选中月份植物正常显示

---

## 8. 移动端 / PWA

- 最大内容宽度 `100vw`，无固定最大宽度
- 底部导航固定，拇指友好
- 在 `public/manifest.json` 配置 PWA，支持「添加到主屏幕」
- 无离线支持（v1），所有操作需要网络

---

## 9. 部署

- **Vercel：** 连接 GitHub 仓库，自动 CI/CD
- **Supabase：** 免费计划，手动执行建表 SQL
- **环境变量：**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`（仅服务端）

---

## 10. MVP 范围外

- 用户登录 / 多用户
- AI 每周洞察
- 时光胶囊
- 推送通知
- 搜索
- 2.5D 等距渲染
- 深色模式
- 离线支持
