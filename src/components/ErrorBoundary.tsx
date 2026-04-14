import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? "Error inesperado" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary capturó un error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "#fff",
            borderRadius: 16,
            padding: "28px 32px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ margin: 0, marginBottom: 12, color: "#111827" }}>
            Algo salió mal
          </h2>
          <p style={{ margin: 0, marginBottom: 16, color: "#6b7280" }}>
            Capturamos un error inesperado. Puedes recargar la página para
            continuar.
          </p>
          {this.state.message && (
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 13,
                color: "#111827",
                border: "1px solid #e2e8f0",
                marginBottom: 16,
                wordBreak: "break-word",
              }}
            >
              {this.state.message}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}
