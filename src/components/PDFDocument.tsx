import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  section: { marginBottom: 10 },
  title: { fontSize: 18, marginBottom: 10, fontWeight: 'bold' },
  text: { fontSize: 12 },
  noPaymen: { fontSize: 12, color: "red" },
  memberSection: { marginTop: 10 },
  memberName: { fontSize: 14, marginBottom: 5 },
  paymentDetails: { marginLeft: 15, marginBottom: 5 },
});

interface Pago {
  miembro: string;
  monto: number;
  fecha: string;
}

interface PDFDocumentProps {
  nombreGrupo: string;
  totalPagado: number;
  pagosMiembros: { miembro: string; pagos: Pago[] }[]; // Lista de miembros y sus pagos
}

const PDFDocument: React.FC<PDFDocumentProps> = ({ nombreGrupo, totalPagado, pagosMiembros }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Título y total pagado */}
      <View style={styles.section}>
        <Text style={styles.title}>Reporte de Pagos</Text>
        <Text style={styles.text}>Grupo: {nombreGrupo}</Text>
        <Text style={styles.text}>Total Pagado: ${totalPagado}</Text>
      </View>

      {/* Lista de miembros y sus pagos */}
      <View style={styles.memberSection}>
        <Text style={styles.title}>Miembros y Pagos</Text>
        {pagosMiembros.map(({ miembro, pagos }, index) => (
          <View key={index}>
            <Text style={styles.memberName}>Miembro: {miembro}</Text>
            {pagos.length > 0 ? (
              pagos.map((pago, idx) => (
                <View key={idx} style={styles.paymentDetails}>
                  <Text style={styles.text}>
                    Fecha: {pago.fecha} - Monto: ${pago.monto}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noPaymen}>No ha realizado pagos</Text>
            )}
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default PDFDocument;
