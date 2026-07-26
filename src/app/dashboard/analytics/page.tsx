"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & AI Performance</h1>
        <p className="text-muted-foreground mt-2">
          Monitor threat trends, SOC efficiency, and LSTM Model performance metrics.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precision (ML)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{data.metrics.precision.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">True positives / Total flagged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recall (ML)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{data.metrics.recall.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Detected attacks / Total actual attacks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgResolutionTime.toFixed(2)} hrs</div>
            <p className="text-xs text-muted-foreground">SOC investigation speed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Positive Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{data.falsePositiveRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Volume of noise for analysts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Risk Trend & Daily Attacks */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Threat Volume & Average Risk Score (Over Time)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyAttacks.length ? data.dailyAttacks : [{ date: "No Data", count: 0 }]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" name="Attacks Detected" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attack Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Attack Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.attackDistribution.length ? data.attackDistribution : [{ name: "No Data", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {data.attackDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Top Entities */}
        <Card>
          <CardHeader>
            <CardTitle>Top Attacked Entities</CardTitle>
            <CardDescription>Entities with the most anomalies</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topEntities.length ? data.topEntities : [{ name: "No Data", attacks: 0 }]} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="attacks" fill="#FF8042" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Confusion Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Confusion Matrix (Ground Truth)</CardTitle>
            <CardDescription>Based on SOC Alert Resolutions</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <div className="grid grid-cols-3 gap-2 text-center text-sm w-full h-full max-w-sm">
              <div className="col-span-1"></div>
              <div className="col-span-1 font-bold">Predicted Positive</div>
              <div className="col-span-1 font-bold">Predicted Negative</div>
              
              <div className="font-bold flex items-center justify-end pr-2">Actual Positive</div>
              <div className="bg-green-500/20 rounded-md flex flex-col items-center justify-center p-2 border border-green-500">
                <span className="font-bold text-lg">{data.confusionMatrix.TP}</span>
                <span className="text-xs text-muted-foreground">True Positives</span>
              </div>
              <div className="bg-red-500/20 rounded-md flex flex-col items-center justify-center p-2 border border-red-500">
                <span className="font-bold text-lg">{data.confusionMatrix.FN}</span>
                <span className="text-xs text-muted-foreground">False Negatives</span>
              </div>
              
              <div className="font-bold flex items-center justify-end pr-2">Actual Negative</div>
              <div className="bg-orange-500/20 rounded-md flex flex-col items-center justify-center p-2 border border-orange-500">
                <span className="font-bold text-lg">{data.confusionMatrix.FP}</span>
                <span className="text-xs text-muted-foreground">False Positives</span>
              </div>
              <div className="bg-green-500/10 rounded-md flex flex-col items-center justify-center p-2 border border-green-500/50">
                <span className="font-bold text-lg">{data.confusionMatrix.TN}</span>
                <span className="text-xs text-muted-foreground">True Negatives</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROC Curve */}
        <Card>
          <CardHeader>
            <CardTitle>ROC Curve (LSTM Model)</CardTitle>
            <CardDescription>True Positive Rate vs False Positive Rate</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.rocCurve} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickCount={6} name="False Positive Rate" />
                <YAxis dataKey="tpr" type="number" domain={[0, 1]} tickCount={6} name="True Positive Rate" />
                <Tooltip formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val} labelFormatter={(label: any) => `FPR: ${typeof label === 'number' ? label.toFixed(2) : label}`} />
                <Line type="monotone" dataKey="tpr" stroke="#8884d8" strokeWidth={3} dot={false} />
                <Line type="linear" dataKey="fpr" stroke="#999" strokeDasharray="5 5" dot={false} /> {/* Diagonal baseline */}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}