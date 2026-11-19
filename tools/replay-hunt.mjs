#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditEntryHash, sha256, toHex, utf8 } from '../web/js/net.js';
import { deriveOutcome } from '../web/js/drand.js';
import { PVP } from '../web/js/data.js';
import { spreadOf, HUNT_MULT } from '../web/js/huntsim.js';
import { checkHour, ENGINE_V } from '../web/js/huntengine.js';

export function shapeOf(x) {
  if (!x || typeof x !== 'object') throw new Error('input is not a JSON object');
  const entry = 'data' in x && 'hash' in x ? x : null;
  const data = entry ? (typeof entry.data === 'string' ? JSON.parse(entry.data) : entry.data) : x.refs ? x : { refs: x };
  return { entry, data, refs: data.refs || {} };
}

export async function replayInput(x) {
  const { entry, data, refs } = shapeOf(x);
  const checks = { entry: 'skip', spread: 'skip', engine: 'skip' };
  const out = { checks };
  if (entry) {
    const text = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
    checks.entry = (await auditEntryHash(entry.prev, entry.seq, entry.ts, entry.kind, text)) === entry.hash ? 'ok' : 'bad';
    out.entryHash = entry.hash;
  }
  if (refs.fixed === true) {
    checks.spread = refs.mult === HUNT_MULT ? 'ok' : 'bad';
    if (data.draw?.round) out.round = data.draw.round;
  } else if (data.draw?.randomness && data.actionId) {
    const [u0] = await deriveOutcome(data.draw.randomness, data.actionId, entry?.kind || data.kind || 'hunt', 1);
    checks.spread = spreadOf(u0) === refs.mult ? 'ok' : 'bad';
    out.round = data.draw.round;
  }
  if (refs.engine) {
    const r = checkHour(refs, PVP.share);
    checks.engine = r.ok ? 'ok' : 'bad';
    if (!r.ok) out.why = r.why;
    if (r.replay) out.replay = r.replay;
    out.inputHash = toHex(await sha256(utf8(JSON.stringify(refs.engine))));
    out.legs = refs.engine.legs?.length || 0;
  } else {
    out.why = `no engine input (refs.engine, engine v${ENGINE_V}): an hour paid before the engine was published, or not a hunt reveal`;
  }
  Object.assign(out, { from: refs.from, to: refs.to, gross: refs.gross, mult: refs.mult, earned: refs.earned, war: refs.war, chest: refs.chest, kills: refs.kills, fieldSec: refs.fieldSec });
  out.ok = checks.engine === 'ok' && checks.entry !== 'bad' && checks.spread !== 'bad';
  return out;
}

async function main(argv) {
  const file = argv.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('usage: node tools/replay-hunt.mjs <input.json> [--json]');
    return 2;
  }
  const out = await replayInput(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`hour ${new Date(out.from).toISOString()} to ${new Date(out.to).toISOString()}, ${out.legs || 0} leg(s)`);
    console.log(`checks: entry ${out.checks.entry}, spread ${out.checks.spread}, engine ${out.checks.engine}`);
    if (out.replay) console.log(`replay: gross ${out.replay.gross} (recorded ${out.gross}), kills ${Math.round(out.replay.kills)}, field ${Math.round(out.replay.fieldSec)} s`);
    console.log(`payout: earned ${out.earned} milli, war ${out.war}, chest ${out.chest}, spread ${out.mult}`);
    if (out.inputHash) console.log(`engine input sha256 ${out.inputHash}`);
    console.log(out.ok ? 'OK' : `FAILED${out.why ? `: ${out.why}` : ''}`);
  }
  return out.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = await main(process.argv.slice(2));
