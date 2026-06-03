"use client";

import { SimpleListEditor, type SimpleItem } from "./SimpleListEditor";
import { addAssetGroup, removeAssetGroup, renameAssetGroup } from "../_actions/assetGroups";
import type { AssetGroup } from "@/db/schema/finance";

export function AssetGroupEditor({ groups }: { groups: AssetGroup[] }) {
  const items: SimpleItem[] = groups.map((g) => ({ id: g.id, label: g.name }));
  return (
    <SimpleListEditor
      title="Grupa imovine"
      hint="Visoki nivo grupisanja računa (Gotovina, Banka, Broker, Kripto, Dug)."
      items={items}
      placeholder="New asset group"
      onAdd={(name, sortOrder) => addAssetGroup({ name, sortOrder })}
      onRename={(id, name) => renameAssetGroup({ id, name })}
      onRemove={(id) => removeAssetGroup(id)}
    />
  );
}
