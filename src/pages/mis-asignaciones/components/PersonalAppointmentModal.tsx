import React from "react";
import { Button, DatePicker, Form, Input, Modal } from "antd";
import type { FormInstance } from "antd";
import type { PersonalAppointmentFormValues } from "../types";

const { TextArea } = Input;

type PersonalAppointmentModalProps = {
  form: FormInstance<PersonalAppointmentFormValues>;
  open: boolean;
  isSmallScreen: boolean;
  onCancel: () => void;
  onSubmit: (values: PersonalAppointmentFormValues) => void;
};

export const PersonalAppointmentModal: React.FC<PersonalAppointmentModalProps> = ({
  form,
  open,
  isSmallScreen,
  onCancel,
  onSubmit,
}) => (
  <Modal
    title="Agendar cita personal"
    open={open}
  onCancel={onCancel}
  footer={null}
  width={isSmallScreen ? "100%" : 520}
  destroyOnClose
  >
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        name="date"
        label="Fecha"
        rules={[{ required: true, message: "Selecciona la fecha de la cita." }]}
      >
        <DatePicker format="DD-MM-YYYY" style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item
        name="title"
        label="Título de la cita"
        rules={[{ required: true, message: "Escribe el título de la cita." }]}
      >
        <Input placeholder="Ejemplo: Reunión de coordinación" maxLength={120} />
      </Form.Item>

      <Form.Item
        name="description"
        label="¿De qué tratará?"
        rules={[{ required: true, message: "Describe brevemente la cita." }]}
      >
        <TextArea
          placeholder="Agrega los detalles importantes de esta cita"
          autoSize={{ minRows: 4, maxRows: 8 }}
          maxLength={600}
          showCount
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" block>
          Guardar cita
        </Button>
      </Form.Item>
    </Form>
  </Modal>
);
