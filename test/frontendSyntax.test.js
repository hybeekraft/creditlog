const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(root).filter(name => name.endsWith('.html'));

test('inline browser scripts parse without syntax errors', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
    let index = 0;
    for (const [, attributes, source] of scripts) {
      if (/\bsrc\s*=/.test(attributes) || /type\s*=\s*["']application\/(ld\+json|json)["']/i.test(attributes)) continue;
      new vm.Script(source, { filename: `${page}:inline-${++index}` });
    }
  }
});
