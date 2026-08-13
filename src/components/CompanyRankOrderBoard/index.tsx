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

interface RankRow {
  id: string;
  name: string;
}

interface CompanyRankOrderBoardProps {
  ranks: RankRow[];
}

const SortableRankRow: React.FC<{ rank: RankRow }> = ({ rank }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: rank.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="rounded-md border border-gray-300 bg-white p-3 text-sm font-medium text-gray-800 shadow-sm"
    >
      {rank.name}
    </div>
  );
};

const CompanyRankOrderBoard: React.FC<CompanyRankOrderBoardProps> = ({
  ranks,
}) => {
  const router = useRouter();
  const [rows, setRows] = useState<RankRow[]>(ranks);
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
      await httpClient.patch("/admin/company-ranks/order", { updates });
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
              <SortableRankRow key={row.id} rank={row} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default CompanyRankOrderBoard;
