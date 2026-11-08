import { useRef, useState } from "react"
import { createRoot } from "react-dom/client"

import { VqRichText, type VqRichTextHandle } from "./src/index"
import "./src/styles.css"

const CONTEUDO_INICIAL = `
  <h2>Playground do VqRichText</h2>
  <p>Edite este conteúdo, insira imagens, vídeos e tabelas usando a toolbar.</p>
  <ul>
    <li>Formatação de texto</li>
    <li>Imagens redimensionáveis</li>
    <li>Vídeos do YouTube e Vimeo</li>
    <li>Tabelas configuráveis</li>
  </ul>
  <p>Quando terminar, confira o HTML gerado no painel abaixo.</p>
`

function Playground() {
  const [html, setHtml] = useState(CONTEUDO_INICIAL)
  const [disabled, setDisabled] = useState(false)
  const [exibirHtml, setExibirHtml] = useState(false)
  const editorRef = useRef<VqRichTextHandle>(null)

  const inserirNoInicio = () => {
    editorRef.current?.inserirNoInicio("<p><strong>Inserido no início.</strong></p>")
  }

  const inserirNoFim = () => {
    editorRef.current?.inserirNoFim("<p><strong>Inserido no fim.</strong></p>")
  }

  const inserirNoCursor = () => {
    editorRef.current?.inserirHtmlNoCursor("<strong>[texto no cursor]</strong>")
  }

  const restaurar = () => {
    editorRef.current?.definirConteudo(CONTEUDO_INICIAL)
    setHtml(CONTEUDO_INICIAL)
  }

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 20px 80px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, margin: "0 0 4px" }}>vq-rich-text playground</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Teste local do componente usando o código-fonte da biblioteca.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={inserirNoInicio}>
          Inserir no início
        </button>
        <button type="button" onClick={inserirNoFim}>
          Inserir no fim
        </button>
        <button type="button" onClick={inserirNoCursor}>
          Inserir no cursor
        </button>
        <button type="button" onClick={restaurar}>
          Restaurar conteúdo
        </button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />
          Desabilitado
        </label>
        <button type="button" onClick={() => setExibirHtml((valor) => !valor)}>
          {exibirHtml ? "Ocultar HTML" : "Ver HTML"}
        </button>
      </div>

      <VqRichText
        ref={editorRef}
        value={html}
        onChange={setHtml}
        disabled={disabled}
        placeholder="Digite o conteúdo..."
        className="sigi-rte-documento"
      />

      {exibirHtml && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>HTML gerado</h2>
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: 14,
              borderRadius: 8,
              overflow: "auto",
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {html}
          </pre>
        </section>
      )}
    </main>
  )
}

const root = document.getElementById("root")

if (!root) {
  throw new Error("Elemento #root não encontrado")
}

createRoot(root).render(<Playground />)
