#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyChain, verifyEntry, proofChecker, anchorChecker, checkAnchor } from '../../web/js/ledgerverify.js';
import { SERVER_URL, MAINNET, COT_PROGRAM_ID } from '../../web/js/buildprofile.js';

export { checkAnchor };

const DAY_MS = 86400e3;
const ACCT_RE = /^[0-9a-f]{40}$/;
const PID_RE = /^[a-z2-7]{32}$/;

export function parseArgs(argv) {
  const o = { base: SERVER_URL, days: 400, json: false, mainnet: MAINNET, program: COT_PROGRAM_ID };
  const flags = { '--acct': 'acct', '--base': 'base', '--rpc': 'rpc', '--anchor-key': 'anchorKey', '--from': 'from', '--days': 'days', '--file': 'file', '--rules-ref': 'rulesRef', '--program': 'program', '--known': 'known' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--mainnet') o.mainnet = true;
    else if (Object.hasOwn(flags, a)) {
      if (a === '--days' || a === '--from') o.limited = true;
      if (i + 1 >= argv.length) return { error: `${a} needs a value` };
      o[flags[a]] = argv[++i];
    } else if (!a.startsWith('--') && !o.pid) o.pid = a;
    else return { error: `unknown argument ${a}` };
  }
  if (!o.pid || !PID_RE.test(o.pid)) return { error: 'the account must be its public audit id (32 characters of a-z and 2-7)' };
  if (o.acct !== undefined && !ACCT_RE.test(o.acct)) return { error: '--acct must be 40 hex characters' };
  o.days = Number(o.days);
  if (!Number.isSafeInteger(o.days) || o.days < 1) return { error: '--days must be a positive integer' };
  if (o.from && !/^\d{4}-\d{2}-\d{2}$/.test(o.from)) return { error: '--from must be YYYY-MM-DD' };
  if (o.mainnet && !o.rpc) return { error: 'mainnet mode needs --rpc: every anchor must be read on chain' };
  if (o.known !== undefined) {
    const m = /^(\d+):([0-9a-f]{64})$/.exec(o.known);
    if (!m) return { error: '--known must be <seq>:<64 hex hash>' };
    o.known = { seq: Number(m[1]), hash: m[2] };
  }
  o.base = String(o.base).replace(/\/+$/, '');
  return o;
}

export function historyProblem(o, entries, head) {
  if (!entries.length) return { why: 'no entries' };
  if (!o.limited && !o.file && entries[0].seq !== 1) return { why: `the history starts at seq ${entries[0].seq}, not at seq 1 (cut)` };
  if (head) {
    const at = entries.find((x) => x.seq === head.seq);
    if (entries.at(-1).seq < head.seq) return { why: `the history ends at seq ${entries.at(-1).seq}, the server head is seq ${head.seq}` };
    if (!at || at.hash !== head.hash) return { why: `seq ${head.seq} does not match the server head hash` };
  }
  if (o.known) {
    const k = entries.find((x) => x.seq === o.known.seq);
    if (!k && (o.known.seq >= entries[0].seq || !o.limited)) return { why: `known entry seq ${o.known.seq} is gone (cut)` };
    if (k && k.hash !== o.known.hash) return { why: `known entry seq ${o.known.seq} was rewritten` };
  }
  return null;
}

export function codeRef(dir = fileURLToPath(new URL('../..', import.meta.url))) {
  const manifest = path.join(dir, 'core-manifest.json');
  if (fs.existsSync(manifest)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (!/^[0-9a-f]{40}$/.test(String(m.rules || ''))) return null;
      for (const [rel, want] of Object.entries(m.files || {})) {
        if (!/^(web\/js|server\/src)\//.test(rel)) continue;
        if (createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex') !== want) return null;
      }
      return m.rules;
    } catch {
      return null;
    }
  }
  try {
    const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (git('status', '--porcelain', '--', 'web/js', 'server/src')) return null;
    return git('rev-parse', 'HEAD') || null;
  } catch {
    return null;
  }
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TRIES_503 = 5;

async function getJson(fetchFn, url, sleep = sleepMs) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetchFn(url);
    if (res.status === 503 && attempt < TRIES_503) {
      const s = Number.parseInt(res.headers?.get?.('retry-after'), 10);
      await sleep(1000 * Math.min(30, Math.max(1, Number.isFinite(s) ? s : 5)));
      continue;
    }
    if (res.status === 404) return null;
    if (res.status === 503) throw new Error(`${url}: HTTP 503 after ${TRIES_503} attempts (server is finishing a deploy; run again in a few minutes)`);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  }
}

export async function download(o, { fetchFn, now, sleep }) {
  const head = await getJson(fetchFn, `${o.base}/audit/${o.pid}/head`, sleep);
  const top = head?.head?.seq || 0;
  const bySeq = new Map();
  const stop = o.from ? Date.parse(`${o.from}T00:00:00Z`) : -Infinity;
  for (let i = 0, t = Math.floor(now / DAY_MS) * DAY_MS; i < o.days && t >= stop; i++, t -= DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    for (let after = 0, pages = 0; pages < 1000; pages++) {
      const r = await getJson(fetchFn, `${o.base}/audit/${o.pid}/day/${day}${after ? `?after=${after}` : ''}`, sleep);
      for (const e of r?.entries || []) bySeq.set(e.seq, e);
      if (!Number.isSafeInteger(r?.next) || r.next <= after) break;
      after = r.next;
    }
    if (bySeq.has(1) || (top && [...bySeq.keys()].filter((s) => s <= top).length >= top)) break;
  }
  return { entries: [...bySeq.values()].sort((a, b) => a.seq - b.seq), head: head?.head || null };
}

const FAIL = new Set(['bad', 'fail']);

export function rulesHint(commit) {
  return `recorded under rules ${commit}: run the verifier from the core release whose core-manifest.json "rules" is ${commit} to replay this draw, or pass --rules-ref any to replay it with this code`;
}

export function notFinalReasons(rows) {
  const n = (label) => rows.filter((x) => x.label === label).length;
  const reasons = [];
  const rules = rows.filter((x) => x.label === 'RULES');
  if (rules.length) reasons.push({ code: 'rules', count: rules.length, commits: [...new Set(rules.map((x) => x.rules))] });
  if (n('PEND') + n('UNCHECKED')) reasons.push({ code: 'anchors', count: n('PEND') + n('UNCHECKED'), pending: n('PEND'), unchecked: n('UNCHECKED') });
  const norule = rows.filter((x) => x.label === 'SIG' && x.why === 'no rule').length;
  if (n('SIG') - norule) reasons.push({ code: 'sig', count: n('SIG') - norule });
  if (norule) reasons.push({ code: 'norule', count: norule });
  if (n('HIDDEN')) reasons.push({ code: 'hidden', count: n('HIDDEN') });
  if (n('WAIT')) reasons.push({ code: 'wait', count: n('WAIT') });
  return reasons;
}

function reasonText(x) {
  if (x.code === 'rules') return `${x.count} ${x.count === 1 ? 'entry' : 'entries'} recorded under other rules (${x.commits.join(', ')}), rule replay not run: re-check them with the core release of those rules or --rules-ref any`;
  if (x.code === 'sig') return `${x.count} ${x.count === 1 ? 'draw' : 'draws'} checked by drand signature only: no rule replayed the outcome (a kind without a replay rule, or its public record not readable here)`;
  if (x.code === 'norule') return `${x.count} ${x.count === 1 ? 'entry' : 'entries'} with no rule to re-run (no draw, fixed table or price): proven by the hash chain and anchor only`;
  if (x.code === 'hidden') return `${x.count} ${x.count === 1 ? 'entry' : 'entries'} hidden by the public view (wallets shortened or data withheld), not verified here: the account verifies them in full in its Statement`;
  if (x.code === 'anchors') return `${x.count} ${x.count === 1 ? 'anchor' : 'anchors'} not final (${x.pending} pending, ${x.unchecked} not read on chain)`;
  return `${x.count} ${x.count === 1 ? 'entry' : 'entries'} still waiting for a check`;
}

export function rowLabel(r) {
  if (FAIL.has(r.status)) return 'FAIL';
  if (r.status === 'rules') return 'RULES';
  if (r.status === 'sig') return 'SIG';
  if (r.status === 'hidden') return 'HIDDEN';
  if (r.status !== 'ok') return 'WAIT';
  return r.steps.anchor === 'ok' ? 'PASS' : r.steps.anchor === 'pending' ? 'PEND' : 'UNCHECKED';
}

export async function verifyAccount(o, entries, { fetchFn, info, rulesRef = null, now = Date.now(), head = null } = {}) {
  let leafHidden = false;
  const check = o.acct ? proofChecker(o.acct, (acct, seq) => getJson(fetchFn, `${o.base}/api/ledger/proof/${o.pid}/${seq}`)
    .then((p) => {
      if (p?.leaf && p.leaf.seqFrom === undefined) { leafHidden = true; return null; }
      return p?.leaf ? { ...p, acct, leaf: { ...p.leaf, acct } } : p;
    }).catch(() => null)) : undefined;
  const merkle = check ? async (e, all) => { const r = await check(e, all); return leafHidden ? 'skip' : r; } : undefined;
  const anchor = anchorChecker({
    rpc: o.rpc, anchorKey: o.anchorKey, programId: o.program, mainnet: !!o.mainnet, fetchFn, now,
    getEpoch: (n) => getJson(fetchFn, `${o.base}/api/ledger/tx/${n}`),
  });
  const usdDay = (day) => getJson(fetchFn, `${o.base}/realm/index/day/${day}`);
  const duelLog = (match) => getJson(fetchFn, `${o.base}/duel/${encodeURIComponent(match)}/log`);
  const claimRef = o.acct && o.rpc ? { rpc: o.rpc, programId: o.program, fetchFn } : undefined;
  const rows = [];
  const chain = await verifyChain(entries);
  const history = historyProblem(o, entries, head);
  for (const e of entries) {
    const r = await verifyEntry(e, entries, { info, merkle, anchor, rulesRef, usdDay, mainnet: !!o.mainnet, duelLog, claimRef }).catch((err) => ({ status: 'fail', why: err.message, steps: {} }));
    const why = (r.why === 'anchor' || r.steps.anchor === 'pending' || r.steps.anchor === 'unchecked' ? `anchor ${r.anchor?.status}: ${r.anchor?.why}` : r.why)
      || (r.merkle?.status === 'bad' ? `merkle: ${r.merkle.why}` : undefined)
      || (r.rules ? rulesHint(r.rules) : undefined);
    const row = { seq: e.seq, kind: e.kind, status: r.status, why, epoch: r.merkle?.epoch, steps: r.steps, ...(r.rules ? { rules: r.rules } : {}) };
    rows.push({ ...row, label: rowLabel(row) });
  }
  const counts = {};
  for (const x of rows) counts[x.label] = (counts[x.label] || 0) + 1;
  const ok = chain.ok && !history && entries.length > 0 && !rows.some((x) => FAIL.has(x.status));
  const final = ok && rows.every((x) => x.label === 'PASS');
  const inert = rows.filter((x) => x.status === 'ok' && x.steps?.rule === 'none').length;
  return { ok, final, reasons: ok && !final ? notFinalReasons(rows) : [], chain, history, rows, counts, inert };
}

export function report(o, entries, v) {
  const lines = [`account ${o.pid}: ${entries.length} entries${entries.length ? `, seq ${entries[0].seq} to ${entries.at(-1).seq}` : ''}`];
  if (!v.chain.ok) lines.push(`FAIL hash chain: ${v.chain.why} at seq ${v.chain.at ?? '?'}`);
  if (v.history) lines.push(`FAIL history: ${v.history.why}`);
  for (const r of v.rows) {
    const steps = Object.entries(r.steps).map(([k, s]) => `${k}=${s}`).join(' ');
    lines.push(`${r.label} seq ${r.seq} ${r.kind}${r.epoch !== undefined ? ` epoch ${r.epoch}` : ''}  ${steps}${r.why ? `  (${r.why})` : ''}`);
  }
  const tally = Object.entries(v.counts).map(([k, n]) => `${n} ${k}`).join(', ') || 'no entries';
  const why = (v.reasons || []).map(reasonText).join('; ');
  if (v.inert) lines.push(`NOTE: ${v.inert} of the passing ${v.inert === 1 ? 'entries moves' : 'entries move'} no value (no rule to re-run): proven by the hash chain and anchor, and by holding only the fields of a kind that changes nothing`);
  lines.push(replayLine(replayTally(v.rows)));
  lines.push(`${v.ok ? (v.final ? 'PASS' : `PASS, NOT FINAL (${why || 'not every entry passed'})`) : 'FAIL'}: ${tally}`);
  const w = hiddenWarning(v.rows);
  if (w) lines.push(w);
  return lines.join('\n');
}

export function hiddenWarning(rows) {
  const k = rows.filter((x) => x.label === 'HIDDEN').length;
  if (!k) return null;
  return `WARNING: ${k} hidden ${k === 1 ? 'entry was' : 'entries were'} NOT verified: their data is withheld or masked by the public view, so a dishonest server could have hidden a draw or a payment there (a drand proof they show was still checked). Only the account's own Statement verifies them in full.`;
}

const noRuleRow = (x) => x.label === 'SIG' && x.why === 'no rule';

export function noReplayLine(rows) {
  const replayed = rows.filter((x) => x.steps?.rule === 'ok').length;
  const skipped = rows.filter((x) => x.label === 'RULES' || (x.label === 'SIG' && !noRuleRow(x)));
  if (replayed || !skipped.length) return null;
  const commits = [...new Set(skipped.filter((x) => x.rules).map((x) => x.rules))];
  const how = commits.length
    ? `run the verifier from the core release whose core-manifest.json "rules" is ${commits.join(' or ')}, or pass --rules-ref any to replay them with this code`
    : 'no rule replayed any of them (signature only)';
  return `NOT VERIFIED: 0 of ${skipped.length} ${skipped.length === 1 ? 'draw entry' : 'draw entries'} replayed, so no outcome was checked: ${how} (exit code 3)`;
}

export function replayTally(rows) {
  const replayed = rows.filter((x) => x.steps?.rule === 'ok').length;
  const signatureOnly = rows.filter((x) => x.label === 'SIG' && !noRuleRow(x)).length;
  const otherRules = rows.filter((x) => x.label === 'RULES').length;
  return { replayed, total: replayed + signatureOnly + otherRules, signatureOnly, otherRules };
}

export function replayLine(t) {
  return `replayed ${t.replayed} of ${t.total} ${t.total === 1 ? 'draw entry' : 'draw entries'} (${t.signatureOnly} signature only, ${t.otherRules} other rules)`;
}

export async function main(argv, deps = {}) {
  const out = deps.out || ((s) => console.log(s));
  const fetchFn = deps.fetchFn || ((...a) => globalThis.fetch(...a));
  const o = parseArgs(argv);
  if (o.error) {
    out(`error: ${o.error}\nusage: node tools/verify/verify.mjs <pid> [--acct ACCT] [--base URL] [--rpc URL] [--anchor-key PUBKEY] [--mainnet] [--program ID] [--known SEQ:HASH] [--from YYYY-MM-DD] [--days N] [--file entries.json] [--json]`);
    return 2;
  }
  const now = deps.now ?? Date.now();
  let entries;
  let head = null;
  try {
    if (o.file) entries = JSON.parse(fs.readFileSync(o.file, 'utf8'));
    else ({ entries, head } = await download(o, { fetchFn, now }));
  } catch (err) {
    out(`error: could not read the ledger: ${err.message}`);
    return 2;
  }
  const rulesRef = o.rulesRef ?? (deps.rulesRef !== undefined ? deps.rulesRef : codeRef());
  const v = await verifyAccount(o, entries, { fetchFn, info: deps.info, rulesRef, now, head });
  const warning = hiddenWarning(v.rows);
  const noReplay = v.ok ? noReplayLine(v.rows) : null;
  out(o.json ? JSON.stringify({ pid: o.pid, ok: v.ok, final: v.final, reasons: v.reasons, ...(warning ? { warning } : {}), ...(noReplay ? { noReplay } : {}), replay: replayTally(v.rows), chain: v.chain, history: v.history, counts: v.counts, inert: v.inert, entries: v.rows }, null, 2)
    : `${report(o, entries, v)}${noReplay ? `\n${noReplay}` : ''}`);
  return v.ok ? (noReplay ? 3 : 0) : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exitCode = await main(process.argv.slice(2));
