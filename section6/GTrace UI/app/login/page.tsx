import type { Metadata } from "next";
import { AnimatedSphere } from "@/components/landing/animated-sphere";
import { LoginForm } from "@/components/investigator/login-form";

export const metadata: Metadata = {
  title: "Sign In — GTrace Investigator Console",
  description: "Restricted access. Authorized investigators only.",
};

export default function LoginPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground relative overflow-hidden noise-overlay">
      {/* Reuses the landing sphere; inverted so its dark glyphs read on the dark canvas */}
      <div
        className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[900px] lg:h-[900px] opacity-30 pointer-events-none invert"
        aria-hidden="true"
      >
        <AnimatedSphere />
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden="true">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10 left-0 right-0"
            style={{ top: `${12.5 * (i + 1)}%` }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10 top-0 bottom-0"
            style={{ left: `${8.33 * (i + 1)}%` }}
          />
        ))}
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <LoginForm />
      </main>
    </div>
  );
}
