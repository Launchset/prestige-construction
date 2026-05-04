import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_DIR = process.cwd();
const STATE_PATH = path.join(
  ROOT_DIR,
  "scripts",
  "scraper",
  "pdf-feature-review-batch-state.json",
);

type BatchState = {
  status: "idle" | "running" | "complete" | "failed" | "stopped";
  stage: "none" | "import_approved" | "extract_next_batch";
  started_at: string | null;
  finished_at: string | null;
  message: string;
  log: string[];
};

let running = false;
let stopRequested = false;
let currentChild: ChildProcessWithoutNullStreams | null = null;
let stateWriteQueue = Promise.resolve();

function defaultState(): BatchState {
  return {
    status: "idle",
    stage: "none",
    started_at: null,
    finished_at: null,
    message: "No batch has been run from the UI yet.",
    log: [],
  };
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    return JSON.parse(raw) as BatchState;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return defaultState();
    }

    if (error instanceof SyntaxError) {
      const resetState: BatchState = {
        ...defaultState(),
        status: "failed",
        finished_at: new Date().toISOString(),
        message: "Batch state file was corrupted. It has been reset.",
      };

      return resetState;
    }

    throw error;
  }
}

async function writeState(state: BatchState) {
  stateWriteQueue = stateWriteQueue.then(() =>
    fs.writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8"),
  );

  await stateWriteQueue;
}

async function appendLog(line: string) {
  const state = await readState();

  state.log = [...state.log, line].slice(-120);
  await writeState(state);
}

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      env,
      shell: false,
      windowsHide: true,
    });
    currentChild = child;

    child.stdout.on("data", (chunk) => {
      for (const line of String(chunk).split(/\r?\n/).filter(Boolean)) {
        void appendLog(line);
      }
    });

    child.stderr.on("data", (chunk) => {
      for (const line of String(chunk).split(/\r?\n/).filter(Boolean)) {
        void appendLog(line);
      }
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      currentChild = null;

      if (stopRequested) {
        reject(new Error(`Batch stopped while running ${command} ${args.join(" ")}`));
        return;
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? signal}`));
      }
    });
  });
}

async function runBatch(limit: number) {
  const startedAt = new Date().toISOString();

  running = true;
  stopRequested = false;
  await writeState({
    status: "running",
    stage: "import_approved",
    started_at: startedAt,
    finished_at: null,
    message: "Importing approved PDF features to Supabase branch.",
    log: [],
  });

  try {
    await runCommand("node", ["scripts/importApprovedPdfFeatures.mjs"], {
      ...process.env,
      PDF_FEATURE_WRITE: "1",
    });

    if (stopRequested) {
      throw new Error("Batch stopped before extracting the next batch.");
    }

    await writeState({
      ...await readState(),
      status: "running",
      stage: "extract_next_batch",
      message: `Extracting next ${limit} products with Ollama.`,
    });

    await runCommand("node", ["scripts/extractPdfFeatures.mjs"], {
      ...process.env,
      PDF_FEATURE_WRITE: "",
      PDF_FEATURE_OLLAMA_MODEL: process.env.PDF_FEATURE_OLLAMA_MODEL || "llama3.1:8b",
      PDF_FEATURE_LIMIT: String(limit),
    });

    if (stopRequested) {
      throw new Error("Batch stopped.");
    }

    await writeState({
      ...await readState(),
      status: "complete",
      stage: "none",
      finished_at: new Date().toISOString(),
      message: `Imported approved rows and generated the next ${limit}.`,
    });
  } catch (error) {
    await writeState({
      ...await readState(),
      status: stopRequested ? "stopped" : "failed",
      finished_at: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Batch failed.",
    });
  } finally {
    running = false;
    stopRequested = false;
    currentChild = null;
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(await readState(), {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const state = await readState();

  if (running || state.status === "running") {
    return NextResponse.json(
      { error: "A PDF feature batch is already running.", state },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => ({})) as { limit?: number };
  const limit = Number.isInteger(body.limit) && body.limit && body.limit > 0
    ? Math.min(body.limit, 50)
    : 10;

  void runBatch(limit);

  return NextResponse.json({
    status: "started",
    limit,
  });
}

export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const state = await readState();

  if (!running && state.status !== "running") {
    return NextResponse.json({ status: "not_running", state });
  }

  stopRequested = true;

  if (currentChild && !currentChild.killed) {
    currentChild.kill();
  }

  await writeState({
    ...state,
    status: "stopped",
    finished_at: new Date().toISOString(),
    message: "Stop requested. The current process was terminated.",
  });

  running = false;

  return NextResponse.json({ status: "stopped" });
}
