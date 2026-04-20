import dayjs, { type Dayjs } from "dayjs";

export type S4MemberSummary = {
  id: number;
  nombre: string;
};

export type S4FormValues = {
  participoMinisterio?: boolean;
  cursosBiblicos?: number;
  horas?: string;
  comentarios?: string;
  precursorAuxiliar?: boolean;
};

export type S4ReportRecord = {
  id: number;
  miembroId: number;
  fecha: string;
  tipoRegistro?: "visita" | "s4";
  mesServicio?: string | null;
  participoMinisterio?: boolean;
  cursosBiblicos?: number;
  horas?: string;
  comentarios?: string;
  precursorAuxiliar?: boolean;
};

export const emptyS4FormValues: Required<S4FormValues> = {
  participoMinisterio: false,
  cursosBiblicos: 0,
  horas: "",
  comentarios: "",
  precursorAuxiliar: false,
};

export const formatS4MonthLabel = (value?: string) =>
  value ? dayjs(value).locale("es").format("MMMM YYYY") : "";

export const normalizeS4FileSegment = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const isS4Record = (item: Partial<S4ReportRecord>) =>
  item.tipoRegistro === "s4" ||
  Boolean(item.mesServicio) ||
  Boolean(item.participoMinisterio) ||
  Number(item.cursosBiblicos ?? 0) > 0 ||
  Boolean(item.horas) ||
  Boolean(item.comentarios) ||
  Boolean(item.precursorAuxiliar);

export const findS4ReportForMemberMonth = (
  reports: S4ReportRecord[],
  memberId: number,
  monthValue: Dayjs,
) => {
  const targetMonth = monthValue.startOf("month").format("YYYY-MM");

  return reports
    .filter(
      (report) =>
        report.miembroId === memberId &&
        dayjs(report.mesServicio ?? report.fecha).format("YYYY-MM") ===
          targetMonth,
    )
    .sort((left, right) => right.id - left.id)[0];
};

export const getS4FormValuesFromReport = (
  report?: S4ReportRecord,
): Required<S4FormValues> => ({
  participoMinisterio:
    report?.participoMinisterio ?? emptyS4FormValues.participoMinisterio,
  cursosBiblicos: report?.cursosBiblicos ?? emptyS4FormValues.cursosBiblicos,
  horas: report?.horas ?? emptyS4FormValues.horas,
  comentarios: report?.comentarios ?? emptyS4FormValues.comentarios,
  precursorAuxiliar:
    report?.precursorAuxiliar ?? emptyS4FormValues.precursorAuxiliar,
});

export const buildS4Payload = ({
  memberId,
  month,
  values,
}: {
  memberId: number;
  month: Dayjs;
  values: S4FormValues;
}) => {
  const reportMonth = month.startOf("month");

  return {
    miembro: memberId,
    fecha: reportMonth.format("YYYY-MM-DD"),
    mesServicio: reportMonth.format("YYYY-MM-DD"),
    tipoRegistro: "s4",
    participoMinisterio: values.participoMinisterio ?? false,
    cursosBiblicos: values.cursosBiblicos ?? 0,
    horas: values.horas?.trim() ?? "",
    comentarios: values.comentarios?.trim() ?? "",
    precursorAuxiliar: values.precursorAuxiliar ?? false,
    tema: "",
    acompanante: null,
    completada: true,
  };
};

export const buildS4FileName = (memberName: string, month: Dayjs) =>
  `s4-${normalizeS4FileSegment(memberName)}-${month.format("YYYY-MM")}.pdf`;
