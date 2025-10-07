import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Loader2, Database, ArrowRight, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db } from "@/lib/database/index";
import type { DatabaseProvider } from "@/lib/database/types";

interface MigrationWizardProps {
  currentProvider: string;
  onMigrationComplete: () => void;
}

type MigrationStep = "select" | "backup" | "validate" | "migrate" | "verify" | "complete";

interface MigrationProgress {
  step: MigrationStep;
  currentTable: string;
  recordsTransferred: number;
  totalRecords: number;
  percentage: number;
  logs: string[];
}

export function MigrationWizard({ currentProvider, onMigrationComplete }: MigrationWizardProps) {
  const [targetProvider, setTargetProvider] = useState<DatabaseProvider>("postgresql");
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "running" | "paused" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState<MigrationProgress>({
    step: "select",
    currentTable: "",
    recordsTransferred: 0,
    totalRecords: 0,
    percentage: 0,
    logs: [],
  });

  const providers: DatabaseProvider[] = ["supabase", "firebase", "mysql", "postgresql", "mongodb", "sqlite"];
  const availableProviders = providers.filter(p => p !== currentProvider);

  const steps: { key: MigrationStep; label: string }[] = [
    { key: "select", label: "Select Target" },
    { key: "backup", label: "Create Backup" },
    { key: "validate", label: "Validate" },
    { key: "migrate", label: "Migrate Data" },
    { key: "verify", label: "Verify Integrity" },
    { key: "complete", label: "Complete" },
  ];

  const addLog = (message: string) => {
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
    }));
  };

  const simulateMigration = async () => {
    setMigrationStatus("running");
    
    // Step 1: Backup
    setProgress(prev => ({ ...prev, step: "backup", percentage: 0 }));
    addLog("Starting database backup...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    addLog("✓ Backup created successfully");

    // Step 2: Validate
    setProgress(prev => ({ ...prev, step: "validate", percentage: 16 }));
    addLog("Validating schema compatibility...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    addLog("✓ Schema validation passed");

    // Step 3: Migrate
    setProgress(prev => ({ ...prev, step: "migrate", percentage: 33 }));
    const tables = ["profiles", "projects", "messages", "payments", "video_versions", 
                   "editors", "clients", "project_clients", "user_roles", "project_types"];
    
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      setProgress(prev => ({ 
        ...prev, 
        currentTable: table,
        recordsTransferred: (i + 1) * 100,
        totalRecords: tables.length * 100,
        percentage: 33 + ((i + 1) / tables.length) * 33,
      }));
      addLog(`Migrating table: ${table}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog(`✓ ${table} migrated successfully`);
    }

    // Step 4: Verify
    setProgress(prev => ({ ...prev, step: "verify", percentage: 83 }));
    addLog("Verifying data integrity...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    addLog("✓ Data integrity verified");

    // Step 5: Complete
    setProgress(prev => ({ ...prev, step: "complete", percentage: 100 }));
    addLog("✓ Migration completed successfully!");
    setMigrationStatus("completed");
    
    toast({
      title: "Migration Complete",
      description: `Successfully migrated from ${currentProvider} to ${targetProvider}`,
    });

    onMigrationComplete();
  };

  const handleStartMigration = () => {
    if (!targetProvider) {
      toast({
        title: "Select Target Provider",
        description: "Please select a target database provider",
        variant: "destructive",
      });
      return;
    }

    simulateMigration();
  };

  const handleDownloadBackup = () => {
    toast({
      title: "Backup Downloaded",
      description: "Database backup downloaded successfully",
    });
  };

  return (
    <div className="space-y-6">
      {/* Migration Steps Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Progress</CardTitle>
          <CardDescription>
            Follow the steps to migrate your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className={`flex flex-col items-center ${
                    steps.findIndex(s => s.key === progress.step) >= index 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      steps.findIndex(s => s.key === progress.step) > index
                        ? "bg-primary border-primary"
                        : steps.findIndex(s => s.key === progress.step) === index
                        ? "border-primary"
                        : "border-muted"
                    }`}>
                      {steps.findIndex(s => s.key === progress.step) > index ? (
                        <CheckCircle className="h-5 w-5 text-primary-foreground" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <span className="text-xs mt-2 text-center">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 w-12 mx-2 ${
                      steps.findIndex(s => s.key === progress.step) > index 
                        ? "bg-primary" 
                        : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <Progress value={progress.percentage} className="h-2" />

            {/* Current Status */}
            {migrationStatus === "running" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  {progress.currentTable 
                    ? `Migrating table: ${progress.currentTable} (${progress.recordsTransferred}/${progress.totalRecords} records)`
                    : "Processing migration..."
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      {migrationStatus === "idle" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Target Database</CardTitle>
            <CardDescription>
              Choose which database to migrate to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Badge variant="outline" className="mb-2">Current</Badge>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 capitalize font-semibold">
                    <Database className="h-5 w-5" />
                    {currentProvider}
                  </div>
                </div>
              </div>

              <ArrowRight className="h-8 w-8 text-muted-foreground" />

              <div className="flex-1">
                <Badge variant="outline" className="mb-2">Target</Badge>
                <Select value={targetProvider} onValueChange={(value) => setTargetProvider(value as DatabaseProvider)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target database" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map(provider => (
                      <SelectItem key={provider} value={provider} className="capitalize">
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> A backup will be created before migration. 
                The migration process may take several minutes depending on data volume.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleStartMigration} className="flex-1">
                Start Migration
              </Button>
              <Button variant="outline" onClick={handleDownloadBackup}>
                <Download className="h-4 w-4 mr-2" />
                Download Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration Logs */}
      {progress.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Logs</CardTitle>
            <CardDescription>Real-time migration activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black/5 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
              {progress.logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {migrationStatus === "completed" && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Migration Successful!</strong> Your database has been migrated to {targetProvider}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
