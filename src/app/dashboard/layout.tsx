import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/layout/user-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hackathon mode: Bypass authentication
  const mockUser = {
    name: "Hackathon Judge",
    email: "judge@hackathon.com",
    role: "ADMIN"
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1 w-full min-h-screen bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 justify-between bg-card">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="font-semibold text-foreground/80">
            Dashboard / {mockUser.role}
          </span>
        </div>
        <UserNav user={mockUser as any} />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
