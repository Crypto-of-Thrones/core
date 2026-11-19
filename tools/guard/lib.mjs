
export function langOf(file) {
  if (/\.(m|c)?js$/.test(file)) return 'js';
  if (/\.rs$/.test(file)) return 'rust';
  if (/\.(sh|toml|lock)$/.test(file) || /(^|\/)(pre-commit|pre-push|commit-msg|\.gitignore|\.gitattributes)$/.test(file)) return 'hash';
  return null;
}

const ID = /[A-Za-z0-9_$]/;
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof']);
const REGEX_AFTER_PUNCT = '(,=:[!&|?{};+-*%<>~^';

function scanJS(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  let last = null;
  const tpl = [];
  if (src.startsWith('#!')) { while (i < n && src[i] !== '\n') i++; }
  const readString = (q) => {
    i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') i++;
      else if (src[i] === '\n') throw new Error(`unterminated string at ${i}`);
      i++;
    }
    i++;
  };
  const readTemplate = () => {
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; return false; }
      if (c === '$' && src[i + 1] === '{') { i += 2; return true; }
      i++;
    }
    throw new Error('unterminated template literal');
  };
  const readRegex = () => {
    i++;
    let cls = false;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') throw new Error(`unterminated regex at ${i}`);
      if (cls) { if (c === ']') cls = false; }
      else if (c === '[') cls = true;
      else if (c === '/') break;
      i++;
    }
    i++;
    while (i < n && ID.test(src[i])) i++;
  };
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') {
      const s = i;
      while (i < n && src[i] !== '\n') i++;
      out.push({ start: s, end: i, text: src.slice(s, i) });
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const s = i;
      const e = src.indexOf('*/', i + 2);
      if (e < 0) throw new Error(`unterminated block comment at ${i}`);
      i = e + 2;
      out.push({ start: s, end: i, text: src.slice(s, i) });
      continue;
    }
    if (c === '"' || c === "'") { readString(c); last = { kind: 'value' }; continue; }
    if (c === '`') {
      i++;
      if (readTemplate()) tpl.push(0);
      last = { kind: 'value' };
      continue;
    }
    if (c === '/') {
      const isRegex = !last || (last.kind === 'punct' && REGEX_AFTER_PUNCT.includes(last.text)) || (last.kind === 'word' && REGEX_AFTER_WORD.has(last.text));
      if (isRegex) { readRegex(); last = { kind: 'value' }; continue; }
      i++;
      last = { kind: 'punct', text: '/' };
      continue;
    }
    if (ID.test(c)) {
      const s = i;
      while (i < n && ID.test(src[i])) i++;
      const w = src.slice(s, i);
      last = /^[0-9]/.test(w) ? { kind: 'value' } : { kind: 'word', text: w };
      continue;
    }
    if (tpl.length && c === '{') { tpl[tpl.length - 1]++; i++; last = { kind: 'punct', text: c }; continue; }
    if (tpl.length && c === '}') {
      if (tpl[tpl.length - 1] === 0) {
        tpl.pop();
        i++;
        if (readTemplate()) tpl.push(0);
        last = { kind: 'value' };
        continue;
      }
      tpl[tpl.length - 1]--;
    }
    i++;
    last = c === ')' || c === ']' || c === '}' ? { kind: 'value' } : { kind: 'punct', text: c };
  }
  if (tpl.length) throw new Error('unterminated template expression');
  return out;
}

function scanRust(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      const s = i;
      while (i < n && src[i] !== '\n') i++;
      out.push({ start: s, end: i, text: src.slice(s, i) });
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const s = i;
      let depth = 0;
      while (i < n) {
        if (src[i] === '/' && src[i + 1] === '*') { depth++; i += 2; continue; }
        if (src[i] === '*' && src[i + 1] === '/') { depth--; i += 2; if (!depth) break; continue; }
        i++;
      }
      if (depth) throw new Error(`unterminated block comment at ${s}`);
      out.push({ start: s, end: i, text: src.slice(s, i) });
      continue;
    }
    const raw = /^b?r(#*)"/.exec(src.slice(i, i + 40));
    if (raw && (i === 0 || !ID.test(src[i - 1]))) {
      const close = `"${raw[1]}`;
      const e = src.indexOf(close, i + raw[0].length);
      if (e < 0) throw new Error(`unterminated raw string at ${i}`);
      i = e + close.length;
      continue;
    }
    if (c === '"') {
      i++;
      while (i < n && src[i] !== '"') { if (src[i] === '\\') i++; i++; }
      i++;
      continue;
    }
    if (c === "'") {
      const m = /^'(?:\\u\{[0-9a-fA-F]+\}|\\.|[^\\'\n])'/u.exec(src.slice(i, i + 16));
      i += m ? m[0].length : 1;
      continue;
    }
    if (ID.test(c)) { while (i < n && ID.test(src[i])) i++; continue; }
    i++;
  }
  return out;
}

function scanHash(src) {
  const out = [];
  let pos = 0;
  for (const line of src.split('\n')) {
    const m = /^\s*#/.exec(line);
    if (m && !(pos === 0 && line.startsWith('#!'))) out.push({ start: pos + m[0].length - 1, end: pos + line.length, text: line.trim() });
    pos += line.length + 1;
  }
  return out;
}

export function scanSource(src, lang) {
  if (lang === 'js') return scanJS(src);
  if (lang === 'rust') return scanRust(src);
  if (lang === 'hash') return scanHash(src);
  return [];
}

export function stripComments(src, lang, { keepLines = false } = {}) {
  const spans = scanSource(src, lang);
  if (!spans.length) return src;
  let out = '';
  let pos = 0;
  const touched = new Set();
  for (const s of spans) {
    out += src.slice(pos, s.start);
    const before = out[out.length - 1];
    const after = src[s.end];
    const nl = s.text.split('\n').length - 1;
    if (!nl && before && after && ID.test(before) && ID.test(after)) out += ' ';
    const line0 = out.split('\n').length - 1;
    for (let k = 0; k <= nl; k++) touched.add(line0 + k);
    out += '\n'.repeat(nl);
    pos = s.end;
  }
  out += src.slice(pos);
  const lines = out.split('\n');
  const kept = [];
  lines.forEach((line, k) => {
    if (!touched.has(k)) { kept.push(line); return; }
    const t = line.replace(/[ \t]+$/, '');
    if (t.trim() === '' && !keepLines) return;
    kept.push(t.trim() === '' ? '' : t);
  });
  return kept.join('\n');
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Length(s) {
  let v = 0n;
  for (const ch of s) {
    const d = B58.indexOf(ch);
    if (d < 0) return -1;
    v = v * 58n + BigInt(d);
  }
  let bytes = 0;
  while (v > 0n) { v >>= 8n; bytes++; }
  for (const ch of s) { if (ch === '1') bytes++; else break; }
  return bytes;
}
