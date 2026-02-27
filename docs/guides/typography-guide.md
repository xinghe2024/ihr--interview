# iHR NEXUS 字体规范

> 所有页面开发必须遵守本规范，确保产品视觉一致性。

---

## 字号层级

| 层级 | 字号 | Tailwind | 用途 | 示例 |
|------|------|----------|------|------|
| **Display** | 24px | `text-2xl` | 页面大标题、数据面板数字 | 仪表盘统计卡 "12人" |
| **H1** | 20px | `text-xl` | 候选人姓名（速览卡内） | "张三" |
| **H2** | 16px | `text-[16px]` | 列表项名称、候选人姓名（列表行） | 仪表盘候选人列表 "张三" |
| **H3** | 15px | `text-[15px]` | 子标题、公司/项目名称 | "北京字节跳动科技有限公司" |
| **Body** | 14px | `text-sm` | 正文、简历描述、面试观察 | 简历工作经历描述文字 |
| **Body-S** | 13px | `text-[13px]` | 按钮文字、状态标签、追问建议、AI 结论引文 | "淘汰"、"通过"、"已交付" |
| **Caption** | 12px | `text-[12px]` | 辅助信息、时间戳、Tabs 标签、证据链引用 | NavBar Tabs、播放器时间 |
| **Micro** | 11px | `text-[11px]` | 表头、状态 badge 文字、元数据标签 | "✅ 通过"、"🚨 矛盾"、表格列标题 |

> [!CAUTION]
> **禁止使用 10px 及以下字号**。之前右侧证据链使用 9-10px 导致阅读困难，已全部修正。如有特殊需求（如装饰性元素），须经设计确认。

---

## 字重规范

| 字重 | Tailwind | 用途 |
|------|----------|------|
| **Extrabold (800)** | `font-extrabold` | 仅用于品牌标识、面板标题（如 "AI 初面录音"） |
| **Bold (700)** | `font-bold` | 标题、按钮文字、状态标签、章节标题 |
| **Semibold (600)** | `font-semibold` | 时间轴章节名称、次级强调 |
| **Medium (500)** | `font-medium` | 辅助标签（职位名称、时间范围） |
| **Normal (400)** | 默认 | 正文、描述文字 |

---

## 颜色规范

### 文字颜色

| 用途 | 颜色 | Tailwind |
|------|------|----------|
| 主文字 | #0f172a | `text-slate-900` |
| 次要文字 | #334155 | `text-slate-700` |
| 辅助文字 | #64748b | `text-slate-500` |
| 占位/禁用 | #94a3b8 | `text-slate-400` |
| 主色强调 | #4f46e5 | `text-indigo-600` |
| 危险/警告 | #be123c / #b45309 | `text-rose-700` / `text-amber-700` |
| 成功 | #059669 | `text-emerald-600` |

### 背景颜色

| 用途 | Tailwind |
|------|----------|
| 内容卡片 | `bg-white` |
| 页面背景 | 渐变（`from-indigo-100 via-white to-rose-50`） |
| 面板背景 | `bg-slate-50/90` |
| 输入框/浅灰区块 | `bg-slate-100` |

---

## 间距与行高

| 场景 | 行高 | Tailwind |
|------|------|----------|
| 标题 | 紧凑 | `leading-tight` |
| 正文/描述 | 宽松 | `leading-relaxed` |
| 短标签 | 紧凑 | `leading-snug` |

---

## 组件字号速查

### 导航栏 (NavBar)
- 返回按钮旁候选人名：`text-[13px] font-bold`
- Tab 标签：`text-[12px] font-bold`

### 速览卡 (Speed Card)
- 姓名：`text-xl font-bold`
- 职位：`text-[13px] text-slate-500 font-medium`
- 基础信息行：`text-[12px] text-slate-500`
- AI 结论标题：`text-[15px] font-bold`
- AI 结论引文：`text-[13px] text-slate-600`
- L1 匹配项：`text-[12px] text-slate-400`

### 追问建议
- 观察描述：`text-[13px] font-bold`
- 追问话术：`text-[13px] text-slate-700`
- 录音按钮：`text-[12px] font-bold`

### 简历正文
- 区块标题（工作经历）：`text-xs font-bold uppercase tracking-widest text-slate-400`
- 公司名：`text-[15px] font-bold`
- 时间范围：`text-[12px] font-mono text-slate-400`
- 职位/角色：`text-[13px] text-slate-500 font-medium`
- 经历描述：`text-sm (14px) text-slate-700`

### 右侧证据链 (Podcast Panel)
- 面板标题："AI 初面录音" `text-[12px] font-extrabold uppercase`
- 时长/时间：`text-[12px] font-mono text-slate-400`
- 播放器时间：`text-[11px] font-mono`
- 章节标题：`text-[13px] font-semibold`
- 状态标签：`text-[11px] font-bold`
- 观察描述（展开）：`text-[13px] text-slate-600`
- 引用原话（展开）：`text-[12px] text-slate-500 italic`
- 播放按钮：`text-[12px] font-bold`

### 底部决策栏
- 按钮文字：`text-[13px] font-bold`

### 仪表盘 (Dashboard)
- 候选人名：`text-[16px] font-bold`
- 职位/经验：`text-[13px] text-slate-500 font-medium`
- 进展描述：`text-[14px] text-slate-600 font-medium`
- 状态标签：`text-[13px] font-bold`
- 操作按钮：`text-[13px] font-bold`
- 表头：`text-[11px] font-bold uppercase tracking-wider`
- 筛选 Tab：`text-[13px] font-bold`

---

## 等宽字体 (Monospace)

使用 `font-mono` 的场景：
- 时间戳（如 `08:20`、`2021.03 - 至今`）
- ID 标识（如 `ID: 4`）
- Token 消耗数字

> [!IMPORTANT]
> 不要在正文或标题中使用等宽字体，仅限于数据型标签。

---

## 禁止事项

1. ❌ 不使用 `text-[9px]` 或 `text-[10px]`
2. ❌ 不在同一层级的元素中使用超过 2 种字号
3. ❌ 不在正文中使用 `font-extrabold`
4. ❌ 不使用浏览器默认字体，统一使用系统 sans-serif 栈
5. ❌ 不使用内联 `style` 设置字号，统一使用 Tailwind class
