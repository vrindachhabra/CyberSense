"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Download, Trash, CheckCircle } from "lucide-react";
import Papa from "papaparse";

export default function SOCAlertDashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
  
  // Selected alert for details view
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    let url = `/api/alerts?`;
    if (statusFilter !== "ALL") url += `status=${statusFilter}&`;
    if (severityFilter !== "ALL") url += `severity=${severityFilter}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;
    
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter, search]);

  const fetchAlertDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`);
      if (res.ok) {
        setSelectedAlert(await res.json());
        setIsDetailsOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedAlertIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAlertIds(newSet);
  };

  const handleBulkAction = async (status: string) => {
    if (selectedAlertIds.size === 0) return;
    setIsActionLoading(true);
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: Array.from(selectedAlertIds), status })
      });
      setSelectedAlertIds(newSet => { newSet.clear(); return newSet; });
      await fetchAlerts();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setIsActionLoading(true);
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      await fetchAlertDetails(id); // refresh details
      await fetchAlerts(); // refresh list
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddComment = async (id: string) => {
    if (!commentText.trim()) return;
    setIsActionLoading(true);
    try {
      await fetch(`/api/alerts/${id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText })
      });
      setCommentText("");
      await fetchAlertDetails(id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportCSV = () => {
    const csvData = alerts.map(a => ({
      ID: a.id,
      Title: a.title,
      Severity: a.severity,
      Status: a.status,
      Entity: a.entity?.name,
      Date: new Date(a.createdAt).toISOString(),
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alerts_export.csv';
    a.click();
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SOC Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage, investigate, and resolve security alerts.</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="INVESTIGATING">Investigating</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v || "ALL")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {selectedAlertIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2 border-l pl-4">
            <span className="text-sm text-muted-foreground">{selectedAlertIds.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => handleBulkAction('RESOLVED')} disabled={isActionLoading}>
              <CheckCircle className="mr-2 h-4 w-4" /> Resolve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction('FALSE_POSITIVE')} disabled={isActionLoading}>
              <Trash className="mr-2 h-4 w-4" /> False Positive
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <Card className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={alerts.length > 0 && selectedAlertIds.size === alerts.length}
                  onCheckedChange={(c) => {
                    if (c) setSelectedAlertIds(new Set(alerts.map(a => a.id)));
                    else setSelectedAlertIds(new Set());
                  }}
                />
              </TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
            ) : alerts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No alerts match filters.</TableCell></TableRow>
            ) : alerts.map((alert) => (
              <TableRow key={alert.id} className="cursor-pointer hover:bg-muted/50" onClick={() => fetchAlertDetails(alert.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedAlertIds.has(alert.id)} onCheckedChange={() => toggleSelection(alert.id)} />
                </TableCell>
                <TableCell>
                  <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : alert.severity === 'HIGH' ? 'destructive' : 'default'}>
                    {alert.severity}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{alert.title}</TableCell>
                <TableCell>{alert.entity?.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{alert.status}</Badge>
                </TableCell>
                <TableCell>{new Date(alert.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          {selectedAlert && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex items-center gap-4">
                  <Badge variant={selectedAlert.severity === 'CRITICAL' ? 'destructive' : 'default'}>{selectedAlert.severity}</Badge>
                  <DialogTitle className="text-xl">{selectedAlert.title}</DialogTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{selectedAlert.description}</p>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto p-6 grid grid-cols-3 gap-6">
                {/* Left Col: ML Details */}
                <div className="col-span-2 space-y-6">
                  <Card>
                    <CardHeader><CardTitle>AI Prediction (LSTM + SHAP)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAlert.anomalyPrediction ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Risk Score</p>
                              <p className={`text-2xl font-bold ${selectedAlert.anomalyPrediction.score > 80 ? 'text-red-500' : 'text-orange-500'}`}>
                                {selectedAlert.anomalyPrediction.score.toFixed(1)} / 100
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Attack Type</p>
                              <p className="text-lg font-medium">
                                {(selectedAlert.anomalyPrediction.features as any)?.attack_classification || "Suspicious Behaviour"}
                              </p>
                            </div>
                          </div>
                          <div className="bg-muted p-4 rounded-md">
                            <p className="text-sm font-semibold mb-2">Human-Readable Explanation:</p>
                            <p className="text-sm font-mono">
                              {(selectedAlert.anomalyPrediction.features as any)?.human_readable_explanation || "No explanation generated."}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No ML prediction linked to this alert.</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader><CardTitle>Timeline & Comments</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {selectedAlert.activities?.map((act: any) => (
                          <div key={act.id} className="border-l-2 pl-4 py-1 text-sm relative">
                            <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-primary" />
                            <p className="text-xs text-muted-foreground">{new Date(act.createdAt).toLocaleString()} - {act.type}</p>
                            <p className="mt-1">{act.content}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Textarea 
                          placeholder="Add investigation notes..." 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                        />
                        <Button className="h-auto" disabled={isActionLoading} onClick={() => handleAddComment(selectedAlert.id)}>Post</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Right Col: Actions & Meta */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" onClick={() => handleUpdateStatus(selectedAlert.id, 'INVESTIGATING')} disabled={isActionLoading || selectedAlert.status === 'INVESTIGATING'}>
                        Start Investigation
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-green-600" onClick={() => handleUpdateStatus(selectedAlert.id, 'RESOLVED')} disabled={isActionLoading || selectedAlert.status === 'RESOLVED'}>
                        Mark Resolved
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => handleUpdateStatus(selectedAlert.id, 'FALSE_POSITIVE')} disabled={isActionLoading || selectedAlert.status === 'FALSE_POSITIVE'}>
                        Mark False Positive
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Entity: </span>
                        {selectedAlert.entity?.name || selectedAlert.entityId}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        {selectedAlert.status}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created: </span>
                        {new Date(selectedAlert.createdAt).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}