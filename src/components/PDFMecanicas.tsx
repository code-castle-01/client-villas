import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "antd";
import { FilePdfFilled } from "@ant-design/icons";

interface ScheduleData {
  key: string;
  date: string;
  accommodators: { dentro: string; lobby: string; reja: string };
  microphone: { micro1: string; micro2: string; plataforma: string };
  audioVideo: string;
  cleaning: string[];
}

interface PDFScheduleProps {
  data: ScheduleData[];
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

const PDFSchedule: React.FC<PDFScheduleProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Arreglos Mecánicos</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableCol, { width: "16%" }]}>
            <Text style={styles.tableHeader}>Fecha</Text>
          </View>
          <View style={[styles.tableCol, { width: "28%" }]}>
            <Text style={styles.tableHeader}>Acomodadores</Text>
          </View>
          <View style={[styles.tableCol, { width: "28%" }]}>
            <Text style={styles.tableHeader}>Micrófonos</Text>
          </View>
          <View style={[styles.tableCol, { width: "14%" }]}>
            <Text style={styles.tableHeader}>Audio Video</Text>
          </View>
          <View style={[styles.tableCol, { width: "14%" }]}>
            <Text style={styles.tableHeader}>Limpieza</Text>
          </View>
        </View>

        {data.map((row) => (
          <View style={styles.tableRow} key={row.key}>
            <View style={[styles.tableCol, { width: "16%" }]}>
              <Text style={styles.tableCell}>{row.date}</Text>
            </View>
            <View style={[styles.tableCol, { width: "28%" }]}>
              <Text style={styles.tableCell}>
                Dentro: {row.accommodators.dentro} {"\n"}
                Lobby: {row.accommodators.lobby} {"\n"}
                Reja: {row.accommodators.reja}
              </Text>
            </View>
            <View style={[styles.tableCol, { width: "28%" }]}>
              <Text style={styles.tableCell}>
                Micrófono 1: {row.microphone.micro1} {"\n"}
                Micrófono 2: {row.microphone.micro2} {"\n"}
                Plataforma: {row.microphone.plataforma}
              </Text>
            </View>
            <View style={[styles.tableCol, { width: "14%" }]}>
              <Text style={styles.tableCell}>{row.audioVideo}</Text>
            </View>
            <View style={[styles.tableCol, { width: "14%" }]}>
              <Text style={styles.tableCell}>{row.cleaning.join(", ")}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

const PDFMecanicas: React.FC<{ data: ScheduleData[] }> = ({ data }) => (
  <Button icon={<FilePdfFilled />} danger type="primary">
    <PDFDownloadLink document={<PDFSchedule data={data} />} fileName="mecanicas.pdf">
      PDF
    </PDFDownloadLink>
  </Button>
);

export default PDFMecanicas;
