import React, { useState } from "react";
import { ArrowLeft, Eye, EyeOff, ArrowRight, LockKeyhole } from "lucide-react";
import Logo from "../components/Logo.jsx";
import { authSignIn, authResetPassword } from "../lib/db.js";
import { Field, Alert } from "./crm/CRMUI.jsx";
import { catalogSnapshot } from "../lib/catalog.js";
import "../styles/crm.css";
export default function LoginPage({ onLogin, navigate, onDemo }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [resetMode, setResetMode] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (resetMode) {
        const result = await authResetPassword(email.trim());
        if (result.error) throw result.error;
        setNotice(
          "Se este e-mail estiver cadastrado, você receberá as instruções de recuperação.",
        );
      } else {
        const result = await authSignIn(email.trim(), password);
        if (result.error) throw result.error;
        if (!result.data?.user)
          throw new Error("Não foi possível confirmar o acesso.");
        onLogin(result.data.user);
      }
    } catch (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos. Verifique seus dados."
          : err.message || "Não foi possível acessar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="crm-login">
      <section
        className="crm-login-visual"
        style={{
          backgroundImage: catalogSnapshot[0]?.img
            ? `url(${catalogSnapshot[0].img})`
            : undefined,
        }}
      >
        <div>
          <Logo light big />
        </div>
        <div>
          <small>Área da equipe VilaVix</small>
          <h1>
            Seu atendimento começa aqui.
          </h1>
          <p>
            Consulte sua carteira, acompanhe as negociações e organize os retornos e visitas do dia.
          </p>
        </div>
      </section>
      <section className="crm-login-form">
        <div>
          <button
            className="crm-link"
            onClick={() => navigate("home")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            <ArrowLeft size={14} />
            Voltar ao site
          </button>
          <h2>
            {resetMode
              ? "Recuperar seu acesso"
              : "Entrar no CRM"}
          </h2>
          <p>
            {resetMode
              ? "Informe o e-mail vinculado à sua conta para receber as instruções."
              : "Entre com a conta cadastrada pela equipe VilaVix."}
          </p>
          <Alert>{error}</Alert>
          <Alert tone="success">{notice}</Alert>
          <form onSubmit={submit}>
            <Field label="E-mail">
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
              />
            </Field>
            {!resetMode && (
              <>
                <Field label="Senha">
                  <div className="crm-password">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      aria-label="Senha"
                    />
                    <button
                      type="button"
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShow((p) => !p)}
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>
                <button
                  type="button"
                  className="crm-link"
                  style={{ fontSize: 11, alignSelf: "flex-end" }}
                  onClick={() => {
                    setResetMode(true);
                    setError("");
                    setNotice("");
                  }}
                >
                  Esqueci minha senha
                </button>
              </>
            )}
            <button
              className="crm-btn crm-btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: 13 }}
            >
              {loading
                ? "Aguarde…"
                : resetMode
                  ? "Enviar instruções"
                  : "Entrar"}
              <ArrowRight size={15} />
            </button>
            {resetMode && (
              <button
                type="button"
                className="crm-btn"
                onClick={() => {
                  setResetMode(false);
                  setNotice("");
                  setError("");
                }}
              >
                Voltar para o login
              </button>
            )}
          </form>
          {onDemo && (
            <button
              className="crm-btn"
              style={{ width: "100%", marginTop: 12 }}
              onClick={onDemo}
            >
              Abrir ambiente de revisão
            </button>
          )}
          <div className="crm-login-note">
            <LockKeyhole
              size={14}
              style={{ verticalAlign: "middle", marginRight: 7 }}
            />
            Acesso exclusivo à equipe autorizada.
            {onDemo &&
              " A revisão usa contatos fictícios e não altera os dados de produção."}
          </div>
        </div>
      </section>
    </main>
  );
}
