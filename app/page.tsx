"use client";

import { useEffect, useRef, useState } from "react";

const LS_KEY = "cert_submitted_v1";

type FieldState = "neutral" | "valid" | "error";

function normalize(str: string) {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function Page() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [chave1, setChave1] = useState("");
  const [chave2, setChave2] = useState("");

  const [nomeState, setNomeState] = useState<{ s: FieldState; m: string }>({ s: "neutral", m: "" });
  const [emailState, setEmailState] = useState<{ s: FieldState; m: string }>({ s: "neutral", m: "" });
  const [chave1State, setChave1State] = useState<{ s: FieldState; m: string }>({ s: "neutral", m: "" });
  const [chave2State, setChave2State] = useState<{ s: FieldState; m: string }>({ s: "neutral", m: "" });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === "1") setAlreadySubmitted(true);
    } catch {}
  }, []);

  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error" | "warning"; msg: string }>({
    show: false,
    type: "success",
    msg: "",
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: "success" | "error" | "warning" = "success") {
    setToast({ show: true, type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 4500);
  }

  function onNomeChange(v: string) {
    setNome(v);
    const t = v.trim();
    if (t.length > 2) setNomeState({ s: "valid", m: "Nome válido" });
    else if (t.length > 0) setNomeState({ s: "error", m: "Digite seu nome completo" });
    else setNomeState({ s: "neutral", m: "" });
  }

  function onEmailChange(v: string) {
    setEmail(v);
    if (!v.trim()) return setEmailState({ s: "neutral", m: "" });
    if (isValidEmail(v)) setEmailState({ s: "valid", m: "E-mail válido" });
    else setEmailState({ s: "error", m: "Digite um e-mail válido" });
  }

  function onChave1Change(v: string) {
    setChave1(v);
    if (!v.trim()) return setChave1State({ s: "neutral", m: "" });
    if (normalize(v).length >= 3) setChave1State({ s: "valid", m: "Pronto pra enviar" });
    else setChave1State({ s: "error", m: "Digite a palavra-chave" });
  }

  function onChave2Change(v: string) {
    setChave2(v);
    if (!v.trim()) return setChave2State({ s: "neutral", m: "" });
    if (normalize(v).length >= 3) setChave2State({ s: "valid", m: "Pronto pra enviar" });
    else setChave2State({ s: "error", m: "Digite a palavra-chave" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    let hasError = false;

    if (!nome.trim() || nome.trim().length < 3) {
      setNomeState({ s: "error", m: "Por favor, informe seu nome completo" });
      hasError = true;
    }
    if (!isValidEmail(email)) {
      setEmailState({ s: "error", m: "Por favor, informe um e-mail válido" });
      hasError = true;
    }
    if (!chave1.trim()) {
      setChave1State({ s: "error", m: "Informe a palavra-chave 1" });
      hasError = true;
    }
    if (!chave2.trim()) {
      setChave2State({ s: "error", m: "Informe a palavra-chave 2" });
      hasError = true;
    }

    if (hasError) {
      showToast("Corrija os campos destacados antes de continuar.", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, chave1, chave2 }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        field?: "chave1" | "chave2";
        code?: string;
      };

      if (res.ok && data.ok) {
        try { localStorage.setItem(LS_KEY, "1"); } catch {}
        setSuccess(true);
        showToast("Dados enviados com sucesso! 🎉", "success");
      } else if (res.status === 409) {
        try { localStorage.setItem(LS_KEY, "1"); } catch {}
        setAlreadySubmitted(true);
        showToast("Este e-mail já solicitou o certificado.", "error");
        setLoading(false);
      } else if (res.status === 422 && data.field) {
        const msg = "Palavra-chave incorreta — volte às aulas 😉";
        if (data.field === "chave1") setChave1State({ s: "error", m: msg });
        if (data.field === "chave2") setChave2State({ s: "error", m: msg });
        showToast("Palavra-chave incorreta.", "error");
        setLoading(false);
      } else {
        throw new Error(data.error || "Erro ao enviar");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao enviar. Tente novamente em instantes.", "error");
      setLoading(false);
    }
  }

  const inputClass = (st: FieldState) =>
    st === "valid" ? "is-valid" : st === "error" ? "is-error" : "";
  const hintClass = (st: FieldState) =>
    st === "valid" ? "field-hint hint-success" : st === "error" ? "field-hint hint-error" : "field-hint hint-info";
  const hintIcon = (st: FieldState) => (st === "valid" ? "✓" : st === "error" ? "✕" : "");

  return (
    <>
      <div className={`toast toast-${toast.type} ${toast.show ? "show" : ""}`} role="alert" aria-live="polite">
        <span className="toast-icon">
          {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "⚠️"}
        </span>
        <span>{toast.msg}</span>
      </div>

      <div className="page-wrapper">
        <div className="header">
          <div className="badge">
            <span className="badge-icon">🎓</span>
            Certificado de Conclusão
          </div>
          <h1>
            Masterclass —<br />
            <span>Claude Builders</span>
          </h1>
          <div className="instructor">
            <span className="instructor-avatar">VV</span>
            <span className="instructor-label">
              <span className="instructor-prefix">Professor</span>
              <span className="instructor-name">Victor Vicente</span>
            </span>
          </div>
          <p>
            Para receber seu certificado, preencha as <strong>informações abaixo</strong>:
          </p>
        </div>

        <div className="card">
          {alreadySubmitted ? (
            <div className="success-overlay show">
              <div className="success-icon-wrap">✅</div>
              <h2>Você já enviou</h2>
              <p>
                Este formulário só pode ser preenchido uma vez.
                <br />
                Se você ainda não recebeu o certificado, aguarde alguns minutos.
              </p>
            </div>
          ) : success ? (
            <div className="success-overlay show">
              <div className="success-icon-wrap">🎉</div>
              <h2>Certificado solicitado!</h2>
              <p>
                Seus dados foram enviados com sucesso.
                <br />
                Em breve você receberá seu certificado.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate autoComplete="off">
              <div className="field-group">
                <label htmlFor="nome">Nome Completo</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    value={nome}
                    onChange={(e) => onNomeChange(e.target.value)}
                    className={inputClass(nomeState.s)}
                    required
                  />
                  <span className="input-icon">👤</span>
                </div>
                <div className={hintClass(nomeState.s)}>
                  {nomeState.m && (
                    <>
                      <span className="hint-icon">{hintIcon(nomeState.s)}</span> {nomeState.m}
                    </>
                  )}
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="email">E-mail</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className={inputClass(emailState.s)}
                    required
                  />
                  <span className="input-icon">✉️</span>
                </div>
                <div className={hintClass(emailState.s)}>
                  {emailState.m && (
                    <>
                      <span className="hint-icon">{hintIcon(emailState.s)}</span> {emailState.m}
                    </>
                  )}
                </div>
              </div>

              <div className="section-divider">
                <span>🔑 Palavras-chave</span>
              </div>

              <div className="field-group">
                <label htmlFor="chave1">
                  Palavra-chave 1
                  <span className="key-badge">🔒 obrigatória</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="chave1"
                    name="chave1"
                    placeholder="Digite a primeira palavra-chave"
                    autoComplete="off"
                    value={chave1}
                    onChange={(e) => onChave1Change(e.target.value)}
                    className={inputClass(chave1State.s)}
                    required
                  />
                  <span className="input-icon">🗝️</span>
                </div>
                <div className={hintClass(chave1State.s)}>
                  {chave1State.m && (
                    <>
                      <span className="hint-icon">{hintIcon(chave1State.s)}</span> {chave1State.m}
                    </>
                  )}
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="chave2">
                  Palavra-chave 2
                  <span className="key-badge">🔒 obrigatória</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="chave2"
                    name="chave2"
                    placeholder="Digite a segunda palavra-chave"
                    autoComplete="off"
                    value={chave2}
                    onChange={(e) => onChave2Change(e.target.value)}
                    className={inputClass(chave2State.s)}
                    required
                  />
                  <span className="input-icon">🗝️</span>
                </div>
                <div className={hintClass(chave2State.s)}>
                  {chave2State.m && (
                    <>
                      <span className="hint-icon">{hintIcon(chave2State.s)}</span> {chave2State.m}
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className={`btn-submit ${loading ? "loading" : ""}`} disabled={loading}>
                <div className="spinner" />
                <span className="btn-text">Receber meu certificado</span>
                <span className="btn-icon">→</span>
              </button>
            </form>
          )}
        </div>

        <p className="footer">
          <span>🔒 Seus dados estão protegidos e serão usados apenas para emissão do certificado.</span>
        </p>
      </div>
    </>
  );
}

