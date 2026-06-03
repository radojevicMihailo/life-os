"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addBucket, removeBucket, updateBucket } from "../_actions/buckets";
import type { AssetGroup, Bucket } from "@/db/schema/finance";

const NONE = "__none__";

export function BucketEditor({
  buckets,
  groups,
}: {
  buckets: Bucket[];
  groups: AssetGroup[];
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(NONE);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await addBucket({
        name,
        assetGroupId: groupId === NONE ? null : groupId,
        sortOrder: buckets.length,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setName("");
    });
  }

  function rename(b: Bucket, next: string) {
    if (next === b.name) return;
    startTransition(async () => {
      const r = await updateBucket({ id: b.id, name: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setGroup(b: Bucket, value: string) {
    const v = value === NONE ? null : value;
    if (v === b.assetGroupId) return;
    startTransition(async () => {
      const r = await updateBucket({ id: b.id, assetGroupId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove(b: Bucket) {
    if (!confirm(`Remove bucket "${b.name}"?`)) return;
    startTransition(async () => {
      const r = await removeBucket(b.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-medium">Bukete</h3>
        <p className="text-xs text-muted-foreground">
          Srednji nivo grupisanja računa (npr. Dinarski Raiffeisen, IBKR, Trezor Safe 3).
        </p>
      </div>

      <ul className="space-y-2">
        {buckets.map((b) => (
          <li key={b.id} className="grid grid-cols-12 gap-2 items-center">
            <Input
              defaultValue={b.name}
              onBlur={(e) => rename(b, e.target.value.trim())}
              className="col-span-7"
            />
            <div className="col-span-4">
              <Select value={b.assetGroupId ?? NONE} onValueChange={(v) => setGroup(b, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Grupa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button size="icon" variant="ghost" onClick={() => remove(b)} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New bucket"
          className="col-span-7"
        />
        <div className="col-span-4">
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Grupa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
