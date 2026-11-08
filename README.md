# @v1ct0rbr/vq-rich-text

Editor rich text baseado em `contentEditable`, com lógica própria para:

- formatação de texto e alinhamento;
- imagens com redimensionamento pelos cantos e por diálogo;
- vídeos embarcados do YouTube e Vimeo;
- tabelas com cabeçalho, bordas personalizáveis, cores de células e alinhamentos.

## Instalação (GitHub Packages)

Este pacote é publicado no registry npm do GitHub Packages. Crie um token
pessoal (classic) com os escopos `read:packages` e `write:packages` e exporte:

```bash
export NODE_AUTH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

No projeto consumidor, adicione um `.npmrc`:

```ini
@v1ct0rbr:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

E instale:

```bash
npm install @v1ct0rbr/vq-rich-text
```

## Uso

```tsx
import { VqRichText } from "@v1ct0rbr/vq-rich-text"
import "@v1ct0rbr/vq-rich-text/styles.css"

<VqRichText value={html} onChange={setHtml} />
```

## Publicação

```bash
export NODE_AUTH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npm version patch
npm publish
```

O script `prepublishOnly` gera o `dist` automaticamente antes do publish.

## Playground

Para testar o componente localmente sem importá-lo em outro projeto:

```bash
npm install
npm run dev
```

O playground abre em `http://localhost:5173` e consome o código-fonte em
`src/`, permitindo testar a toolbar, as ações de ref e visualizar o HTML gerado.

## Props

| Prop | Tipo | Descrição |
| --- | --- | --- |
| `value` | `string` | HTML atual do editor. |
| `onChange` | `(html: string) => void` | Disparado a cada alteração. |
| `disabled` | `boolean` | Desabilita o editor. |
| `className` | `string` | Classes adicionais do container. |
| `placeholder` | `string` | Texto exibido quando vazio. |

## Ref

O componente expõe `VqRichTextHandle` com os métodos:

- `inserirHtmlNoCursor(html: string)`
- `definirConteudo(html: string)`
- `inserirNoInicio(html: string)`
- `inserirNoFim(html: string)`
