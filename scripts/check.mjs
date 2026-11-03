import { readFile, readdir, access, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'parse5';

const temporary = await mkdtemp(join(tmpdir(), 'lifebag-check-'));
let errors = 0;
let scripts = 0;
const fail = message => { console.error(message); errors++; };
const files = (await readdir('.')).filter(file => /\.(html|js)$/.test(file));
function syntax(source, name) {
  const path = join(temporary, name.replace(/[^a-z0-9.-]/gi, '-') + '.mjs');
  return writeFile(path, source).then(() => {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    if (result.status !== 0) fail(result.stderr);
    scripts++;
  });
}
function walk(node, callback) {
  callback(node);
  for (const child of node.childNodes || []) walk(child, callback);
}
try {
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    if (file.endsWith('.js')) { await syntax(content, file); continue; }
    const document = parse(content, { onParseError: error => fail(`${file}:${error.startLine} ${error.code}`) });
    const ids = new Set();
    const links = [];
    const inline = [];
    walk(document, node => {
      const attributes = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
      if (attributes.id) {
        if (ids.has(attributes.id)) fail(`${file}: ID duplicado ${attributes.id}`);
        ids.add(attributes.id);
      }
      if (node.tagName === 'script' && !attributes.src && (!attributes.type || attributes.type === 'module')) inline.push(node.childNodes.map(child => child.value || '').join(''));
      if (attributes.href || attributes.src) links.push(attributes.href || attributes.src);
      if (attributes.target === '_blank' && !attributes.rel?.includes('noopener')) fail(`${file}: enlace externo sin noopener`);
    });
    for (const [index, source] of inline.entries()) await syntax(source, `${file}-${index}`);
    for (const link of links) {
      if (/^(https?:|data:|mailto:|tel:)/.test(link)) continue;
      const [target, anchor] = link.split('#');
      if (target) {
        try { await access(resolve(target)); } catch { fail(`${file}: no existe ${target}`); }
      } else if (anchor && !ids.has(anchor)) fail(`${file}: no existe el ancla #${anchor}`);
      if (target?.endsWith('.html') && anchor) {
        const destination = await readFile(target, 'utf8').catch(() => '');
        const targetDocument = parse(destination);
        let found = false;
        walk(targetDocument, node => { if (node.attrs?.some(attr => attr.name === 'id' && attr.value === anchor)) found = true; });
        if (!found) fail(`${file}: no existe ${target}#${anchor}`);
      }
    }
  }
} finally { await rm(temporary, { recursive: true, force: true }); }
if (errors) process.exitCode = 1;
else console.log(`OK · ${files.filter(file => file.endsWith('.html')).length} páginas, ${scripts} scripts: sintaxis, enlaces locales, anclas e IDs.`);
