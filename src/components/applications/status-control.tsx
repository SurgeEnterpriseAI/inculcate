"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationStatus, Role } from "@prisma/client";
import { allowedNextStatuses, STATUS_LABEL } from "@/lib/application-status";
import { updateApplicationStatus } from "@/server/actions/applications";
import { Button } from "@/components/ui/button";

export function StatusControl({
  id,
  status,
  role,
  isOwner,
}: {
  id: string;
  status: ApplicationStatus;
  role: Role;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const options = allowedNextStatuses(role, status, isOwner);

  if (options.length === 0) return <span className="text-xs text-[var(--muted)]">No actions</span>;

  function move(to: ApplicationStatus) {
    setError(null);
    start(async () => {
      const res = await updateApplicationStatus(id, to);
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((to) => (
        <Button key={to} size="sm" variant={to === "WITHDRAWN" || to === "REJECTED" ? "outline" : "primary"} disabled={pending} onClick={() => move(to)}>
          {to === "WITHDRAWN" ? "Withdraw" : `→ ${STATUS_LABEL[to]}`}
        </Button>
      ))}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
