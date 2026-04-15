import React from "react";
import { Flex, Form, Input, Modal, Typography } from "antd";
import type { FormInstance } from "antd";
import { MiembroProfileFields } from "../../../components/member/MiembroProfileFields";
import type {
  GroupSummary,
  ProfileFormValues,
  ProfileMember,
  ProfileResponse,
} from "../types";

type ProfileModalProps = {
  form: FormInstance<ProfileFormValues>;
  open: boolean;
  saving: boolean;
  isSmallScreen: boolean;
  groups: GroupSummary[];
  profile: ProfileResponse | null;
  currentMember: ProfileMember;
  onCancel: () => void;
  onSubmit: (values: ProfileFormValues) => void | Promise<void>;
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  form,
  open,
  saving,
  isSmallScreen,
  groups,
  profile,
  currentMember,
  onCancel,
  onSubmit,
}) => {
  const member = profile?.member ?? currentMember;
  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: group.nombre,
  }));

  return (
    <Modal
      title="Editar mi perfil"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
        confirmLoading={saving}
      width={isSmallScreen ? "100%" : 820}
      okText="Guardar cambios"
      cancelText="Cancelar"
    >
      <Form<ProfileFormValues> form={form} layout="vertical" onFinish={onSubmit}>
        <Flex gap={16} vertical={isSmallScreen}>
          <Form.Item
            name="username"
            label="Usuario"
            rules={[{ required: true, message: "Ingresa tu usuario" }]}
            style={{ flex: 1 }}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item name="email" label="Correo electrónico" style={{ flex: 1 }}>
            <Input disabled />
          </Form.Item>
        </Flex>
        <MiembroProfileFields
          form={form}
          groupOptions={groupOptions}
          nombramientosMode="readonly"
          readOnlyNombramientos={member?.nombramientos ?? []}
          generoRequiredMessage="Selecciona tu genero"
        />

        <Typography.Title level={5}>Cambiar contraseña</Typography.Title>
        <Flex gap={16} vertical>
          <Form.Item name="currentPassword" label="Contraseña actual">
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Nueva contraseña"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value && !getFieldValue("currentPassword")) {
                    return Promise.resolve();
                  }
                  if (value && value.length >= 6) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("La nueva contraseña debe tener al menos 6 caracteres.")
                  );
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirmar nueva contraseña"
            dependencies={["newPassword"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!getFieldValue("newPassword") && !value) {
                    return Promise.resolve();
                  }
                  if (value === getFieldValue("newPassword")) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("La confirmación no coincide con la nueva contraseña.")
                  );
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
};
