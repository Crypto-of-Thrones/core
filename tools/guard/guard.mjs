#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { langOf, scanSource, base58Length } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = JSON.parse(fs.readFileSync(path.join(HERE, 'guard.config.json'), 'utf8'));

const h16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

const AI_HASHES = new Set([
  'c857d09db23e6822', 'c70eca6b0f88f44d', '053ea4804ef1bb33', '60965168ce762e94', '7d3194f79e645c42',
  '3ea125d0bff386e6', '5d72436256ada538', '8316b399af662089', '7c38d5864015fc72',
]);

const LOCAL_PATHS = [['', 'home', ''], ['', 'Users', ''], ['C:', 'Users', '']].map((p) => p.join('/'));

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{10,}/,
  /\bsk-[A-Za-z0-9_-]{32,}/,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /\b[MN][A-Za-z0-9]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/,
  /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/,
  /\b(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
];

const charClass = (ranges, flags = '') => new RegExp(`[${ranges.map(([a, b = a]) => (a === b ? `\\u{${a.toString(16)}}` : `\\u{${a.toString(16)}}-\\u{${b.toString(16)}}`)).join('')}]`, `u${flags}`);

const BUSINESS = [
  /\b[A-Z]{2,5}-\d{2,}\b/,
  /\b20\d\d-\d\d-\d\d\b/,
  /\b\d{1,2}\/\d{1,2}\/20\d\d\b/,
  /\b(?:owner|partner|founder|client|customer|boss)\b/i,
  /\bdocs\//,
  /\.md\b/,
  /\b(?:audit|slice|finding|item|parity|round)\s+[A-Z]{1,2}\d/i,
  /\b(?:TODO|FIXME|HACK|XXX)\b/,
  /@dev-(?:start|end)|@devtools-/,
  charClass([[0xc0, 0xff]]),
  /\b(?:margin|markup|pricing strategy|whale|anticheat|backoffice|admin panel|profit)\b/i,
];
const TOOL_HEADERS = [['# This file is automatically @gener', 'ated by Cargo.'].join('')];
const ALLOWED_COMMENT = [/^\/\/ SPDX-License-Identifier: [\w.-]+$/, /^# SPDX-License-Identifier: [\w.-]+$/];

const DASH = charClass([[0x2013, 0x2014]]);
const INVISIBLE = charClass([
  [0xad], [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2064], [0x2066, 0x2069], [0xfeff],
  [0xa0], [0x1680], [0x2000, 0x200a], [0x202f], [0x205f], [0x3000], [0xe0000, 0xe007f],
]);

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20, ...opts });
const tryRun = (cmd, args, opts) => { try { return run(cmd, args, opts).trim(); } catch { return ''; } };

const isAllowedName = (name) => CONFIG.allowedNames.includes(name) || CONFIG.allowedAuthors.some((a) => a.name === name);
const isAllowedEmail = (email) => CONFIG.allowedAuthors.some((a) => a.email.toLowerCase() === String(email).toLowerCase())
  || CONFIG.allowedEmailPatterns.some((p) => new RegExp(p).test(email));

function identityTerms(name, email) {
  const out = [];
  if (name && !isAllowedName(name)) {
    out.push(name.toLowerCase());
    for (const w of name.toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 4) out.push(w);
  }
  if (email && !isAllowedEmail(email)) {
    out.push(email.toLowerCase());
    const local = email.toLowerCase().split('@')[0].replace(/^\d+\+/, '');
    if (local.length >= 5) out.push(local);
  }
  return out;
}

function readDenyFile(file) {
  if (!file || !fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  try { return JSON.parse(raw).terms || []; } catch { return raw.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')); }
}

export function loadDeny(env = process.env) {
  const terms = [
    ...readDenyFile(path.join(HERE, 'deny.private.json')),
    ...readDenyFile(env.COT_GUARD_DENY_FILE),
    ...String(env.COT_GUARD_DENY || '').split(/[\n,]/),
    ...identityTerms(tryRun('git', ['config', '--global', 'user.name']), tryRun('git', ['config', '--global', 'user.email'])),
  ];
  return [...new Set(terms.map((t) => String(t).trim().toLowerCase()).filter((t) => t.length >= 3))];
}

function denyMatcher(terms) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const long = terms.filter((t) => t.length >= 6).map(esc);
  const short = terms.filter((t) => t.length < 6).map(esc);
  const parts = [];
  if (long.length) parts.push(`(?:${long.join('|')})`);
  if (short.length) parts.push(`(?<![a-z0-9_])(?:${short.join('|')})(?![a-z0-9_])`);
  return parts.length ? new RegExp(parts.join('|')) : null;
}

function aiMark(line) {
  const raw = line.match(/[A-Za-z0-9]+/g) || [];
  if (raw.some((w) => AI_HASHES.has(h16(w.toLowerCase())))) return true;
  const words = raw.flatMap((w) => w.split(/(?<=[a-z])(?=[A-Z])/)).map((w) => w.toLowerCase());
  for (let i = 0; i < words.length; i++) {
    if (AI_HASHES.has(h16(words[i]))) return true;
    if (i + 1 < words.length && AI_HASHES.has(h16(`${words[i]} ${words[i + 1]}`))) return true;
    if (i + 2 < words.length && AI_HASHES.has(h16(`${words[i]} ${words[i + 1]} ${words[i + 2]}`))) return true;
  }
  return false;
}

function envSecrets(env = process.env) {
  const files = String(env.COT_GUARD_SECRET_FILES || '').split(':').filter(Boolean);
  const out = [];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = /^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      const v = m[1].trim().replace(/^(['"])(.*)\1$/, '$2');
      if (v.length >= 12) out.push(v);
    }
  }
  return out;
}

export class Guard {
  constructor(env = process.env) {
    this.deny = loadDeny(env);
    if (!this.deny.length && env.COT_GUARD_ALLOW_EMPTY_DENY !== '1') {
      throw Object.assign(new Error('no denied terms loaded (set COT_GUARD_DENY or COT_GUARD_DENY_FILE)'), { setup: true });
    }
    this.denyRe = denyMatcher(this.deny);
    this.skipAuthor = env.COT_GUARD_SKIP_AUTHOR === '1';
    this.secrets = envSecrets(env);
    this.findings = [];
  }

  add(rule, where) { this.findings.push(`${rule} ${where}`); }

  text(text, where, { vendor = false } = {}) {
    const lines = text.split('\n');
    lines.forEach((line, k) => {
      const at = `${where}:${k + 1}`;
      if (this.denyRe && this.denyRe.test(line.toLowerCase())) this.add('identity', at);
      if (aiMark(line) && !TOOL_HEADERS.includes(line.trim())) this.add('ai-mark', at);
      if (LOCAL_PATHS.some((p) => line.includes(p))) this.add('local-path', at);
      if (SECRET_PATTERNS.some((re) => re.test(line))) this.add('secret', at);
      for (const m of line.matchAll(/[1-9A-HJ-NP-Za-km-z]{85,90}/g)) if (base58Length(m[0]) === 64) this.add('secret', `${at} (64-byte base58 key)`);
      if (this.secrets.some((v) => line.includes(v))) this.add('secret', `${at} (env file value)`);
      const d = DASH.exec(line);
      if (d && !vendor) this.add('dash', `${at} (U+${d[0].codePointAt(0).toString(16).toUpperCase()})`);
      const u = INVISIBLE.exec(line);
      if (u) this.add('unicode', `${at} (U+${u[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
    });
  }

  comments(src, rel) {
    if (CONFIG.vendor.some((v) => rel.replace(/^[0-9a-f]{12}:/, '').startsWith(v))) return;
    const lang = langOf(rel);
    if (!lang) return;
    let spans;
    try { spans = scanSource(src, lang); } catch (err) { this.add('comment', `${rel} (cannot parse: ${err.message})`); return; }
    for (const s of spans) {
      const t = s.text.trim();
      if (ALLOWED_COMMENT.some((re) => re.test(t))) continue;
      if (BUSINESS.some((re) => re.test(t))) this.add('comment', `${rel}:${src.slice(0, s.start).split('\n').length}`);
    }
  }

  binary(buf, rel) {
    const head = buf.subarray(0, 8000);
    if (!head.includes(0)) return false;
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      for (let p = 8; p + 8 <= buf.length;) {
        const len = buf.readUInt32BE(p);
        const type = buf.subarray(p + 4, p + 8).toString('latin1');
        if (['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'].includes(type)) this.add('binary', `${rel} (PNG ${type} chunk)`);
        p += 12 + len;
      }
    } else if (buf[0] === 0xff && buf[1] === 0xd8) {
      for (let p = 2; p + 4 <= buf.length && buf[p] === 0xff;) {
        const marker = buf[p + 1];
        const len = buf.readUInt16BE(p + 2);
        if (marker === 0xe1 || marker === 0xed || marker === 0xfe) this.add('binary', `${rel} (JPEG metadata segment)`);
        if (marker === 0xda) break;
        p += 2 + len;
      }
    } else {
      this.add('binary', `${rel} (binary file not allowed)`);
    }
    return true;
  }

  file(buf, rel) {
    this.text(rel, `${rel} (path)`);
    if (this.binary(buf, rel)) return;
    const src = buf.toString('utf8');
    this.text(src, rel, { vendor: CONFIG.vendor.some((v) => rel.replace(/^[0-9a-f]{12}:/, '').startsWith(v)) });
    this.comments(src, rel);
  }

  ident(line, where) {
    const m = /^(.*) <(.*)> (\d+) ([+-]\d{4})$/.exec(line.trim());
    if (!m) { this.add('author', `${where} (unreadable identity)`); return; }
    const [, name, email, , tz] = m;
    if (!this.skipAuthor) {
      const ok = CONFIG.allowedAuthors.some((a) => a.name === name && a.email.toLowerCase() === email.toLowerCase())
        || (isAllowedName(name) && isAllowedEmail(email));
      if (!ok) this.add('author', where);
      if (tz !== '+0000') this.add('timezone', `${where} (${tz})`);
    }
    this.text(`${name} ${email}`, where);
  }

  message(msg, where) {
    this.text(msg.split('\n').filter((l) => !l.startsWith('#')).join('\n'), where);
  }

  scanPath(p, root = p) {
    const st = fs.statSync(p);
    const rel = path.relative(fs.statSync(root).isDirectory() ? root : path.dirname(root), p).split(path.sep).join('/');
    if (st.isDirectory()) {
      if (rel && CONFIG.skip.some((s) => `${rel}/`.startsWith(s))) return;
      for (const e of fs.readdirSync(p).sort()) this.scanPath(path.join(p, e), root);
      return;
    }
    this.file(fs.readFileSync(p), rel);
  }

  staged() {
    this.ident(run('git', ['var', 'GIT_AUTHOR_IDENT']), 'author (staged)');
    this.ident(run('git', ['var', 'GIT_COMMITTER_IDENT']), 'committer (staged)');
    const names = run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
    for (const rel of names) this.file(execFileSync('git', ['show', `:${rel}`], { maxBuffer: 64 << 20 }), rel);
  }

  commits(range) {
    const shas = run('git', ['rev-list', ...range]).split('\n').filter(Boolean);
    for (const sha of shas) {
      const short = sha.slice(0, 12);
      const raw = run('git', ['cat-file', 'commit', sha]);
      const [header, ...body] = raw.split('\n\n');
      for (const line of header.split('\n')) {
        if (line.startsWith('author ')) this.ident(line.slice(7), `${short} author`);
        if (line.startsWith('committer ')) this.ident(line.slice(10), `${short} committer`);
      }
      this.message(body.join('\n\n'), `${short} message`);
      const files = run('git', ['diff-tree', '-r', '--root', '--no-commit-id', '--name-only', '--diff-filter=ACMR', '-z', sha]).split('\0').filter(Boolean);
      for (const rel of files) this.file(execFileSync('git', ['show', `${sha}:${rel}`], { maxBuffer: 64 << 20 }), `${short}:${rel}`);
    }
    return shas.length;
  }

  prePush(stdin) {
    const zero = /^0+$/;
    for (const line of stdin.split('\n').filter(Boolean)) {
      const [, local, , remote] = line.split(' ');
      if (zero.test(local)) continue;
      this.commits(zero.test(remote) ? [local, '--not', '--remotes'] : [`${remote}..${local}`]);
    }
  }
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const g = new Guard();
  if (cmd === 'scan' && rest.length) for (const p of rest) g.scanPath(path.resolve(p));
  else if (cmd === 'text') g.text(fs.readFileSync(rest[0] || 0, 'utf8'), rest[0] || 'stdin');
  else if (cmd === 'msg' && rest[0]) g.message(fs.readFileSync(rest[0], 'utf8'), 'commit message');
  else if (cmd === 'staged') g.staged();
  else if (cmd === 'commits' && rest.length) g.commits(rest);
  else if (cmd === 'pre-push') g.prePush(fs.readFileSync(0, 'utf8'));
  else throw Object.assign(new Error('usage: guard.mjs scan <path>... | text [file] | msg <file> | staged | commits <range> | pre-push'), { setup: true });
  for (const f of g.findings) console.error(`guard: ${f}`);
  if (g.findings.length) {
    console.error(`guard: ${g.findings.length} finding(s), blocked`);
    return 1;
  }
  console.error('guard: clean');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (err) { console.error(`guard: ${err.message}`); process.exitCode = err.setup ? 2 : 1; }
}
