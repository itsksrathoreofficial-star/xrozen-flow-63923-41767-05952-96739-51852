/**
 * AI Controller - XrozenAI Chat Endpoint
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { ConnectionManager } from '@/lib/database/core/connection.manager';

export class AIController {
  private db: Database.Database;

  constructor() {
    const connectionManager = ConnectionManager.getInstance();
    this.db = connectionManager.getConnection();
  }

  /**
   * XrozenAI Chat - AI-powered assistant with OpenRouter fallback
   */
  chat = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { message, conversationId, messages } = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Build context from user's data
      const profile = this.db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId);
      const projects = this.db.prepare('SELECT * FROM projects WHERE creator_id = ? ORDER BY created_at DESC LIMIT 10').all(userId);
      const editors = this.db.prepare('SELECT * FROM editors LIMIT 10').all();
      const clients = this.db.prepare('SELECT * FROM clients LIMIT 10').all();
      const payments = this.db.prepare('SELECT * FROM payments WHERE payer_id = ? OR recipient_id = ? LIMIT 10').all(userId, userId);

      const context = `
User Context:
- Name: ${(profile as any)?.full_name || 'Unknown'}
- Email: ${(profile as any)?.email || 'Unknown'}
- Role: ${(profile as any)?.user_category || 'Unknown'}

Projects: ${(projects as any[]).length} total
${(projects as any[]).slice(0, 5).map(p => `- ${p.name} (${p.status})`).join('\n') || 'No projects'}

Editors: ${(editors as any[]).length} available
Clients: ${(clients as any[]).length} available
Payments: ${(payments as any[]).length} transactions
`;

      const systemPrompt = `You are XrozenAI, an expert AI assistant for the Xrozen Workflow platform. 
You help users manage video editing projects, track editors and clients, handle payments, and provide insights.
You can perform actions like creating projects, adding clients/editors, and more.
Always be helpful, concise, and professional.

${context}

Answer questions based on the user's actual data shown above. If you don't have specific information, say so clearly.

Available Actions:
- create_project: Create a new project
- add_client: Add a new client
- add_editor: Add a new editor
- list_projects: List all user's projects

When users ask you to perform actions, use the appropriate tools.`;

      // Define tools for AI actions
      const tools = [
        {
          type: "function",
          function: {
            name: "create_project",
            description: "Create a new video editing project",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Project name" },
                description: { type: "string", description: "Project description" },
                client_id: { type: "string", description: "Client UUID (optional)" },
                deadline: { type: "string", description: "Deadline in YYYY-MM-DD format (optional)" }
              },
              required: ["name"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "add_client",
            description: "Add a new client to the system",
            parameters: {
              type: "object",
              properties: {
                full_name: { type: "string", description: "Client full name" },
                email: { type: "string", description: "Client email" },
                company: { type: "string", description: "Company name (optional)" }
              },
              required: ["full_name", "email"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "add_editor",
            description: "Add a new editor to the system",
            parameters: {
              type: "object",
              properties: {
                full_name: { type: "string", description: "Editor full name" },
                email: { type: "string", description: "Editor email" },
                specialty: { type: "string", description: "Editor specialty (optional)" },
                employment_type: { type: "string", enum: ["freelance", "fulltime"], description: "Employment type (optional, defaults to freelance)" },
                monthly_salary: { type: "number", description: "Monthly salary for fulltime editors (optional)" }
              },
              required: ["full_name", "email"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "list_projects",
            description: "List all user's projects with their current status",
            parameters: { type: "object", properties: {} }
          }
        }
      ];

      // Try calling AI with automatic fallback
      let aiData: any;
      let usedModel = 'google/gemini-2.5-flash';

      // First, try Lovable AI Gateway
      const lovableApiKey = process.env.LOVABLE_API_KEY;
      
      if (lovableApiKey) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                ...(messages || []),
                { role: 'user', content: message }
              ],
              tools: tools,
              tool_choice: "auto"
            }),
          });

          if (aiResponse.ok) {
            aiData = await aiResponse.json();
          } else if (aiResponse.status === 429) {
            console.log('Lovable AI rate limited, trying OpenRouter fallback...');
          }
        } catch (error) {
          console.error('Lovable AI error:', error);
        }
      }

      // If Lovable AI failed, try OpenRouter with available models
      if (!aiData) {
        const { AIAdminController } = await import('./ai-admin.controller');
        const aiAdminController = new AIAdminController();
        
        const model = aiAdminController.getNextAvailableModel();
        const openRouterKey = aiAdminController.getActiveAPIKey('openrouter');

        if (!model || !openRouterKey) {
          res.status(500).json({ error: 'No AI models available' });
          return;
        }

        usedModel = model.model_id;

        try {
          const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://xrozen-workflow.com',
              'X-Title': 'Xrozen Workflow'
            },
            body: JSON.stringify({
              model: usedModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...(messages || []),
                { role: 'user', content: message }
              ],
              tools: tools,
              tool_choice: "auto"
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('OpenRouter error:', aiResponse.status, errorText);
            
            // Log failed request
            aiAdminController.logRequest(model.id, userId, false, `HTTP ${aiResponse.status}`);
            
            res.status(500).json({ error: `AI service unavailable` });
            return;
          }

          aiData = await aiResponse.json();
          
          // Log successful request
          aiAdminController.logRequest(model.id, userId, true);
        } catch (error: any) {
          console.error('OpenRouter error:', error);
          res.status(500).json({ error: 'AI service error' });
          return;
        }
      }

      const choice = aiData.choices[0];
      let assistantMessage = choice.message.content || '';

      // Handle tool calls if AI wants to perform actions
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        try {
          let toolResult = '';
          let actionData = null;

          // Execute the requested tool
          switch (functionName) {
            case 'create_project':
              const projectId = crypto.randomUUID();
              this.db.prepare(`
                INSERT INTO projects (id, name, description, creator_id, client_id, deadline, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now'))
              `).run(
                projectId,
                functionArgs.name,
                functionArgs.description || null,
                userId,
                functionArgs.client_id || null,
                functionArgs.deadline || null
              );
              
              actionData = { type: 'project', id: projectId, name: functionArgs.name };
              toolResult = `Successfully created project "${functionArgs.name}"`;
              break;

            case 'add_client':
              const clientId = crypto.randomUUID();
              this.db.prepare(`
                INSERT INTO clients (id, full_name, email, company, user_id, employment_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'freelance', datetime('now'), datetime('now'))
              `).run(
                clientId,
                functionArgs.full_name,
                functionArgs.email,
                functionArgs.company || null,
                userId
              );
              
              actionData = { type: 'client', id: clientId, name: functionArgs.full_name };
              toolResult = `Successfully added client "${functionArgs.full_name}"`;
              break;

            case 'add_editor':
              const editorId = crypto.randomUUID();
              this.db.prepare(`
                INSERT INTO editors (id, full_name, email, specialty, employment_type, monthly_salary, user_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `).run(
                editorId,
                functionArgs.full_name,
                functionArgs.email,
                functionArgs.specialty || null,
                functionArgs.employment_type || 'freelance',
                functionArgs.monthly_salary || null,
                userId
              );
              
              actionData = { type: 'editor', id: editorId, name: functionArgs.full_name };
              toolResult = `Successfully added editor "${functionArgs.full_name}"`;
              break;

            case 'list_projects':
              const projectsList = this.db.prepare(`
                SELECT * FROM projects 
                WHERE creator_id = ? 
                ORDER BY created_at DESC
              `).all(userId) as any[];
              
              toolResult = projectsList.length > 0 
                ? `Found ${projectsList.length} projects:\n${projectsList.map(p => `- ${p.name} (${p.status})`).join('\n')}`
                : 'No projects found.';
              break;

            default:
              toolResult = 'Unknown tool requested';
          }

          assistantMessage = `✅ ${toolResult}${actionData ? `\n\n__ACTION_DATA__${JSON.stringify(actionData)}__ACTION_DATA__` : ''}`;
        } catch (error) {
          console.error('Tool execution error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          assistantMessage = `❌ Failed to execute action: ${errorMsg}`;
        }
      }

      // Create or update conversation
      let convId = conversationId;
      if (!convId) {
        convId = crypto.randomUUID();
        this.db.prepare(`
          INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `).run(convId, userId, message.slice(0, 50));
      }

      // Save messages
      if (convId) {
        const userMsgId = crypto.randomUUID();
        const assistantMsgId = crypto.randomUUID();
        
        this.db.prepare(`
          INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
          VALUES (?, ?, 'user', ?, datetime('now'))
        `).run(userMsgId, convId, message);
        
        this.db.prepare(`
          INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
          VALUES (?, ?, 'assistant', ?, datetime('now'))
        `).run(assistantMsgId, convId, assistantMessage);
      }

      res.json({ 
        response: assistantMessage,
        conversationId: convId
      });

    } catch (error) {
      console.error('Error in XrozenAI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: errorMessage });
    }
  };

  /**
   * Get AI conversation history
   */
  getConversations = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const conversations = this.db.prepare(`
        SELECT * FROM ai_conversations 
        WHERE user_id = ? 
        ORDER BY updated_at DESC
      `).all(userId);

      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  };

  /**
   * Create new conversation
   */
  createConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title } = req.body;
      const convId = crypto.randomUUID();
      
      this.db.prepare(`
        INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run(convId, userId, title || 'New Conversation');

      const conversation = this.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(convId);
      res.json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  };

  /**
   * Delete conversation
   */
  deleteConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { conversationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify user owns this conversation
      const conversation = this.db.prepare(`
        SELECT * FROM ai_conversations 
        WHERE id = ? AND user_id = ?
      `).get(conversationId, userId);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Delete messages first
      this.db.prepare('DELETE FROM ai_messages WHERE conversation_id = ?').run(conversationId);
      
      // Delete conversation
      this.db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(conversationId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  };

  /**
   * Get messages for a conversation
   */
  getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { conversationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify user owns this conversation
      const conversation = this.db.prepare(`
        SELECT * FROM ai_conversations 
        WHERE id = ? AND user_id = ?
      `).get(conversationId, userId);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const messages = this.db.prepare(`
        SELECT * FROM ai_messages 
        WHERE conversation_id = ? 
        ORDER BY created_at ASC
      `).all(conversationId);

      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  };
}
