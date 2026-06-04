import { TemplateForm } from "../../_components/TemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">New template</h1>
      <TemplateForm mode={{ kind: "create" }} initialName="" initialItems={[]} />
    </div>
  );
}
