import type { Express, Request, Response } from 'express';

/** The one non-sensitive response the foundation health check accepts. */
export const HEALTH_BODY = Object.freeze({
  status: 'ok',
  mode: 'fictional-demo',
} as const);

export const HEALTH_PATH = '/api/health';

/**
 * Mounts the foundation health contract. It reads no configuration, touches no
 * provider and echoes nothing from the request, so it cannot leak paths,
 * environment values or account data.
 */
export function mountHealthRoute(app: Express): void {
  app.get(HEALTH_PATH, (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(HEALTH_BODY);
  });
}
