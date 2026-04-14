import { FilePdfFilled } from "@ant-design/icons";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { Button } from "antd";
import dayjs from "dayjs";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  header: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  text: {
    marginBottom: 10,
    lineHeight: 1.5,
  },
  underline: {
    textDecoration: "underline",
  },
});

interface MeetingPDFProps {
  data: {
    president: string;
    date: string;
    songNumber: number;
    optionalQuestions?: string;
    discourseTopic: string;
    speaker: string;
    congregation: string;
    nextWeekTitle: string;
    watchtowerConductor: string;
  };
}

const MeetingsPDF: React.FC<MeetingPDFProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>
        Instrucciones para la presidencia de la Reunión Pública
      </Text>

      <View style={styles.headerInfo}>
        <Text>4:55 p.m. Presidente: {data.president}</Text>
        <Text>Fecha: {dayjs(data.date).format("DD/MM/YYYY")}</Text>
      </View>

      <Text style={styles.text}>
        Buenas tardes hermanos y amigos que nos visitan, los invito a ubicarse en sus
        asientos ya que dentro de 5 minutos iniciaremos la reunión. Mientras tanto
        disfruten de un agradable preludio musical (Repetir)
      </Text>

      <Text style={styles.text}>5:00 p.m.</Text>

      <Text style={styles.text}>
        Muy buenas tardes hermanos y queridos amigos. Para la congregación Las Villas
        es un placer extenderles una cordial bienvenida a la Reunión Pública.
        Confiamos en que lo que escucharemos en este programa de enseñanza espiritual
        aumentará nuestro deseo de hacer la voluntad de Dios. (Queremos recordarles
        que por favor programen sus celulares para que estos no distraigan al resto
        del auditorio) Gracias.
      </Text>

      <Text style={styles.text}>
        Como de costumbre iniciaremos la reunión cantando. Por favor pueden ponerse
        de pie para entonar la canción N° {data.songNumber} después de la canción
        haremos una oración. (Después de la canción y oración) Ahora pueden sentarse.
      </Text>

      {data.optionalQuestions && (
        <Text style={styles.text}>
          {data.optionalQuestions}
          {"\n"}(Preguntas opcionales)
        </Text>
      )}

      <Text style={styles.text}>
        Estas interrogantes y muchas más se responderán en el discurso público que a
        continuación escucharemos y se titula: {data.discourseTopic}
      </Text>

      <Text style={styles.text}>
        Este será presentado por el hermano: {data.speaker} Quien sirve en la
        Congregación: {data.congregation}
      </Text>

      <Text style={styles.text}>Por favor pedimos su amable atención.</Text>

      <Text style={styles.text}>
        5:36 p.m. (Después de finalizar el discurso) Muchas gracias a Jehová y al
        hermano: {data.speaker} por su excelente disertación.
      </Text>

      <Text style={styles.text}>
        Todas las semanas se presentan discursos animadores como el que acabamos de
        escuchar.
      </Text>

      <Text style={styles.text}>
        El próximo fin de semana les invitamos al discurso que tiene como título:{" "}
        {data.nextWeekTitle}
      </Text>

      <Text style={styles.text}>
        Podemos ir invitando desde ya a familiares, conocidos, vecinos, estudiantes y
        demás personas interesadas a este interesante discurso.
      </Text>

      <Text style={styles.text}>
        Aprovechamos para invitarles al análisis de un artículo de La Atalaya a cargo
        del hermano: {data.watchtowerConductor}
      </Text>

      <Text style={styles.text}>Ver. km 2/74 pág. 3 - km 5/07 pág. 3</Text>
    </Page>
  </Document>
);

const MeetingPDF = ({ data }: MeetingPDFProps) => (
  <Button icon={<FilePdfFilled />} danger type="primary">
    <PDFDownloadLink document={<MeetingsPDF data={data} />} fileName="mecanicas.pdf">
      PDF
    </PDFDownloadLink>
  </Button>
);

export default MeetingPDF;
