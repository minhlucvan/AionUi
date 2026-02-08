/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SECURITY_CONFIG } from '@/webserver/config/constants';

/**
 * 登录/注册等敏感操作的限流
 */
export const authRateLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  skipSuccessfulRequests: true,
}) as unknown as RequestHandler;

/**
 * 一般 API 请求限流
 */
export const apiRateLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: 60 * 1000,
  max: 60,
  message: {
    error: 'Too many API requests, please slow down.',
  },
}) as unknown as RequestHandler;

/**
 * 文件浏览等操作限流
 */
export const fileOperationLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: 'Too many file operations, please slow down.',
  },
}) as unknown as RequestHandler;

/**
 * 已认证用户的敏感操作限流（优先按用户 ID，其次按 IP）
 */
export const authenticatedActionLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many sensitive actions, please try again later.',
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyGenerator: (req: any) => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  },
}) as unknown as RequestHandler;

/**
 * Attach CSRF token to response for client-side usage
 * tiny-csrf provides req.csrfToken() method to generate tokens
 *
 * 将 CSRF token 添加到响应中供客户端使用
 * tiny-csrf 提供 req.csrfToken() 方法来生成 token
 */
export function attachCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // tiny-csrf provides req.csrfToken() method
  if (typeof req.csrfToken === 'function') {
    const token = req.csrfToken();
    res.setHeader(CSRF_HEADER_NAME, token);
    res.locals.csrfToken = token;
  }
  next();
}

/**
 * 供静态路由等场景使用的通用限流器工厂
 */
export function createRateLimiter(options: Parameters<typeof rateLimit>[0]): RequestHandler {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  }) as unknown as RequestHandler;
}
