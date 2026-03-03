/**
 * Orchestrator — Agent 流水线编排
 *
 * M2 解析流程：PDF → Resume Agent → KSQ Agent
 * M4 分析流程：transcript → Analysis Agent → Report Agent
 */
import { extractTextFromPdf } from './pdfService.js';
import { parseResume } from '../agents/resumeAgent.js';
import { generateKSQ } from '../agents/ksqAgent.js';
import { analyzeTranscript } from '../agents/analysisAgent.js';
import { generateReport, type ReportResult } from '../agents/reportAgent.js';
import { extractVerifiedTags, type VerifiedTag } from './tagService.js';
import type { DetailedResume, KSQItem, Observation, InterviewMessage } from '@shared/types.js';

export interface ResumeParseResult {
  resume: DetailedResume;
  ksqItems: KSQItem[];
  rawText: string;
}

/**
 * M2 解析流水线：
 * 1. PDF 提取文本
 * 2. Resume Agent → DetailedResume
 * 3. KSQ Agent → KSQItem[]
 */
export async function runResumePipeline(
  pdfPath: string,
  role: string,
): Promise<ResumeParseResult> {
  // Step 1: PDF → raw text
  console.log('📄 [Orchestrator] Step 1: Extracting text from PDF...');
  const rawText = await extractTextFromPdf(pdfPath);
  console.log(`   Extracted ${rawText.length} characters`);

  // Step 2: raw text → DetailedResume
  console.log('🤖 [Orchestrator] Step 2: Running Resume Agent...');
  const resume = await parseResume(rawText);
  console.log(`   Parsed: ${resume.basicProfile.name}, ${resume.workExperiences.length} work experiences`);

  // Step 3: DetailedResume → KSQ
  console.log('🎯 [Orchestrator] Step 3: Running KSQ Agent...');
  const ksqItems = await generateKSQ(resume, role);
  console.log(`   Generated ${ksqItems.length} KSQ items`);

  return { resume, ksqItems, rawText };
}

/**
 * 从纯文本运行流水线（跳过 PDF 提取，用于文本简历或测试）
 */
export async function runResumeTextPipeline(
  resumeText: string,
  role: string,
): Promise<ResumeParseResult> {
  console.log('🤖 [Orchestrator] Running Resume Agent (text input)...');
  const resume = await parseResume(resumeText);

  console.log('🎯 [Orchestrator] Running KSQ Agent...');
  const ksqItems = await generateKSQ(resume, role);

  return { resume, ksqItems, rawText: resumeText };
}

// ═══════════════════════════════════════════════════
// M4 分析流水线
// ═══════════════════════════════════════════════════

export interface AnalysisResult {
  observations: Observation[];
  report: ReportResult;
  verifiedTags: VerifiedTag[];
}

/**
 * M4 分析流水线：
 * 1. Analysis Agent → Observation[]
 * 2. Report Agent → Recommendation + KSQ 判定
 * 3. Tag Service → Verified Tags（静默积累）
 */
export async function runAnalysisPipeline(
  messages: InterviewMessage[],
  ksqItems: KSQItem[],
  resume?: DetailedResume,
): Promise<AnalysisResult> {
  const ksqTopics = ksqItems.map(k => k.topic);

  // Step 1: 信号检测
  console.log('🔍 [Orchestrator] Step 1: Running Analysis Agent...');
  const observations = await analyzeTranscript(messages, resume, ksqTopics);
  console.log(`   Detected ${observations.length} observations`);

  // Step 2: 生成报告
  console.log('📊 [Orchestrator] Step 2: Running Report Agent...');
  const report = await generateReport(ksqItems, observations);
  console.log(`   Recommendation: ${report.recommendation}`);

  // Step 3: 提取标签
  console.log('🏷️ [Orchestrator] Step 3: Extracting verified tags...');
  const verifiedTags = extractVerifiedTags(report.ksqResults, observations);
  console.log(`   Extracted ${verifiedTags.length} tags`);

  return { observations, report, verifiedTags };
}
