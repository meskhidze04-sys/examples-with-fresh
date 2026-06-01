/**
 * In-Memory Database Implementation
 * Useful for testing and development
 */

import { BaseDatabase } from './IDatabase';
import { BotConfig, BotTask, BotLog } from '../types/bot';

export class InMemoryDatabase extends BaseDatabase {
  private bots: Map<string, BotConfig> = new Map();
  private tasks: Map<string, BotTask> = new Map();
  private logs: BotLog[] = [];

  async connect(): Promise<void> {
    // No-op for in-memory database
  }

  async disconnect(): Promise<void> {
    this.bots.clear();
    this.tasks.clear();
    this.logs = [];
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Bot operations
  async getAllBots(): Promise<BotConfig[]> {
    return Array.from(this.bots.values());
  }

  async getBotById(botId: string): Promise<BotConfig | null> {
    return this.bots.get(botId) || null;
  }

  async createBot(bot: BotConfig): Promise<BotConfig> {
    this.bots.set(bot.id, { ...bot });
    return bot;
  }

  async updateBot(botId: string, updates: Partial<BotConfig>): Promise<BotConfig> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');

    const updated: BotConfig = {
      ...bot,
      ...updates,
      id: bot.id,
      createdAt: bot.createdAt,
      updatedAt: new Date(),
    };

    this.bots.set(botId, updated);
    return updated;
  }

  async deleteBot(botId: string): Promise<void> {
    this.bots.delete(botId);
    // Also delete associated tasks
    Array.from(this.tasks.entries()).forEach(([taskId, task]) => {
      if (task.botId === botId) {
        this.tasks.delete(taskId);
      }
    });
  }

  // Task operations
  async getBotTasks(botId: string): Promise<BotTask[]> {
    return Array.from(this.tasks.values()).filter((task) => task.botId === botId);
  }

  async getTaskById(taskId: string): Promise<BotTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async createTask(task: BotTask): Promise<BotTask> {
    this.tasks.set(task.id, { ...task });
    return task;
  }

  async updateTask(taskId: string, updates: Partial<BotTask>): Promise<BotTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    const updated: BotTask = {
      ...task,
      ...updates,
      id: task.id,
      botId: task.botId,
      createdAt: task.createdAt,
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  async deleteTask(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }

  async deleteTasksByBotId(botId: string): Promise<void> {
    Array.from(this.tasks.entries()).forEach(([taskId, task]) => {
      if (task.botId === botId) {
        this.tasks.delete(taskId);
      }
    });
  }

  // Log operations
  async addLog(log: BotLog): Promise<void> {
    this.logs.push({ ...log });

    // Keep only recent logs
    if (this.logs.length > 10000) {
      this.logs.shift();
    }
  }

  async getBotLogs(botId: string, limit: number = 100): Promise<BotLog[]> {
    return this.logs
      .filter((log) => log.botId === botId)
      .slice(-limit);
  }

  async getLogsByLevel(botId: string, level: string): Promise<BotLog[]> {
    return this.logs.filter((log) => log.botId === botId && log.level === level);
  }

  async clearBotLogs(botId: string): Promise<number> {
    const initialLength = this.logs.length;
    this.logs = this.logs.filter((log) => log.botId !== botId);
    return initialLength - this.logs.length;
  }

  async clearOldLogs(olderThanDays: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const initialLength = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp.getTime() >= cutoffTime);
    return initialLength - this.logs.length;
  }
}
