import React from "react";
import {
  Button,
  Input,
  Popup,
  Selector,
  Space,
  Tag,
  TextArea,
} from "antd-mobile";
import type { GroupSummary, ProfileMember } from "../types";

export type MobileProfileFormValues = {
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  celular?: string;
  direccion?: string;
  genero?: "hombre" | "mujer";
  grupo?: number;
  fechaNacimiento?: string;
  fechaInmersion?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

type MobileProfileEditorProps = {
  currentMember: ProfileMember;
  groups: GroupSummary[];
  open: boolean;
  saving: boolean;
  values: MobileProfileFormValues;
  onChange: (values: MobileProfileFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const fieldStyles: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

export const MobileProfileEditor: React.FC<MobileProfileEditorProps> = ({
  currentMember,
  groups,
  open,
  saving,
  values,
  onChange,
  onClose,
  onSubmit,
}) => {
  const updateField = <K extends keyof MobileProfileFormValues>(
    key: K,
    value: MobileProfileFormValues[K],
  ) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  return (
    <Popup
      visible={open}
      position="right"
      bodyStyle={{ width: "100%", height: "100%" }}
      onMaskClick={onClose}
    >
      <div style={{ height: "100%", overflowY: "auto", padding: 16, display: "grid", gap: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Editar mi perfil</h3>
          <p style={{ margin: "6px 0 0", color: "var(--app-muted)" }}>
            Actualiza tus datos personales y deja tu cuenta lista para las próximas
            asignaciones.
          </p>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <strong>Cuenta</strong>
          <Tag color="primary" fill="outline">
            Usuario: {values.username}
          </Tag>
          <Tag color="primary" fill="outline">
            Correo: {values.email}
          </Tag>
          <Tag color="success" fill="outline">
            Nombramientos:{" "}
            {currentMember?.nombramientos?.length
              ? currentMember.nombramientos.map((item) => item.replace(/_/g, " ")).join(", ")
              : "Sin nombramientos"}
          </Tag>
        </div>

        <label style={fieldStyles}>
          <span>Nombres</span>
          <Input value={values.nombres} onChange={(value) => updateField("nombres", value)} />
        </label>

        <label style={fieldStyles}>
          <span>Apellidos</span>
          <Input value={values.apellidos} onChange={(value) => updateField("apellidos", value)} />
        </label>

        <label style={fieldStyles}>
          <span>Celular</span>
          <Input value={values.celular} onChange={(value) => updateField("celular", value)} />
        </label>

        <label style={fieldStyles}>
          <span>Teléfono fijo</span>
          <Input value={values.telefono} onChange={(value) => updateField("telefono", value)} />
        </label>

        <label style={fieldStyles}>
          <span>Dirección</span>
          <TextArea
            value={values.direccion}
            rows={3}
            onChange={(value) => updateField("direccion", value)}
          />
        </label>

        <div style={fieldStyles}>
          <span>Género</span>
          <Selector
            columns={2}
            value={values.genero ? [values.genero] : []}
            options={[
              { label: "Hombre", value: "hombre" },
              { label: "Mujer", value: "mujer" },
            ]}
            onChange={(value) =>
              updateField("genero", (value[0] as MobileProfileFormValues["genero"]) ?? undefined)
            }
          />
        </div>

        <div style={fieldStyles}>
          <span>Grupo</span>
          <Selector
            columns={1}
            value={values.grupo ? [String(values.grupo)] : []}
            options={groups.map((group) => ({
              label: group.nombre,
              value: String(group.id),
            }))}
            onChange={(value) =>
              updateField("grupo", value[0] ? Number(value[0]) : undefined)
            }
          />
        </div>

        <label style={fieldStyles}>
          <span>Fecha de nacimiento</span>
          <input
            type="date"
            value={values.fechaNacimiento || ""}
            onChange={(event) => updateField("fechaNacimiento", event.target.value)}
          />
        </label>

        <label style={fieldStyles}>
          <span>Fecha de inmersión</span>
          <input
            type="date"
            value={values.fechaInmersion || ""}
            onChange={(event) => updateField("fechaInmersion", event.target.value)}
          />
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <strong>Cambiar contraseña</strong>
          <Input
            type="password"
            placeholder="Contraseña actual"
            value={values.currentPassword}
            onChange={(value) => updateField("currentPassword", value)}
          />
          <Input
            type="password"
            placeholder="Nueva contraseña"
            value={values.newPassword}
            onChange={(value) => updateField("newPassword", value)}
          />
          <Input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={values.confirmPassword}
            onChange={(value) => updateField("confirmPassword", value)}
          />
        </div>

        <Space direction="vertical" block style={{ width: "100%" }}>
          <Button block color="primary" loading={saving} onClick={onSubmit}>
            Guardar cambios
          </Button>
          <Button block onClick={onClose}>
            Cancelar
          </Button>
        </Space>
      </div>
    </Popup>
  );
};
