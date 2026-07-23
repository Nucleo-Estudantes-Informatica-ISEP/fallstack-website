"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import { findInvalidScheduleRowIds } from "@/domain/schedule/scheduleValidation";

import { CSS } from "@dnd-kit/utilities";

// Every page in the app that renders the schedule (Schedule/index.tsx,
// Content/index.tsx's firstDayTitle/secondDayTitle) assumes exactly two
// days - this board follows the same assumption rather than deriving lanes
// from whatever `day` values happen to be in the data.
const DAYS = [1, 2] as const;
type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  1: "Dia 1",
  2: "Dia 2",
};

interface ScheduleRow {
  id: string;
  startTime: string;
  endTime: string;
  activity: string;
}

type Board = Record<Day, ScheduleRow[]>;

interface ScheduleBoardProps {
  events: (ScheduleRow & { day: number })[];
}

function groupByDay(events: ScheduleBoardProps["events"]): Board {
  const board = { 1: [], 2: [] } as Board;
  for (const event of events) {
    const day = (DAYS as readonly number[]).includes(event.day)
      ? (event.day as Day)
      : 1;
    board[day].push({
      id: event.id,
      startTime: event.startTime,
      endTime: event.endTime,
      activity: event.activity,
    });
  }
  return board;
}

function findContainer(board: Board, id: string): Day | undefined {
  if (DAYS.some((day) => String(day) === id)) return Number(id) as Day;
  return DAYS.find((day) => board[day].some((row) => row.id === id));
}

const ScheduleRowCard: React.FC<{ row: ScheduleRow; invalid?: boolean }> = ({
  row,
  invalid,
}) => (
  <div className="flex items-center gap-3 rounded-md border border-gray-300 bg-white p-2 shadow-sm">
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${
        invalid
          ? "border-2 border-red-500 text-red-600"
          : "border border-transparent text-gray-600"
      }`}
    >
      {row.startTime}
    </span>
    <span className="text-xs text-gray-400">–{row.endTime}</span>
    <span className="truncate text-sm font-medium text-gray-800">
      {row.activity}
    </span>
  </div>
);

const SortableRow: React.FC<{ row: ScheduleRow; invalid: boolean }> = ({
  row,
  invalid,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <ScheduleRowCard row={row} invalid={invalid} />
    </div>
  );
};

const DayLane: React.FC<{
  day: Day;
  rows: ScheduleRow[];
  invalidIds: Set<string>;
}> = ({ day, rows, invalidIds }) => {
  const { setNodeRef } = useDroppable({ id: String(day) });

  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 rounded-lg bg-gray-100 p-4">
      <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
        {DAY_LABELS[day]} ({rows.length})
      </h2>
      <SortableContext
        items={rows.map((row) => row.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
          {rows.map((row) => (
            <SortableRow
              key={row.id}
              row={row}
              invalid={invalidIds.has(row.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const ScheduleBoard: React.FC<ScheduleBoardProps> = ({ events }) => {
  const router = useRouter();
  const [board, setBoard] = useState<Board>(() => groupByDay(events));
  const [activeRow, setActiveRow] = useState<ScheduleRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const invalidIds = useMemo(() => {
    const invalid = new Set<string>();
    for (const day of DAYS) {
      for (const id of findInvalidScheduleRowIds(board[day])) invalid.add(id);
    }
    return invalid;
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const container = findContainer(board, id);
    if (!container) return;
    setActiveRow(board[container].find((row) => row.id === id) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(board, activeId);
    const overContainer = findContainer(board, overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    setBoard((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((row) => row.id === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = overItems.findIndex((row) => row.id === overId);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((row) => row.id !== activeId),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveRow(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const container = findContainer(board, activeId);
    const overContainer = findContainer(board, overId);
    if (!container || !overContainer || container !== overContainer) return;

    setBoard((prev) => {
      const rows = prev[container];
      const activeIndex = rows.findIndex((row) => row.id === activeId);
      const overIndex = rows.findIndex((row) => row.id === overId);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex)
        return prev;
      return { ...prev, [container]: arrayMove(rows, activeIndex, overIndex) };
    });
  };

  const handleSave = async () => {
    const updates = DAYS.flatMap((day) =>
      board[day].map((row, index) => ({ id: row.id, day, order: index }))
    );
    setIsSaving(true);
    try {
      await httpClient.patch("/admin/schedule/order", { updates });
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
      <div className="flex items-center justify-end gap-3 self-end">
        {invalidIds.size > 0 && (
          <span className="text-sm font-medium text-red-600">
            Alguns horários ficam sobrepostos com esta ordem.
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || invalidIds.size > 0}
          className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "A guardar..." : "Guardar"}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DAYS.map((day) => (
            <DayLane
              key={day}
              day={day}
              rows={board[day]}
              invalidIds={invalidIds}
            />
          ))}
        </div>
        <DragOverlay>
          {activeRow && <ScheduleRowCard row={activeRow} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default ScheduleBoard;
