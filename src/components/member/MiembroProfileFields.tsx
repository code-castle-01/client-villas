import React from "react";
import { Col, DatePicker, Divider, Form, Input, Row, Select, Space, Tag, Typography } from "antd";
import type { FormInstance } from "antd";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

type GroupOption = {
  value: number;
  label: string;
};

type NombramientoOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type MiembroProfileFieldsProps = {
  form: FormInstance;
  groupOptions: GroupOption[];
  generoRequiredMessage?: string;
  nombramientosMode?: "editable" | "readonly";
  nombramientosOptions?: NombramientoOption[];
  readOnlyNombramientos?: string[];
  onNombramientosChange?: (values: string[]) => void;
  sectionTitleClassName?: string;
};

const sectionTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: 12,
};

export const MiembroProfileFields: React.FC<MiembroProfileFieldsProps> = ({
  form,
  groupOptions,
  generoRequiredMessage = "Selecciona el género",
  nombramientosMode = "editable",
  nombramientosOptions = [],
  readOnlyNombramientos = [],
  onNombramientosChange,
  sectionTitleClassName,
}) => {
  const renderSectionTitle = (label: string) => (
    <Typography.Text
      className={sectionTitleClassName}
      style={sectionTitleClassName ? undefined : sectionTitleStyle}
    >
      {label}
    </Typography.Text>
  );

  return (
    <>
      <Divider />
      {renderSectionTitle("Informacion Personal")}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="nombres"
            label="Nombres"
            rules={[{ required: true, message: "Ingresa los nombres" }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="apellidos"
            label="Apellidos"
            rules={[{ required: true, message: "Ingresa los apellidos" }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="celular" label="Celular">
            <PhoneInput
              className="grupos-phone"
              defaultCountry="CO"
              international
              countryCallingCodeEditable={false}
              placeholder="Ej: +57 3201234567"
              value={form.getFieldValue("celular")}
              onChange={(value) => form.setFieldValue("celular", value)}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="telefono" label="Telefono fijo">
            <PhoneInput
              className="grupos-phone"
              defaultCountry="CO"
              international
              countryCallingCodeEditable={false}
              placeholder="Ej: +57 571234567"
              value={form.getFieldValue("telefono")}
              onChange={(value) => form.setFieldValue("telefono", value)}
            />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item name="direccion" label="Direccion de residencia">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      {renderSectionTitle("Provilegios")}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="fechaNacimiento" label="Fecha de Nacimiento">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="fechaInmersion" label="Fecha de Inmersion">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="genero"
            label="Genero"
            rules={[{ required: true, message: generoRequiredMessage }]}
          >
            <Select
              options={[
                { value: "hombre", label: "Hombre" },
                { value: "mujer", label: "Mujer" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          {nombramientosMode === "editable" ? (
            <Form.Item
              name="nombramientos"
              label="Nombramientos"
              rules={[
                { required: true, message: "Selecciona el nombramiento" },
              ]}
            >
              <Select
                mode="multiple"
                options={nombramientosOptions}
                placeholder="Selecciona nombramientos"
                onChange={(values) => onNombramientosChange?.(values)}
              />
            </Form.Item>
          ) : (
            <Form.Item label="Nombramientos">
              <Space wrap size={[4, 4]}>
                {(readOnlyNombramientos.length
                  ? readOnlyNombramientos
                  : ["Sin nombramientos"]
                ).map((nombramiento) => (
                  <Tag
                    key={nombramiento}
                    color={nombramiento === "Sin nombramientos" ? "default" : "geekblue"}
                  >
                    {nombramiento === "Sin nombramientos"
                      ? nombramiento
                      : nombramiento.replace(/_/g, " ")}
                  </Tag>
                ))}
              </Space>
            </Form.Item>
          )}
        </Col>
        <Col xs={24}>
          <Form.Item name="grupo" label="Asignar a grupo">
            <Select
              allowClear
              options={groupOptions}
              placeholder="Selecciona un grupo"
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};
