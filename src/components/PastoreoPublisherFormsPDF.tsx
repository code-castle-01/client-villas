import React from "react";
import {
  Document,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

export type S4PdfData = {
  memberName: string;
  monthLabel: string;
  participated: boolean;
  bibleStudies: number;
  hours: string;
  comments: string;
};

export type S21MonthRow = {
  key: string;
  label: string;
  participated: boolean;
  bibleStudies: number;
  auxiliaryPioneer: boolean;
  hours: string;
  notes: string;
};

export type S21PdfData = {
  memberName: string;
  birthDate?: string;
  baptismDate?: string;
  gender?: "hombre" | "mujer" | "";
  appointments: string[];
  serviceYearLabel: string;
  rows: S21MonthRow[];
  totalHours: string;
};

const palette = {
  line: "#202020",
  fill: "#eef2ff",
  paper: "#ffffff",
  text: "#111111",
  muted: "#4b5563",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontSize: 11,
    color: palette.text,
    fontFamily: "Helvetica",
    backgroundColor: palette.paper,
  },
  centeredTitle: {
    fontSize: 21,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 12,
  },
  s4Row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  s4Label: {
    width: 58,
    fontSize: 10,
    fontWeight: 700,
  },
  s4Field: {
    flex: 1,
    minHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: palette.fill,
    borderBottomWidth: 1,
    borderBottomColor: "#7b8594",
  },
  s4Box: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: palette.line,
  },
  s4BoxRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  s4BoxText: {
    flex: 1,
    padding: 8,
    lineHeight: 1.35,
  },
  checkboxCell: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: palette.line,
  },
  checkSquare: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: "#737373",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 11,
    fontWeight: 700,
  },
  s4Footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 16,
  },
  footerCode: {
    fontSize: 10,
  },
  commentsArea: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: palette.line,
    minHeight: 64,
  },
  commentsLabel: {
    width: 86,
    padding: 8,
    fontSize: 10,
    fontWeight: 700,
  },
  commentsValue: {
    flex: 1,
    padding: 8,
    backgroundColor: palette.fill,
    borderLeftWidth: 1,
    borderLeftColor: palette.line,
    minHeight: 64,
  },
  s21Title: {
    width: "100%",
    fontSize: 15.5,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 10,
  },
  s21TopGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  s21Left: {
    flex: 1.7,
  },
  s21Right: {
    flex: 0.95,
  },
  s21InfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  s21InfoLabel: {
    width: 118,
    fontSize: 9.5,
    fontWeight: 700,
  },
  s21InfoField: {
    flex: 1,
    minHeight: 18,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    backgroundColor: palette.fill,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  optionItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  optionItemWide: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  optionText: {
    marginLeft: 5,
    fontSize: 9.5,
    fontWeight: 700,
  },
  appointmentsRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  appointmentItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  s21YearLine: {
    fontSize: 9.5,
    color: palette.muted,
    marginBottom: 5,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: palette.line,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  tableHeaderCell: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: palette.line,
    fontWeight: 700,
    textAlign: "center",
    fontSize: 9,
  },
  tableCell: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: palette.line,
    fontSize: 9.2,
  },
  shadedCell: {
    backgroundColor: palette.fill,
  },
  centered: {
    textAlign: "center",
  },
  bold: {
    fontWeight: 700,
  },
  smallMuted: {
    fontSize: 10,
    color: palette.muted,
  },
  s21Page: {
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 22,
    fontSize: 10,
    color: palette.text,
    fontFamily: "Helvetica",
    backgroundColor: palette.paper,
  },
  s21TableHeaderYear: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: 400,
  },
  s21TotalLabel: {
    textAlign: "right",
    width: "62%",
    paddingRight: 10,
    fontWeight: 700,
  },
  s21Footer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    width: 88,
  },
  s21FooterText: {
    fontSize: 8.5,
  },
});

const CheckboxMark: React.FC<{ checked: boolean }> = ({ checked }) => (
  <View style={styles.checkSquare}>
    {checked ? <Text style={styles.checkMark}>X</Text> : null}
  </View>
);

const S4Document: React.FC<{ data: S4PdfData }> = ({ data }) => (
  <Document>
    <Page size="A5" style={styles.page}>
      <Text style={styles.centeredTitle}>INFORME DE PREDICACIÓN</Text>

      <View style={styles.s4Row}>
        <Text style={styles.s4Label}>Nombre:</Text>
        <Text style={styles.s4Field}>{data.memberName}</Text>
      </View>
      <View style={styles.s4Row}>
        <Text style={styles.s4Label}>Mes:</Text>
        <Text style={styles.s4Field}>{data.monthLabel}</Text>
      </View>

      <View style={styles.s4Box}>
        <View style={styles.s4BoxRow}>
          <Text style={styles.s4BoxText}>
            Marque la casilla si participó en alguna faceta de la predicación
            durante el mes
          </Text>
          <View style={styles.checkboxCell}>
            <CheckboxMark checked={data.participated} />
          </View>
        </View>
        <View style={styles.s4BoxRow}>
          <Text style={styles.s4BoxText}>
            Número de diferentes cursos bíblicos dirigidos
          </Text>
          <View style={[styles.checkboxCell, styles.shadedCell]}>
            <Text>{data.bibleStudies || ""}</Text>
          </View>
        </View>
        <View style={[styles.s4BoxRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.s4BoxText}>
            Horas (para precursores auxiliares, regulares y especiales, o
            misioneros en el campo)
          </Text>
          <View style={[styles.checkboxCell, styles.shadedCell]}>
            <Text>{data.hours}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.s4Box, styles.commentsArea]}>
        <View style={{ flexDirection: "row", minHeight: 64 }}>
          <Text style={styles.commentsLabel}>Comentarios:</Text>
          <Text style={styles.commentsValue}>{data.comments}</Text>
        </View>
      </View>

      <View style={styles.s4Footer}>
        <Text style={styles.footerCode}>S-4-S</Text>
        <Text style={styles.footerCode}>11/23</Text>
      </View>
    </Page>
  </Document>
);

const monthColumnWidths = ["17%", "14%", "13%", "13%", "18%", "25%"] as const;

const S21Page: React.FC<{ data: S21PdfData }> = ({ data }) => (
  <Page size="LETTER" style={styles.s21Page}>
      <Text style={styles.s21Title}>REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN</Text>

      <View style={styles.s21TopGrid}>
        <View style={styles.s21Left}>
          <View style={styles.s21InfoRow}>
            <Text style={styles.s21InfoLabel}>Nombre:</Text>
            <Text style={styles.s21InfoField}>{data.memberName}</Text>
          </View>
          <View style={styles.s21InfoRow}>
            <Text style={styles.s21InfoLabel}>Fecha de nacimiento:</Text>
            <Text style={styles.s21InfoField}>{data.birthDate ?? ""}</Text>
          </View>
          <View style={styles.s21InfoRow}>
            <Text style={styles.s21InfoLabel}>Fecha de bautismo:</Text>
            <Text style={styles.s21InfoField}>{data.baptismDate ?? ""}</Text>
          </View>
        </View>
        <View style={styles.s21Right}>
          <View style={styles.optionGrid}>
            <View style={styles.optionItem}>
              <CheckboxMark checked={data.gender === "hombre"} />
              <Text style={styles.optionText}>Hombre</Text>
            </View>
            <View style={styles.optionItem}>
              <CheckboxMark checked={data.gender === "mujer"} />
              <Text style={styles.optionText}>Mujer</Text>
            </View>
            <View style={styles.optionItem}>
              <CheckboxMark checked={false} />
              <Text style={styles.optionText}>Otras ovejas</Text>
            </View>
            <View style={styles.optionItem}>
              <CheckboxMark checked={false} />
              <Text style={styles.optionText}>Ungido</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.appointmentsRow}>
        {[
          ["Anciano", data.appointments.includes("anciano")],
          [
            "Siervo ministerial",
            data.appointments.includes("siervo_ministerial") ||
              data.appointments.includes("siervo"),
          ],
          ["Precursor regular", data.appointments.includes("precursor_regular")],
          ["Precursor especial", data.appointments.includes("precursor_especial")],
          [
            "Misionero que sirve en el campo",
            data.appointments.includes("misionero") ||
              data.appointments.includes("misionero_campo"),
          ],
        ].map(([label, checked]) => (
          <View
            key={String(label)}
            style={
              label === "Misionero que sirve en el campo"
                ? styles.optionItemWide
                : styles.appointmentItem
            }
          >
            <CheckboxMark checked={Boolean(checked)} />
            <Text style={styles.optionText}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.s21YearLine}>
        Año de servicio: {data.serviceYearLabel}
      </Text>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View
            style={[
              styles.tableHeaderCell,
              {
                width: monthColumnWidths[0],
                backgroundColor: palette.fill,
              },
            ]}
          >
            <Text>Año de servicio</Text>
            <Text style={styles.s21TableHeaderYear}>{data.serviceYearLabel}</Text>
          </View>
          {[
            "Participación\nen el\nministerio",
            "Cursos\nbíblicos",
            "Precursor\nauxiliar",
            "Horas\n(Si es precursor o\nmisionero que\nsirve en el campo)",
            "Notas",
          ].map((label, index) => (
            <Text
              key={label}
              style={[
                styles.tableHeaderCell,
                {
                  width: monthColumnWidths[index + 1],
                  backgroundColor:
                    index === 1 || index === 3 ? palette.fill : palette.paper,
                },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>

        {data.rows.map((row) => (
          <View style={styles.tableRow} key={row.key}>
            <Text
              style={[
                styles.tableCell,
                { width: monthColumnWidths[0], backgroundColor: palette.paper },
              ]}
            >
              {row.label}
            </Text>
            <View
              style={[
                styles.tableCell,
                { width: monthColumnWidths[1], alignItems: "center" },
              ]}
            >
              <CheckboxMark checked={row.participated} />
            </View>
            <Text
              style={[
                styles.tableCell,
                styles.centered,
                { width: monthColumnWidths[2], backgroundColor: palette.fill },
              ]}
            >
              {row.bibleStudies || ""}
            </Text>
            <View
              style={[
                styles.tableCell,
                { width: monthColumnWidths[3], alignItems: "center" },
              ]}
            >
              <CheckboxMark checked={row.auxiliaryPioneer} />
            </View>
            <Text
              style={[
                styles.tableCell,
                styles.centered,
                { width: monthColumnWidths[4], backgroundColor: palette.fill },
              ]}
            >
              {row.hours}
            </Text>
            <Text
              style={[
                styles.tableCell,
                { width: monthColumnWidths[5], borderRightWidth: 0 },
              ]}
            >
              {row.notes}
            </Text>
          </View>
        ))}

        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
          <View
            style={[
              styles.tableCell,
              {
                width: "57%",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={styles.s21TotalLabel}>Total</Text>
          </View>
          <Text
            style={[
              styles.tableCell,
              styles.centered,
              {
                width: monthColumnWidths[4],
                backgroundColor: palette.fill,
              },
            ]}
          >
            {data.totalHours}
          </Text>
          <Text
            style={[
              styles.tableCell,
              {
                width: monthColumnWidths[5],
                borderRightWidth: 0,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.s21Footer}>
        <Text style={styles.s21FooterText}>S-21-S</Text>
        <Text style={styles.s21FooterText}>11/23</Text>
      </View>
  </Page>
);

const S21Document: React.FC<{ data: S21PdfData }> = ({ data }) => (
  <Document>
    <S21Page data={data} />
  </Document>
);

export const S21BatchDocument: React.FC<{ items: S21PdfData[] }> = ({ items }) => (
  <Document>
    {items.map((item) => (
      <S21Page
        key={`${item.memberName}-${item.serviceYearLabel}`}
        data={item}
      />
    ))}
  </Document>
);

export const S4PdfDownloadButton: React.FC<{
  data: S4PdfData;
  fileName: string;
}> = ({ data, fileName }) => (
  <PDFDownloadLink document={<S4Document data={data} />} fileName={fileName}>
    {({ loading }) => (
      <Button icon={<DownloadOutlined />} type="primary">
        {loading ? "Preparando..." : "Descargar S-4"}
      </Button>
    )}
  </PDFDownloadLink>
);

export const S21PdfDownloadButton: React.FC<{
  data: S21PdfData;
  fileName: string;
}> = ({ data, fileName }) => (
  <PDFDownloadLink document={<S21Document data={data} />} fileName={fileName}>
    {({ loading }) => (
      <Button icon={<DownloadOutlined />} type="primary">
        {loading ? "Preparando..." : "Descargar S-21"}
      </Button>
    )}
  </PDFDownloadLink>
);
