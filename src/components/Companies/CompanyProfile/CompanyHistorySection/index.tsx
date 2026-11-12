"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

import { httpClient } from "@/lib/http/client";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import { formatDateDDStrMonthHourMin } from "@/utils/date";

// Same limit as the server's comment schema (src/schemas/saveSchema.ts).
const COMMENT_MAX_LENGTH = 1000;

const outlineButton =
  "inline-flex min-h-9 items-center justify-center rounded-full border border-ui-border px-4 text-sm text-ui-text transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus disabled:cursor-not-allowed disabled:opacity-60";

const SavedStudentRow = ({ item }: { item: SavedStudentDto }) => {
  const [editing, setEditing] = useState(false);
  const [savedComment, setSavedComment] = useState(item.comment ?? "");
  const [comment, setComment] = useState(item.comment ?? "");
  const [loading, setLoading] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const wasEditing = useRef(false);
  const fieldId = useId();
  const counterId = useId();
  const name = item.student.name;

  // Move focus into the editor when it opens, and back to the button that
  // opened it when it closes.
  useEffect(() => {
    if (editing) fieldRef.current?.focus();
    else if (wasEditing.current) editButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

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
      // Keep the editor open with the typed text so nothing is lost.
      toast.error("Não foi possível atualizar o comentário.", {
        toastId: `comment-failed-${item.studentId}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setComment(savedComment);
    setEditing(false);
  };

  return (
    <li className="grid grid-cols-1 gap-2 border-t border-ui-border py-4 first:border-0 sm:grid-cols-[2fr_1fr_2fr] sm:items-start sm:gap-4">
      <div className="min-w-0 sm:pt-1">
        <Link
          href={`/student/${item.student.code}/preview`}
          title={name}
          className="line-clamp-2 rounded-sm font-bold wrap-break-word text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-focus"
        >
          {name}
        </Link>
      </div>
      <div className="text-sm text-ui-muted sm:pt-1 sm:text-base">
        <span className="sr-only">Guardado em </span>
        <time dateTime={item.createdAt}>
          {formatDateDDStrMonthHourMin(item.createdAt)}
        </time>
      </div>
      <div className="min-w-0">
        {editing ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId} className="sr-only">
              Comentário sobre {name}
            </label>
            <textarea
              ref={fieldRef}
              id={fieldId}
              className="ui-field resize-y"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") cancel();
              }}
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              aria-describedby={counterId}
              disabled={loading}
            />
            <p id={counterId} className="text-right text-xs text-ui-muted">
              {comment.length}/{COMMENT_MAX_LENGTH}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateComment(comment)}
                disabled={loading}
                aria-busy={loading}
                className="ui-action min-h-9 text-sm"
              >
                {loading ? "A guardar..." : "Guardar"}
              </button>
              {savedComment && (
                <button
                  type="button"
                  onClick={() => updateComment(null)}
                  disabled={loading}
                  className={`${outlineButton} border-ui-error text-ui-error hover:border-ui-error`}
                >
                  Remover
                </button>
              )}
              <button
                type="button"
                onClick={cancel}
                disabled={loading}
                className={outlineButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm wrap-anywhere whitespace-pre-wrap text-white/90">
              {savedComment || (
                <span className="text-ui-muted italic">Sem comentário</span>
              )}
            </p>
            <button
              ref={editButtonRef}
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`${savedComment ? "Editar" : "Adicionar"} comentário sobre ${name}`}
              className={outlineButton}
            >
              {savedComment ? "Editar" : "Adicionar comentário"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
};

// Company-only scan history with editable comments (Scan de Perfil tab).
// Below `sm` each entry stacks: name, date, then the comment.
const CompanySavesSection = ({
  historyData,
}: {
  historyData: SavedStudentDto[];
}) => {
  if (!historyData.length) {
    return (
      <p className="w-full border-t-2 py-6 text-center text-white/70">
        Ainda não há perfis guardados. Os estudantes que guardar aparecem aqui.
      </p>
    );
  }

  return (
    <div className="w-full text-white">
      <div
        className="firefox-scrollbar-margin scrollbar-thumb-rounded-lg scrollbar-w-1 scrollbar max-h-120 w-full scrollbar-thumb-slate-500 scrollbar-track-transparent overflow-y-auto pr-1"
        style={{ scrollbarGutter: "stable" }}
      >
        {/* Visual column headings only; each entry labels its own parts. */}
        <div
          aria-hidden="true"
          className="sticky top-0 z-10 hidden border-b-2 bg-background pb-2 font-bold text-white/70 sm:grid sm:grid-cols-[2fr_1fr_2fr] sm:gap-4"
        >
          <span>Nome</span>
          <span>Data</span>
          <span>Comentário</span>
        </div>
        <ul aria-label="Histórico de scans">
          {historyData.map((item) => (
            <SavedStudentRow
              key={`${item.studentId}-${item.createdAt}`}
              item={item}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CompanySavesSection;
