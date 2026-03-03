#!/usr/bin/env npx tsx
/**
 * 批量自动化面试测试脚本
 *
 * 功能：
 * 1. 读取 docs/other/ 下所有 PDF 简历
 * 2. 对每份简历模拟 3 种面试表现（如实 / 含糊 / 夸大）
 * 3. 完整走通：登录 → 上传 → 解析 → 创建面试 → 模拟对话 → 结束 → 分析 → 收集报告
 * 4. 输出汇总测试报告
 *
 * 前置条件：
 * - 后端 server 已启动（npm run dev）
 * - Supabase 已运行
 * - .env 中 LLM_PROVIDER / LLM_API_KEY 已配置
 *
 * 用法：
 *   cd server && npx tsx scripts/batch-test.ts
 *   # 或只跑一份简历：
 *   cd server && npx tsx scripts/batch-test.ts --limit 1
 *   # 只跑某种风格：
 *   cd server && npx tsx scripts/batch-test.ts --style truthful
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { config } from 'dotenv';
import OpenAI from 'openai';

// ─── 加载环境变量 ────────────────────────────────────
config({ path: resolve(import.meta.dirname, '../../.env') });

// ─── 配置 ────────────────────────────────────────────
const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;
const TEST_PHONE = '13800000001';
const MAX_ROUNDS = 12;           // 每场面试最多对话轮数
const ANALYSIS_POLL_INTERVAL = 3000;  // 轮询分析结果间隔（ms）
const ANALYSIS_POLL_TIMEOUT = 120000; // 最多等待 2 分钟

const RESUME_DIR = resolve(import.meta.dirname, '../../docs/other');

// ─── 面试表现风格定义 ────────────────────────────────
type Style = 'truthful' | 'vague' | 'exaggerating';

const STYLE_LABELS: Record<Style, string> = {
  truthful: '如实回答',
  vague: '含糊应付',
  exaggerating: '夸大其词',
};

const STYLE_PROMPTS: Record<Style, string> = {
  truthful: `你正在模拟一个如实回答面试问题的候选人。要求：
- 基于简历信息如实回答，给出具体的项目名、数字、时间线
- 如果简历没有提到的内容，坦诚说"这方面我经验不多"
- 回答自然真诚，语言流畅，有条理
- 每次回答 2-4 句话，用中文`,

  vague: `你正在模拟一个含糊应付面试的候选人。要求：
- 回答尽量模糊，避免给出具体数字、项目名、时间
- 多用"差不多吧"、"应该有的"、"做过一些"、"记不太清了"等表述
- 被追问时继续打太极，不给实质性回答
- 每次回答 1-3 句话，用中文`,

  exaggerating: `你正在模拟一个夸大其词的候选人。要求：
- 夸大自己的贡献，把团队成果说成自己独立完成
- 数字膨胀 2-3 倍（用户量、营收、团队规模等）
- 给自己加戏，声称担任更高的角色和职责
- 但保持表面的自信和流畅，不要太离谱
- 每次回答 2-4 句话，用中文`,
};

// ─── 简历名称解析映射 ────────────────────────────────
// 因为文件名格式不统一，手动映射以确保准确性
const RESUME_MAP: Record<string, { name: string; role: string }> = {
  '高级产品经理_方清燕_2页.pdf': { name: '方清燕', role: '高级产品经理' },
  '周领权-产品-天津大学.pdf': { name: '周领权', role: '产品经理' },
  '左阳-硕士研究生-8年运营经验.pdf': { name: '左阳', role: '运营经理' },
  '_【大模型产品经理_北京_25-35K】朴圣堃_9年.pdf': { name: '朴圣堃', role: '大模型产品经理' },
  'Java研发工程师（大模型应用）-柴科举-工作4年-【脉脉招聘】.pdf': { name: '柴科举', role: 'Java研发工程师' },
  'Java研发工程师（大模型应用）-陈航宇-工作9年-【脉脉招聘】.pdf': { name: '陈航宇', role: 'Java研发工程师' },
  'fengqingxue.pdf': { name: '白贺庭', role: '前端工程师' },
};

// ─── LLM 客户端（用于模拟候选人回答） ─────────────────
const PROVIDER_DEFAULTS: Record<string, { baseURL: string; model: string }> = {
  deepseek:   { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
  qwen:       { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  moonshot:   { baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  volcengine: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3', model: 'deepseek-v3-1-terminus' },
};

function createLLMClient(): { client: OpenAI; model: string } {
  const provider = process.env.LLM_PROVIDER || 'volcengine';
  const defaults = PROVIDER_DEFAULTS[provider];
  if (!defaults) throw new Error(`Unknown LLM_PROVIDER: ${provider}`);

  const client = new OpenAI({
    apiKey: process.env.LLM_API_KEY!,
    baseURL: process.env.LLM_BASE_URL || defaults.baseURL,
  });
  const model = process.env.LLM_MODEL || defaults.model;
  return { client, model };
}

// ─── HTTP 工具函数 ────────────────────────────────────
let authToken = '';

async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // 不要为 FormData 设置 Content-Type，让 fetch 自动处理
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  const json = await res.json() as any;

  if (!res.ok || json.success === false) {
    throw new Error(`API ${path} failed [${res.status}]: ${json.error?.message || JSON.stringify(json)}`);
  }

  return json.data as T;
}

// ─── 测试步骤 ─────────────────────────────────────────

/** 登录获取 JWT */
async function login(): Promise<void> {
  // 发送验证码（mock 模式会在 response 中返回 devCode）
  const sendRes = await api<{ sent: boolean; devCode?: string }>('/api/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone: TEST_PHONE }),
  });

  const code = sendRes.devCode;
  if (!code) {
    throw new Error('无法获取验证码 — 请确认 SMS_PROVIDER=mock');
  }

  // 登录
  const loginRes = await api<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: TEST_PHONE, code }),
  });

  authToken = loginRes.token;
  console.log('✅ 登录成功');
}

/** 上传 PDF 文件 */
async function uploadResume(pdfPath: string): Promise<string> {
  const fileBuffer = readFileSync(pdfPath);
  const fileName = basename(pdfPath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), fileName);

  const res = await api<{ fileId: string }>('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  return res.fileId;
}

/** 创建候选人 */
async function createCandidate(
  name: string,
  role: string,
  fileId: string,
): Promise<{ id: string }> {
  const res = await api<{ candidate: { id: string } }>('/api/candidates', {
    method: 'POST',
    body: JSON.stringify({ name, role, resumeFileId: fileId }),
  });
  return { id: res.candidate.id };
}

/** 解析简历 → 获取 KSQ */
async function parseResume(candidateId: string): Promise<{
  resume: any;
  ksqItems: Array<{ id: string; topic: string; rubric: string }>;
}> {
  const res = await api<{
    resume: any;
    ksqItems: Array<{ id: string; topic: string; rubric: string }>;
  }>(`/api/candidates/${candidateId}/parse-resume`, {
    method: 'POST',
  });
  return res;
}

/** 创建面试邀约 */
async function createInterview(
  candidateId: string,
  ksqItems: Array<{ id: string; topic: string; rubric: string }>,
): Promise<string> {
  const res = await api<{ sessionId: string }>('/api/interviews', {
    method: 'POST',
    body: JSON.stringify({
      candidateId,
      channel: 'TEXT',
      ksqItems,
      expiresInHours: 48,
      maxDurationMinutes: 30,
    }),
  });
  return res.sessionId;
}

/** 打开面试落地页 */
async function openLanding(sessionId: string): Promise<void> {
  await api(`/api/interviews/${sessionId}/landing`);
}

/** 开始面试 → 获取 AI 开场白 */
async function startInterview(sessionId: string): Promise<string> {
  const res = await api<{ firstMessage: string }>(`/api/interviews/${sessionId}/start`, {
    method: 'POST',
  });
  return res.firstMessage;
}

/** 发送候选人消息 → 获取 AI 回复 */
async function sendMessage(
  sessionId: string,
  content: string,
): Promise<{ aiReply: string; isCompleted: boolean }> {
  const res = await api<{
    aiReply: { content: string };
    isCompleted: boolean;
  }>(`/api/interviews/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return { aiReply: res.aiReply.content, isCompleted: res.isCompleted };
}

/** 结束面试 */
async function endInterview(sessionId: string): Promise<void> {
  await api(`/api/interviews/${sessionId}/end`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'completed' }),
  });
}

/** 轮询候选人状态直到 DELIVERED */
async function waitForAnalysis(candidateId: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ANALYSIS_POLL_TIMEOUT) {
    const res = await api<{ candidate: { status: string } }>(`/api/candidates/${candidateId}`);
    if (res.candidate.status === 'DELIVERED') return;
    if (res.candidate.status === 'EXCEPTION') {
      throw new Error('候选人状态异常：EXCEPTION');
    }
    await sleep(ANALYSIS_POLL_INTERVAL);
  }
  console.warn(`  ⚠️ 分析超时（${ANALYSIS_POLL_TIMEOUT / 1000}s），继续..`);
}

/** 获取候选人完整详情 */
async function getCandidateDetail(candidateId: string): Promise<any> {
  return api(`/api/candidates/${candidateId}`);
}

// ─── 模拟候选人回答 ──────────────────────────────────

async function simulateCandidateReply(
  llm: { client: OpenAI; model: string },
  style: Style,
  resumeSummary: string,
  conversationHistory: Array<{ role: 'ai' | 'candidate'; content: string }>,
  aiMessage: string,
): Promise<string> {
  const systemPrompt = `${STYLE_PROMPTS[style]}

候选人简历摘要：
${resumeSummary}

以下是之前的对话历史（如有）：
${conversationHistory.map(m => `${m.role === 'ai' ? '面试官' : '你'}：${m.content}`).join('\n')}`;

  const response = await llm.client.chat.completions.create({
    model: llm.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `面试官说：${aiMessage}\n\n请以候选人身份回复：` },
    ],
    temperature: 0.8,
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content?.trim() || '嗯...我想想。';
}

/** 从 DetailedResume 构建简要摘要 */
function buildResumeSummary(resume: any): string {
  if (!resume) return '（简历信息暂无）';
  const parts: string[] = [];
  const bp = resume.basicProfile;
  if (bp) {
    parts.push(`姓名: ${bp.name || '未知'}`);
    if (bp.currentCompany) parts.push(`当前公司: ${bp.currentCompany}`);
    if (bp.currentTitle) parts.push(`当前职位: ${bp.currentTitle}`);
    if (bp.totalYearsExp) parts.push(`工作年限: ${bp.totalYearsExp}年`);
  }
  if (resume.workExperiences?.length) {
    parts.push('工作经历:');
    for (const w of resume.workExperiences.slice(0, 3)) {
      parts.push(`  - ${w.company} ${w.title} (${w.startDate}~${w.endDate || '至今'}): ${w.highlights?.join('; ') || ''}`);
    }
  }
  if (resume.education?.length) {
    parts.push('教育:');
    for (const e of resume.education) {
      parts.push(`  - ${e.school} ${e.degree} ${e.major}`);
    }
  }
  if (resume.skills?.length) {
    parts.push(`技能: ${resume.skills.join(', ')}`);
  }
  return parts.join('\n');
}

// ─── 单个面试流程 ─────────────────────────────────────

interface TestResult {
  fileName: string;
  candidateName: string;
  role: string;
  style: Style;
  styleLabel: string;
  rounds: number;
  recommendation: string;
  observationCount: number;
  ksqResults: Array<{ topic: string; verdict: string }>;
  durationSeconds: number;
  error?: string;
}

async function runSingleInterview(
  llm: { client: OpenAI; model: string },
  candidateId: string,
  ksqItems: Array<{ id: string; topic: string; rubric: string }>,
  resume: any,
  style: Style,
  fileName: string,
  candidateName: string,
  role: string,
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    fileName,
    candidateName,
    role,
    style,
    styleLabel: STYLE_LABELS[style],
    rounds: 0,
    recommendation: '—',
    observationCount: 0,
    ksqResults: [],
    durationSeconds: 0,
  };

  try {
    // 创建面试
    const sessionId = await createInterview(candidateId, ksqItems);
    console.log(`    📋 面试创建: ${sessionId.slice(0, 8)}...`);

    // Landing + Start
    await openLanding(sessionId);
    const firstMessage = await startInterview(sessionId);
    console.log(`    🎤 AI开场: ${firstMessage.slice(0, 60)}...`);

    // 模拟对话
    const history: Array<{ role: 'ai' | 'candidate'; content: string }> = [];
    let lastAiMsg = firstMessage;
    let completed = false;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      // 模拟候选人回答
      const candidateReply = await simulateCandidateReply(
        llm, style, buildResumeSummary(resume), history, lastAiMsg,
      );
      console.log(`    💬 Round ${round + 1} | 候选人(${STYLE_LABELS[style]}): ${candidateReply.slice(0, 50)}...`);

      history.push({ role: 'ai', content: lastAiMsg });
      history.push({ role: 'candidate', content: candidateReply });

      // 发送到 server
      const response = await sendMessage(sessionId, candidateReply);
      lastAiMsg = response.aiReply;
      result.rounds = round + 1;

      if (response.isCompleted) {
        console.log(`    ✅ 面试自动结束 (Round ${round + 1})`);
        completed = true;
        break;
      }
    }

    // 如果未自动结束，手动结束
    if (!completed) {
      await endInterview(sessionId);
      console.log(`    ⏹️ 面试手动结束 (${MAX_ROUNDS} rounds)`);
    }

    // 等待分析完成
    console.log('    ⏳ 等待分析流水线...');
    await waitForAnalysis(candidateId);

    // 收集结果
    const detail = await getCandidateDetail(candidateId);
    result.recommendation = detail.candidate?.recommendation || '—';
    result.observationCount = detail.observations?.length || 0;
    result.ksqResults = (detail.ksqResults || []).map((k: any) => ({
      topic: k.topic || k.id,
      verdict: k.verdict || '—',
    }));

    console.log(`    📊 结果: ${result.recommendation} | ${result.observationCount} observations | ${result.ksqResults.map((k: { topic: string; verdict: string }) => `${k.topic}=${k.verdict}`).join(', ')}`);

  } catch (err: any) {
    result.error = err.message;
    console.error(`    ❌ 错误: ${err.message}`);
  }

  result.durationSeconds = Math.round((Date.now() - startTime) / 1000);
  return result;
}

// ─── 主流程 ──────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function parseArgs(): { limit: number; styleFilter: Style | null } {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let styleFilter: Style | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--style' && args[i + 1]) {
      styleFilter = args[i + 1] as Style;
      i++;
    }
  }

  return { limit, styleFilter };
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   艾琳 批量自动化面试测试                      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  const { limit, styleFilter } = parseArgs();
  const styles: Style[] = styleFilter ? [styleFilter] : ['truthful', 'vague', 'exaggerating'];

  // 初始化 LLM 客户端
  const llm = createLLMClient();
  console.log(`🤖 LLM: ${process.env.LLM_PROVIDER} / ${llm.model}`);

  // 扫描简历
  const pdfFiles = readdirSync(RESUME_DIR)
    .filter(f => f.endsWith('.pdf'))
    .slice(0, limit);

  console.log(`📂 找到 ${pdfFiles.length} 份简历 × ${styles.length} 种风格 = ${pdfFiles.length * styles.length} 场面试\n`);

  // 登录
  await login();

  // 运行测试
  const allResults: TestResult[] = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const fileName = pdfFiles[i];
    const pdfPath = resolve(RESUME_DIR, fileName);
    const meta = RESUME_MAP[fileName] || { name: fileName.replace('.pdf', ''), role: '未知岗位' };

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📄 [${i + 1}/${pdfFiles.length}] ${meta.name} — ${meta.role}`);
    console.log(`   文件: ${fileName}`);
    console.log('═'.repeat(60));

    // 上传 PDF（每份简历上传一次）
    let fileId: string;
    let resume: any;
    let ksqItems: Array<{ id: string; topic: string; rubric: string }>;
    let refCandidateId: string;

    try {
      console.log('  📤 上传简历...');
      fileId = await uploadResume(pdfPath);
      console.log(`     fileId: ${fileId.slice(0, 8)}...`);

      // 创建第一个候选人并解析（获取 ksqItems）
      console.log('  🧠 解析简历 + 生成 KSQ...');
      const refCandidate = await createCandidate(`${meta.name} [参考]`, meta.role, fileId);
      refCandidateId = refCandidate.id;
      const parsed = await parseResume(refCandidateId);
      resume = parsed.resume;
      ksqItems = parsed.ksqItems;
      console.log(`     KSQ: ${ksqItems.map(k => k.topic).join(' | ')}`);
    } catch (err: any) {
      console.error(`  ❌ 简历处理失败: ${err.message}`);
      // 跳过该简历的所有面试
      for (const style of styles) {
        allResults.push({
          fileName, candidateName: meta.name, role: meta.role,
          style, styleLabel: STYLE_LABELS[style],
          rounds: 0, recommendation: '—', observationCount: 0,
          ksqResults: [], durationSeconds: 0, error: err.message,
        });
      }
      continue;
    }

    // 对每种风格运行面试
    for (const style of styles) {
      console.log(`\n  ── 风格: ${STYLE_LABELS[style]} ──────────────`);

      try {
        // 创建独立候选人（避免状态冲突）
        let candidateId: string;
        if (style === styles[0]) {
          // 第一种风格复用已解析的候选人
          candidateId = refCandidateId;
        } else {
          // 其他风格创建新候选人
          const c = await createCandidate(`${meta.name} [${STYLE_LABELS[style]}]`, meta.role, fileId);
          candidateId = c.id;
          // 也需要解析以获取 resume_data（用于分析流水线）
          console.log('    🧠 解析简历...');
          await parseResume(candidateId);
        }

        const result = await runSingleInterview(
          llm, candidateId, ksqItems, resume,
          style, fileName, meta.name, meta.role,
        );
        allResults.push(result);
      } catch (err: any) {
        console.error(`    ❌ 面试失败: ${err.message}`);
        allResults.push({
          fileName, candidateName: meta.name, role: meta.role,
          style, styleLabel: STYLE_LABELS[style],
          rounds: 0, recommendation: '—', observationCount: 0,
          ksqResults: [], durationSeconds: 0, error: err.message,
        });
      }
    }
  }

  // ─── 输出汇总报告 ──────────────────────────────────
  printReport(allResults);
}

function printReport(results: TestResult[]) {
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        批量测试汇总报告                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log();

  // 按简历分组
  const byResume = new Map<string, TestResult[]>();
  for (const r of results) {
    const key = r.fileName;
    if (!byResume.has(key)) byResume.set(key, []);
    byResume.get(key)!.push(r);
  }

  for (const [fileName, group] of byResume) {
    const first = group[0];
    console.log(`┌─ ${first.candidateName} (${first.role}) ─ ${fileName}`);

    for (const r of group) {
      const status = r.error ? '❌' : '✅';
      const ksqSummary = r.ksqResults.map(k => `${k.verdict}`).join('/') || '—';
      console.log(`│  ${status} ${r.styleLabel.padEnd(8)} → ${r.recommendation.padEnd(10)} | ${r.rounds} rounds | ${r.observationCount} obs | KSQ: ${ksqSummary} | ${r.durationSeconds}s`);
      if (r.error) {
        console.log(`│     错误: ${r.error}`);
      }
    }
    console.log('└───────────────────────────────────');
  }

  // 统计
  const total = results.length;
  const success = results.filter(r => !r.error).length;
  const failed = total - success;

  const byStyle: Record<string, { proceed: number; followUp: number; hold: number; total: number }> = {};
  for (const r of results) {
    if (r.error) continue;
    if (!byStyle[r.style]) byStyle[r.style] = { proceed: 0, followUp: 0, hold: 0, total: 0 };
    byStyle[r.style].total++;
    if (r.recommendation === 'Proceed') byStyle[r.style].proceed++;
    else if (r.recommendation === 'FollowUp') byStyle[r.style].followUp++;
    else if (r.recommendation === 'Hold') byStyle[r.style].hold++;
  }

  console.log('\n📊 统计汇总:');
  console.log(`   总计: ${total} 场 | 成功: ${success} | 失败: ${failed}`);

  for (const [style, stats] of Object.entries(byStyle)) {
    const label = STYLE_LABELS[style as Style];
    console.log(`   ${label}: Proceed=${stats.proceed} FollowUp=${stats.followUp} Hold=${stats.hold} (共${stats.total})`);
  }

  // 合理性检查
  console.log('\n🔍 合理性检查:');
  const truthfulProceeds = byStyle['truthful']?.proceed || 0;
  const truthfulTotal = byStyle['truthful']?.total || 0;
  const exagHolds = byStyle['exaggerating']?.hold || 0;
  const exagTotal = byStyle['exaggerating']?.total || 0;
  const vagueFollowUps = (byStyle['vague']?.followUp || 0) + (byStyle['vague']?.hold || 0);
  const vagueTotal = byStyle['vague']?.total || 0;

  if (truthfulTotal > 0) {
    const rate = (truthfulProceeds / truthfulTotal * 100).toFixed(0);
    const icon = truthfulProceeds / truthfulTotal >= 0.5 ? '✅' : '⚠️';
    console.log(`   ${icon} 如实回答 → Proceed 率: ${rate}% (${truthfulProceeds}/${truthfulTotal})`);
  }
  if (vagueTotal > 0) {
    const rate = (vagueFollowUps / vagueTotal * 100).toFixed(0);
    const icon = vagueFollowUps / vagueTotal >= 0.5 ? '✅' : '⚠️';
    console.log(`   ${icon} 含糊应付 → FollowUp/Hold 率: ${rate}% (${vagueFollowUps}/${vagueTotal})`);
  }
  if (exagTotal > 0) {
    const rate = (exagHolds / exagTotal * 100).toFixed(0);
    const icon = exagHolds / exagTotal >= 0.3 ? '✅' : '⚠️';
    console.log(`   ${icon} 夸大其词 → Hold 率: ${rate}% (${exagHolds}/${exagTotal})`);
  }

  console.log('\n✨ 测试完成！');
}

// ─── 启动 ─────────────────────────────────────────────
main().catch((err) => {
  console.error('\n💀 致命错误:', err);
  process.exit(1);
});
