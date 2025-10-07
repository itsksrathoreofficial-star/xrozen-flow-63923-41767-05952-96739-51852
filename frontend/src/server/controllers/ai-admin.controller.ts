/**
 * AI Admin Controller - Manage AI models and API keys
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { successResponse, errorResponse } from '../utils/response.util';

const FREE_OPENROUTER_MODELS = [
  { id: "alibaba/tongyi-deepresearch-30b-a3b:free", name: "Alibaba Tongyi DeepResearch 30B", limit: 20 },
  { id: "meituan/longcat-flash-chat:free", name: "Meituan LongCat Flash Chat", limit: 20 },
  { id: "nvidia/nemotron-nano-9b-v2:free", name: "NVIDIA Nemotron Nano 9B v2", limit: 20 },
  { id: "deepseek/deepseek-chat-v3.1:free", name: "DeepSeek Chat v3.1", limit: 20 },
  { id: "openai/gpt-oss-20b:free", name: "OpenAI GPT OSS 20B", limit: 20 },
  { id: "z-ai/glm-4.5-air:free", name: "Z-AI GLM 4.5 Air", limit: 20 },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder", limit: 20 },
  { id: "moonshotai/kimi-k2:free", name: "MoonshotAI Kimi K2", limit: 20 },
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", name: "Dolphin Mistral 24B Venice", limit: 20 },
  { id: "google/gemma-3n-e2b-it:free", name: "Google Gemma 3N E2B IT", limit: 20 },
  { id: "tencent/hunyuan-a13b-instruct:free", name: "Tencent Hunyuan A13B Instruct", limit: 20 },
  { id: "tngtech/deepseek-r1t2-chimera:free", name: "TNG DeepSeek R1T2 Chimera", limit: 20 },
  { id: "mistralai/mistral-small-3.2-24b-instruct:free", name: "Mistral Small 3.2 24B Instruct", limit: 20 },
  { id: "moonshotai/kimi-dev-72b:free", name: "MoonshotAI Kimi Dev 72B", limit: 20 },
  { id: "deepseek/deepseek-r1-0528-qwen3-8b:free", name: "DeepSeek R1 0528 Qwen3 8B", limit: 20 },
  { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1 0528", limit: 20 },
  { id: "mistralai/devstral-small-2505:free", name: "Mistral Devstral Small 2505", limit: 20 },
  { id: "google/gemma-3n-e4b-it:free", name: "Google Gemma 3N E4B IT", limit: 20 },
  { id: "meta-llama/llama-3.3-8b-instruct:free", name: "Meta Llama 3.3 8B Instruct", limit: 20 },
  { id: "qwen/qwen3-4b:free", name: "Qwen3 4B", limit: 20 },
  { id: "qwen/qwen3-30b-a3b:free", name: "Qwen3 30B A3B", limit: 20 },
  { id: "qwen/qwen3-8b:free", name: "Qwen3 8B", limit: 20 },
  { id: "qwen/qwen3-14b:free", name: "Qwen3 14B", limit: 20 },
  { id: "qwen/qwen3-235b-a22b:free", name: "Qwen3 235B A22B", limit: 20 },
  { id: "tngtech/deepseek-r1t-chimera:free", name: "TNG DeepSeek R1T Chimera", limit: 20 },
  { id: "microsoft/mai-ds-r1:free", name: "Microsoft MAI DS R1", limit: 20 },
  { id: "shisa-ai/shisa-v2-llama3.3-70b:free", name: "Shisa AI v2 Llama 3.3 70B", limit: 20 },
  { id: "arliai/qwq-32b-arliai-rpr-v1:free", name: "ArliAI QWQ 32B RPR v1", limit: 20 },
  { id: "agentica-org/deepcoder-14b-preview:free", name: "Agentica DeepCoder 14B Preview", limit: 20 },
  { id: "meta-llama/llama-4-maverick:free", name: "Meta Llama 4 Maverick", limit: 20 },
  { id: "meta-llama/llama-4-scout:free", name: "Meta Llama 4 Scout", limit: 20 },
  { id: "qwen/qwen2.5-vl-32b-instruct:free", name: "Qwen 2.5 VL 32B Instruct", limit: 20 },
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek Chat v3 0324", limit: 20 },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1 24B Instruct", limit: 20 },
  { id: "google/gemma-3-4b-it:free", name: "Google Gemma 3 4B IT", limit: 20 },
  { id: "google/gemma-3-12b-it:free", name: "Google Gemma 3 12B IT", limit: 20 },
  { id: "google/gemma-3-27b-it:free", name: "Google Gemma 3 27B IT", limit: 20 },
  { id: "google/gemini-2.0-flash-exp:free", name: "Google Gemini 2.0 Flash Experimental", limit: 20 },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", limit: 20 }
];

export class AIAdminController {
  private db: Database.Database;

  constructor() {
    const connectionManager = ConnectionManager.getInstance();
    this.db = connectionManager.getConnection();
    this.initTables();
  }

  private initTables() {
    // Create ai_models table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_models (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        model_id TEXT NOT NULL UNIQUE,
        is_free INTEGER DEFAULT 0,
        rate_limit_per_minute INTEGER,
        enabled INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 50,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create ai_api_keys table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_api_keys (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        key_name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create ai_request_logs table for monitoring
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_request_logs (
        id TEXT PRIMARY KEY,
        model_id TEXT,
        user_id TEXT,
        request_tokens INTEGER,
        response_tokens INTEGER,
        success INTEGER DEFAULT 1,
        error_message TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Get all AI models
   */
  getModels = async (req: Request, res: Response) => {
    try {
      const models = this.db.prepare(`
        SELECT * FROM ai_models ORDER BY priority DESC, created_at DESC
      `).all();

      return res.json(successResponse(models));
    } catch (error: any) {
      console.error('Get AI models error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Add all free OpenRouter models
   */
  addFreeOpenRouterModels = async (req: Request, res: Response) => {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO ai_models (
          id, provider, model_name, model_id, is_free, rate_limit_per_minute, enabled, priority
        ) VALUES (?, ?, ?, ?, 1, ?, 1, ?)
      `);

      const insertMany = this.db.transaction((models: any[]) => {
        for (const model of models) {
          const id = crypto.randomUUID();
          stmt.run(id, 'openrouter', model.name, model.id, model.limit, 40); // Lower priority for free models
        }
      });

      insertMany(FREE_OPENROUTER_MODELS);

      return res.json(successResponse({ added: FREE_OPENROUTER_MODELS.length }));
    } catch (error: any) {
      console.error('Add free models error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Update AI model
   */
  updateModel = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const allowedFields = ['enabled', 'priority', 'rate_limit_per_minute'];
      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse('No valid fields to update'));
      }

      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE ai_models 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values, id);

      const updatedModel = this.db.prepare('SELECT * FROM ai_models WHERE id = ?').get(id);

      return res.json(successResponse(updatedModel));
    } catch (error: any) {
      console.error('Update AI model error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Get all API keys (without exposing actual keys)
   */
  getAPIKeys = async (req: Request, res: Response) => {
    try {
      const keys = this.db.prepare(`
        SELECT id, provider, key_name, is_active, created_at
        FROM ai_api_keys ORDER BY created_at DESC
      `).all();

      return res.json(successResponse(keys));
    } catch (error: any) {
      console.error('Get API keys error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Add API key
   */
  addAPIKey = async (req: Request, res: Response) => {
    try {
      const { provider, key_name, api_key } = req.body;

      if (!provider || !key_name || !api_key) {
        return res.status(400).json(errorResponse('Missing required fields'));
      }

      const id = crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO ai_api_keys (id, provider, key_name, api_key, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(id, provider, key_name, api_key);

      return res.json(successResponse({ id, message: 'API key added successfully' }));
    } catch (error: any) {
      console.error('Add API key error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Delete API key
   */
  deleteAPIKey = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      this.db.prepare('DELETE FROM ai_api_keys WHERE id = ?').run(id);

      return res.json(successResponse({ message: 'API key deleted' }));
    } catch (error: any) {
      console.error('Delete API key error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Get API key for a provider (internal use)
   */
  getActiveAPIKey = (provider: string): string | null => {
    const key = this.db.prepare(`
      SELECT api_key FROM ai_api_keys 
      WHERE provider = ? AND is_active = 1 
      ORDER BY created_at DESC LIMIT 1
    `).get(provider) as any;

    return key?.api_key || null;
  };

  /**
   * Get next available model (with fallback logic)
   */
  getNextAvailableModel = (): any => {
    const model = this.db.prepare(`
      SELECT * FROM ai_models 
      WHERE enabled = 1 
      ORDER BY priority DESC, RANDOM()
      LIMIT 1
    `).get();

    return model;
  };

  /**
   * Log AI request
   */
  logRequest = (modelId: string, userId: string, success: boolean, errorMessage?: string) => {
    try {
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO ai_request_logs (id, model_id, user_id, success, error_message)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, modelId, userId, success ? 1 : 0, errorMessage || null);
    } catch (error) {
      console.error('Log AI request error:', error);
    }
  };
}
