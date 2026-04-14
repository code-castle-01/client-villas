import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { Button } from "antd";
import { FilePdfFilled } from "@ant-design/icons";

interface Conferencia {
  id: string;
  orador: string;
  cong: string;
  tema: string;
  cancion: string;
  fecha: string;
  auxiliar: string;
}

interface PDFConferenciasProps {
  data: Conferencia[];
}

const styles = StyleSheet.create({
  page: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
    color: "#4CAF50",
    fontWeight: "bold",
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
    fontSize: 12,
  },
});

const PDFSchedule: React.FC<PDFConferenciasProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>ARREGLOS DE CONFERENCIAS</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableCol, { width: "16%" }]}>
            <Text style={styles.tableHeader}>Orador</Text>
          </View>
          <View style={[styles.tableCol, { width: "16%" }]}>
            <Text style={styles.tableHeader}>Congregación</Text>
          </View>
          <View style={[styles.tableCol, { width: "24%" }]}>
            <Text style={styles.tableHeader}>Tema del Bosquejo</Text>
          </View>
          <View style={[styles.tableCol, { width: "12%" }]}>
            <Text style={styles.tableHeader}>Canción</Text>
          </View>
          <View style={[styles.tableCol, { width: "16%" }]}>
            <Text style={styles.tableHeader}>Fecha</Text>
          </View>
          <View style={[styles.tableCol, { width: "16%" }]}>
            <Text style={styles.tableHeader}>Auxiliar</Text>
          </View>
        </View>

        {data.map((conferencia) => (
          <View style={styles.tableRow} key={conferencia.id}>
            <View style={[styles.tableCol, { width: "16%" }]}>
              <Text style={styles.tableCell}>{conferencia.orador}</Text>
            </View>
            <View style={[styles.tableCol, { width: "16%" }]}>
              <Text style={styles.tableCell}>{conferencia.cong}</Text>
            </View>
            <View style={[styles.tableCol, { width: "24%" }]}>
              <Text style={styles.tableCell}>{conferencia.tema}</Text>
            </View>
            <View style={[styles.tableCol, { width: "12%" }]}>
              <Text style={styles.tableCell}>{conferencia.cancion}</Text>
            </View>
            <View style={[styles.tableCol, { width: "16%" }]}>
              <Text style={styles.tableCell}>{conferencia.fecha}</Text>
            </View>
            <View style={[styles.tableCol, { width: "16%" }]}>
              <Text style={styles.tableCell}>{conferencia.auxiliar}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

const PDFConferencias: React.FC<PDFConferenciasProps> = ({ data }) => (
  <Button icon={<FilePdfFilled />} danger type="primary">
    <PDFDownloadLink
      document={<PDFSchedule data={data} />}
      fileName="conferencias.pdf"
    >
      PDF
    </PDFDownloadLink>
  </Button>
);

export default PDFConferencias;
