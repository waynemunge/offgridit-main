import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function getTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSecs = Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return { days, hours, mins, secs };
}

export function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState(() => getTimeLeft(endsAt));

  useEffect(() => {
    const id = setInterval(() => setLeft(getTimeLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!left) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" /> Sale ended
      </div>
    );
  }

  const display =
    left.days > 0
      ? `${left.days}d ${left.hours}h ${left.mins}m`
      : `${String(left.hours).padStart(2, "0")}:${String(left.mins).padStart(2, "0")}:${String(left.secs).padStart(2, "0")}`;

  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
      <Clock className="h-4 w-4 shrink-0" />
      Flash sale ends in{" "}
      <span className="font-mono">{display}</span>
    </div>
  );
}
