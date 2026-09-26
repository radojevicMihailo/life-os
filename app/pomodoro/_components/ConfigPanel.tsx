"use client";

import { useState } from "react";
import { usePomodoro } from "@/lib/pomodoro/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function NumberField({
  id,
  label,
  value,
  min,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  const [raw, setRaw] = useState<string>(String(value));

  function commit() {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setRaw(String(value));
      return;
    }
    const clamped = Math.max(min, Math.floor(n));
    setRaw(String(clamped));
    if (clamped !== value) onChange(clamped);
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        disabled={disabled}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-24"
      />
    </div>
  );
}

export function ConfigPanel() {
  const {
    state,
    setConfig,
    notifyEnabled,
    setNotify,
    requestNotificationPermission,
  } = usePomodoro();

  const cfg = state.config;
  const disabled = state.status !== "idle";

  const canEnableNotifications =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission !== "denied";

  return (
    <div className="mt-6 grid gap-4 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium">Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          key={cfg.workMin}
          id="work-min"
          label="Work (min)"
          value={cfg.workMin}
          min={1}
          disabled={disabled}
          onChange={(n) => setConfig({ workMin: n })}
        />
        <NumberField
          key={cfg.breakMin}
          id="break-min"
          label="Break (min)"
          value={cfg.breakMin}
          min={1}
          disabled={disabled}
          onChange={(n) => setConfig({ breakMin: n })}
        />
      </div>
      <div className="flex items-center gap-3">
        {canEnableNotifications && !notifyEnabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void requestNotificationPermission()}
          >
            Enable notifications
          </Button>
        )}
        {notifyEnabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setNotify(false)}
          >
            Disable notifications
          </Button>
        )}
      </div>
    </div>
  );
}
