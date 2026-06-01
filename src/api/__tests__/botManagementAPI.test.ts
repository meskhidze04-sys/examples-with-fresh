/**
 * Unit Tests for Bot Management API
 * Uses Mocha, Chai, and Sinon for testing
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDatabase } from '../database/InMemoryDatabase';
import { BotConfig, BotTask, BotLog } from '../types/bot';

describe('Bot Management API', () => {
  let db: InMemoryDatabase;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    await db.connect();
  });

  afterEach(async () => {
    await db.disconnect();
  });

  describe('Bot Operations', () => {
    describe('createBot', () => {
      it('should create a new bot', async () => {
        const botId = uuidv4();
        const bot: BotConfig = {
          id: botId,
          name: 'Test Bot',
          description: 'A test bot',
          enabled: true,
          settings: { setting1: 'value1' },
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const created = await db.createBot(bot);

        expect(created).to.deep.equal(bot);
        expect(created.name).to.equal('Test Bot');
      });

      it('should preserve bot settings', async () => {
        const botId = uuidv4();
        const settings = { timeout: 5000, retries: 3, webhook: 'http://example.com' };
        const bot: BotConfig = {
          id: botId,
          name: 'Config Bot',
          description: '',
          enabled: true,
          settings,
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const created = await db.createBot(bot);

        expect(created.settings).to.deep.equal(settings);
      });
    });

    describe('getBotById', () => {
      it('should retrieve a bot by ID', async () => {
        const botId = uuidv4();
        const bot: BotConfig = {
          id: botId,
          name: 'Retrieve Test',
          description: '',
          enabled: true,
          settings: {},
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.createBot(bot);
        const retrieved = await db.getBotById(botId);

        expect(retrieved).to.not.be.null;
        expect(retrieved?.name).to.equal('Retrieve Test');
      });

      it('should return null for non-existent bot', async () => {
        const result = await db.getBotById('non-existent-id');

        expect(result).to.be.null;
      });
    });

    describe('getAllBots', () => {
      it('should return all bots', async () => {
        const bot1: BotConfig = {
          id: uuidv4(),
          name: 'Bot 1',
          description: '',
          enabled: true,
          settings: {},
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const bot2: BotConfig = {
          id: uuidv4(),
          name: 'Bot 2',
          description: '',
          enabled: true,
          settings: {},
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.createBot(bot1);
        await db.createBot(bot2);

        const bots = await db.getAllBots();

        expect(bots).to.have.lengthOf(2);
        expect(bots.map((b) => b.name)).to.include.members(['Bot 1', 'Bot 2']);
      });

      it('should return empty array when no bots exist', async () => {
        const bots = await db.getAllBots();

        expect(bots).to.be.an('array').that.is.empty;
      });
    });

    describe('updateBot', () => {
      it('should update bot properties', async () => {
        const botId = uuidv4();
        const bot: BotConfig = {
          id: botId,
          name: 'Original Name',
          description: 'Original Description',
          enabled: true,
          settings: { key: 'value' },
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.createBot(bot);

        const updated = await db.updateBot(botId, {
          name: 'Updated Name',
          status: 'active',
        });

        expect(updated.name).to.equal('Updated Name');
        expect(updated.status).to.equal('active');
        expect(updated.description).to.equal('Original Description');
      });

      it('should update lastRunAt timestamp', async () => {
        const botId = uuidv4();
        const bot: BotConfig = {
          id: botId,
          name: 'Timestamp Bot',
          description: '',
          enabled: true,
          settings: {},
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.createBot(bot);

        const now = new Date();
        const updated = await db.updateBot(botId, {
          lastRunAt: now,
          status: 'active',
        });

        expect(updated.lastRunAt).to.exist;
        expect(updated.lastRunAt?.getTime()).to.be.closeTo(now.getTime(), 100);
      });

      it('should throw error for non-existent bot', async () => {
        try {
          await db.updateBot('non-existent', { name: 'New Name' });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).to.equal('Bot not found');
        }
      });
    });

    describe('deleteBot', () => {
      it('should delete a bot', async () => {
        const botId = uuidv4();
        const bot: BotConfig = {
          id: botId,
          name: 'Delete Test',
          description: '',
          enabled: true,
          settings: {},
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.createBot(bot);
        await db.deleteBot(botId);

        const retrieved = await db.getBotById(botId);

        expect(retrieved).to.be.null;
      });

      it('should delete associated tasks when bot is deleted', async () => {
        const botId = uuidv4();
        const bot: BotConfig = {
          id: botId,
          name: 'Bot with Tasks',
          description: '',
          enabled: true,
          settings: {},
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const task: BotTask = {
          id: uuidv4(),
          botId,
          taskType: 'test',
          config: {},
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        };

        await db.createBot(bot);
        await db.createTask(task);
        await db.deleteBot(botId);

        const tasks = await db.getBotTasks(botId);

        expect(tasks).to.be.empty;
      });
    });
  });

  describe('Task Operations', () => {
    let botId: string;

    beforeEach(async () => {
      botId = uuidv4();
      const bot: BotConfig = {
        id: botId,
        name: 'Task Test Bot',
        description: '',
        enabled: true,
        settings: {},
        status: 'inactive',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.createBot(bot);
    });

    describe('createTask', () => {
      it('should create a new task', async () => {
        const task: BotTask = {
          id: uuidv4(),
          botId,
          taskType: 'email-notification',
          config: { recipients: ['test@example.com'] },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        };

        const created = await db.createTask(task);

        expect(created.taskType).to.equal('email-notification');
        expect(created.config.recipients).to.deep.equal(['test@example.com']);
      });
    });

    describe('getBotTasks', () => {
      it('should retrieve all tasks for a bot', async () => {
        const task1: BotTask = {
          id: uuidv4(),
          botId,
          taskType: 'type1',
          config: {},
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        };

        const task2: BotTask = {
          id: uuidv4(),
          botId,
          taskType: 'type2',
          config: {},
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        };

        await db.createTask(task1);
        await db.createTask(task2);

        const tasks = await db.getBotTasks(botId);

        expect(tasks).to.have.lengthOf(2);
      });

      it('should return empty array for bot with no tasks', async () => {
        const tasks = await db.getBotTasks(botId);

        expect(tasks).to.be.empty;
      });
    });

    describe('updateTask', () => {
      it('should update task properties', async () => {
        const taskId = uuidv4();
        const task: BotTask = {
          id: taskId,
          botId,
          taskType: 'original-type',
          config: { key: 'value' },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 5,
        };

        await db.createTask(task);

        const updated = await db.updateTask(taskId, {
          enabled: false,
          executionCount: 6,
        });

        expect(updated.enabled).to.be.false;
        expect(updated.executionCount).to.equal(6);
        expect(updated.taskType).to.equal('original-type');
      });
    });

    describe('deleteTask', () => {
      it('should delete a task', async () => {
        const taskId = uuidv4();
        const task: BotTask = {
          id: taskId,
          botId,
          taskType: 'test',
          config: {},
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        };

        await db.createTask(task);
        await db.deleteTask(taskId);

        const retrieved = await db.getTaskById(taskId);

        expect(retrieved).to.be.null;
      });
    });
  });

  describe('Log Operations', () => {
    let botId: string;

    beforeEach(async () => {
      botId = uuidv4();
      const bot: BotConfig = {
        id: botId,
        name: 'Log Test Bot',
        description: '',
        enabled: true,
        settings: {},
        status: 'inactive',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.createBot(bot);
    });

    describe('addLog', () => {
      it('should add a log entry', async () => {
        const log: BotLog = {
          id: uuidv4(),
          botId,
          level: 'info',
          message: 'Test log message',
          timestamp: new Date(),
        };

        await db.addLog(log);

        const logs = await db.getBotLogs(botId, 10);

        expect(logs).to.have.lengthOf(1);
        expect(logs[0].message).to.equal('Test log message');
      });

      it('should include metadata in logs', async () => {
        const log: BotLog = {
          id: uuidv4(),
          botId,
          level: 'error',
          message: 'Error occurred',
          timestamp: new Date(),
          metadata: { errorCode: 500, details: 'Internal server error' },
        };

        await db.addLog(log);

        const logs = await db.getBotLogs(botId, 10);

        expect(logs[0].metadata).to.deep.equal({ errorCode: 500, details: 'Internal server error' });
      });
    });

    describe('getBotLogs', () => {
      it('should retrieve logs with limit', async () => {
        for (let i = 0; i < 5; i++) {
          const log: BotLog = {
            id: uuidv4(),
            botId,
            level: 'info',
            message: `Log ${i}`,
            timestamp: new Date(),
          };
          await db.addLog(log);
        }

        const logs = await db.getBotLogs(botId, 3);

        expect(logs).to.have.lengthOf(3);
      });
    });

    describe('getLogsByLevel', () => {
      it('should filter logs by level', async () => {
        const infoLog: BotLog = {
          id: uuidv4(),
          botId,
          level: 'info',
          message: 'Info message',
          timestamp: new Date(),
        };

        const errorLog: BotLog = {
          id: uuidv4(),
          botId,
          level: 'error',
          message: 'Error message',
          timestamp: new Date(),
        };

        await db.addLog(infoLog);
        await db.addLog(errorLog);

        const errorLogs = await db.getLogsByLevel(botId, 'error');

        expect(errorLogs).to.have.lengthOf(1);
        expect(errorLogs[0].level).to.equal('error');
      });
    });

    describe('clearBotLogs', () => {
      it('should clear all logs for a bot', async () => {
        for (let i = 0; i < 3; i++) {
          const log: BotLog = {
            id: uuidv4(),
            botId,
            level: 'info',
            message: `Log ${i}`,
            timestamp: new Date(),
          };
          await db.addLog(log);
        }

        const cleared = await db.clearBotLogs(botId);

        expect(cleared).to.equal(3);

        const logs = await db.getBotLogs(botId, 10);

        expect(logs).to.be.empty;
      });
    });

    describe('clearOldLogs', () => {
      it('should clear logs older than specified days', async () => {
        const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
        const recentDate = new Date();

        const oldLog: BotLog = {
          id: uuidv4(),
          botId,
          level: 'info',
          message: 'Old log',
          timestamp: oldDate,
        };

        const recentLog: BotLog = {
          id: uuidv4(),
          botId,
          level: 'info',
          message: 'Recent log',
          timestamp: recentDate,
        };

        await db.addLog(oldLog);
        await db.addLog(recentLog);

        const cleared = await db.clearOldLogs(7); // Clear logs older than 7 days

        expect(cleared).to.equal(1);

        const logs = await db.getBotLogs(botId, 10);

        expect(logs).to.have.lengthOf(1);
        expect(logs[0].message).to.equal('Recent log');
      });
    });
  });

  describe('Database Connection', () => {
    it('should perform health check', async () => {
      const health = await db.healthCheck();

      expect(health).to.be.true;
    });

    it('should disconnect gracefully', async () => {
      await db.disconnect();

      const health = await db.healthCheck();

      expect(health).to.be.true; // In-memory DB always healthy
    });
  });
});
