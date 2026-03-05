/**
 * Winston 日志服务
 * 开发环境：仅 console 输出
 * 生产环境：console + 文件双输出（按天轮转）
 */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getEnv } from '../config/env.js';

const env = getEnv();

const LOG_DIR = env.LOG_DIR || '/data/logs/ailin-server';

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, stack }) =>
      stack
        ? `${timestamp} [${level}] ${message}\n${stack}`
        : `${timestamp} [${level}] ${message}`
    ),
  ),
});

function createTransports(): winston.transport[] {
  const transports: winston.transport[] = [consoleTransport];

  if (env.NODE_ENV === 'production') {
    // 全量日志：按天轮转
    transports.push(
      new DailyRotateFile({
        dirname: LOG_DIR,
        filename: '%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '30d',
      }),
    );

    // 错误日志：单独一份
    transports.push(
      new DailyRotateFile({
        dirname: LOG_DIR,
        filename: '%DATE%-error.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '50m',
        maxFiles: '30d',
      }),
    );
  }

  return transports;
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) =>
      stack
        ? `${timestamp} [${level}] ${message}\n${stack}`
        : `${timestamp} [${level}] ${message}`
    ),
  ),
  transports: createTransports(),
});
