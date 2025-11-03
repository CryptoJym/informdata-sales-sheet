import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { EOL } from 'node:os';
import readline from 'node:readline';

interface Options {
  input: string;
  target: string;
  delayMs: number;
  once: boolean;
}

interface ReplayFrame {
  lineNumber: number;
  raw: string;
}

function parseArgs(argv: string[]): Options {
  const args = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args.set(key, value);
    }
  }

  const input = args.get('input');
  const target = args.get('target');
  if (!input || !target) {
    throw new Error('Usage: ts-node src/replay.ts --input <file.ndjson> --target <url> [--delay 250] [--once]');
  }

  return {
    input,
    target,
    delayMs: Number(args.get('delay') ?? 250),
    once: args.has('once'),
  };
}

async function loadFrames(path: string): Promise<ReplayFrame[]> {
  await access(path);
  const stream = createReadStream(path, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const frames: ReplayFrame[] = [];
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      JSON.parse(trimmed);
      frames.push({ lineNumber, raw: trimmed });
    } catch (error) {
      console.warn(`⚠️  Skipping line ${lineNumber}: not valid JSON (${(error as Error).message})`);
    }
  }
  return frames;
}

async function replayFrames(frames: ReplayFrame[], options: Options) {
  const iterations = options.once ? 1 : 2;
  console.log(`🔁 Replaying ${frames.length} webhook events to ${options.target} (${iterations} iteration${iterations === 1 ? '' : 's'})`);

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    console.log(`\n▶️  Iteration ${iteration}/${iterations}`);
    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i];
      const started = performance.now();
      try {
        const res = await fetch(options.target, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-informdata-replay': 'demo',
            'x-informdata-replay-line': String(frame.lineNumber),
          },
          body: frame.raw + EOL,
        });

        const ms = (performance.now() - started).toFixed(1);
        const outcome = res.ok ? '✅' : '⚠️';
        console.log(`${outcome} [${res.status}] line ${frame.lineNumber} (${ms} ms)`);
      } catch (error) {
        console.error(`❌ line ${frame.lineNumber} failed: ${(error as Error).message}`);
      }

      if (i < frames.length - 1) {
        await delay(options.delayMs);
      }
    }
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv);
    const frames = await loadFrames(options.input);
    if (frames.length === 0) {
      console.warn('No valid payloads found in the input file.');
      return;
    }
    await replayFrames(frames, options);
    console.log('\n✅ Replay finished');
  } catch (error) {
    console.error(`Fatal: ${(error as Error).message}`);
    process.exit(1);
  }
}

void main();
