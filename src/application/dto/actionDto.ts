export interface ActionDto {
  id: string;
  name: string;
  description: string;
  points: number;
  altText: string | null;
  isLive: boolean;
  isVisible: boolean;
}

export type StudentActionDto = ActionDto & { done: boolean };

export const toActionDto = (action: ActionDto): ActionDto => ({
  id: action.id,
  name: action.name,
  description: action.description,
  points: action.points,
  altText: action.altText,
  isLive: action.isLive,
  isVisible: action.isVisible,
});

export const toStudentActionDto = (
  action: StudentActionDto
): StudentActionDto => ({ ...toActionDto(action), done: action.done });
