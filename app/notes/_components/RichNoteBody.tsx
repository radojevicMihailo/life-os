"use client";

import { useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bold, Heading2, Italic, List, ListOrdered, Pilcrow } from "lucide-react";
import { Button } from "@/components/ui/button";

function inlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/([\\*_\[\]])/g, "\\$1");
  if (!(node instanceof HTMLElement)) return "";
  const content = Array.from(node.childNodes, inlineMarkdown).join("");
  switch (node.tagName) {
    case "B": case "STRONG": return `**${content}**`;
    case "I": case "EM": return `*${content}*`;
    case "BR": return "  \n";
    case "CODE": return `\`${content}\``;
    case "A": {
      const url = node.getAttribute("href") ?? "";
      return /^(https?:|mailto:)/i.test(url) ? `[${content}](${url})` : content;
    }
    default: return content;
  }
}

function blockMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return inlineMarkdown(node).trim();
  if (!(node instanceof HTMLElement)) return "";
  const content = Array.from(node.childNodes, inlineMarkdown).join("").trim();
  if (/^H[1-6]$/.test(node.tagName)) return `${"#".repeat(Number(node.tagName[1]))} ${content}`;
  if (node.tagName === "UL" || node.tagName === "OL") {
    return Array.from(node.children).filter((child) => child.tagName === "LI")
      .map((child, index) => `${node.tagName === "OL" ? `${index + 1}.` : "-"} ${Array.from(child.childNodes, inlineMarkdown).join("").trim()}`)
      .join("\n");
  }
  if (node.tagName === "HR") return "---";
  if (node.tagName === "PRE") return `\`\`\`\n${node.textContent ?? ""}\n\`\`\``;
  return content;
}

function editorMarkdown(editor: HTMLElement): string {
  return Array.from(editor.childNodes, blockMarkdown).filter(Boolean).join("\n\n").trim();
}

const controls = [
  { label: "Običan tekst", icon: Pilcrow, command: "formatBlock", value: "p" },
  { label: "Naslov", icon: Heading2, command: "formatBlock", value: "h2" },
  { label: "Podebljaj", icon: Bold, command: "bold" },
  { label: "Kurziv", icon: Italic, command: "italic" },
  { label: "Lista", icon: List, command: "insertUnorderedList" },
  { label: "Numerisana lista", icon: ListOrdered, command: "insertOrderedList" },
] as const;

export function RichNoteBody({ initialBody, onChange }: { initialBody: string; onChange: (body: string) => void }) {
  const editor = useRef<HTMLDivElement>(null);
  const markup = useMemo(() => renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{initialBody}</ReactMarkdown>), [initialBody]);

  function format(command: string, value?: string) {
    editor.current?.focus();
    document.execCommand(command, false, value);
    if (editor.current) onChange(editorMarkdown(editor.current));
  }

  return <div className="overflow-hidden rounded-2xl border border-input bg-background">
    <div role="toolbar" aria-label="Formatiranje beleške" className="flex flex-wrap gap-1 border-b border-border bg-card p-2">
      {controls.map(({ label, icon: Icon, command, ...rest }) => <Button
        key={label} type="button" variant="ghost" size="icon-sm" title={label} aria-label={label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => format(command, "value" in rest ? rest.value : undefined)}
      ><Icon className="size-4" /></Button>)}
    </div>
    <div
      ref={editor}
      role="textbox"
      aria-label="Sadržaj beleške"
      aria-multiline="true"
      contentEditable
      suppressContentEditableWarning
      onInput={(event) => onChange(editorMarkdown(event.currentTarget))}
      onPaste={(event) => {
        event.preventDefault();
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      }}
      className="min-h-80 p-5 text-base leading-relaxed outline-none empty:before:text-muted-foreground empty:before:content-['Počni_da_pišeš…'] [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:mb-3 [&_ol]:ml-6 [&_ol]:list-decimal"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  </div>;
}
