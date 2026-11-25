import type { Express, Request, Response } from 'express';

/** The one non-sensitive response the foundation health check accepts. */
export const HEALTH_BODY = Object.freeze({
  status: 'ok',
  mode: 'fictional-demo',
} as const);

export const HEALTH_PATH = '/api/health';
export const READY_PATH = '/api/ready';

/**
 * Liveness is intentionally separate from private-storage readiness. The frozen
 * foundation health contract remains unchanged; readiness can fail closed when
 * essential private functionality is unavailable.
 */
export function mountReadinessRoute(
  app: Express,
  privateReady: () => boolean,
): void {
  app.get(READY_PATH, (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const ready = privateReady();
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not-ready',
      privateStorage: ready ? 'ready' : 'unavailable',
    });
  });
}

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
