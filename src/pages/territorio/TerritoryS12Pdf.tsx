import React from "react";
import {
  Document,
  Image,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { FilePdfFilled } from "@ant-design/icons";
import { Button } from "antd";
import type { ButtonProps } from "antd";

export type TerritoryS12PdfData = {
  sitio: string;
  n: number;
  img: string;
};

type TerritoryS12PdfProps = {
  territory: TerritoryS12PdfData;
};

type TerritoryS12DownloadButtonProps = TerritoryS12PdfProps & {
  buttonProps?: ButtonProps;
  label?: string;
};

const cardSize: [number, number] = [413.9, 267.7];

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingHorizontal: 30,
    paddingBottom: 28,
    fontFamily: "Times-Roman",
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 12.5,
    textAlign: "center",
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 5,
  },
  label: {
    fontFamily: "Times-Bold",
    fontSize: 9,
    lineHeight: 1,
  },
  localityLine: {
    flexGrow: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: "#7b8794",
    borderStyle: "dotted",
    marginLeft: 2,
    marginRight: 4,
    minHeight: 9,
    paddingLeft: 2,
  },
  territoryLine: {
    width: 64,
    borderBottomWidth: 0.8,
    borderBottomColor: "#7b8794",
    borderStyle: "dotted",
    marginLeft: 2,
    minHeight: 9,
    paddingLeft: 3,
  },
  fieldText: {
    fontSize: 7.5,
    lineHeight: 1,
  },
  mapFrame: {
    height: 107,
    backgroundColor: "#f3f6fc",
    overflow: "hidden",
    marginBottom: 4,
  },
  mapImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  mapCaption: {
    fontFamily: "Times-Bold",
    fontSize: 8,
    textAlign: "center",
    marginBottom: 2,
  },
  instruction: {
    fontFamily: "Times-Bold",
    fontSize: 8,
    lineHeight: 1.1,
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    left: 30,
    bottom: 20,
    flexDirection: "row",
    gap: 18,
  },
  footerText: {
    fontSize: 6,
  },
});

const sanitizeFileName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const TerritoryS12Document: React.FC<TerritoryS12PdfProps> = ({
  territory,
}) => (
  <Document title={`S-12 Territorio ${territory.n} - ${territory.sitio}`}>
    <Page size={cardSize} style={styles.page}>
      <Text style={styles.title}>Tarjeta del mapa del territorio</Text>

      <View style={styles.fieldRow}>
        <Text style={styles.label}>Localidad</Text>
        <View style={styles.localityLine}>
          <Text style={styles.fieldText}>Las Villas - {territory.sitio}</Text>
        </View>
        <Text style={styles.label}>Terr. núm.</Text>
        <View style={styles.territoryLine}>
          <Text style={styles.fieldText}>{territory.n}</Text>
        </View>
      </View>

      <View style={styles.mapFrame}>
        <Image src={territory.img} style={styles.mapImage} />
      </View>

      <Text style={styles.mapCaption}>
        (Pegue el mapa arriba o dibuje el territorio)
      </Text>
      <Text style={styles.instruction}>
        Sírvase mantener esta tarjeta en el sobre. No la manche, marque, ni doble.
        Cada vez que se haya trabajado completamente el territorio, infórmelo al
        hermano que atiende los archivos del territorio.
      </Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>S-12-S</Text>
        <Text style={styles.footerText}>6/72</Text>
      </View>
    </Page>
  </Document>
);

export const TerritoryS12DownloadButton: React.FC<
  TerritoryS12DownloadButtonProps
> = ({ territory, buttonProps, label = "S-12" }) => (
  <PDFDownloadLink
    document={<TerritoryS12Document territory={territory} />}
    fileName={`s-12-territorio-${territory.n}-${
      sanitizeFileName(territory.sitio) || "territorio"
    }.pdf`}
    className="territorio-pdf-link"
  >
    {({ loading }) => (
      <Button
        size="small"
        type="primary"
        danger
        icon={<FilePdfFilled />}
        {...buttonProps}
        disabled={loading || buttonProps?.disabled}
      >
        {loading ? "Generando..." : label}
      </Button>
    )}
  </PDFDownloadLink>
);
