import "server-only";

import { HttpError } from "@/types/HttpError";
import config from "@/config";
import { signJwt } from "@/services/authService";

import {
  createActionCompletion,
  findActionById,
  findActionByName,
  findActionCompletion,
  findActionCompletions,
  findActions,
  findVisibleActions,
  toggleAction,
} from "../repositories/actionRepository";
import {
  findStudentAction,
  findStudentByCode,
} from "../repositories/studentRepository";

export const getActions = () => findActions();

export async function getStudentActions(studentCode: string) {
  const actions = await findVisibleActions();
  const student = await findStudentByCode(studentCode);
  if (!student) return actions.map((action) => ({ ...action, done: false }));
  const completions = await findActionCompletions(student.id);
  return actions.map((action) => ({
    ...action,
    done: completions.some(({ actionId }) => actionId === action.id),
  }));
}

export async function completeAction(studentCode: string, actionName: string) {
  const [action, student] = await Promise.all([
    findActionByName(actionName),
    findStudentByCode(studentCode),
  ]);
  if (!action || !student) return null;
  if (await findActionCompletion(student.id, action.id)) return null;
  return createActionCompletion(student.id, action.id);
}

export async function getActionQrCode(id: string) {
  const timestamp =
    Math.round(Date.now() / config.constants.actionQrCodeRefreshRateMs) *
    config.constants.actionQrCodeRefreshRateMs;
  return {
    action: await findActionById(id),
    qrCode:
      "action-" +
      signJwt(
        { id, timestamp },
        {
          algorithm: "HS256",
          expiresIn: config.constants.actionQrCodeRefreshRateMs * 2,
        }
      ),
  };
}

export async function completeActionById(studentId: string, actionId: string) {
  const action = await findActionById(actionId);
  if (!action) throw new HttpError("Ação não encontrada", 404);
  if (!action.isLive) throw new HttpError("A ação não está aberta", 400);
  const student = await findStudentAction(studentId, actionId);
  if (!student) throw new HttpError("Estudante não encontrado", 404);
  if (student.actionCompletions.length)
    throw new HttpError("Já completaste esta ação", 400);
  await createActionCompletion(studentId, actionId);
}

export async function toggleActionLive(id: string) {
  const action = await findActionById(id);
  if (!action) throw new HttpError("Action not found", 404);
  await toggleAction(id, !action.isLive);
}
