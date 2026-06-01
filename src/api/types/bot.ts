/**
 * Bot Configuration Types and Interfaces
 */

export interface BotConfig {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  owner?: string;
}

export interface BotTask {
  id: string;
  botId: string;
  taskType: string;
  config: Record<string, any>;
  enabled: boolean;
  schedule?: string; // cron expression
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount: number;
}

export interface BotLog {
  id: string;
  botId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BotStatistics {
  botId: string;
  botName: string;
  status: string;
  enabled: boolean;
  tasksCount: number;
  tasksEnabled: number;
  logsCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  uptime?: number;
  totalExecutions: number;
  failureCount: number;
}

export interface SystemStatistics {
  totalBots: number;
  activeBots: number;
  inactiveBots: number;
  errorBots: number;
  totalTasks: number;
  totalLogs: number;
  timestamp: Date;
}

export interface CreateBotRequest {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface UpdateBotRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
  enabled?: boolean;
}

export interface CreateTaskRequest {
  taskType: string;
  config?: Record<string, any>;
  schedule?: string;
  enabled?: boolean;
}

export interface UpdateTaskRequest {
  taskType?: string;
  config?: Record<string, any>;
  schedule?: string;
  enabled?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  total?: number;
  page?: number;
  pageSize?: number;
}
