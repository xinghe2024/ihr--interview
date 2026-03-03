/**
 * PDF 文本提取服务
 */
import { readFile } from 'node:fs/promises';
// pdf-parse 没有默认导出，使用 createRequire 兼容 CJS 模块
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

/**
 * 从 PDF 文件路径提取纯文本
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const result = await pdfParse(buffer);
  return result.text;
}

/**
 * 从 Buffer 提取纯文本
 */
export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}
