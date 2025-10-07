import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Plus, Trash2, MessageSquare, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function XrozenAI() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth context to initialize
      if (authLoading) {
        console.log('🔧 XrozenAI: Auth context still loading, waiting...');
        return;
      }
      
      // Check if user is authenticated through context
      if (!isAuthenticated || !apiClient.isAuthenticated()) {
        console.log('🔧 XrozenAI: Not authenticated, redirecting to auth');
        navigate('/auth');
        return;
      }
      
      try {
        console.log('🔧 XrozenAI: User authenticated, loading conversations');
        loadConversations();
      } catch (error) {
        console.error('🔧 XrozenAI: Auth check failed:', error);
        // Don't redirect for AI-specific failures
      }
    };
    
    checkAuth();
  }, [navigate, isAuthenticated, authLoading]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Load conversations
  const loadConversations = async () => {
    if (!apiClient.isAuthenticated()) {
      console.log('🔧 XrozenAI: Not authenticated, skipping conversation load');
      setLoadingConversations(false);
      return;
    }
    
    try {
      console.log('🔧 XrozenAI: Loading conversations...');
      const data = await apiClient.getAIConversations();

      setConversations(data || []);
      
      // Auto-select most recent conversation
      if (data && data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0].id);
        loadMessages(data[0].id);
      }
      console.log('🔧 XrozenAI: Conversations loaded successfully');
    } catch (error) {
      console.error('🔧 XrozenAI: Error loading conversations:', error);
      // Don't redirect to auth for AI-specific endpoints - they might not be available
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        console.log('🔧 XrozenAI: AI endpoint not available, but keeping user logged in');
        // Just show empty state instead of redirecting to auth
        setConversations([]);
      }
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      // For now, messages are loaded within the conversation context
      // The API doesn't have a separate getAIMessages method
      setMessages([]);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Create new conversation
  const createNewConversation = async () => {
    try {
      const user = await apiClient.getCurrentUser();
      if (!user) return;

      // Create a temporary conversation ID for new chats
      // The actual conversation will be created when the first message is sent
      const tempId = `temp_${Date.now()}`;
      const newConversation = {
        id: tempId,
        title: 'New Conversation',
        updated_at: new Date().toISOString()
      };

      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversation(newConversation.id);
      setMessages([]);
      setInput('');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive"
      });
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      // For now, just remove from local state
      // The API doesn't have a deleteAIConversation method yet
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  };

  // Send message - auto-create conversation if needed
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const tempId = `temp-${Date.now()}`;
    
    setInput('');
    setLoading(true);
    
    // Add user message immediately
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    try {
      const response = await apiClient.chatWithAI(
        userMessage,
        selectedConversation?.startsWith('temp_') ? undefined : selectedConversation
      );
      
      // Update conversation ID if new
      if (!selectedConversation && response.conversationId) {
        setSelectedConversation(response.conversationId);
        // Reload conversations to get the new one
        loadConversations();
      }

      // Parse action data from response
      let responseContent = response.response || response.message || 'No response received';
      const actionMatch = responseContent.match(/__ACTION_DATA__(.+?)__ACTION_DATA__/);
      if (actionMatch) {
        responseContent = responseContent.replace(/__ACTION_DATA__.+?__ACTION_DATA__/, '').trim();
      }

      // Replace temp message with actual message
      setMessages(prev => prev.map(m => 
        m.id === tempId 
          ? { ...m, id: `user-${Date.now()}` }
          : m
      ).concat({
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        created_at: new Date().toISOString()
      }));

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      setMessages(prev => prev.filter(m => m.id !== tempId));
      
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="flex-shrink-0 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2 flex-1">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">XrozenAI</h1>
            </div>
            
            {/* History Button */}
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <History className="h-4 w-4" />
                  Chat History
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Conversation History</SheetTitle>
                </SheetHeader>
                
                <div className="mt-6">
                  <Button 
                    onClick={() => {
                      createNewConversation();
                      setShowHistory(false);
                    }} 
                    className="w-full gap-2 mb-4"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    New Conversation
                  </Button>

                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="space-y-2">
                      {loadingConversations ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Loading...
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No conversations yet
                        </div>
                      ) : (
                        conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={cn(
                              "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                              selectedConversation === conv.id
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted"
                            )}
                            onClick={() => {
                              setSelectedConversation(conv.id);
                              loadMessages(conv.id);
                              setShowHistory(false);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{conv.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(conv.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
            
            <Button 
              onClick={createNewConversation} 
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </header>

          {/* Chat messages area - scrollable */}
          <div className="flex-1 overflow-y-auto" ref={scrollRef}>
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Welcome to XrozenAI</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Your intelligent assistant for managing projects, clients, and workflow
                  </p>
                  <div className="bg-muted/50 rounded-lg p-6 max-w-2xl mx-auto text-left">
                    <p className="font-medium mb-4">Try asking:</p>
                    <div className="grid gap-3">
                      <div className="flex items-start gap-3 p-3 bg-background rounded-md">
                        <div className="text-primary">•</div>
                        <p className="text-sm">"Create a new project called Marketing Video"</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-background rounded-md">
                        <div className="text-primary">•</div>
                        <p className="text-sm">"Add a client named John Doe with email john@example.com"</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-background rounded-md">
                        <div className="text-primary">•</div>
                        <p className="text-sm">"Show me all pending projects"</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-background rounded-md">
                        <div className="text-primary">•</div>
                        <p className="text-sm">"List my recent payments"</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-6 py-4 shadow-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <p className="text-xs opacity-50 mt-2">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {loading && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-muted rounded-2xl px-6 py-4 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">XrozenAI is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input area - fixed at bottom */}
          <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur">
            <div className="max-w-4xl mx-auto p-4">
              <div className="flex gap-3 items-end bg-muted/50 rounded-2xl p-2 shadow-lg">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask XrozenAI anything about your workflow..."
                  disabled={loading}
                  className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 min-h-[60px] max-h-[200px] resize-none text-base px-4"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center px-4">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
