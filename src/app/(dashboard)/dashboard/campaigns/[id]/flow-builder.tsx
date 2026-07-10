"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Image as ImageIcon, MessageSquare, ListChecks, Mail, X, ChevronUp, ChevronDown } from "lucide-react";

type Option = { label: string; value: string; next?: string };
type Step = {
  id: string;
  type: "message" | "choice" | "contact";
  message: string;
  image?: string;
  options?: Option[];
};

function makeId() {
  return "step_" + Math.random().toString(36).slice(2, 9);
}

export default function FlowBuilder({
  initialFlow,
  onChange,
}: {
  initialFlow: Step[];
  onChange: (flow: Step[]) => void;
}) {
  const [steps, setSteps] = useState<Step[]>(
    initialFlow.length > 0
      ? initialFlow
      : [{ id: makeId(), type: "message", message: "Hey! Thanks for stopping by 👋" }]
  );

  function update(newSteps: Step[]) {
    setSteps(newSteps);
    onChange(newSteps);
  }

  function addStep(type: Step["type"]) {
    const newStep: Step = {
      id: makeId(),
      type,
      message: type === "contact" ? "Leave your email and WhatsApp number and we'll follow up shortly." : "",
      options: type === "choice" ? [{ label: "Option 1", value: "option_1" }] : undefined,
    };
    update([...steps, newStep]);
  }

  function updateStep(index: number, patch: Partial<Step>) {
    const next = steps.slice();
    next[index] = { ...next[index], ...patch };
    update(next);
  }

  function removeStep(index: number) {
    update(steps.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = steps.slice();
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  function addOption(stepIndex: number) {
    const step = steps[stepIndex];
    const options = step.options || [];
    updateStep(stepIndex, {
      options: [...options, { label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }],
    });
  }

  function updateOption(stepIndex: number, optIndex: number, patch: Partial<Option>) {
    const step = steps[stepIndex];
    const options = (step.options || []).slice();
    options[optIndex] = { ...options[optIndex], ...patch };
    updateStep(stepIndex, { options });
  }

  function removeOption(stepIndex: number, optIndex: number) {
    const step = steps[stepIndex];
    updateStep(stepIndex, { options: (step.options || []).filter((_, i) => i !== optIndex) });
  }

  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <StepCard
          key={step.id}
          step={step}
          index={index}
          total={steps.length}
          onUpdate={(patch) => updateStep(index, patch)}
          onRemove={() => removeStep(index)}
          onMove={(dir) => moveStep(index, dir)}
          onAddOption={() => addOption(index)}
          onUpdateOption={(optIndex, patch) => updateOption(index, optIndex, patch)}
          onRemoveOption={(optIndex) => removeOption(index, optIndex)}
        />
      ))}

      <div className="flex gap-2 pt-2">
        <AddStepButton icon={<MessageSquare size={14} />} label="Message" onClick={() => addStep("message")} />
        <AddStepButton icon={<ListChecks size={14} />} label="Multiple Choice" onClick={() => addStep("choice")} />
        <AddStepButton icon={<Mail size={14} />} label="Contact Form" onClick={() => addStep("contact")} />
      </div>
    </div>
  );
}

function AddStepButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 px-3 py-2 rounded-lg hover:bg-brand-100 transition-colors"
    >
      <Plus size={13} /> {icon} {label}
    </button>
  );
}

function StepCard({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: {
  step: Step;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Step>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddOption: () => void;
  onUpdateOption: (optIndex: number, patch: Partial<Option>) => void;
  onRemoveOption: (optIndex: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const typeLabels = { message: "Message", choice: "Multiple Choice", contact: "Contact Form" };
  const typeColors = {
    message: "bg-blue-50 text-blue-700",
    choice: "bg-brand-50 text-brand-700",
    contact: "bg-emerald-50 text-emerald-700",
  };

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    // Resize client-side via canvas before upload — keeps the stored
    // campaign config small regardless of the original photo size.
    const dataUrl = await resizeImageToDataUrl(file, 800, 0.75);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      onUpdate({ image: data.url });
    } else {
      alert(data.error || "Upload failed");
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeColors[step.type]}`}>
            {typeLabels[step.type]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ChevronUp size={15} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ChevronDown size={15} />
          </button>
          <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-600">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <textarea
        value={step.message}
        onChange={(e) => onUpdate({ message: e.target.value })}
        placeholder={step.type === "contact" ? "e.g. Leave your email and WhatsApp number..." : "What should the bot say here?"}
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
      />

      {step.type !== "contact" && (
        <div className="mb-3">
          {step.image ? (
            <div className="relative inline-block">
              <img src={step.image} className="h-24 rounded-lg object-cover" alt="" />
              <button
                type="button"
                onClick={() => onUpdate({ image: undefined })}
                className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 shadow-card"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-brand-300 hover:text-brand-600"
            >
              <ImageIcon size={14} /> {uploading ? "Uploading..." : "Add image (carousel/reel banner)"}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      )}

      {step.type === "choice" && (
        <div className="flex flex-col gap-2">
          {(step.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-brand-400 shrink-0" />
              <input
                value={opt.label}
                onChange={(e) => onUpdateOption(i, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                placeholder="Option text"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button type="button" onClick={() => onRemoveOption(i)} className="text-gray-300 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAddOption}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 mt-1 self-start"
          >
            <Plus size={12} /> Add option
          </button>
        </div>
      )}
    </div>
  );
}

function resizeImageToDataUrl(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
