import React from "react";
import {
  Document,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { FilePdfFilled } from "@ant-design/icons";
import { Button } from "antd";

type PDFGrupoMiembro = {
  id: number | string;
  apellidos?: string;
  nombres?: string;
  nombre?: string;
  telefono?: string;
  celular?: string;
  nombramientos?: string[];
};

interface PDFGruposProps {
  groupName: string;
  data: PDFGrupoMiembro[];
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
    textAlign: "center",
    color: "#4CAF50",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 12,
    textAlign: "center",
    color: "#6b7280",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCol: {
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCell: {
    fontSize: 9,
  },
  tableHeader: {
    backgroundColor: "#4CAF50",
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
    padding: 2,
    fontSize: 11,
  },
});

const sanitizeFileName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PDFGrupoDocument: React.FC<PDFGruposProps> = ({ groupName, data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Miembros del Grupo</Text>
      <Text style={styles.subtitle}>
        {groupName} - {data.length} miembros
      </Text>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableCol, { width: "24%" }]}>
            <Text style={styles.tableHeader}>Apellidos</Text>
          </View>
          <View style={[styles.tableCol, { width: "24%" }]}>
            <Text style={styles.tableHeader}>Nombres</Text>
          </View>
          <View style={[styles.tableCol, { width: "20%" }]}>
            <Text style={styles.tableHeader}>Teléfono</Text>
          </View>
          <View style={[styles.tableCol, { width: "32%" }]}>
            <Text style={styles.tableHeader}>Nombramientos</Text>
          </View>
        </View>

        {data.map((miembro) => (
          <View style={styles.tableRow} key={String(miembro.id)}>
            <View style={[styles.tableCol, { width: "24%" }]}>
              <Text style={styles.tableCell}>{miembro.apellidos || "-"}</Text>
            </View>
            <View style={[styles.tableCol, { width: "24%" }]}>
              <Text style={styles.tableCell}>
                {miembro.nombres || miembro.nombre || "-"}
              </Text>
            </View>
            <View style={[styles.tableCol, { width: "20%" }]}>
              <Text style={styles.tableCell}>
                {miembro.telefono || miembro.celular || "-"}
              </Text>
            </View>
            <View style={[styles.tableCol, { width: "32%" }]}>
              <Text style={styles.tableCell}>
                {miembro.nombramientos?.length
                  ? miembro.nombramientos.join(", ")
                  : "-"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

const PDFGrupos: React.FC<PDFGruposProps> = ({ groupName, data }) => (
  <Button size="small" icon={<FilePdfFilled />} danger type="primary">
    <PDFDownloadLink
      document={<PDFGrupoDocument groupName={groupName} data={data} />}
      fileName={`${sanitizeFileName(groupName || "grupo") || "grupo"}.pdf`}
    >
      {({ loading }) => (loading ? "Generando..." : "PDF")}
    </PDFDownloadLink>
  </Button>
);

export default PDFGrupos;
