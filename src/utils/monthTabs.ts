import dayjs from "dayjs";

export const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const MONTH_TAB_ITEMS = MONTH_LABELS.map((label, index) => ({
  key: index.toString(),
  label,
}));

export const getMonthKeyFromIsoDate = (value?: string | null) => {
  if (!value) return null;

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.month().toString() : null;
};

export const getMonthKeyFromDisplayDate = (value?: string | null) => {
  if (!value) return null;

  const [day, month, year] = value.split("-");
  if (!day || !month || !year) return null;

  const parsed = dayjs(`${year}-${month}-${day}`);
  return parsed.isValid() ? parsed.month().toString() : null;
};

export const resolveDefaultMonthKey = <T>(
  items: T[],
  getMonthKey: (item: T) => string | null | undefined,
) => {
  const currentMonthKey = dayjs().month().toString();

  if (items.some((item) => getMonthKey(item) === currentMonthKey)) {
    return currentMonthKey;
  }

  const firstAvailableMonthKey = items
    .map(getMonthKey)
    .find((monthKey): monthKey is string => Boolean(monthKey));

  return firstAvailableMonthKey ?? currentMonthKey;
};

export const getMonthLabel = (monthKey?: string | null) =>
  MONTH_LABELS[Number(monthKey)] ?? "este mes";
