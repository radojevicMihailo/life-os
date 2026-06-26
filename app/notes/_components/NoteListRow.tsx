import Link from "next/link";
import { StickyNote, ListChecks } from "lucide-react";
import { type NoteKind, noteKindLabel } from "@/db/schema/notes";

export type NoteListItem = {
  id: string;
  title: string;
  kind: NoteKind;
  body: string;
  updatedAt: Date;
};

export function NoteListRow({ note }: { note: NoteListItem }) {
  const Icon = note.kind === "todo" ? ListChecks : StickyNote;
  const snippet = note.body.replace(/\s+/g, " ").trim().slice(0, 120);
  return (
    <Link
      href={`/notes/${note.id}`}
      className="flex items-start gap-3 rounded-md border p-3 transition hover:bg-accent"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{note.title || "Untitled"}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {noteKindLabel[note.kind]}
          </span>
        </div>
        {snippet ? <p className="truncate text-sm text-muted-foreground">{snippet}</p> : null}
      </div>
    </Link>
  );
}
