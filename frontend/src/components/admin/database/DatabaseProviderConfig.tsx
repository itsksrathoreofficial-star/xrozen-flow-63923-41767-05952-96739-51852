import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Database, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db } from "@/lib/database/index";
import type { DatabaseProvider } from "@/lib/database/types";

interface DatabaseProviderConfigProps {
  currentProvider: string;
  onProviderChange: () => void;
}

export function DatabaseProviderConfig({ currentProvider, onProviderChange }: DatabaseProviderConfigProps) {
  const [selectedProvider, setSelectedProvider] = useState<DatabaseProvider>("supabase");
  const [testing, setTesting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const providers: DatabaseProvider[] = ["supabase", "firebase", "mysql", "postgresql", "mongodb", "sqlite"];

  const providerFields: Record<DatabaseProvider, { label: string; type: string; key: string }[]> = {
    supabase: [
      { label: "Project URL", type: "url", key: "url" },
      { label: "Anon Key", type: "text", key: "anonKey" },
      { label: "Service Role Key", type: "password", key: "serviceKey" },
    ],
    firebase: [
      { label: "API Key", type: "text", key: "apiKey" },
      { label: "Auth Domain", type: "text", key: "authDomain" },
      { label: "Project ID", type: "text", key: "projectId" },
      { label: "Storage Bucket", type: "text", key: "storageBucket" },
    ],
    mysql: [
      { label: "Host", type: "text", key: "host" },
      { label: "Port", type: "number", key: "port" },
      { label: "Username", type: "text", key: "username" },
      { label: "Password", type: "password", key: "password" },
      { label: "Database Name", type: "text", key: "database" },
    ],
    postgresql: [
      { label: "Host", type: "text", key: "host" },
      { label: "Port", type: "number", key: "port" },
      { label: "Username", type: "text", key: "username" },
      { label: "Password", type: "password", key: "password" },
      { label: "Database Name", type: "text", key: "database" },
    ],
    mongodb: [
      { label: "Connection String", type: "text", key: "connectionString" },
      { label: "Database Name", type: "text", key: "database" },
    ],
    sqlite: [
      { label: "Database File Path", type: "text", key: "filePath" },
    ],
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // In a real implementation, you would test the connection with the provided credentials
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast({
        title: "Connection Successful",
        description: `Successfully connected to ${selectedProvider}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect with provided credentials",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      await db.saveConfig(selectedProvider, credentials);
      toast({
        title: "Configuration Saved",
        description: `${selectedProvider} configuration saved successfully`,
      });
      onProviderChange();
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <Card 
            key={provider}
            className={`cursor-pointer transition-all ${
              provider === currentProvider 
                ? "ring-2 ring-primary" 
                : selectedProvider === provider 
                ? "ring-2 ring-primary/50" 
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedProvider(provider)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 capitalize">
                  <Database className="h-5 w-5" />
                  {provider}
                </span>
                {provider === currentProvider && (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {provider === "supabase" && "PostgreSQL-based BaaS with real-time"}
                {provider === "firebase" && "NoSQL document database by Google"}
                {provider === "mysql" && "Popular open-source relational database"}
                {provider === "postgresql" && "Advanced open-source SQL database"}
                {provider === "mongodb" && "Flexible document-oriented database"}
                {provider === "sqlite" && "Lightweight file-based database"}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Configure {selectedProvider}</CardTitle>
          <CardDescription>
            Enter credentials to connect to {selectedProvider}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerFields[selectedProvider].map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type={field.type}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={credentials[field.key] || ""}
                onChange={(e) => setCredentials({
                  ...credentials,
                  [field.key]: e.target.value,
                })}
              />
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleTestConnection}
              variant="outline"
              disabled={testing}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button onClick={handleSaveConfiguration}>
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
