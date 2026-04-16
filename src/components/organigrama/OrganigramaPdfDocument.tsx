import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { DirectoryGroup } from "../../api/groupDirectory";
import {
  committeeBranches,
  otherAssignments,
  type OrganigramaAssignments,
} from "./organigrama.schema";

type OrganigramaPdfDocumentProps = {
  congregationName: string;
  assignments: OrganigramaAssignments;
  groups: DirectoryGroup[];
  resolveMemberName: (memberId?: number) => string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 26,
    fontSize: 11,
    color: "#1f2937",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    fontWeight: 700,
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#111827",
  },
  subtitle: {
    textAlign: "center",
    color: "#5b6678",
    marginBottom: 18,
  },
  committeeRoot: {
    borderWidth: 1.5,
    borderColor: "#111827",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  committeeRootText: {
    fontSize: 20,
    fontWeight: 700,
  },
  branchRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 18,
  },
  branchColumn: {
    flex: 1,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
    color: "#14213d",
  },
  positionCard: {
    borderWidth: 1.25,
    borderColor: "#111827",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  positionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 6,
  },
  positionName: {
    textAlign: "center",
    lineHeight: 1.4,
  },
  auxLabel: {
    fontWeight: 700,
    marginTop: 6,
  },
  sectionSpacing: {
    marginTop: 6,
    marginBottom: 8,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cardsGridItem: {
    width: "32%",
  },
  groupGridItem: {
    width: "24%",
  },
  note: {
    color: "#5b6678",
    marginBottom: 10,
  },
});

const PdfPositionCard = ({
  title,
  memberName,
  auxiliaryName,
}: {
  title: string;
  memberName: string;
  auxiliaryName: string;
}) => (
  <View style={styles.positionCard}>
    <Text style={styles.positionTitle}>{title}</Text>
    <Text style={styles.positionName}>{memberName}</Text>
    <Text style={styles.auxLabel}>Auxiliar:</Text>
    <Text style={styles.positionName}>{auxiliaryName}</Text>
  </View>
);

export const OrganigramaPdfDocument: React.FC<OrganigramaPdfDocumentProps> = ({
  congregationName,
  assignments,
  groups,
  resolveMemberName,
}) => (
  <Document title={`Organigrama - ${congregationName}`}>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Text style={styles.title}>{congregationName}</Text>
      <Text style={styles.subtitle}>
        Organigrama de cargos y responsabilidades de la congregación
      </Text>

      <View style={styles.committeeRoot}>
        <Text style={styles.committeeRootText}>Comité de servicio</Text>
      </View>

      <View style={styles.branchRow}>
        {committeeBranches.map((branch) => (
          <View key={branch.key} style={styles.branchColumn}>
            <PdfPositionCard
              title={branch.lead.title}
              memberName={resolveMemberName(
                assignments[branch.lead.role].memberId,
              )}
              auxiliaryName={resolveMemberName(
                assignments[branch.lead.role].auxiliaryMemberId,
              )}
            />
            {branch.children.map((child) => (
              <PdfPositionCard
                key={child.role}
                title={child.title}
                memberName={resolveMemberName(assignments[child.role].memberId)}
                auxiliaryName={resolveMemberName(
                  assignments[child.role].auxiliaryMemberId,
                )}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionTitle}>Otros encargos</Text>
      </View>
      <View style={styles.cardsGrid}>
        {otherAssignments.map((role) => (
          <View key={role.role} style={styles.cardsGridItem}>
            <PdfPositionCard
              title={role.title}
              memberName={resolveMemberName(assignments[role.role].memberId)}
              auxiliaryName={resolveMemberName(
                assignments[role.role].auxiliaryMemberId,
              )}
            />
          </View>
        ))}
      </View>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionTitle}>Grupos para el servicio del campo</Text>
        <Text style={styles.note}>
          La información de grupos se sincroniza desde la escena de Grupos.
        </Text>
      </View>
      <View style={styles.cardsGrid}>
        {groups.map((group) => (
          <View key={group.id} style={styles.groupGridItem}>
            <PdfPositionCard
              title={group.nombre}
              memberName={group.superintendenteNombre ?? "Pendiente"}
              auxiliaryName={group.auxiliarNombre ?? "Pendiente"}
            />
          </View>
        ))}
      </View>
    </Page>
  </Document>
);
