import { readFile } from 'node:fs/promises';

const load = async (language) => JSON.parse(await readFile(
  new URL(`../src/i18n/locales/${language}/common.json`, import.meta.url),
  'utf8',
));

const [tr, en] = await Promise.all([load('tr'), load('en')]);
const missingInEnglish = Object.keys(tr).filter((key) => !(key in en));
const missingInTurkish = Object.keys(en).filter((key) => !(key in tr));

if (missingInEnglish.length || missingInTurkish.length) {
  console.error(JSON.stringify({ missingInEnglish, missingInTurkish }, null, 2));
  process.exit(1);
}

const sourceFiles = [
  '../src/App.tsx',
  '../src/components/ui.tsx',
  '../src/services/supabase.ts',
];
const usedKeys = new Set();
for (const path of sourceFiles) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const match of source.matchAll(/(?:\bt|\btx|i18n\.t)\("([^"]+)"/g)) usedKeys.add(match[1]);
  for (const match of source.matchAll(/(?:\bt|\btx|i18n\.t)\('([^']+)'/g)) usedKeys.add(match[1]);
}
const missingUsedKeys = [...usedKeys].filter((key) => !(key in tr));
if (missingUsedKeys.length) {
  console.error(JSON.stringify({ missingUsedKeys }, null, 2));
  process.exit(1);
}

console.log(`i18n resources are aligned (${Object.keys(tr).length} keys per language; ${usedKeys.size} static keys verified).`);
