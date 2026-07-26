"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Rocket, BrainCircuit, Terminal, Loader2, CheckCircle2 } from "lucide-react";

const ALGORITHMS = [
  "LSTM (Long Short-Term Memory)",
  "Transformer",
  "Isolation Forest",
  "One-Class SVM",
  "XGBoost"
];

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  
  // Training Form State
  const [modelName, setModelName] = useState("");
  const [selectedAlgo, setSelectedAlgo] = useState("");
  const [selectedDataset, setSelectedDataset] = useState("");
  
  // Active Training State
  const [isTraining, setIsTraining] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchRegistry = async () => {
    try {
      const res = await fetch("/api/models");
      if (res.ok) {
        const data = await res.json();
        setModels(data.models);
        setDatasets(data.datasets);
      }
    } catch (e) {
      console.error("Failed to fetch registry", e);
    }
  };

  useEffect(() => {
    fetchRegistry();
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const handleTrainModel = async () => {
    if (!modelName || !selectedAlgo || !selectedDataset) return;
    
    setIsTraining(true);
    setTrainingProgress(0);
    setTerminalLogs(["Initializing compute cluster...", "Loading dataset...", `Compiling ${selectedAlgo} architecture...`]);

    try {
      const res = await fetch("/api/models/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName, algorithm: selectedAlgo, datasetId: selectedDataset })
      });
      const data = await res.json();
      
      if (data.success) {
        setActiveRunId(data.trainingRunId);
        startPolling(data.trainingRunId);
      }
    } catch (e) {
      console.error("Failed to start training", e);
      setIsTraining(false);
    }
  };

  const startPolling = (runId: string) => {
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/models/training-runs/${runId}`);
        const data = await res.json();
        
        setTrainingProgress(data.progress || 0);
        
        if (data.logs?.steps?.length > 0) {
          const step = data.logs.steps[0];
          setTerminalLogs(prev => {
            const newLog = `Epoch ${step.epoch} - Loss: ${step.loss} - ${step.message}`;
            // Avoid duplicates
            if (prev[prev.length - 1] === newLog) return prev;
            return [...prev, newLog];
          });
        }

        if (data.status === "RETIRED" || data.status === "FAILED") {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsTraining(false);
          setActiveRunId(null);
          fetchRegistry(); // Refresh registry
          setTerminalLogs(prev => [...prev, "Training Complete. Model saved to registry."]);
        }
      } catch (e) {
        console.error("Polling failed", e);
      }
    }, 1000); // Poll every second for live feel
  };

  const handleDeploy = async (modelVersionId: string) => {
    try {
      await fetch("/api/models/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelVersionId })
      });
      fetchRegistry();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    // Mock download
    const blob = new Blob(["mock_model_weights"], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "model_weights.bin";
    a.click();
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MLOps & Model Training</h1>
        <p className="text-muted-foreground mt-2">Design, train, version, and deploy anomaly detection models.</p>
      </div>

      <Tabs defaultValue="train" className="flex-1 flex flex-col">
        <TabsList className="grid w-[400px] grid-cols-2 mb-4">
          <TabsTrigger value="train">Train Model</TabsTrigger>
          <TabsTrigger value="registry">Model Registry</TabsTrigger>
        </TabsList>
        
        {/* TRAIN TAB */}
        <TabsContent value="train" className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Configuration</CardTitle>
                <CardDescription>Select your architecture and dataset to begin a training run.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model Name</label>
                  <Input 
                    placeholder="e.g. Prod-Auth-LSTM" 
                    value={modelName} 
                    onChange={e => setModelName(e.target.value)} 
                    disabled={isTraining}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Algorithm</label>
                  <Select disabled={isTraining} value={selectedAlgo} onValueChange={(v) => setSelectedAlgo(v || "")}>
                    <SelectTrigger><SelectValue placeholder="Select algorithm" /></SelectTrigger>
                    <SelectContent>
                      {ALGORITHMS.map(algo => <SelectItem key={algo} value={algo}>{algo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Training Dataset</label>
                  <Select disabled={isTraining} value={selectedDataset} onValueChange={(v) => setSelectedDataset(v || "")}>
                    <SelectTrigger><SelectValue placeholder="Select dataset" /></SelectTrigger>
                    <SelectContent>
                      {datasets.length === 0 && <SelectItem value="none" disabled>No datasets uploaded</SelectItem>}
                      {datasets.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.filename} ({d.metadata?.rows || 0} rows)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full mt-4" 
                  onClick={handleTrainModel} 
                  disabled={isTraining || !modelName || !selectedAlgo || !selectedDataset}
                >
                  {isTraining ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Training...</> : <><BrainCircuit className="mr-2 h-4 w-4" /> Start Training</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col bg-zinc-950 text-green-400 overflow-hidden border-zinc-800">
              <CardHeader className="border-b border-zinc-800 bg-zinc-900 pb-3 pt-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-mono text-zinc-200">Training Terminal</span>
                </div>
                {isTraining && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-y-auto font-mono text-xs flex flex-col justify-end space-y-1">
                {terminalLogs.length === 0 ? (
                  <div className="text-zinc-600">Waiting for training job...</div>
                ) : (
                  terminalLogs.map((log, i) => (
                    <div key={i} className="opacity-90">{">"} {log}</div>
                  ))
                )}
              </CardContent>
              {isTraining && (
                <div className="px-4 pb-4">
                  <div className="flex justify-between text-xs mb-1 text-zinc-400">
                    <span>Progress</span>
                    <span>{trainingProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={trainingProgress} className="h-1 bg-zinc-800" />
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* REGISTRY TAB */}
        <TabsContent value="registry" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Model Registry</CardTitle>
              <CardDescription>Manage, version, and deploy trained models to production.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Metrics (F1/Acc)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.flatMap(model => 
                    model.versions.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>{model.type}</TableCell>
                        <TableCell><Badge variant="outline">{v.versionString}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={v.status === 'ACTIVE' ? 'default' : v.status === 'RETIRED' ? 'secondary' : 'outline'}>
                            {v.status === 'ACTIVE' && <CheckCircle2 className="mr-1 h-3 w-3 inline" />}
                            {v.status === 'RETIRED' ? 'TRAINED (ARCHIVED)' : v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {v.metrics ? `${v.metrics.f1?.toFixed(1)}% / ${v.metrics.accuracy?.toFixed(1)}%` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={handleDownload} disabled={v.status === 'TRAINING'}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleDeploy(v.id)} 
                            disabled={v.status !== 'RETIRED'}
                            variant={v.status === 'RETIRED' ? 'default' : 'secondary'}
                          >
                            <Rocket className="mr-2 h-4 w-4" />
                            Deploy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {models.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No models in registry. Train a model to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}