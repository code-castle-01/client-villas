import { useState } from "react";
import { Button, Card, Result, Typography } from "antd";
import { migrateLocalStorageToApi } from "../migrations/localStorageToApi";

export const MigracionPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runMigration = async () => {
    setLoading(true);
    setResult(null);
    setMessage(null);
    try {
      const res = await migrateLocalStorageToApi();
      if (res.ok) {
        setResult("ok");
      } else {
        setResult("error");
        setMessage(res.message ?? "No se pudo migrar.");
      }
    } catch (error) {
      setResult("error");
      setMessage("Error inesperado durante la migración.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 700, margin: "0 auto" }}>
      <Typography.Title level={3}>
        Migrar datos desde localStorage
      </Typography.Title>
      <Typography.Paragraph>
        Esta acción migrará los datos locales a Strapi. Se recomienda ejecutarla
        una sola vez.
      </Typography.Paragraph>
      <Button type="primary" onClick={runMigration} loading={loading}>
        Ejecutar migración
      </Button>
      {result === "ok" && (
        <Result status="success" title="Migración completada" />
      )}
      {result === "error" && (
        <Result status="error" title="Migración fallida" subTitle={message} />
      )}
    </Card>
  );
};
