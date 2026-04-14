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

interface Reunion {
  id: number | string;
  fecha: string;
  presidente: string;
  lector: string;
  oracion: string;
}

interface PDFReunionesProps {
  data: Reunion[];
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

const PDFSchedule: React.FC<PDFReunionesProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>REUNIÓN DE FIN DE SEMANA</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableCol, { width: "25%" }]}>
            <Text style={styles.tableHeader}>FECHA</Text>
          </View>
          <View style={[styles.tableCol, { width: "25%" }]}>
            <Text style={styles.tableHeader}>PRESIDENTE</Text>
          </View>
          <View style={[styles.tableCol, { width: "25%" }]}>
            <Text style={styles.tableHeader}>LECTOR</Text>
          </View>
          <View style={[styles.tableCol, { width: "25%" }]}>
            <Text style={styles.tableHeader}>ORACIÓN</Text>
          </View>
        </View>

        {data.map((reunion) => (
          <View style={styles.tableRow} key={reunion.id}>
            <View style={[styles.tableCol, { width: "25%" }]}>
              <Text style={styles.tableCell}>{reunion.fecha}</Text>
            </View>
            <View style={[styles.tableCol, { width: "25%" }]}>
              <Text style={styles.tableCell}>{reunion.presidente}</Text>
            </View>
            <View style={[styles.tableCol, { width: "25%" }]}>
              <Text style={styles.tableCell}>{reunion.lector}</Text>
            </View>
            <View style={[styles.tableCol, { width: "25%" }]}>
              <Text style={styles.tableCell}>{reunion.oracion}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

const PDFReuniones: React.FC<PDFReunionesProps> = ({ data }) => (
  <Button icon={<FilePdfFilled />} danger type="primary">
    <PDFDownloadLink document={<PDFSchedule data={data} />} fileName="reuniones.pdf">
      PDF
    </PDFDownloadLink>
  </Button>
);

export default PDFReuniones;
