"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, AlertTriangle, ShieldCheck, Play, Square, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const fetchInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveData = async () => {
    try {
      const res = await fetch("/api/live");
      if (res.ok) {
        setLiveData(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLiveData();

    // Start data fetch polling loop
    fetchInterval.current = setInterval(fetchLiveData, 3000);

    return () => {
      if (fetchInterval.current) clearInterval(fetchInterval.current);
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, []);

  useEffect(() => {
    if (isSimulating) {
      simulationInterval.current = setInterval(async () => {
        try {
          await fetch("/api/simulator/tick", { method: "POST" });
        } catch (e) {
          console.error("Simulation tick failed", e);
        }
      }, 3000);
    } else {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    }
  }, [isSimulating]);

  const toggleSimulation = () => setIsSimulating(!isSimulating);

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Security Feed</h1>
          <p className="text-muted-foreground mt-2">Live stream of ML-processed access logs and real-time risk gauges.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Switch id="sim-mode" checked={isSimulating} onCheckedChange={toggleSimulation} />
            <label htmlFor="sim-mode" className="text-sm font-medium leading-none flex items-center gap-2 cursor-pointer">
              {isSimulating ? <><Play className="h-4 w-4 text-green-500" /> Simulation Running</> : <><Square className="h-4 w-4 text-muted-foreground" /> Simulator Paused</>}
            </label>
          </div>
        </div>
      </div>

      {!liveData ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unresolved Alerts</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${liveData.unresolvedAlertsCount > 5 ? 'text-red-500' : 'text-orange-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{liveData.unresolvedAlertsCount}</div>
                <p className="text-xs text-muted-foreground">Alerts requiring SOC attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Risk (Rolling)</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{liveData.currentRiskAvg.toFixed(1)} / 100</div>
                <p className="text-xs text-muted-foreground">Based on the last 15 active sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">Active</div>
                <p className="text-xs text-muted-foreground">ML Engine and baselining nominal</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
            {/* Risk Changes Gauge (Line Chart) */}
            <Card className="col-span-1 flex flex-col">
              <CardHeader>
                <CardTitle>Real-Time Risk Trend</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveData.riskHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={() => "Score"} 
                      formatter={(val: any) => typeof val === 'number' ? [val.toFixed(1), "Risk"] : [val, "Risk"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Live Attack Feed */}
            <Card className="col-span-2 flex flex-col overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Live Event Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto pr-4">
                <div className="space-y-4">
                  {liveData.feed.map((event: any) => {
                    const isAnomaly = event.isAnomaly;
                    const features = event.features as any;
                    
                    return (
                      <div 
                        key={event.id} 
                        className={`p-4 rounded-lg border-l-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
                          isAnomaly 
                            ? 'bg-red-500/10 border-red-500 hover:bg-red-500/20' 
                            : 'bg-muted/50 border-green-500 hover:bg-muted'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={isAnomaly ? 'destructive' : 'outline'}>
                              {isAnomaly ? features?.attack_classification || "ANOMALY" : "NORMAL"}
                            </Badge>
                            <span className="font-semibold">{event.entity?.name || "Unknown Entity"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-4">
                            <span className="font-mono text-sm font-bold opacity-75">Risk: {event.score.toFixed(1)}</span>
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {isAnomaly ? (
                          <div className="text-sm font-mono text-red-700 dark:text-red-400">
                            &gt; {features?.human_readable_explanation || "Suspicious deviations detected."}
                          </div>
                        ) : (
                          <div className="text-sm font-mono text-muted-foreground">
                            &gt; Session matches generic baseline profile.
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {liveData.feed.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      No live events. Start the simulator to begin streaming data.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}