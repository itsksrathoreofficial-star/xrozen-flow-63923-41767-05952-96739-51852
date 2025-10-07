/**
 * Admin AI Models Management Page
 * Manage AI models and API keys for XrozenAI
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Brain, Plus, Trash2, Key, CheckCircle, XCircle, AlertCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  model_id: string;
  is_free: boolean;
  rate_limit_per_minute?: number;
  enabled: boolean;
  priority: number;
  created_at: string;
}

interface APIKey {
  id: string;
  provider: string;
  key_name: string;
  is_active: boolean;
  created_at: string;
}

const FREE_OPENROUTER_MODELS = [
  { id: "alibaba/tongyi-deepresearch-30b-a3b:free", name: "Alibaba Tongyi DeepResearch 30B" },
  { id: "meituan/longcat-flash-chat:free", name: "Meituan LongCat Flash Chat" },
  { id: "nvidia/nemotron-nano-9b-v2:free", name: "NVIDIA Nemotron Nano 9B v2" },
  { id: "deepseek/deepseek-chat-v3.1:free", name: "DeepSeek Chat v3.1" },
  { id: "openai/gpt-oss-20b:free", name: "OpenAI GPT OSS 20B" },
  { id: "z-ai/glm-4.5-air:free", name: "Z-AI GLM 4.5 Air" },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder" },
  { id: "moonshotai/kimi-k2:free", name: "MoonshotAI Kimi K2" },
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", name: "Dolphin Mistral 24B Venice" },
  { id: "google/gemma-3n-e2b-it:free", name: "Google Gemma 3N E2B IT" },
  { id: "tencent/hunyuan-a13b-instruct:free", name: "Tencent Hunyuan A13B Instruct" },
  { id: "tngtech/deepseek-r1t2-chimera:free", name: "TNG DeepSeek R1T2 Chimera" },
  { id: "mistralai/mistral-small-3.2-24b-instruct:free", name: "Mistral Small 3.2 24B Instruct" },
  { id: "moonshotai/kimi-dev-72b:free", name: "MoonshotAI Kimi Dev 72B" },
  { id: "deepseek/deepseek-r1-0528-qwen3-8b:free", name: "DeepSeek R1 0528 Qwen3 8B" },
  { id: "deepseek/deepseek-r1-0528:free", name: "DeepSeek R1 0528" },
  { id: "mistralai/devstral-small-2505:free", name: "Mistral Devstral Small 2505" },
  { id: "google/gemma-3n-e4b-it:free", name: "Google Gemma 3N E4B IT" },
  { id: "meta-llama/llama-3.3-8b-instruct:free", name: "Meta Llama 3.3 8B Instruct" },
  { id: "qwen/qwen3-4b:free", name: "Qwen3 4B" },
  { id: "qwen/qwen3-30b-a3b:free", name: "Qwen3 30B A3B" },
  { id: "qwen/qwen3-8b:free", name: "Qwen3 8B" },
  { id: "qwen/qwen3-14b:free", name: "Qwen3 14B" },
  { id: "qwen/qwen3-235b-a22b:free", name: "Qwen3 235B A22B" },
  { id: "tngtech/deepseek-r1t-chimera:free", name: "TNG DeepSeek R1T Chimera" },
  { id: "microsoft/mai-ds-r1:free", name: "Microsoft MAI DS R1" },
  { id: "shisa-ai/shisa-v2-llama3.3-70b:free", name: "Shisa AI v2 Llama 3.3 70B" },
  { id: "arliai/qwq-32b-arliai-rpr-v1:free", name: "ArliAI QWQ 32B RPR v1" },
  { id: "agentica-org/deepcoder-14b-preview:free", name: "Agentica DeepCoder 14B Preview" },
  { id: "meta-llama/llama-4-maverick:free", name: "Meta Llama 4 Maverick" },
  { id: "meta-llama/llama-4-scout:free", name: "Meta Llama 4 Scout" },
  { id: "qwen/qwen2.5-vl-32b-instruct:free", name: "Qwen 2.5 VL 32B Instruct" },
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek Chat v3 0324" },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1 24B Instruct" },
  { id: "google/gemma-3-4b-it:free", name: "Google Gemma 3 4B IT" },
  { id: "google/gemma-3-12b-it:free", name: "Google Gemma 3 12B IT" },
  { id: "google/gemma-3-27b-it:free", name: "Google Gemma 3 27B IT" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Google Gemini 2.0 Flash Experimental" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1" }
];

export default function AdminAIModels() {
  const navigate = useNavigate();
  const [models, setModels] = useState<AIModel[]>([]);
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("openrouter");
  const [keyName, setKeyName] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    checkAdminAuth();
    loadData();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const user = await apiClient.getCurrentUser();
      if (!user || user.user_category !== 'admin') {
        navigate("/auth");
      }
    } catch (error) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    try {
      // Load AI models and API keys
      const [modelsData, keysData] = await Promise.all([
        fetch(`${apiClient['baseURL']}/admin/ai-models`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }).then(r => r.json()),
        fetch(`${apiClient['baseURL']}/admin/ai-keys`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }).then(r => r.json())
      ]);
      
      setModels(modelsData.data || []);
      setAPIKeys(keysData.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load AI models");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFreeModels = async () => {
    try {
      const response = await fetch(`${apiClient['baseURL']}/admin/ai-models/add-openrouter-free`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      await response.json();
      toast.success(`Added ${FREE_OPENROUTER_MODELS.length} free OpenRouter models`);
      loadData();
    } catch (error) {
      console.error("Error adding free models:", error);
      toast.error("Failed to add free models");
    }
  };

  const handleAddAPIKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyName.trim() || !apiKey.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch(`${apiClient['baseURL']}/admin/ai-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          provider: selectedProvider,
          key_name: keyName,
          api_key: apiKey
        })
      });

      await response.json();
      toast.success("API key added successfully");
      setKeyDialogOpen(false);
      setKeyName("");
      setApiKey("");
      loadData();
    } catch (error) {
      console.error("Error adding API key:", error);
      toast.error("Failed to add API key");
    }
  };

  const handleToggleModel = async (modelId: string, enabled: boolean) => {
    try {
      const response = await fetch(`${apiClient['baseURL']}/admin/ai-models/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ enabled })
      });

      await response.json();
      setModels(models.map(m => m.id === modelId ? { ...m, enabled } : m));
      toast.success(enabled ? "Model enabled" : "Model disabled");
    } catch (error) {
      console.error("Error toggling model:", error);
      toast.error("Failed to update model");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await fetch(`${apiClient['baseURL']}/admin/ai-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });

      setAPIKeys(apiKeys.filter(k => k.id !== keyId));
      toast.success("API key deleted");
    } catch (error) {
      console.error("Error deleting key:", error);
      toast.error("Failed to delete API key");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AdminSidebar />
        <div className="flex-1 bg-gradient-to-br from-background via-primary/5 to-success/5">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
                    <Brain className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">AI Models Management</h1>
                    <p className="text-sm text-muted-foreground">Configure AI models and API keys for XrozenAI</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddFreeModels} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Free OpenRouter Models
                </Button>
                <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary">
                      <Key className="w-4 h-4 mr-2" />
                      Add API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add API Key</DialogTitle>
                      <DialogDescription>
                        Add an API key for AI model providers
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddAPIKey} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openrouter">OpenRouter</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                            <SelectItem value="google">Google AI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Key Name</Label>
                        <Input
                          placeholder="e.g., OpenRouter Production"
                          value={keyName}
                          onChange={(e) => setKeyName(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          required
                        />
                      </div>
                      
                      <Button type="submit" className="w-full gradient-primary">
                        Add API Key
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </header>

          <main className="px-8 py-8 space-y-8">
            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage API keys for different AI providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No API keys configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{key.key_name}</p>
                            <p className="text-sm text-muted-foreground">{key.provider}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the API key "{key.key_name}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteKey(key.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Models Section */}
            <Card>
              <CardHeader>
                <CardTitle>Available AI Models</CardTitle>
                <CardDescription>
                  Configure which AI models are available for XrozenAI ({models.length} models)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {models.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AI models configured</p>
                    <Button onClick={handleAddFreeModels} className="mt-4" variant="outline">
                      Add Free OpenRouter Models
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {models.map((model) => (
                      <div key={model.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{model.model_name}</p>
                            <p className="text-sm text-muted-foreground font-mono">{model.model_id}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{model.provider}</Badge>
                              {model.is_free && <Badge className="bg-success">Free</Badge>}
                              {model.rate_limit_per_minute && (
                                <Badge variant="secondary">
                                  {model.rate_limit_per_minute}/min
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant={model.enabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleModel(model.id, !model.enabled)}
                          >
                            {model.enabled ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Disabled
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Rate Limiting & Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <strong>OpenRouter Free Models:</strong> Rate limits vary by model and are shared across all users. The system automatically rotates between available models to avoid hitting rate limits.
                </p>
                <p>
                  <strong>Model Priority:</strong> Models are tried in order of priority. Free models are deprioritized but used as fallback when paid quotas are reached.
                </p>
                <p>
                  <strong>Automatic Fallback:</strong> If a model fails due to rate limiting (429 error), the system automatically tries the next available model.
                </p>
                <p>
                  <strong>Monitoring:</strong> All AI requests are logged with success/failure status for monitoring and debugging.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
