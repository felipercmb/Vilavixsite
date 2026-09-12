import React, { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Alert, Field } from "./crm/CRMUI.jsx";
import "../styles/crm.css";

export default function ResetPassword({ user, loading, navigate }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    setSaving(true);
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword("");
      setConfirmation("");
      setDone(true);
      await supabase.auth.signOut();
    } catch (failure) {
      setError(
        failure.message ||
          "Não foi possível atualizar sua senha. Solicite um novo link de recuperação.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <main
      className="crm-login"
      style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}
    >
      <section
        className="crm-login-form"
        style={{ width: "100%", maxWidth: 540 }}
      >
        <div>
          <h1>Redefinir sua senha</h1>
          <Alert>{error}</Alert>
          {loading ? (
            <p role="status">Verificando seu link…</p>
          ) : done ? (
            <>
              <Alert tone="success">
                Senha atualizada. Entre com sua nova senha.
              </Alert>
              <button
                className="crm-btn crm-btn-primary"
                onClick={() => navigate("login")}
              >
                Ir para o login
              </button>
            </>
          ) : user ? (
            <form onSubmit={submit}>
              <p>Escolha uma nova senha para acessar o CRM.</p>
              <Field label="Nova senha">
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field label="Confirme a nova senha">
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </Field>
              <button className="crm-btn crm-btn-primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          ) : (
            <>
              <p>
                Este link expirou ou não foi reconhecido. Solicite um novo link
                pela opção “Esqueci minha senha”.
              </p>
              <button className="crm-btn" onClick={() => navigate("login")}>
                Voltar ao login
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
