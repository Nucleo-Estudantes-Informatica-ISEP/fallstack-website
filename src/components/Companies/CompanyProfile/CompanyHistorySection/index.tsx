"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import swal from "sweetalert";

import { httpClient } from "@/lib/http/client";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import { formatDateDDStrMonthHourMin } from "@/utils/date";

const SavedStudentRow = ({ item }: { item: SavedStudentDto }) => {
  const [editing, setEditing] = useState(false);
  const [savedComment, setSavedComment] = useState(item.comment ?? "");
  const [comment, setComment] = useState(item.comment ?? "");
  const [loading, setLoading] = useState(false);

  const updateComment = async (nextComment: string | null) => {
    setLoading(true);

    try {
      await httpClient.put("/saved", {
        studentId: item.studentId,
        comment: nextComment,
      });

      const value = nextComment ?? "";
      setSavedComment(value);
      setComment(value);
      setEditing(false);
    } catch {
      swal("Erro", "Não foi possível atualizar o comentário.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-row items-center justify-between border-b border-gray-700 py-4 last:border-0">
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <Link
          href={`/student/${item.student.code}/preview`}
          className="font-bold text-white hover:underline"
        >
          {item.student.name}
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 text-center text-gray-300">
        {formatDateDDStrMonthHourMin(item.createdAt)}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        {editing ? (
          <>
            <textarea
              className="rounded-md border border-gray-300 p-1 text-black"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              style={{ minWidth: 120, maxWidth: 220 }}
              disabled={loading}
            />
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => updateComment(comment)}
                disabled={loading}
                className="rounded bg-green-600 px-2 text-xs text-white"
              >
                Salvar
              </button>
              <button
                onClick={() => updateComment(null)}
                disabled={loading}
                className="rounded bg-red-600 px-2 text-xs text-white"
              >
                Remover
              </button>
              <button
                onClick={() => {
                  setComment(savedComment);
                  setEditing(false);
                }}
                disabled={loading}
                className="rounded bg-gray-600 px-2 text-xs text-white"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="block min-h-6 text-xs text-gray-200">
              {savedComment || (
                <span className="text-gray-400 italic">Sem comentário</span>
              )}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="mt-1 rounded bg-blue-600 px-2 text-xs text-white"
            >
              Editar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const CompanySavesSection = () => {
  const [historyData, setHistoryData] = useState<SavedStudentDto[] | null>(
    null
  );

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        const data =
          await httpClient.get<SavedStudentDto[]>("/companies/history");
        setHistoryData(data);
      } catch (error) {
        swal("Erro ao buscar histórico de scans!");
        console.error("Error fetching history data:", error);
      }
    };

    fetchHistoryData();
  }, []);

  return (
    <div className="my-4 flex w-full flex-col items-center justify-center text-white">
      <div
        className="firefox-scrollbar-margin scrollbar-thumb-rounded-lg scrollbar-w-1 scrollbar max-h-80 w-full overflow-y-scroll pl-1 scrollbar-thumb-slate-500 scrollbar-track-transparent"
        style={{ scrollbarGutter: "stable" }}
      >
        {!historyData ? (
          Array(3)
            .fill(1)
            .map((_, i) => (
              <div
                key={i}
                className="flex flex-row items-center border-t border-gray-700 py-4 first:border-0"
              >
                <div className="flex w-full justify-center">
                  <Skeleton
                    containerClassName="flex-1"
                    baseColor="#333"
                    highlightColor="#444"
                  />
                </div>
              </div>
            ))
        ) : !historyData.length ? (
          <div className="flex flex-row py-3">
            <div className="flex w-full justify-center text-gray-400">
              Sem perfis salvos.
            </div>
          </div>
        ) : (
          historyData.map((item) => (
            <SavedStudentRow
              key={`${item.studentId}-${item.createdAt}`}
              item={item}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CompanySavesSection;
