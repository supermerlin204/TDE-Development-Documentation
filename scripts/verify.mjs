import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const scriptFiles = [
  'data/_init.js',
  'data/dashboard.js',
  'data/classes.js',
  'data/npcs.js',
  'data/bestiary.js',
  'data/regions.js',
  'data/equipment.js',
  'data/mechanics.js',
  'data/quests.js',
  'data/glossary.js',
  'data/changelog.js',
  'js/mediaManifest.js',
  'js/modelStore.js',
  'js/app.js',
  'js/map3d.js'
];

const failures = [];
for (const file of scriptFiles) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}: ${result.stderr.trim()}`);
}

const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) failures.push(`index.html: duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);

const localRefs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
  .map(match => match[1].split(/[?#]/)[0])
  .filter(ref => ref && !/^(?:https?:|data:|#)/.test(ref));
for (const ref of localRefs) {
  if (!existsSync(resolve(root, ref))) failures.push(`index.html: missing local resource ${ref}`);
}

const dataContext = vm.createContext({ console });
for (const file of scriptFiles.filter(file => file.startsWith('data/'))) {
  new vm.Script(readFileSync(resolve(root, file), 'utf8'), { filename: file }).runInContext(dataContext);
}
const data = JSON.parse(new vm.Script('JSON.stringify(TDE_DATA)').runInContext(dataContext));
for (const [key, value] of Object.entries(data)) {
  if (!Array.isArray(value)) continue;
  const idsInList = value.map(item => item && item.id).filter(Boolean);
  const duplicates = idsInList.filter((id, index) => idsInList.indexOf(id) !== index);
  if (duplicates.length) failures.push(`TDE_DATA.${key}: duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
}

const mediaContext = vm.createContext({ window: {} });
new vm.Script(readFileSync(resolve(root, 'js/mediaManifest.js'), 'utf8')).runInContext(mediaContext);
const media = mediaContext.window.TDE_MEDIA;
for (const path of [...Object.values(media.thumbnails), ...Object.values(media.entityImages).flat()]) {
  if (!existsSync(resolve(root, path))) failures.push(`media manifest: missing ${path}`);
}
for (const filename of media.modelFiles || []) {
  if (!existsSync(resolve(root, 'models', filename))) failures.push(`model manifest: missing models/${filename}`);
}

const inspirationFile = resolve(root, '灵感词条集合.md');
if (!existsSync(inspirationFile) || statSync(inspirationFile).size === 0) {
  failures.push('灵感词条集合.md is missing or empty');
}
const pagesWorkflow = readFileSync(resolve(root, '.github/workflows/static.yml'), 'utf8');
if (!pagesWorkflow.includes("--exclude '灵感词条集合.md'")) {
  failures.push('GitHub Pages artifact must exclude 灵感词条集合.md');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Verified ${scriptFiles.length} scripts, ${ids.length} HTML IDs, ${localRefs.length} local resources, and ${Object.keys(data).length} data groups.`);
