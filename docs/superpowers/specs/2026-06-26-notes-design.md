# Notes module — design

Date: 2026-06-26

## Purpose

Add a Notes section to life-os for capturing free-form markdown notes and simple
todo lists. Lightweight by design — heavy task management already lives in the
`(tasks)` module. Notes are for quick capture: a markdown scratchpad or a
checkable list.

## Decisions

- **One entity, two kinds.** A single `note` has a `kind` of `free` or `todo`.
  Free notes use a markdown `body`. Todo notes use a list of checkable items.
  Switching kind keeps both representations stored; only the relevant one renders.
- **Flat organization.** No folders or tags. List sorted by `updatedAt` desc,
  with a client-side search box (filters title + body).
- **Minimal todo items.** Each item is text + done checkbox + order. No due
  dates, no link to the Tasks system.
- **Markdown body.** Free notes are markdown, rendered with `react-markdown` +
  `remark-gfm`.
- **Reorder via up/down buttons.** No drag-and-drop.

## Data model — `db/schema/notes.ts`

```
noteKindEnum = pgEnum("note_kind", ["free", "todo"])

note
  id         uuid pk default random
  title      text not null
  kind       note_kind not null default "free"
  body       text not null default ""        // markdown, used when kind = free
  createdAt  timestamp not null default now
  updatedAt  timestamp not null default now
  index on updatedAt

noteItem
  id         uuid pk default random
  noteId     uuid not null fk -> note.id on delete cascade
  text       text not null
  done       boolean not null default false
  position   integer not null default 0      // ordering within a note
  createdAt  timestamp not null default now
  index on (noteId, position)
```

Switching a note's kind does not delete data — a `free` note may still hold
orphan items and a `todo` note may still hold a `body`; the UI just renders
whichever matches the current kind.

## Validation — `lib/validation/notes.ts`

Zod schemas, mirroring the goals module style:

- `createNoteSchema` — title (non-empty), kind (optional, default `free`)
- `updateNoteSchema` — id + optional title / body / kind patch
- `addItemSchema` — noteId, text (non-empty)
- `updateItemTextSchema` — id, text
- `toggleItemSchema` — id, done
- `reorderItemSchema` — id, direction (`up` | `down`)
- `deleteNoteSchema` / `deleteItemSchema` — id

Exported `Create*Input` / `Update*Input` types.

## Server actions — `app/notes/_actions/`

`notes.ts` (`"use server"`), all returning the existing
`ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }` shape:

- `createNote(input)` -> `{ id }`
- `updateNote(input)` — title / body / kind; bumps `updatedAt`
- `deleteNote(input)`
- `addItem(input)` -> `{ id }` — appends with `position = max+1`
- `updateItemText(input)`
- `toggleItem(input)`
- `reorderItems(input)` — swap position with neighbor in given direction
- `deleteItem(input)`

Item mutations bump the parent note's `updatedAt` so the list re-sorts.

`_revalidate.ts` — `revalidateNoteRoutes({ noteId? })` revalidates `/notes`
and `/notes/:id`, following the goals `_revalidate` pattern.

## Routes

- `app/notes/page.tsx` (server) — loads all notes (id, title, kind, body,
  updatedAt) sorted by `updatedAt` desc; renders `NoteList`. "New note" button
  creates a blank `free` note and routes to it.
- `app/notes/[id]/page.tsx` (server) — loads the note + its items; renders
  `NoteEditor`.
- `app/notes/loading.tsx` — skeleton, matching sibling modules.

## Components — `app/notes/_components/`

- `NoteList` (client) — holds search state, renders `SearchBox` + filtered
  `NoteListRow`s.
- `SearchBox` (client) — controlled input, filters title + body.
- `NoteListRow` — link to `/notes/:id`, shows title, kind badge, snippet,
  relative updated time.
- `NoteEditor` (client) — title field, kind toggle, delete. Renders
  `MarkdownBody` editor when `free`, `TodoItems` when `todo`. Calls actions and
  refreshes.
- `MarkdownBody` (client) — textarea + rendered preview (`react-markdown` +
  `remark-gfm`). Debounced save via `updateNote`.
- `TodoItems` (client) — add-item input, list of rows each with checkbox,
  inline-editable text, up/down buttons, delete.

## Navigation — `components/nav-tree.tsx`

Add a leaf: `{ kind: "leaf", href: "/notes", label: "Notes", icon: StickyNote }`
(import `StickyNote` from lucide-react). Add `/notes` and `/notes/` to route
matching so the item highlights on detail pages.

## Dependencies

Add `react-markdown` and `remark-gfm`. Confirm against the bundled Next.js docs
in `node_modules/next/dist/docs/` that client-component usage is correct before
wiring.

## Testing

- `lib/validation/notes.ts` — unit tests for each schema (valid + invalid).
- `reorderItems` logic — unit test the position-swap (extract pure helper if it
  clarifies, following `task-sections.ts` precedent).
- Action happy-path coverage consistent with existing module test depth.

## Out of scope

Folders, tags, due dates on items, drag-and-drop reorder, linking todo items to
the Tasks system, rich-text WYSIWYG, sharing/export, attachments.
