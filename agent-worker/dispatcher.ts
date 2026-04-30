/**
 * Dispatcher for 8gent-social integration.
 *
 * This module handles agent spawn requests from the control plane (8gent-social
 * matching layer). It validates requests, spawns agents in child processes,
 * and tracks lifecycle.
 *
 * Future: Will be wired to agent-mail bus for async dispatch.
 */

import { spawn } from "node:child_process";
import type { AgentProfile } from "./types.ts";

export interface SpawnRequest {
  agentId: string;
  roomName: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface SpawnResult {
  requestId: string;
  agentId: string;
  roomName: string;
  pid: number;
  status: "spawned" | "failed";
  error?: string;
}

interface AgentProcess {
  pid: number;
  agentId: string;
  roomName: string;
  startedAt: Date;
}

class AgentDispatcher {
  private processes: Map<number, AgentProcess> = new Map();

  async spawn(request: SpawnRequest): Promise<SpawnResult> {
    const requestId = request.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const proc = spawn("node", ["--loader", "tsx", "agent-worker/agent-cli.ts", request.agentId, request.roomName], {
        cwd: process.cwd(),
        detached: true,
        stdio: "inherit",
      });

      if (proc.pid === undefined) {
        throw new Error("Failed to get process ID");
      }

      this.processes.set(proc.pid, {
        pid: proc.pid,
        agentId: request.agentId,
        roomName: request.roomName,
        startedAt: new Date(),
      });

      proc.on("exit", (code) => {
        console.log(
          `[dispatcher] agent ${request.agentId} (PID ${proc.pid}) exited with code ${code}`
        );
        this.processes.delete(proc.pid!);
      });

      return {
        requestId,
        agentId: request.agentId,
        roomName: request.roomName,
        pid: proc.pid,
        status: "spawned",
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        requestId,
        agentId: request.agentId,
        roomName: request.roomName,
        pid: -1,
        status: "failed",
        error,
      };
    }
  }

  getProcesses(): AgentProcess[] {
    return Array.from(this.processes.values());
  }

  getProcess(pid: number): AgentProcess | undefined {
    return this.processes.get(pid);
  }

  killProcess(pid: number): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;

    try {
      process.kill(-proc.pid);
      return true;
    } catch {
      return false;
    }
  }
}

export const dispatcher = new AgentDispatcher();
