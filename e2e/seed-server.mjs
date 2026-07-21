import { copyFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seed = resolve(here, 'fixtures/db.seed.json');
const tmp = resolve(here, '.tmp/db.e2e.json');

// 매 실행마다 시드를 던져버릴 사본으로 복사 — 실제 db.json은 건드리지 않는다
mkdirSync(dirname(tmp), { recursive: true });
copyFileSync(seed, tmp);

// 앱이 하드코딩으로 바라보는 포트 3001을, 사본을 가리킨 채로 점유
const child = spawn('npx', ['json-server', '--watch', tmp, '--port', '3001'], {
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
