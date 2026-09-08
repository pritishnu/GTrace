"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
  const router = useRouter();
  const [investigatorId, setInvestigatorId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setTimeout(() => router.push("/dashboard"), 900);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center border border-border bg-card">
          <Lock className="size-4 text-highlight" />
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Optimus / Investigator Console
          </p>
          <h1 className="font-display text-2xl leading-none">Restricted Access</h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border border-border bg-card/90 backdrop-blur-sm p-6 flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="investigator-id" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Investigator ID
          </Label>
          <Input
            id="investigator-id"
            name="investigatorId"
            autoComplete="username"
            placeholder="INV-0000"
            required
            value={investigatorId}
            onChange={(e) => setInvestigatorId(e.target.value)}
            className="h-10 rounded-none font-mono bg-background/60 border-border focus-visible:ring-highlight/60 focus-visible:border-highlight"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-none font-mono bg-background/60 border-border focus-visible:ring-highlight/60 focus-visible:border-highlight"
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-10 rounded-none bg-highlight text-highlight-foreground hover:bg-highlight/90 font-medium tracking-wide"
        >
          {submitting ? (
            <>
              <Spinner className="size-4" />
              Authenticating
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <ShieldAlert className="size-3.5 shrink-0" />
          Access is logged and monitored.
        </p>
      </form>

      <p className="mt-6 font-mono text-[11px] text-muted-foreground/70">
        Session ID {"·"} {"0x"}
        {Math.abs(hashString("optimus-session")).toString(16).slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
