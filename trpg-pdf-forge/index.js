import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { installRoutes } from './server/routes.mjs';
import { installSheetRoutes } from './server/sheet-routes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(here, 'assets');

/** 版本号只认 package.json 一处，避免 index.js / 文档 / 客户端三处漏改。 */
const version = JSON.parse(readFileSync(path.join(here, 'package.json'), 'utf8')).version;

/** The host half only contributes authenticated HTTP routes and local project storage. */
export const inject = ['connection', 'sessions'];

/**
 * Mount the TRPG studio's project routes.
 * @param ctx - Host context.
 */
export function apply(ctx) {
  installRoutes(ctx, { assetsDir, version });
  installSheetRoutes(ctx, { assetsDir, version });
}

export { here as packageDir, assetsDir, version };
