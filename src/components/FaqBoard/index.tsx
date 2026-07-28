"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";

import { CSS } from "@dnd-kit/utilities";

interface FaqRow {
  id: string;
  question: string;
}

interface FaqBoardProps {
  faqs: FaqRow[];
}

const SortableFaqRow: React.FC<{ faq: FaqRow }> = ({ faq }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: faq.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="rounded-md border border-gray-300 bg-white p-3 text-sm font-medium text-gray-800 shadow-sm"
    >
      {faq.question}
    </div>
  );
};

const FaqBoard: React.FC<FaqBoardProps> = ({ faqs }) => {
  const router = useRouter();
  const [rows, setRows] = useState<FaqRow[]>(faqs);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRows((prev) => {
      const activeIndex = prev.findIndex((row) => row.id === active.id);
      const overIndex = prev.findIndex((row) => row.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return prev;
      return arrayMove(prev, activeIndex, overIndex);
    });
  };

  const handleSave = async () => {
    const updates = rows.map((row, index) => ({ id: row.id, order: index }));
    setIsSaving(true);
    try {
      await httpClient.patch("/admin/faqs/order", { updates });
      toast.success("Ordem guardada.");
      router.refresh();
    } catch {
      toast.error("Não foi possível guardar a ordem.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-fit self-end rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "A guardar..." : "Guardar"}
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex max-w-2xl flex-col gap-2">
            {rows.map((row) => (
              <SortableFaqRow key={row.id} faq={row} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default FaqBoard;
