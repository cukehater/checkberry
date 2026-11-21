// @gravity-ui/icons의 SVG에서 path만 뽑아 src/shared/ui/gravity-icons.all.ts를 만든다. `pnpm icons:gen`
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dir = join(dirname(require.resolve('@gravity-ui/icons/package.json')), 'svgs');
const { version } = require('@gravity-ui/icons/package.json');
const out = new URL('../src/shared/ui/gravity-icons.all.ts', import.meta.url);

const icons = {};
const skipped = [];
for (const file of readdirSync(dir).sort()) {
  if (!file.endsWith('.svg')) continue;
  const name = file.slice(0, -4);
  // <defs>(clipPath 등)의 path는 그리는 모양이 아니다
  const svg = readFileSync(join(dir, file), 'utf8').replace(/<defs>[\s\S]*?<\/defs>/g, '');
  // 16 격자가 아니거나 색이 두 가지(빨간 점)인 아이콘은 단색 16 격자 렌더러로 그릴 수 없어 뺀다
  if (!svg.includes('viewBox="0 0 16 16"') || /fill="#/.test(svg)) {
    skipped.push(name);
    continue;
  }
  const paths = [...svg.matchAll(/<path\b([^>]*)\/?>/g)].map(([, attrs]) => {
    const d = attrs.match(/\sd="([^"]+)"/)[1];
    return /fill-rule="evenodd"/.test(attrs) ? { d, evenOdd: true } : { d };
  });
  if (paths.length) icons[name] = paths;
}

const body = Object.entries(icons)
  .map(([name, paths]) => `  ${JSON.stringify(name)}: ${JSON.stringify(paths).replace(/"(d|evenOdd)":/g, '$1:')},`)
  .join('\n');
writeFileSync(
  out,
  `// 생성 파일. 직접 고치지 않는다(scripts/gen-gravity-icons.mjs, \`pnpm icons:gen\`).
// Gravity UI Icons (MIT, © YANDEX LLC) · @gravity-ui/icons ${version} 전체. 16×16 격자, fill 방식.
import type { IconPath } from './gravity-icons.data';

export const GRAVITY_ICONS_ALL: Record<string, readonly IconPath[]> = {
${body}
};
`,
);
console.log(`${Object.keys(icons).length}개 생성, ${skipped.length}개 제외: ${skipped.join(', ')}`);
