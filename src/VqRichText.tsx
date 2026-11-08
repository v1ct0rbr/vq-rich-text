import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Columns3,
  Settings2,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Video,
} from "lucide-react"

export interface VqRichTextProps {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export interface VqRichTextHandle {
  inserirHtmlNoCursor: (html: string) => void
  definirConteudo: (html: string) => void
  inserirNoInicio: (html: string) => void
  inserirNoFim: (html: string) => void
}

interface ImagemSelecionada {
  wrapper: HTMLElement
  img: HTMLImageElement
}

interface TabelaSelecionada {
  tabela: HTMLTableElement
  celula: HTMLTableCellElement | null
}

const BOTOES_HANDLE = ["nw", "ne", "sw", "se"]

function executarComando(comando: string, valor?: string) {
  document.execCommand(comando, false, valor)
}

function iconeBotao(titulo: string, onClick: () => void, children: ReactNode, desabilitado = false) {
  return (
    <button
      type="button"
      className="sigi-rte-btn"
      title={titulo}
      aria-label={titulo}
      disabled={desabilitado}
      onMouseDown={(evento) => evento.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match?.[1] ?? null
}

function vimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

function dividirAtributos(elemento: Element): Element[] {
  const clones: Element[] = []
  if (elemento instanceof HTMLTableElement) {
    clones.push(...Array.from(elemento.querySelectorAll("td,th")))
  }
  return clones
}

export const VqRichText = forwardRef<VqRichTextHandle, VqRichTextProps>(function VqRichText({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Digite aqui…",
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null)
  const inputImagem = useRef<HTMLInputElement>(null)
  const menuCelulaRef = useRef<HTMLDivElement>(null)
  const imagemArrastada = useRef<HTMLElement | null>(null)
  const ultimoEmitido = useRef("")
  const selecaoSalva = useRef<Range | null>(null)
  const historico = useRef<string[]>([])
  const indiceHistorico = useRef(-1)
  const restaurandoHistorico = useRef(false)
  const [imagemSelecionada, setImagemSelecionada] = useState<ImagemSelecionada | null>(null)
  const [imagemLargura, setImagemLargura] = useState("")
  const [imagemAltura, setImagemAltura] = useState("")
  const [tabelaAberta, setTabelaAberta] = useState(false)
  const [tabelaAtual, setTabelaAtual] = useState<TabelaSelecionada | null>(null)
  const [tabelaSelecionada, setTabelaSelecionada] = useState<HTMLTableElement | null>(null)
  const [linhas, setLinhas] = useState("3")
  const [colunas, setColunas] = useState("3")
  const [cabecalho, setCabecalho] = useState(true)
  const [bordaEstilo, setBordaEstilo] = useState("none")
  const [bordaCor, setBordaCor] = useState("#cbd5e1")
  const [bordaLargura, setBordaLargura] = useState("1")
  const [corCelula, setCorCelula] = useState("#ffffff")
  const [alinhamentoVertical, setAlinhamentoVertical] = useState("top")
  const [alinhamentoHorizontal, setAlinhamentoHorizontal] = useState("left")
  const [alturaLinha, setAlturaLinha] = useState("")
  const [larguraColuna, setLarguraColuna] = useState("")
  const [alinhamentoTabela, setAlinhamentoTabela] = useState("left")
  const [larguraTabela, setLarguraTabela] = useState("")
  const [menuCelula, setMenuCelula] = useState<{
    x: number
    y: number
    celula: HTMLTableCellElement
  } | null>(null)

  function emitir() {
    const html = editorRef.current?.innerHTML ?? ""
    ultimoEmitido.current = html
    if (!restaurandoHistorico.current
        && historico.current[indiceHistorico.current] !== html) {
      historico.current = historico.current.slice(0, indiceHistorico.current + 1)
      historico.current.push(html)
      if (historico.current.length > 100) historico.current.shift()
      indiceHistorico.current = historico.current.length - 1
    }
    onChange(html)
  }

  function desfazer() {
    if (indiceHistorico.current <= 0) return
    restaurandoHistorico.current = true
    indiceHistorico.current -= 1
    const html = historico.current[indiceHistorico.current] ?? ""
    const editor = editorRef.current
    if (editor) {
      editor.innerHTML = html
      normalizarConteudo()
      editor.focus()
    }
    ultimoEmitido.current = html
    onChange(html)
    restaurandoHistorico.current = false
  }

  function refazer() {
    if (indiceHistorico.current >= historico.current.length - 1) return
    restaurandoHistorico.current = true
    indiceHistorico.current += 1
    const html = historico.current[indiceHistorico.current] ?? ""
    const editor = editorRef.current
    if (editor) {
      editor.innerHTML = html
      normalizarConteudo()
      editor.focus()
    }
    ultimoEmitido.current = html
    onChange(html)
    restaurandoHistorico.current = false
  }

  function salvarSelecao() {
    const selecao = window.getSelection()
    if (selecao && selecao.rangeCount > 0) {
      selecaoSalva.current = selecao.getRangeAt(0).cloneRange()
    }
  }

  function restaurarSelecao() {
    const selecao = window.getSelection()
    const range = selecaoSalva.current
    if (selecao && range) {
      selecao.removeAllRanges()
      selecao.addRange(range)
    }
    editorRef.current?.focus()
  }

  function comando(nome: string, valor?: string) {
    if (disabled) return
    restaurarSelecao()
    executarComando(nome, valor)
    emitir()
  }

  function aplicarAlinhamento(valor: string) {
    if (disabled) return
    if (tabelaSelecionada) {
      tabelaSelecionada.setAttribute("data-alinhamento", valor)
      tabelaSelecionada.style.marginLeft = valor === "left" ? "0" : "auto"
      tabelaSelecionada.style.marginRight = valor === "right" ? "0" : "auto"
      if (valor === "justify") {
        tabelaSelecionada.style.width = "100%"
      }
      emitir()
      return
    }
    const selecao = window.getSelection()
    let range = selecao && selecao.rangeCount > 0
      ? selecao.getRangeAt(0)
      : selecaoSalva.current
    const editor = editorRef.current
    if (!range || !editor || !editor.contains(range.commonAncestorContainer)) {
      range = selecaoSalva.current
    }
    if (!range || !editor || !editor.contains(range.commonAncestorContainer)) return

    const alvos = new Set<HTMLElement>()
    const elementoBase = range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
    const celulaAtual = elementoBase?.closest("td,th")
    if (celulaAtual instanceof HTMLElement) {
      celulaAtual.style.textAlign = valor
      celulaAtual.querySelectorAll<HTMLElement>("p,div,h1,h2,h3,h4,li").forEach((item) => {
        item.style.textAlign = valor
      })
      emitir()
      return
    }
    if (range.collapsed) {
      const bloco = elementoBase?.closest("p,div,h1,h2,h3,h4,li")
      if (bloco instanceof HTMLElement) alvos.add(bloco)
    } else {
      editor.querySelectorAll<HTMLElement>("p,div,h1,h2,h3,h4,li").forEach((el) => {
        try {
          if (range!.intersectsNode(el)) alvos.add(el)
        } catch {
          // nó fora do documento atual
        }
      })
    }
    if (alvos.size === 0 && elementoBase) {
      const bloco = elementoBase.closest("p,div,h1,h2,h3,h4,li")
      if (bloco instanceof HTMLElement) alvos.add(bloco)
    }
    for (const alvo of alvos) {
      alvo.style.textAlign = valor
    }
    emitir()
  }

  function inserirHtml(html: string) {
    if (disabled) return
    restaurarSelecao()
    executarComando("insertHTML", html)
    normalizarConteudo()
    emitir()
  }

  function normalizarImagens() {
    const raiz = editorRef.current
    if (!raiz) return
    raiz.querySelectorAll("img").forEach((img) => {
      if (img.closest(".sigi-rte-image")) return
      const wrapper = document.createElement("span")
      wrapper.className = "sigi-rte-image"
      wrapper.contentEditable = "false"
      wrapper.draggable = true
      img.parentNode?.insertBefore(wrapper, img)
      wrapper.appendChild(img)
      for (const direcao of BOTOES_HANDLE) {
        const handle = document.createElement("span")
        handle.className = `sigi-rte-handle sigi-rte-handle-${direcao}`
        handle.dataset.handle = direcao
        wrapper.appendChild(handle)
      }
    })
  }

  useImperativeHandle(ref, () => ({
    inserirHtmlNoCursor(html: string) {
      inserirHtml(html)
    },
    definirConteudo(html: string) {
      const editor = editorRef.current
      if (!editor) return
      editor.innerHTML = html
      normalizarConteudo()
      emitir()
    },
    inserirNoInicio(html: string) {
      const editor = editorRef.current
      if (!editor) return
      editor.insertAdjacentHTML("afterbegin", html)
      normalizarConteudo()
      emitir()
    },
    inserirNoFim(html: string) {
      const editor = editorRef.current
      if (!editor) return
      editor.insertAdjacentHTML("beforeend", html)
      normalizarConteudo()
      emitir()
    },
  }))

  function normalizarCampos() {
    const raiz = editorRef.current
    if (!raiz) return
    raiz.querySelectorAll<HTMLElement>("[data-campo-id]").forEach((campo) => {
      campo.classList.add("sigi-rte-campo")
      campo.contentEditable = "false"
      campo.setAttribute("contenteditable", "false")
      campo.style.cssText = ""
    })
  }

  function normalizarConteudo() {
    normalizarImagens()
    normalizarCampos()
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (value !== ultimoEmitido.current && value !== editor.innerHTML) {
      editor.innerHTML = value || ""
      normalizarConteudo()
      historico.current = [editor.innerHTML]
      indiceHistorico.current = 0
      ultimoEmitido.current = editor.innerHTML
    }
  }, [value])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    normalizarConteudo()
    historico.current = [editor.innerHTML]
    indiceHistorico.current = 0
  }, [])

  useEffect(() => {
    if (!menuCelula) return
    const fechar = () => setMenuCelula(null)
    document.addEventListener("mousedown", fechar)
    return () => document.removeEventListener("mousedown", fechar)
  }, [menuCelula])

  useLayoutEffect(() => {
    if (!menuCelula) return
    const ajustar = () => {
      const elemento = menuCelulaRef.current
      if (!elemento) return
      const margem = 8
      const retangulo = elemento.getBoundingClientRect()
      const esquerda = Math.max(margem,
        Math.min(menuCelula.x, window.innerWidth - retangulo.width - margem))
      const topo = Math.max(margem,
        Math.min(menuCelula.y, window.innerHeight - retangulo.height - margem))
      elemento.style.left = `${esquerda}px`
      elemento.style.top = `${topo}px`
    }
    ajustar()
    window.addEventListener("resize", ajustar)
    return () => window.removeEventListener("resize", ajustar)
  }, [menuCelula])

  useEffect(() => {
    const handle = editorRef.current
    if (!handle) return

    function aoClicarImagem(evento: MouseEvent) {
      const alvo = evento.target as HTMLElement
      const wrapper = alvo.closest(".sigi-rte-image")
      if (!(wrapper instanceof HTMLElement) || evento.button !== 2) return
      const img = wrapper.querySelector("img")
      if (!(img instanceof HTMLImageElement)) return
      evento.preventDefault()
      setImagemSelecionada({ wrapper, img })
      setImagemLargura(Math.round(img.getBoundingClientRect().width).toString())
      setImagemAltura(Math.round(img.getBoundingClientRect().height).toString())
    }

    function aoIniciarRedimensionamento(evento: MouseEvent) {
      const alvo = evento.target as HTMLElement
      const direcao = alvo.dataset.handle
      if (!direcao) return
      const wrapper = alvo.closest(".sigi-rte-image")
      const img = wrapper?.querySelector("img")
      if (!(wrapper instanceof HTMLElement) || !(img instanceof HTMLImageElement)) return
      const direcaoHandle = direcao
      const imgElement = img
      evento.preventDefault()
      evento.stopPropagation()
      const inicioX = evento.clientX
      const inicioY = evento.clientY
      const larguraInicial = imgElement.getBoundingClientRect().width
      const alturaInicial = imgElement.getBoundingClientRect().height
      const proporcao = larguraInicial / Math.max(1, alturaInicial)

      function mover(movimento: MouseEvent) {
        const dx = movimento.clientX - inicioX
        const dy = movimento.clientY - inicioY
        const horizontal = direcaoHandle.includes("e") ? dx : -dx
        const vertical = direcaoHandle.includes("s") ? dy : -dy
        const delta = Math.abs(horizontal) > Math.abs(vertical)
          ? horizontal
          : vertical * proporcao
        const largura = Math.max(24, Math.round(larguraInicial + delta))
        const altura = Math.max(24, Math.round(largura / proporcao))
        imgElement.style.width = `${largura}px`
        imgElement.style.height = `${altura}px`
        imgElement.setAttribute("width", String(largura))
        imgElement.setAttribute("height", String(altura))
      }
      function soltar() {
        document.removeEventListener("mousemove", mover)
        document.removeEventListener("mouseup", soltar)
        emitir()
      }
      document.addEventListener("mousemove", mover)
      document.addEventListener("mouseup", soltar)
    }

    function aoPressionarTabela(evento: MouseEvent) {
      if (evento.button !== 0) return
      const alvo = evento.target as HTMLElement
      const celula = alvo.closest("td,th") as HTMLTableCellElement | null
      if (!celula) return
      const retangulo = celula.getBoundingClientRect()
      if (evento.clientX < retangulo.right - 6) return
      const tabela = celula.closest("table") as HTMLTableElement | null
      const linha = celula.parentElement
      const primeira = tabela?.querySelector("tr")
      if (!tabela || !linha || !primeira) return
      evento.preventDefault()
      evento.stopPropagation()
      const indice = Array.from(linha.children).indexOf(celula)
      const inicioX = evento.clientX
      const larguraInicial = retangulo.width
      const larguraTabela = tabela.getBoundingClientRect().width
      const largurasIniciais = Array.from(primeira.children).map(
        (item) => item.getBoundingClientRect().width,
      )
      tabela.style.tableLayout = "fixed"
      tabela.style.width = `${larguraTabela}px`
      for (let i = 0; i < primeira.children.length; i++) {
        const item = primeira.children[i] as HTMLElement
        item.style.width = `${largurasIniciais[i]}px`
        item.setAttribute("colwidth", String(Math.round(largurasIniciais[i])))
      }
      function mover(movimento: MouseEvent) {
        const delta = movimento.clientX - inicioX
        const largura = Math.max(40, Math.round(larguraInicial + delta))
        for (const item of Array.from(tabela!.querySelectorAll("tr"))) {
          const alvoCelula = item.children[indice] as HTMLElement | undefined
          if (!alvoCelula) continue
          alvoCelula.style.width = `${largura}px`
          alvoCelula.setAttribute("colwidth", String(largura))
        }
        tabela!.style.width = `${Math.max(200, larguraTabela + delta)}px`
      }
      function soltar() {
        document.removeEventListener("mousemove", mover)
        document.removeEventListener("mouseup", soltar)
        emitir()
      }
      document.addEventListener("mousemove", mover)
      document.addEventListener("mouseup", soltar)
    }

    function aoArrastarImagem(evento: DragEvent) {
      const alvo = evento.target as HTMLElement
      const wrapper = alvo.closest(".sigi-rte-image")
      if (!(wrapper instanceof HTMLElement)) return
      if ((alvo as HTMLElement).dataset.handle) return
      imagemArrastada.current = wrapper
      evento.dataTransfer?.setData("text/plain", "")
      if (evento.dataTransfer) evento.dataTransfer.effectAllowed = "move"
    }

    function aoSobrepor(evento: DragEvent) {
      const tipos = evento.dataTransfer?.types ?? []
      if (!imagemArrastada.current
          && !Array.from(tipos).includes("text/html")) return
      evento.preventDefault()
      if (evento.dataTransfer) {
        evento.dataTransfer.dropEffect = imagemArrastada.current ? "move" : "copy"
      }
    }

    function aoSoltarImagem(evento: DragEvent) {
      const imagem = imagemArrastada.current
      if (!imagem) return
      evento.preventDefault()
      const doc = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null
        caretPositionFromPoint?: (x: number, y: number) => {
          offsetNode: Node
          offset: number
        } | null
      }
      let range = doc.caretRangeFromPoint?.(evento.clientX, evento.clientY) ?? null
      if (!range && doc.caretPositionFromPoint) {
        const posicao = doc.caretPositionFromPoint(evento.clientX, evento.clientY)
        if (posicao) {
          range = document.createRange()
          range.setStart(posicao.offsetNode, posicao.offset)
          range.collapse(true)
        }
      }
      if (!range) return
      const container = range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement
      if (container?.closest(".sigi-rte-image") === imagem) return
      range.deleteContents()
      range.insertNode(imagem)
      const selecao = window.getSelection()
      const novoRange = document.createRange()
      novoRange.setStartAfter(imagem)
      novoRange.collapse(true)
      selecao?.removeAllRanges()
      selecao?.addRange(novoRange)
      imagemArrastada.current = null
      emitir()
    }

    function aoTerminarArrasto() {
      imagemArrastada.current = null
    }

    function posicaoDoEvento(evento: DragEvent): Range | null {
      const doc = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null
        caretPositionFromPoint?: (x: number, y: number) => {
          offsetNode: Node
          offset: number
        } | null
      }
      let range = doc.caretRangeFromPoint?.(evento.clientX, evento.clientY) ?? null
      if (!range && doc.caretPositionFromPoint) {
        const posicao = doc.caretPositionFromPoint(evento.clientX, evento.clientY)
        if (posicao) {
          range = document.createRange()
          range.setStart(posicao.offsetNode, posicao.offset)
          range.collapse(true)
        }
      }
      return range
    }

    function aoPressionarForaDaTabela(evento: MouseEvent) {
      if (!tabelaSelecionada) return
      const alvo = evento.target as Node
      if (tabelaSelecionada.contains(alvo)) return
      tabelaSelecionada.classList.remove("sigi-rte-tabela-selecionada")
      setTabelaSelecionada(null)
    }

    function posicionarCaretDepois(campo: HTMLElement) {
      const selecao = window.getSelection()
      const range = document.createRange()
      range.setStartAfter(campo)
      range.collapse(true)
      selecao?.removeAllRanges()
      selecao?.addRange(range)
      editorRef.current?.focus()
    }

    function removerCampo(campo: HTMLElement) {
      const pai = campo.parentNode
      if (!pai) return
      const anterior = campo.previousSibling
      campo.remove()
      const selecao = window.getSelection()
      const range = document.createRange()
      if (anterior) {
        range.setStartAfter(anterior)
      } else if (pai.firstChild) {
        range.setStartBefore(pai.firstChild)
      } else {
        range.selectNodeContents(pai)
      }
      range.collapse(true)
      selecao?.removeAllRanges()
      selecao?.addRange(range)
      normalizarConteudo()
      emitir()
    }

    function campoVizinho(range: Range, direcao: "anterior" | "proximo"): HTMLElement | null {
      const container = range.startContainer
      const offset = range.startOffset
      let no: Node | null = null
      if (container instanceof Text) {
        if (direcao === "anterior" && offset > 0) return null
        if (direcao === "proximo" && offset < container.length) return null
        no = direcao === "anterior"
          ? container.previousSibling
          : container.nextSibling
      } else {
        no = direcao === "anterior"
          ? container.childNodes[offset - 1] ?? null
          : container.childNodes[offset] ?? null
      }
      while (no && no.nodeType === Node.TEXT_NODE && !(no.textContent ?? "").length) {
        no = direcao === "anterior" ? no.previousSibling : no.nextSibling
      }
      return no instanceof HTMLElement && no.classList.contains("sigi-rte-campo")
        ? no : null
    }

    function aoClicarCampo(evento: MouseEvent) {
      const alvo = evento.target as HTMLElement
      const campo = alvo.closest(".sigi-rte-campo")
      if (!(campo instanceof HTMLElement)) return
      evento.preventDefault()
      evento.stopPropagation()
      posicionarCaretDepois(campo)
    }

    function aoTeclarCampo(evento: KeyboardEvent) {
      if (evento.key !== "Backspace" && evento.key !== "Delete") return
      const selecao = window.getSelection()
      if (!selecao || selecao.rangeCount === 0) return
      const range = selecao.getRangeAt(0)
      if (!range.collapsed) {
        const campos: HTMLElement[] = []
        const editorAtual = editorRef.current
        editorAtual?.querySelectorAll<HTMLElement>(".sigi-rte-campo").forEach((campo) => {
          try {
            if (range.intersectsNode(campo)) campos.push(campo)
          } catch {
            // fora do documento
          }
        })
        if (campos.length > 0) {
          evento.preventDefault()
          campos.forEach((campo) => campo.remove())
          normalizarConteudo()
          emitir()
        }
        return
      }
      const campo = campoVizinho(range, evento.key === "Backspace" ? "anterior" : "proximo")
      if (!campo) return
      evento.preventDefault()
      removerCampo(campo)
    }

    function aoTeclarHistorico(evento: KeyboardEvent) {
      if (!(evento.ctrlKey || evento.metaKey)) return
      if (evento.key.toLowerCase() !== "z" && evento.key.toLowerCase() !== "y") return
      evento.preventDefault()
      if (evento.key.toLowerCase() === "y" || evento.shiftKey) refazer()
      else desfazer()
    }

    function aoSoltarConteudo(evento: DragEvent) {
      if (imagemArrastada.current) return
      const html = evento.dataTransfer?.getData("text/html")
      if (!html) return
      const range = posicaoDoEvento(evento)
      if (!range) return
      evento.preventDefault()
      range.deleteContents()
      const temporario = document.createElement("div")
      temporario.innerHTML = html
      const fragmento = document.createDocumentFragment()
      while (temporario.firstChild) fragmento.appendChild(temporario.firstChild)
      range.insertNode(fragmento)
      const selecao = window.getSelection()
      const novoRange = document.createRange()
      novoRange.setStart(range.endContainer, range.endOffset)
      novoRange.collapse(true)
      selecao?.removeAllRanges()
      selecao?.addRange(novoRange)
      normalizarConteudo()
      emitir()
    }

    function aoAbrirMenuCelula(evento: MouseEvent) {
      const alvo = evento.target as HTMLElement
      if (alvo.closest(".sigi-rte-image")) return
      const celula = alvo.closest("td,th")
      if (!(celula instanceof HTMLTableCellElement)) return
      evento.preventDefault()
      evento.stopPropagation()
      const tabela = celula.closest("table")
      if (tabela instanceof HTMLTableElement) {
        setTabelaAtual({ tabela, celula })
      }
      setMenuCelula({ x: evento.clientX, y: evento.clientY, celula })
    }

    handle.addEventListener("contextmenu", aoClicarImagem)
    handle.addEventListener("mousedown", aoIniciarRedimensionamento)
    handle.addEventListener("mousedown", aoPressionarTabela)
    handle.addEventListener("dragstart", aoArrastarImagem)
    handle.addEventListener("dragover", aoSobrepor)
    handle.addEventListener("drop", aoSoltarImagem)
    handle.addEventListener("dragend", aoTerminarArrasto)
    handle.addEventListener("drop", aoSoltarConteudo)
    handle.addEventListener("contextmenu", aoAbrirMenuCelula)
    handle.addEventListener("keydown", aoTeclarHistorico)
    handle.addEventListener("mousedown", aoPressionarForaDaTabela)
    handle.addEventListener("mousedown", aoClicarCampo)
    handle.addEventListener("keydown", aoTeclarCampo)
    return () => {
      handle.removeEventListener("contextmenu", aoClicarImagem)
      handle.removeEventListener("mousedown", aoIniciarRedimensionamento)
      handle.removeEventListener("mousedown", aoPressionarTabela)
      handle.removeEventListener("dragstart", aoArrastarImagem)
      handle.removeEventListener("dragover", aoSobrepor)
      handle.removeEventListener("drop", aoSoltarImagem)
      handle.removeEventListener("dragend", aoTerminarArrasto)
      handle.removeEventListener("drop", aoSoltarConteudo)
      handle.removeEventListener("contextmenu", aoAbrirMenuCelula)
      handle.removeEventListener("keydown", aoTeclarHistorico)
      handle.removeEventListener("mousedown", aoPressionarForaDaTabela)
      handle.removeEventListener("mousedown", aoClicarCampo)
      handle.removeEventListener("keydown", aoTeclarCampo)
    }
  })

  function inserirImagem(arquivo: File) {
    if (!arquivo.type.startsWith("image/")) return
    const leitor = new FileReader()
    leitor.onload = () => {
      const src = String(leitor.result ?? "")
      inserirHtml(
        `<span class="sigi-rte-image" contenteditable="false" draggable="true"><img src="${src}" alt="">` +
        BOTOES_HANDLE.map((direcao) =>
          `<span class="sigi-rte-handle sigi-rte-handle-${direcao}" data-handle="${direcao}"></span>`,
        ).join("") + "</span>",
      )
    }
    leitor.readAsDataURL(arquivo)
  }

  function aplicarDimensoesImagem() {
    if (!imagemSelecionada) return
    const largura = Number(imagemLargura)
    const altura = Number(imagemAltura)
    if (largura > 0) {
      imagemSelecionada.img.style.width = `${largura}px`
      imagemSelecionada.img.setAttribute("width", String(largura))
    } else {
      imagemSelecionada.img.style.width = ""
      imagemSelecionada.img.removeAttribute("width")
    }
    if (altura > 0) {
      imagemSelecionada.img.style.height = `${altura}px`
      imagemSelecionada.img.setAttribute("height", String(altura))
    } else {
      imagemSelecionada.img.style.height = ""
      imagemSelecionada.img.removeAttribute("height")
    }
    setImagemSelecionada(null)
    emitir()
  }

  function inserirVideo() {
    const url = window.prompt("URL do vídeo (YouTube ou Vimeo)", "https://www.youtube.com/watch?v=")
    if (!url) return
    const youtube = youtubeId(url)
    const vimeo = vimeoId(url)
    const urlSegura = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    if (youtube) {
      inserirHtml(`<div class="sigi-rte-video" contenteditable="false" data-video-provider="youtube" data-video-url="${urlSegura}"><iframe src="https://www.youtube.com/embed/${youtube}" allowfullscreen></iframe></div>`)
      return
    }
    if (vimeo) {
      inserirHtml(`<div class="sigi-rte-video" contenteditable="false" data-video-provider="vimeo" data-video-url="${urlSegura}"><iframe src="https://player.vimeo.com/video/${vimeo}" allowfullscreen></iframe></div>`)
      return
    }
    window.alert("Informe uma URL válida do YouTube ou Vimeo.")
  }

  function abrirTabela() {
    salvarSelecao()
    const selecao = window.getSelection()
    const no = selecao?.anchorNode
    const elemento = no instanceof Element ? no : no?.parentElement
    const tabela = elemento?.closest("table") as HTMLTableElement | null
    const celula = elemento?.closest("td,th") as HTMLTableCellElement | null
    setTabelaAtual(tabela ? { tabela, celula } : null)
    setTabelaAberta(true)
  }

  function aplicarBordas(tabela: HTMLTableElement) {
    const estilo = bordaEstilo === "none" ? "none" : `${bordaLargura}px ${bordaEstilo} ${bordaCor}`
    tabela.style.borderCollapse = "collapse"
    for (const celula of dividirAtributos(tabela)) {
      if (celula instanceof HTMLElement) celula.style.border = estilo
    }
  }

  function inserirTabela() {
    const qtdLinhas = Math.max(1, Math.min(30, Number(linhas) || 1))
    const qtdColunas = Math.max(1, Math.min(12, Number(colunas) || 1))
    const borda = bordaEstilo === "none"
      ? "none"
      : `${bordaLargura}px ${bordaEstilo} ${bordaCor}`
    const estiloBase = `border:${borda};padding:6px 8px;`
    const linhasHtml = Array.from({ length: qtdLinhas }, (_, indiceLinha) => {
      const tag = cabecalho && indiceLinha === 0 ? "th" : "td"
      const estilo = cabecalho && indiceLinha === 0
        ? `${estiloBase}background-color:#e2e8f0;color:#0f172a;font-weight:600;`
        : estiloBase
      return `<tr>${Array.from({ length: qtdColunas }, () => `<${tag} contenteditable="true" style="${estilo}"><br></${tag}>`).join("")}</tr>`
    }).join("")
    const html = `<table class="sigi-rte-table" style="border-collapse:collapse;width:100%;table-layout:auto" data-border-style="${bordaEstilo}" data-border-color="${bordaCor}" data-border-width="${bordaLargura}"><tbody>${linhasHtml}</tbody></table><p><br></p>`
    inserirHtml(html)
    setTabelaAberta(false)
  }

  function adicionarLinha(depois: boolean) {
    const celula = tabelaAtual?.celula
    const linha = celula?.parentElement
    if (!linha) return
    const nova = document.createElement("tr")
    const total = linha.children.length
    for (let i = 0; i < total; i++) {
      const novaCelula = document.createElement("td")
      novaCelula.innerHTML = "<br>"
      nova.appendChild(novaCelula)
    }
    linha.parentElement?.insertBefore(nova, depois ? linha.nextSibling : linha)
    aplicarBordas(tabelaAtual!.tabela)
    setTabelaAberta(false)
    emitir()
  }

  function adicionarColuna(depois: boolean) {
    const celula = tabelaAtual?.celula
    if (!celula || !tabelaAtual) return
    const indice = Array.from(celula.parentElement?.children ?? []).indexOf(celula)
    for (const linha of Array.from(tabelaAtual.tabela.querySelectorAll("tr"))) {
      const referencia = linha.children[indice]
      const nova = document.createElement(referencia?.tagName.toLowerCase() === "th" ? "th" : "td")
      nova.innerHTML = "<br>"
      linha.insertBefore(nova, depois ? referencia?.nextSibling ?? null : referencia ?? null)
    }
    aplicarBordas(tabelaAtual.tabela)
    setTabelaAberta(false)
    emitir()
  }

  function removerLinha() {
    const linha = tabelaAtual?.celula?.parentElement
    if (!linha || !tabelaAtual) return
    if (tabelaAtual.tabela.querySelectorAll("tr").length <= 1) return
    linha.remove()
    setTabelaAberta(false)
    emitir()
  }

  function removerColuna() {
    const celula = tabelaAtual?.celula
    if (!celula || !tabelaAtual) return
    const indice = Array.from(celula.parentElement?.children ?? []).indexOf(celula)
    const linhas = Array.from(tabelaAtual.tabela.querySelectorAll("tr"))
    if ((linhas[0]?.children.length ?? 0) <= 1) return
    for (const linha of linhas) linha.children[indice]?.remove()
    setTabelaAberta(false)
    emitir()
  }

  function alternarCabecalho() {
    const tabela = tabelaAtual?.tabela
    if (!tabela) return
    const primeira = tabela.querySelector("tr")
    if (!primeira) return
    for (const celula of Array.from(primeira.children)) {
      const virarCabecalho = celula.tagName.toLowerCase() !== "th"
      const nova = document.createElement(virarCabecalho ? "th" : "td")
      nova.innerHTML = celula.innerHTML
      nova.style.cssText = (celula as HTMLElement).style.cssText
      if (virarCabecalho) {
        nova.style.backgroundColor = "#e2e8f0"
        nova.style.color = "#0f172a"
        nova.style.fontWeight = "600"
      } else {
        nova.style.backgroundColor = ""
        nova.style.color = ""
        nova.style.fontWeight = ""
      }
      celula.replaceWith(nova)
    }
    setTabelaAberta(false)
    emitir()
  }

  function aplicarCorCelula() {
    const celula = tabelaAtual?.celula
    if (!celula) return
    celula.style.backgroundColor = corCelula
    emitir()
  }

  function aplicarAlinhamentoVertical() {
    const celula = tabelaAtual?.celula
    if (!celula) return
    alinharVerticalCelula(celula, alinhamentoVertical)
  }

  function aplicarPosicaoTabela() {
    const tabela = tabelaAtual?.tabela
    if (!tabela) return
    const largura = Number(larguraTabela)
    if (largura > 0) {
      tabela.style.width = `${Math.min(100, Math.max(20, largura))}%`
    }
    posicionarTabela(tabela, alinhamentoTabela)
  }

  function selecionarTabela(tabela: HTMLTableElement) {
    document.querySelectorAll(".sigi-rte-tabela-selecionada")
      .forEach((item) => item.classList.remove("sigi-rte-tabela-selecionada"))
    tabela.classList.add("sigi-rte-tabela-selecionada")
    setTabelaSelecionada(tabela)
    setTabelaAberta(false)
  }

  function moverTabela(direcao: -1 | 1) {
    const tabela = tabelaAtual?.tabela
    if (!tabela) return
    const irmao = direcao < 0 ? tabela.previousElementSibling : tabela.nextElementSibling
    if (irmao) {
      if (direcao < 0) irmao.before(tabela)
      else irmao.after(tabela)
    } else if (direcao > 0) {
      tabela.parentElement?.appendChild(tabela)
    }
    emitir()
  }

  function alinharConteudoCelula(celula: HTMLTableCellElement, valor: string) {
    celula.style.textAlign = valor
    celula.querySelectorAll<HTMLElement>("p,div,h1,h2,h3,h4,li").forEach((item) => {
      item.style.textAlign = valor
    })
    emitir()
  }

  function alinharVerticalCelula(celula: HTMLTableCellElement, valor: string) {
    celula.style.verticalAlign = valor
    emitir()
  }

  function posicionarTabela(tabela: HTMLTableElement, valor: string) {
    tabela.setAttribute("data-alinhamento", valor)
    tabela.style.marginLeft = valor === "left" ? "0" : "auto"
    tabela.style.marginRight = valor === "right" ? "0" : "auto"
    if (valor === "justify") tabela.style.width = "100%"
    emitir()
  }

  function excluirTabela(tabela: HTMLTableElement) {
    tabela.remove()
    setTabelaSelecionada(null)
    setTabelaAtual(null)
    setMenuCelula(null)
    emitir()
  }

  function aplicarAlinhamentoHorizontal() {
    const celula = tabelaAtual?.celula
    if (!celula) return
    alinharConteudoCelula(celula, alinhamentoHorizontal)
  }

  function aplicarAlturaLinha() {
    const linha = tabelaAtual?.celula?.parentElement
    const valor = Number(alturaLinha)
    if (!linha || !(valor > 0)) return
    linha.style.height = `${valor}px`
    emitir()
  }

  function aplicarLarguraColuna() {
    const celula = tabelaAtual?.celula
    const tabela = tabelaAtual?.tabela
    const valor = Number(larguraColuna)
    if (!celula || !tabela || !(valor > 0)) return
    const linha = celula.parentElement
    if (!linha) return
    const indice = Array.from(linha.children).indexOf(celula)
    const larguraAtual = celula.getBoundingClientRect().width
    const delta = valor - larguraAtual
    const larguraTabela = tabela.getBoundingClientRect().width
    tabela.style.tableLayout = "fixed"
    tabela.style.width = `${Math.max(200, larguraTabela + delta)}px`
    for (const item of Array.from(tabela.querySelectorAll("tr"))) {
      const alvoCelula = item.children[indice] as HTMLElement | undefined
      if (!alvoCelula) continue
      alvoCelula.style.width = `${valor}px`
      alvoCelula.setAttribute("colwidth", String(Math.round(valor)))
    }
    emitir()
  }

  return (
    <div className={["sigi-rte", disabled ? "sigi-rte-disabled" : "", className ?? ""].join(" ")}>
      <div className="sigi-rte-toolbar">
        {iconeBotao("Desfazer", desfazer, <Undo2 size={16} />, disabled)}
        {iconeBotao("Refazer", refazer, <Redo2 size={16} />, disabled)}
        <span className="sigi-rte-sep" />
        <select
          className="sigi-rte-select"
          aria-label="Estilo do parágrafo"
          disabled={disabled}
          onChange={(evento) => comando("formatBlock", evento.target.value)}
          defaultValue="p"
        >
          <option value="p">Parágrafo</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
          <option value="h4">Título 4</option>
        </select>
        <span className="sigi-rte-sep" />
        {iconeBotao("Negrito", () => comando("bold"), <Bold size={16} />, disabled)}
        {iconeBotao("Itálico", () => comando("italic"), <Italic size={16} />, disabled)}
        {iconeBotao("Sublinhado", () => comando("underline"), <Underline size={16} />, disabled)}
        {iconeBotao("Riscado", () => comando("strikeThrough"), <Strikethrough size={16} />, disabled)}
        {iconeBotao("Alinhar à esquerda", () => aplicarAlinhamento("left"), <AlignLeft size={16} />, disabled)}
        {iconeBotao("Centralizar", () => aplicarAlinhamento("center"), <AlignCenter size={16} />, disabled)}
        {iconeBotao("Alinhar à direita", () => aplicarAlinhamento("right"), <AlignRight size={16} />, disabled)}
        {iconeBotao("Justificar", () => aplicarAlinhamento("justify"), <AlignJustify size={16} />, disabled)}
        <span className="sigi-rte-sep" />
        {iconeBotao("Lista com marcadores", () => comando("insertUnorderedList"), <List size={16} />, disabled)}
        {iconeBotao("Lista numerada", () => comando("insertOrderedList"), <ListOrdered size={16} />, disabled)}
        {iconeBotao("Citação", () => comando("formatBlock", "blockquote"), <Quote size={16} />, disabled)}
        {iconeBotao("Link", () => {
          const url = window.prompt("Endereço do link", "https://")
          if (url) comando("createLink", url)
        }, <Link2 size={16} />, disabled)}
        {iconeBotao("Remover link", () => comando("unlink"), <span className="sigi-rte-texto-btn">unlink</span>, disabled)}
        <span className="sigi-rte-sep" />
        <label className="sigi-rte-cor" title="Cor do texto">
          <Palette size={16} />
          <input
            type="color"
            disabled={disabled}
            onChange={(evento) => comando("foreColor", evento.target.value)}
          />
        </label>
        <label className="sigi-rte-cor" title="Cor de destaque">
          <Highlighter size={16} />
          <input
            type="color"
            disabled={disabled}
            defaultValue="#fef08a"
            onChange={(evento) => comando("hiliteColor", evento.target.value)}
          />
        </label>
        {iconeBotao("Limpar formatação", () => comando("removeFormat"), <RemoveFormatting size={16} />, disabled)}
        {iconeBotao("Inserir imagem", () => inputImagem.current?.click(), <ImagePlus size={16} />, disabled)}
        <input
          ref={inputImagem}
          type="file"
          accept="image/*"
          hidden
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0]
            evento.target.value = ""
            if (arquivo) {
              salvarSelecao()
              inserirImagem(arquivo)
            }
          }}
        />
        {iconeBotao("Inserir vídeo", inserirVideo, <Video size={16} />, disabled)}
        {iconeBotao("Tabela", abrirTabela, <Table2 size={16} />, disabled)}
      </div>

      <div
        ref={editorRef}
        className="sigi-rte-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => {
          normalizarConteudo()
          emitir()
        }}
        onBlur={emitir}
        onKeyUp={salvarSelecao}
        onMouseUp={salvarSelecao}
      />

      {menuCelula ? (
        (() => {
          const tabela = menuCelula.celula.closest("table")
          return (
            <div
              ref={menuCelulaRef}
              className="sigi-rte-cell-menu"
              style={{ left: menuCelula.x, top: menuCelula.y }}
              onMouseDown={(evento) => evento.stopPropagation()}
            >
              <div className="sigi-rte-cell-menu-secao">
                <div className="sigi-rte-cell-menu-titulo">Célula</div>
                <div className="sigi-rte-cell-menu-grid">
                  <label>
                    Fundo
                    <input
                      type="color"
                      value={menuCelula.celula.style.backgroundColor || "#ffffff"}
                      onChange={(evento) => {
                        menuCelula.celula.style.backgroundColor = evento.target.value
                        emitir()
                      }}
                    />
                  </label>
                  <label>
                    Fonte
                    <input
                      type="color"
                      defaultValue="#0f172a"
                      onChange={(evento) => {
                        const cor = evento.target.value
                        menuCelula.celula.style.color = cor
                        menuCelula.celula.querySelectorAll<HTMLElement>("*").forEach((item) => {
                          item.style.color = cor
                        })
                        emitir()
                      }}
                    />
                  </label>
                </div>
                <div className="sigi-rte-cell-menu-rotulo">Alinhamento horizontal</div>
                <div className="sigi-rte-cell-menu-linha">
                  <button type="button" onClick={() => alinharConteudoCelula(menuCelula.celula, "left")}>Esq.</button>
                  <button type="button" onClick={() => alinharConteudoCelula(menuCelula.celula, "center")}>Centro</button>
                  <button type="button" onClick={() => alinharConteudoCelula(menuCelula.celula, "right")}>Dir.</button>
                  <button type="button" onClick={() => alinharConteudoCelula(menuCelula.celula, "justify")}>Justif.</button>
                </div>
                <div className="sigi-rte-cell-menu-grid">
                  <label>
                    Vertical
                    <select
                      defaultValue={menuCelula.celula.style.verticalAlign || "top"}
                      onChange={(evento) => alinharVerticalCelula(menuCelula.celula, evento.target.value)}
                    >
                      <option value="top">Topo</option>
                      <option value="middle">Meio</option>
                      <option value="bottom">Baixo</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="sigi-rte-cell-menu-negrito"
                    onClick={() => {
                      menuCelula.celula.style.fontWeight =
                        menuCelula.celula.style.fontWeight === "bold" ? "" : "bold"
                      emitir()
                    }}
                  >
                    Negrito
                  </button>
                </div>
              </div>

              <div className="sigi-rte-cell-menu-secao">
                <div className="sigi-rte-cell-menu-titulo">Linhas e colunas</div>
                <div className="sigi-rte-cell-menu-grid">
                  <button type="button" onClick={() => { adicionarLinha(false); setMenuCelula(null) }}>Linha acima</button>
                  <button type="button" onClick={() => { adicionarLinha(true); setMenuCelula(null) }}>Linha abaixo</button>
                  <button type="button" onClick={() => { adicionarColuna(false); setMenuCelula(null) }}>Coluna esquerda</button>
                  <button type="button" onClick={() => { adicionarColuna(true); setMenuCelula(null) }}>Coluna direita</button>
                  <button type="button" className="sigi-rte-cell-menu-perigo" onClick={() => { removerLinha(); setMenuCelula(null) }}>Remover linha</button>
                  <button type="button" className="sigi-rte-cell-menu-perigo" onClick={() => { removerColuna(); setMenuCelula(null) }}>Remover coluna</button>
                </div>
              </div>

              <div className="sigi-rte-cell-menu-secao">
                <div className="sigi-rte-cell-menu-titulo">Tabela</div>
                <div className="sigi-rte-cell-menu-rotulo">Posição</div>
                <div className="sigi-rte-cell-menu-linha">
                  <button type="button" onClick={() => tabela instanceof HTMLTableElement && posicionarTabela(tabela, "left")}>Esq.</button>
                  <button type="button" onClick={() => tabela instanceof HTMLTableElement && posicionarTabela(tabela, "center")}>Centro</button>
                  <button type="button" onClick={() => tabela instanceof HTMLTableElement && posicionarTabela(tabela, "right")}>Dir.</button>
                </div>
                <button
                  type="button"
                  className="sigi-rte-cell-menu-acao"
                  onClick={() => tabela instanceof HTMLTableElement && selecionarTabela(tabela)}
                >
                  Selecionar tabela
                </button>
                <button
                  type="button"
                  className="sigi-rte-cell-menu-acao sigi-rte-cell-menu-perigo"
                  onClick={() => tabela instanceof HTMLTableElement && excluirTabela(tabela)}
                >
                  Excluir tabela
                </button>
              </div>

              <button type="button" className="sigi-rte-cell-menu-fechar" onClick={() => setMenuCelula(null)}>
                Fechar
              </button>
            </div>
          )
        })()
      ) : null}

      {imagemSelecionada ? (
        <div className="sigi-rte-modal-backdrop" onClick={() => setImagemSelecionada(null)}>
          <div className="sigi-rte-modal" onClick={(evento) => evento.stopPropagation()}>
            <h3>Dimensões da imagem</h3>
            <div className="sigi-rte-modal-grid">
              <label>
                Largura (px)
                <input value={imagemLargura} onChange={(e) => setImagemLargura(e.target.value)} type="number" min={1} />
              </label>
              <label>
                Altura (px)
                <input value={imagemAltura} onChange={(e) => setImagemAltura(e.target.value)} type="number" min={1} />
              </label>
            </div>
            <div className="sigi-rte-modal-acoes">
              <button type="button" className="sigi-rte-btn-texto" onClick={() => setImagemSelecionada(null)}>Cancelar</button>
              <button type="button" className="sigi-rte-btn-primario" onClick={aplicarDimensoesImagem}>Aplicar</button>
            </div>
          </div>
        </div>
      ) : null}

      {tabelaAberta ? (
        <div className="sigi-rte-modal-backdrop" onClick={() => setTabelaAberta(false)}>
          <div className="sigi-rte-modal sigi-rte-modal-larga" onClick={(evento) => evento.stopPropagation()}>
            <h3>{tabelaAtual ? "Configurar tabela" : "Inserir tabela"}</h3>
            {!tabelaAtual ? (
              <div className="sigi-rte-modal-grid">
                <label>Linhas<input type="number" min={1} max={30} value={linhas} onChange={(e) => setLinhas(e.target.value)} /></label>
                <label>Colunas<input type="number" min={1} max={12} value={colunas} onChange={(e) => setColunas(e.target.value)} /></label>
                <label className="sigi-rte-check"><input type="checkbox" checked={cabecalho} onChange={(e) => setCabecalho(e.target.checked)} /> Linha de cabeçalho</label>
                <label>Borda
                  <select value={bordaEstilo} onChange={(e) => setBordaEstilo(e.target.value)}>
                    <option value="solid">Sólida</option>
                    <option value="dashed">Tracejada</option>
                    <option value="dotted">Pontilhada</option>
                    <option value="none">Sem borda</option>
                  </select>
                </label>
                <label>Cor da borda<input type="color" value={bordaCor} onChange={(e) => setBordaCor(e.target.value)} /></label>
                <label>Largura (px)<input type="number" min={1} max={12} value={bordaLargura} onChange={(e) => setBordaLargura(e.target.value)} /></label>
              </div>
            ) : (
              <div className="sigi-rte-tabela-acoes">
                <div className="sigi-rte-grupo-acoes">
                  <button type="button" onClick={() => adicionarLinha(true)}><Rows3 size={16} /> Linha abaixo</button>
                  <button type="button" onClick={() => adicionarLinha(false)}><Rows3 size={16} /> Linha acima</button>
                  <button type="button" onClick={removerLinha}><Trash2 size={16} /> Remover linha</button>
                  <button type="button" onClick={() => adicionarColuna(true)}><Columns3 size={16} /> Coluna à direita</button>
                  <button type="button" onClick={() => adicionarColuna(false)}><Columns3 size={16} /> Coluna à esquerda</button>
                  <button type="button" onClick={removerColuna}><Trash2 size={16} /> Remover coluna</button>
                  <button type="button" onClick={alternarCabecalho}><Settings2 size={16} /> Alternar cabeçalho</button>
                </div>
                <div className="sigi-rte-modal-grid">
                  <label>Borda
                    <select value={bordaEstilo} onChange={(e) => setBordaEstilo(e.target.value)}>
                      <option value="solid">Sólida</option>
                      <option value="dashed">Tracejada</option>
                      <option value="dotted">Pontilhada</option>
                      <option value="none">Sem borda</option>
                    </select>
                  </label>
                  <label>Cor<input type="color" value={bordaCor} onChange={(e) => setBordaCor(e.target.value)} /></label>
                  <label>Largura<input type="number" min={1} max={12} value={bordaLargura} onChange={(e) => setBordaLargura(e.target.value)} /></label>
                  <label>Cor da célula<input type="color" value={corCelula} onChange={(e) => setCorCelula(e.target.value)} /></label>
                  <label>Alinhamento vertical
                    <select value={alinhamentoVertical} onChange={(e) => setAlinhamentoVertical(e.target.value)}>
                      <option value="top">Topo</option>
                      <option value="middle">Meio</option>
                      <option value="bottom">Baixo</option>
                    </select>
                  </label>
                  <label>Alinhamento horizontal
                    <select value={alinhamentoHorizontal} onChange={(e) => setAlinhamentoHorizontal(e.target.value)}>
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </label>
                  <label>Altura da linha (px)
                    <input type="number" min={1} placeholder="Automática" value={alturaLinha} onChange={(e) => setAlturaLinha(e.target.value)} />
                  </label>
                  <label>Largura da coluna (px)
                    <input type="number" min={1} placeholder="Atual" value={larguraColuna} onChange={(e) => setLarguraColuna(e.target.value)} />
                  </label>
                  <label>Posição da tabela
                    <select value={alinhamentoTabela} onChange={(e) => setAlinhamentoTabela(e.target.value)}>
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </label>
                  <label>Largura da tabela (%)
                    <input type="number" min={20} max={100} placeholder="100" value={larguraTabela} onChange={(e) => setLarguraTabela(e.target.value)} />
                  </label>
                </div>
                <div className="sigi-rte-modal-acoes">
                  <button type="button" onClick={() => tabelaAtual && selecionarTabela(tabelaAtual.tabela)}>Selecionar tabela</button>
                  <button type="button" onClick={() => tabelaAtual && aplicarBordas(tabelaAtual.tabela)}>Aplicar bordas</button>
                  <button type="button" onClick={aplicarCorCelula}>Aplicar cor da célula</button>
                  <button type="button" onClick={aplicarAlinhamentoVertical}>Aplicar vertical</button>
                  <button type="button" onClick={aplicarAlinhamentoHorizontal}>Aplicar horizontal</button>
                  <button type="button" onClick={aplicarAlturaLinha}>Aplicar altura</button>
                  <button type="button" onClick={aplicarLarguraColuna}>Aplicar largura</button>
                  <button type="button" onClick={aplicarPosicaoTabela}>Aplicar posição</button>
                  <button type="button" onClick={() => moverTabela(-1)}>Mover para cima</button>
                  <button type="button" onClick={() => moverTabela(1)}>Mover para baixo</button>
                </div>
              </div>
            )}
            <div className="sigi-rte-modal-acoes">
              <button type="button" className="sigi-rte-btn-texto" onClick={() => setTabelaAberta(false)}>Cancelar</button>
              {!tabelaAtual ? (
                <button type="button" className="sigi-rte-btn-primario" onClick={inserirTabela}>Inserir tabela</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
})
