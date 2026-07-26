"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, UploadCloud, Loader2 } from "lucide-react";

type Dataset = {
  id: string;
  name: string;
  sizeBytes: number;
  rowCount: number;
  columnCount: number;
  missingValues: number;
  anomalyPercentage: number | null;
  createdAt: string;
};

export default function SyntheticDataPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const res = await fetch("/api/datasets");
      if (res.ok) {
        const data = await res.json();
        setDatasets(data);
      }
    } catch (error) {
      console.error("Failed to fetch datasets", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchDatasets();
      } else {
        const err = await res.json();
        alert("Upload failed: " + err.error);
      }
    } catch (error) {
      console.error("Upload error", error);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    
    try {
      const res = await fetch(`/api/datasets/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDatasets(datasets.filter(d => d.id !== id));
      } else {
        alert("Delete failed.");
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dataset Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage your synthetic and real-world behavioural datasets for model training.
          </p>
        </div>
        
        <div>
          <input
            type="file"
            id="file-upload"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <Button 
            disabled={isUploading}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
            {isUploading ? "Uploading..." : "Upload Dataset"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Datasets</CardTitle>
          <CardDescription>View statistics and anomalies for available datasets.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : datasets.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No datasets uploaded yet. Click "Upload Dataset" to add a CSV file.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead>Missing</TableHead>
                  <TableHead>Anomalies</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset.id}>
                    <TableCell className="font-medium">{dataset.name}</TableCell>
                    <TableCell>{formatBytes(dataset.sizeBytes)}</TableCell>
                    <TableCell>{dataset.rowCount.toLocaleString()}</TableCell>
                    <TableCell>{dataset.columnCount}</TableCell>
                    <TableCell>{dataset.missingValues.toLocaleString()}</TableCell>
                    <TableCell>
                      {dataset.anomalyPercentage !== null 
                        ? `${dataset.anomalyPercentage.toFixed(2)}%` 
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dataset.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}