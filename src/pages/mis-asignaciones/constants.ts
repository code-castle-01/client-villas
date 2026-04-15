import type { AssignmentCategory } from "./types";

export const AUTH_STORAGE_EVENT = "auth-storage-changed";

export const categoryMeta: Record<
  AssignmentCategory,
  { color: string; label: string }
> = {
  reunion: {
    color: "blue",
    label: "Reunión",
  },
  conferencia: {
    color: "gold",
    label: "Conferencia",
  },
  escuela: {
    color: "geekblue",
    label: "Escuela",
  },
  mecanica: {
    color: "cyan",
    label: "Mecánicas",
  },
  pastoreo: {
    color: "volcano",
    label: "Pastoreo",
  },
  presidencia: {
    color: "green",
    label: "Presidencia",
  },
};
