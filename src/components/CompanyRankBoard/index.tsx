"use client";

import { useState } from "react";
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
import LogoThumbnail from "@/components/ui/LogoThumbnail";

import { CSS } from "@dnd-kit/utilities";

interface CompanyRow {
  id: string;
  name: string;
  avatar: string | null;
}

interface RankLane {
  id: string;
  name: string;
  companies: CompanyRow[];
}

type Board = Record<string, CompanyRow[]>;

interface CompanyRankBoardProps {
  ranks: { id: string; name: string }[];
  companies: {
    id: string;
    name: string;
    avatar: string | null;
    rankId: string;
  }[];
}

function groupByRank(
  ranks: { id: string; name: string }[],
  companies: CompanyRankBoardProps["companies"]
): Board {
  const board: Board = Object.fromEntries(ranks.map((rank) => [rank.id, []]));
  for (const company of companies) {
    board[company.rankId]?.push({
      id: company.id,
      name: company.name,
      avatar: company.avatar,
    });
  }
  return board;
}

function findContainer(
  rankIds: string[],
  board: Board,
  id: string
): string | undefined {
  if (rankIds.includes(id)) return id;
  return rankIds.find((rankId) => board[rankId].some((c) => c.id === id));
}

const CompanyRowCard: React.FC<{ company: CompanyRow; dragging?: boolean }> = ({
  company,
  dragging,
}) => (
  <div
    className={`flex items-center gap-3 rounded-md border border-gray-300 bg-white p-2 shadow-sm ${
      dragging ? "opacity-50" : ""
    }`}
  >
    {company.avatar ? (
      <LogoThumbnail src={company.avatar} size={32} />
    ) : (
      <div className="size-8 shrink-0 rounded-full bg-gray-200" />
    )}
    <span className="truncate text-sm font-medium text-gray-800">
      {company.name}
    </span>
  </div>
);

const SortableRow: React.FC<{ company: CompanyRow }> = ({ company }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <CompanyRowCard company={company} dragging={isDragging} />
    </div>
  );
};

const RankLaneColumn: React.FC<{ rank: RankLane }> = ({ rank }) => {
  const { setNodeRef } = useDroppable({ id: rank.id });

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3 rounded-lg bg-gray-100 p-4">
      <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
        {rank.name} ({rank.companies.length})
      </h2>
      <SortableContext
        items={rank.companies.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
          {rank.companies.map((company) => (
            <SortableRow key={company.id} company={company} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const CompanyRankBoard: React.FC<CompanyRankBoardProps> = ({
  ranks,
  companies,
}) => {
  const router = useRouter();
  const rankIds = ranks.map((rank) => rank.id);
  const [board, setBoard] = useState<Board>(() =>
    groupByRank(ranks, companies)
  );
  const [activeCompany, setActiveCompany] = useState<CompanyRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const container = findContainer(rankIds, board, id);
    if (!container) return;
    setActiveCompany(board[container].find((c) => c.id === id) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(rankIds, board, activeId);
    const overContainer = findContainer(rankIds, board, overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    setBoard((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((c) => c.id === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = overItems.findIndex((c) => c.id === overId);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((c) => c.id !== activeId),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCompany(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const container = findContainer(rankIds, board, activeId);
    const overContainer = findContainer(rankIds, board, overId);
    if (!container || !overContainer || container !== overContainer) return;

    setBoard((prev) => {
      const items = prev[container];
      const activeIndex = items.findIndex((c) => c.id === activeId);
      const overIndex = items.findIndex((c) => c.id === overId);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex)
        return prev;
      return { ...prev, [container]: arrayMove(items, activeIndex, overIndex) };
    });
  };

  const handleSave = async () => {
    const updates = rankIds.flatMap((rankId) =>
      board[rankId].map((company, index) => ({
        id: company.id,
        rankId,
        order: index,
      }))
    );
    setIsSaving(true);
    try {
      await httpClient.patch("/admin/companies/rank-board", { updates });
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
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ranks.map((rank) => (
            <RankLaneColumn
              key={rank.id}
              rank={{ ...rank, companies: board[rank.id] }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCompany && <CompanyRowCard company={activeCompany} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default CompanyRankBoard;
