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
import { addAccount, removeAccount, updateAccount } from "../_actions/accounts";
import type { Account, AssetGroup, Bucket, Currency } from "@/db/schema/finance";

const NONE = "__none__";

export function AccountEditor({
  accounts,
  groups,
  buckets,
  currencies,
}: {
  accounts: Account[];
  groups: AssetGroup[];
  buckets: Bucket[];
  currencies: Currency[];
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(NONE);
  const [bucketId, setBucketId] = useState<string>(NONE);
  const [currencyId, setCurrencyId] = useState<string>(NONE);
  const [pending, startTransition] = useTransition();

  function bucketsFor(groupIdValue: string | null): Bucket[] {
    if (!groupIdValue) return buckets;
    return buckets.filter((b) => b.assetGroupId === groupIdValue || b.assetGroupId === null);
  }

  function submit() {
    startTransition(async () => {
      const r = await addAccount({
        name,
        assetGroupId: groupId === NONE ? null : groupId,
        bucketId: bucketId === NONE ? null : bucketId,
        currencyId: currencyId === NONE ? null : currencyId,
        sortOrder: accounts.length,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setName("");
      setBucketId(NONE);
    });
  }

  function rename(a: Account, next: string) {
    if (next === a.name) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, name: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setGroup(a: Account, value: string) {
    const v = value === NONE ? null : value;
    if (v === a.assetGroupId) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, assetGroupId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setBucket(a: Account, value: string) {
    const v = value === NONE ? null : value;
    if (v === a.bucketId) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, bucketId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function setCurrency(a: Account, value: string) {
    const v = value === NONE ? null : value;
    if (v === a.currencyId) return;
    startTransition(async () => {
      const r = await updateAccount({ id: a.id, currencyId: v });
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove(a: Account) {
    if (!confirm(`Remove account "${a.name}"?`)) return;
    startTransition(async () => {
      const r = await removeAccount(a.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-medium">Računi / Imovina</h3>
        <p className="text-xs text-muted-foreground">
          Svaki račun ima ime, grupu, buket i jednu valutu.
        </p>
      </div>

      <ul className="space-y-2">
        {accounts.map((a) => (
          <li key={a.id} className="grid grid-cols-12 gap-2 items-center">
            <Input
              defaultValue={a.name}
              onBlur={(e) => rename(a, e.target.value.trim())}
              className="col-span-4"
            />
            <div className="col-span-3">
              <Select value={a.assetGroupId ?? NONE} onValueChange={(v) => setGroup(a, v)}>
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
            <div className="col-span-3">
              <Select value={a.bucketId ?? NONE} onValueChange={(v) => setBucket(a, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Buket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {bucketsFor(a.assetGroupId).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Select value={a.currencyId ?? NONE} onValueChange={(v) => setCurrency(a, v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Valuta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button size="icon" variant="ghost" onClick={() => remove(a)} disabled={pending}>
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
          placeholder="New account"
          className="col-span-4"
        />
        <div className="col-span-3">
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
        <div className="col-span-3">
          <Select value={bucketId} onValueChange={setBucketId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Buket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {bucketsFor(groupId === NONE ? null : groupId).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1">
          <Select value={currencyId} onValueChange={setCurrencyId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Valuta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {currencies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
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
