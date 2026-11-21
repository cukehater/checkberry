// @phosphor-icons/core의 fill SVG 경로(phosphor-icons.all.ts)와 검색 태그(phosphor-tags.ts)를 뽑는다. `pnpm icons:gen`
// 태그는 아이콘 피커만 쓰므로 따로 둬서 습관 아이콘을 그릴 때 평가하지 않게 한다
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
// package.json은 exports에 없어 진입 파일(dist/index.umd.js)에서 패키지 폴더를 찾는다
const root = dirname(dirname(require.resolve('@phosphor-icons/core')));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { icons: meta } = require('@phosphor-icons/core');
const out = new URL('../src/shared/ui/phosphor-icons.all.ts', import.meta.url);
const tagsOut = new URL('../src/shared/ui/phosphor-tags.ts', import.meta.url);

const paths = {};
const tags = {};
for (const { name, tags: t, categories } of [...meta].sort((a, b) => a.name.localeCompare(b.name))) {
  const svg = readFileSync(join(root, 'assets', 'fill', `${name}-fill.svg`), 'utf8');
  // 256 격자 단색 fill. 경로가 여러 개인 아이콘(8개)은 배열로 둔다
  if (!svg.includes('viewBox="0 0 256 256"') || /<(?!svg|path|\/svg)[a-z]/.test(svg)) throw new Error(`예상과 다른 SVG: ${name}`);
  const ds = [...svg.matchAll(/<path d="([^"]+)"\/>/g)].map((m) => m[1]);
  paths[name] = ds.length === 1 ? ds[0] : ds;
  // '*new*' 같은 표시용 태그는 뺀다
  tags[name] = [...new Set([...t, ...categories].filter((x) => !x.startsWith('*')))].join(' ');
}

writeFileSync(
  out,
  `// 생성 파일. 직접 고치지 않는다(scripts/gen-phosphor-icons.mjs, \`pnpm icons:gen\`).
// Phosphor Icons (MIT, © Phosphor Icons) · @phosphor-icons/core ${version} 전체 fill 두께. 256×256 격자.

/** 아이콘 이름 → path d(경로가 여럿이면 배열) */
export const PHOSPHOR_PATHS: Record<string, string | readonly string[]> = ${JSON.stringify(paths)};
`,
);
writeFileSync(
  tagsOut,
  `// 생성 파일. 직접 고치지 않는다(scripts/gen-phosphor-icons.mjs, \`pnpm icons:gen\`).
// Phosphor Icons (MIT) · @phosphor-icons/core ${version} 검색 태그.

/** 아이콘 이름 → 검색 태그(영문, 공백 구분) */
export const PHOSPHOR_TAGS: Record<string, string> = ${JSON.stringify(tags)};
`,
);
console.log(`${Object.keys(paths).length}개 생성`);
