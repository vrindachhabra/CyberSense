"use client";

import { Activity, AlertTriangle, Database, LayoutDashboard, Settings, ShieldAlert, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Synthetic Data", url: "/dashboard/synthetic-data", icon: Database },
  { title: "Detection Models", url: "/dashboard/models", icon: Activity },
  { title: "Alerts", url: "/dashboard/alerts", icon: AlertTriangle },
  { title: "Entities", url: "/dashboard/entities", icon: Users },
  { title: "Analytics", url: "/dashboard/analytics", icon: ShieldAlert },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-border">
        <h1 className="text-lg font-bold text-primary flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          Anomaly Platform
        </h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<Link href={item.url} />} isActive={pathname === item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
