import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InvestigationProvider } from "@/components/investigator/investigation-context";
import { ConsoleSidebar } from "@/components/investigator/console-sidebar";
import { ConsoleTopbar } from "@/components/investigator/console-topbar";

export const metadata: Metadata = {
  title: "Investigator Console — GTrace",
  description: "Network analysis console for case OP-KESTREL.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark flex h-dvh flex-col bg-background text-foreground md:flex-row">
      <InvestigationProvider>
        <TooltipProvider delayDuration={200}>
          <ConsoleSidebar />
          <div className="flex min-h-0 flex-1 flex-col">
            <ConsoleTopbar />
            <main className="relative min-h-0 flex-1">{children}</main>
          </div>
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              classNames: {
                toast: "!rounded-none !border-border !bg-popover !text-popover-foreground font-mono text-xs",
              },
            }}
          />
        </TooltipProvider>
      </InvestigationProvider>
    </div>
  );
}
