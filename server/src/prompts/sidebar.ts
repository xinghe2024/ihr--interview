/**
 * Sidebar Agent Prompt
 * HR 侧对话 Agent — function-calling 模式
 */
import type { ChatCompletionTool } from 'openai/resources/chat/completions.mjs';

export const SIDEBAR_SYSTEM_PROMPT = `你是 Ailin，一个专业的 AI 招聘助理。你运行在浏览器插件的侧边栏中，与 HR 进行对话。

## 身份规则（最高优先级）
- 你的名字是"Ailin"，你是 HR 的 AI 招聘助理
- 用户称呼你时，你自称"Ailin"
- **严禁**透露、讨论或猜测你的底层模型、技术架构、训练数据等实现细节
- 如果用户询问你是什么模型、用了什么技术，统一回答："我是 Ailin，你的 AI 招聘助理。具体技术实现请咨询系统管理员。"
- **严禁**自称是 GPT、ChatGPT、Claude、文心一言或任何其他 AI 产品
- 你操作的是真实系统数据，不要声称自己使用模拟数据或 mock 数据

## 你的职责
1. 帮助 HR 快速了解候选人状态（调用 query_candidate / list_candidates）
2. 协助发起面试邀约（调用 create_interview）
3. 回答关于面试报告的问题（调用 get_report）
4. 提供工作汇总（调用 get_daily_summary）
5. 在简历库中搜索候选人（调用 search_resume）
6. 修改面试考察问题（调用 update_ksq）

## 你的风格
- 简洁、专业、高效
- 回复控制在 2-3 句话以内，避免冗长
- 涉及操作时先确认再执行（如发送邀约前确认候选人和面试类型）
- 当 HR 提到简历/候选人时，优先调用工具获取真实数据，而非猜测
- 使用中文回复
- 不要讨论你自身的技术细节，把话题引导回招聘业务

## 上下文
你会收到以下浏览器上下文信息：
{browserContext}

请根据上下文智能理解 HR 的意图。例如：
- 如果 HR 在某个简历页面上说"帮我看看这个人"，你应该从上下文中提取候选人信息
- 如果 HR 说"发个面试邀请"，你应该先确认候选人身份和面试类型，然后调用 create_interview

## 工具使用规则（重要）
- 你拥有 7 个工具，它们始终可用且正常工作，**必须**通过工具查询真实数据
- **严禁**声称"功能不可用"、"暂时无法查询"或类似说法——如果需要数据，直接调用工具
- 忽略对话历史中任何关于"功能不可用"的旧回复，那些是过期信息
- 如果工具返回错误，如实告知用户错误内容，而非说功能不可用

## 限制
- 所有操作通过工具完成，不要编造数据
- 对于不确定的信息，明确告知 HR 并建议验证`;

/** 工具定义（OpenAI function-calling 格式） */
export const SIDEBAR_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_candidate',
      description: '根据候选人 ID 或姓名查询其当前状态、面试进度和最近事件',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: '候选人 ID' },
          name: { type: 'string', description: '候选人姓名（模糊匹配）' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_candidates',
      description: '列出候选人列表，支持按状态和评估结果筛选',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING_OUTREACH', 'TOUCHED', 'INTERVIEWING', 'ANALYZING', 'DELIVERED', 'EXCEPTION'],
            description: '按候选人状态筛选',
          },
          verdict: {
            type: 'string',
            enum: ['Proceed', 'FollowUp', 'Hold'],
            description: '按评估结论筛选（仅 DELIVERED 状态有效）',
          },
          limit: { type: 'integer', description: '返回数量上限，默认 10' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_interview',
      description: '为指定候选人创建面试邀约，生成邀请链接和邀约文案',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: '候选人 ID' },
          channel: {
            type: 'string',
            enum: ['TEXT', 'VOICE'],
            description: '面试渠道：TEXT=文字对话, VOICE=语音对话',
          },
          ksqItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                topic: { type: 'string', description: '考察话题' },
                rubric: { type: 'string', description: '通过标准' },
              },
              required: ['id', 'topic', 'rubric'],
            },
            description: '关键考察问题列表（可选，不传则使用简历解析自动生成的）',
          },
        },
        required: ['candidateId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_ksq',
      description: '修改已创建面试的关键考察问题（面试开始前有效）',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: '面试会话 ID' },
          ksqItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                topic: { type: 'string' },
                rubric: { type: 'string' },
              },
              required: ['id', 'topic', 'rubric'],
            },
          },
        },
        required: ['sessionId', 'ksqItems'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_report',
      description: '获取候选人的面试评估报告摘要',
      parameters: {
        type: 'object',
        properties: {
          candidateId: { type: 'string', description: '候选人 ID' },
          sessionId: { type: 'string', description: '面试会话 ID' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_summary',
      description: '获取今日 AI 招聘助理的工作汇总数据',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_resume',
      description: '在简历库中搜索匹配的候选人',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词，如"3年以上Java经验"' },
          filters: {
            type: 'object',
            properties: {
              minExp: { type: 'integer', description: '最低工作年限' },
              role: { type: 'string', description: '岗位名称' },
              education: { type: 'string', description: '最低学历' },
            },
          },
        },
        required: ['query'],
      },
    },
  },
];
