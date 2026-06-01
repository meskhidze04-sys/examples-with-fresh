/**
 * SQLite Database Implementation
 * Provides persistence layer for bot management data
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { BaseDatabase } from './IDatabase';
import { BotConfig, BotTask, BotLog } from '../types/bot';

export class SQLiteDatabase extends BaseDatabase {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = ':memory:') {
    super();
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else this.initializeSchema().then(resolve).catch(reject);
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.run('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async initializeSchema(): Promise<void> {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT 1,
        settings TEXT,
        status TEXT DEFAULT 'inactive',
        errorMessage TEXT,
        owner TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastRunAt DATETIME
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        botId TEXT NOT NULL,
        taskType TEXT NOT NULL,
        config TEXT,
        enabled BOOLEAN DEFAULT 1,
        schedule TEXT,
        executionCount INTEGER DEFAULT 0,
        lastExecutedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (botId) REFERENCES bots(id)
      )`,
      `CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        botId TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (botId) REFERENCES bots(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_botId ON tasks(botId)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_botId ON logs(botId)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)`,
    ];

    for (const schema of schemas) {
      await this.run(schema);
    }
  }

  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) reject(new Error('Database not connected'));
      this.db!.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) reject(new Error('Database not connected'));
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) reject(new Error('Database not connected'));
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Bot operations
  async getAllBots(): Promise<BotConfig[]> {
    const rows = await this.all('SELECT * FROM bots');
    return rows.map((row) => this.parseBotRow(row));
  }

  async getBotById(botId: string): Promise<BotConfig | null> {
    const row = await this.get('SELECT * FROM bots WHERE id = ?', [botId]);
    return row ? this.parseBotRow(row) : null;
  }

  async createBot(bot: BotConfig): Promise<BotConfig> {
    await this.run(
      `INSERT INTO bots (id, name, description, enabled, settings, status, owner, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bot.id,
        bot.name,
        bot.description,
        bot.enabled ? 1 : 0,
        JSON.stringify(bot.settings),
        bot.status,
        bot.owner,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    return bot;
  }

  async updateBot(botId: string, updates: Partial<BotConfig>): Promise<BotConfig> {
    const bot = await this.getBotById(botId);
    if (!bot) throw new Error('Bot not found');

    const updated = { ...bot, ...updates, updatedAt: new Date() };

    await this.run(
      `UPDATE bots SET name = ?, description = ?, enabled = ?, settings = ?, status = ?, 
        errorMessage = ?, lastRunAt = ?, updatedAt = ? WHERE id = ?`,
      [
        updated.name,
        updated.description,
        updated.enabled ? 1 : 0,
        JSON.stringify(updated.settings),
        updated.status,
        updated.errorMessage,
        updated.lastRunAt?.toISOString(),
        updated.updatedAt.toISOString(),
        botId,
      ]
    );

    return updated;
  }

  async deleteBot(botId: string): Promise<void> {
    await this.run('DELETE FROM bots WHERE id = ?', [botId]);
  }

  // Task operations
  async getBotTasks(botId: string): Promise<BotTask[]> {
    const rows = await this.all('SELECT * FROM tasks WHERE botId = ?', [botId]);
    return rows.map((row) => this.parseTaskRow(row));
  }

  async getTaskById(taskId: string): Promise<BotTask | null> {
    const row = await this.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return row ? this.parseTaskRow(row) : null;
  }

  async createTask(task: BotTask): Promise<BotTask> {
    await this.run(
      `INSERT INTO tasks (id, botId, taskType, config, enabled, schedule, createdAt, updatedAt, executionCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.botId,
        task.taskType,
        JSON.stringify(task.config),
        task.enabled ? 1 : 0,
        task.schedule,
        new Date().toISOString(),
        new Date().toISOString(),
        0,
      ]
    );
    return task;
  }

  async updateTask(taskId: string, updates: Partial<BotTask>): Promise<BotTask> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    const updated = { ...task, ...updates, updatedAt: new Date() };

    await this.run(
      `UPDATE tasks SET taskType = ?, config = ?, enabled = ?, schedule = ?, 
        lastExecutedAt = ?, executionCount = ?, updatedAt = ? WHERE id = ?`,
      [
        updated.taskType,
        JSON.stringify(updated.config),
        updated.enabled ? 1 : 0,
        updated.schedule,
        updated.lastExecutedAt?.toISOString(),
        updated.executionCount,
        updated.updatedAt.toISOString(),
        taskId,
      ]
    );

    return updated;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.run('DELETE FROM tasks WHERE id = ?', [taskId]);
  }

  async deleteTasksByBotId(botId: string): Promise<void> {
    await this.run('DELETE FROM tasks WHERE botId = ?', [botId]);
  }

  // Log operations
  async addLog(log: BotLog): Promise<void> {
    await this.run(
      `INSERT INTO logs (id, botId, level, message, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.botId,
        log.level,
        log.message,
        log.metadata ? JSON.stringify(log.metadata) : null,
        log.timestamp.toISOString(),
      ]
    );
  }

  async getBotLogs(botId: string, limit: number = 100): Promise<BotLog[]> {
    const rows = await this.all(
      'SELECT * FROM logs WHERE botId = ? ORDER BY timestamp DESC LIMIT ?',
      [botId, limit]
    );
    return rows.map((row) => this.parseLogRow(row)).reverse();
  }

  async getLogsByLevel(botId: string, level: string): Promise<BotLog[]> {
    const rows = await this.all(
      'SELECT * FROM logs WHERE botId = ? AND level = ? ORDER BY timestamp DESC',
      [botId, level]
    );
    return rows.map((row) => this.parseLogRow(row));
  }

  async clearBotLogs(botId: string): Promise<number> {
    const countRow = await this.get('SELECT COUNT(*) as count FROM logs WHERE botId = ?', [botId]);
    const count = countRow?.count || 0;
    await this.run('DELETE FROM logs WHERE botId = ?', [botId]);
    return count;
  }

  async clearOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const countRow = await this.get('SELECT COUNT(*) as count FROM logs WHERE timestamp < ?', [
      cutoffDate.toISOString(),
    ]);
    const count = countRow?.count || 0;
    await this.run('DELETE FROM logs WHERE timestamp < ?', [cutoffDate.toISOString()]);
    return count;
  }

  // Helper methods
  private parseBotRow(row: any): BotConfig {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: row.enabled === 1,
      settings: row.settings ? JSON.parse(row.settings) : {},
      status: row.status,
      errorMessage: row.errorMessage,
      owner: row.owner,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastRunAt: row.lastRunAt ? new Date(row.lastRunAt) : undefined,
    };
  }

  private parseTaskRow(row: any): BotTask {
    return {
      id: row.id,
      botId: row.botId,
      taskType: row.taskType,
      config: row.config ? JSON.parse(row.config) : {},
      enabled: row.enabled === 1,
      schedule: row.schedule,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastExecutedAt: row.lastExecutedAt ? new Date(row.lastExecutedAt) : undefined,
      executionCount: row.executionCount || 0,
    };
  }

  private parseLogRow(row: any): BotLog {
    return {
      id: row.id,
      botId: row.botId,
      level: row.level,
      message: row.message,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
