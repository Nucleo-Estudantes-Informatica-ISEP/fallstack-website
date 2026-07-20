"use client";

import { useState } from "react";
import Image from "next/image";
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
import type { CompanyTier } from "@/domain/Company/company-tier";

import { CSS } from "@dnd-kit/utilities";

const TIERS: CompanyTier[] = ["DIAMOND", "GOLD", "SILVER", "BRONZE"];

const TIER_LABELS: Record<CompanyTier, string> = {
  DIAMOND: "Diamond",
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
};

interface CompanyRow {
  id: string;
  name: string;
  avatar: string | null;
}

type Board = Record<CompanyTier, CompanyRow[]>;

interface CompanyTierBoardProps {
  companies: {
    id: string;
    name: string;
    avatar: string | null;
    tier: CompanyTier;
  }[];
}

function groupByTier(companies: CompanyTierBoardProps["companies"]): Board {
  const board = { DIAMOND: [], GOLD: [], SILVER: [], BRONZE: [] } as Board;
  for (const company of companies) {
    board[company.tier].push({
      id: company.id,
      name: company.name,
      avatar: company.avatar,
    });
  }
  return board;
}

function findContainer(board: Board, id: string): CompanyTier | undefined {
  if ((TIERS as string[]).includes(id)) return id as CompanyTier;
  return TIERS.find((tier) => board[tier].some((c) => c.id === id));
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
      <Image
        src={company.avatar}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-cover"
      />
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

const TierLane: React.FC<{ tier: CompanyTier; companies: CompanyRow[] }> = ({
  tier,
  companies,
}) => {
  const { setNodeRef } = useDroppable({ id: tier });

  return (
    <div className="flex w-64 shrink-0 flex-col gap-3 rounded-lg bg-gray-100 p-4">
      <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
        {TIER_LABELS[tier]} ({companies.length})
      </h2>
      <SortableContext
        items={companies.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
          {companies.map((company) => (
            <SortableRow key={company.id} company={company} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const CompanyTierBoard: React.FC<CompanyTierBoardProps> = ({ companies }) => {
  const router = useRouter();
  const [board, setBoard] = useState<Board>(() => groupByTier(companies));
  const [activeCompany, setActiveCompany] = useState<CompanyRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const container = findContainer(board, id);
    if (!container) return;
    setActiveCompany(board[container].find((c) => c.id === id) ?? null);
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
    const container = findContainer(board, activeId);
    const overContainer = findContainer(board, overId);
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
    const updates = TIERS.flatMap((tier) =>
      board[tier].map((company, index) => ({
        id: company.id,
        tier,
        order: index,
      }))
    );
    setIsSaving(true);
    try {
      await httpClient.patch("/admin/companies/tier-board", { updates });
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
        className="w-fit self-end rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
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
          {TIERS.map((tier) => (
            <TierLane key={tier} tier={tier} companies={board[tier]} />
          ))}
        </div>
        <DragOverlay>
          {activeCompany && <CompanyRowCard company={activeCompany} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default CompanyTierBoard;
