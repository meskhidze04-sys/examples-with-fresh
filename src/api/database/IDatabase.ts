/**
 * Database Layer - Abstract interface for data persistence
 * Supports multiple backends (SQLite, MySQL, PostgreSQL, MongoDB)
 */

import { BotConfig, BotTask, BotLog } from '../types/bot';

export interface IDatabase {
  // Bot operations
  getAllBots(): Promise<BotConfig[]>;
  getBotById(botId: string): Promise<BotConfig | null>;
  createBot(bot: BotConfig): Promise<BotConfig>;
  updateBot(botId: string, updates: Partial<BotConfig>): Promise<BotConfig>;
  deleteBot(botId: string): Promise<void>;

  // Task operations
  getBotTasks(botId: string): Promise<BotTask[]>;
  getTaskById(taskId: string): Promise<BotTask | null>;
  createTask(task: BotTask): Promise<BotTask>;
  updateTask(taskId: string, updates: Partial<BotTask>): Promise<BotTask>;
  deleteTask(taskId: string): Promise<void>;
  deleteTasksByBotId(botId: string): Promise<void>;

  // Log operations
  addLog(log: BotLog): Promise<void>;
  getBotLogs(botId: string, limit?: number): Promise<BotLog[]>;
  getLogsByLevel(botId: string, level: string): Promise<BotLog[]>;
  clearBotLogs(botId: string): Promise<number>;
  clearOldLogs(olderThanDays: number): Promise<number>;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export abstract class BaseDatabase implements IDatabase {
  abstract getAllBots(): Promise<BotConfig[]>;
  abstract getBotById(botId: string): Promise<BotConfig | null>;
  abstract createBot(bot: BotConfig): Promise<BotConfig>;
  abstract updateBot(botId: string, updates: Partial<BotConfig>): Promise<BotConfig>;
  abstract deleteBot(botId: string): Promise<void>;
  abstract getBotTasks(botId: string): Promise<BotTask[]>;
  abstract getTaskById(taskId: string): Promise<BotTask | null>;
  abstract createTask(task: BotTask): Promise<BotTask>;
  abstract updateTask(taskId: string, updates: Partial<BotTask>): Promise<BotTask>;
  abstract deleteTask(taskId: string): Promise<void>;
  abstract deleteTasksByBotId(botId: string): Promise<void>;
  abstract addLog(log: BotLog): Promise<void>;
  abstract getBotLogs(botId: string, limit?: number): Promise<BotLog[]>;
  abstract getLogsByLevel(botId: string, level: string): Promise<BotLog[]>;
  abstract clearBotLogs(botId: string): Promise<number>;
  abstract clearOldLogs(olderThanDays: number): Promise<number>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
}
