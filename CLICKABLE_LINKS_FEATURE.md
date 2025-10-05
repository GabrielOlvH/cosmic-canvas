# 🔗 Funcionalidade de Links Clicáveis nos Artigos

## 📋 Resumo

Implementada funcionalidade que torna os títulos dos artigos no mapa mental **clicáveis**, permitindo abrir o artigo original em uma nova aba do navegador.

## ✨ Como Funciona

### 1. Detecção de Cliques
- Usa o event system do tldraw para detectar cliques em shapes
- Identifica se o nó clicado é um **estudo (level 2)** no mapa mental
- Verifica se o artigo tem URL disponível nos metadados

### 2. Abertura de Links
Quando você clica em um nó de estudo com link:
- O link abre em **nova aba** do navegador
- Usa `window.open()` com flags de segurança (`noopener`, `noreferrer`)
- Exibe mensagem no console: `🔗 Opening article: [título] [url]`

### 3. Indicação Visual
Os nós de estudos (level 2) agora mostram:
```
Título do Artigo
Autores et al. (2024)

🔗 Click to open article
```

A linha `🔗 Click to open article` só aparece quando há URL disponível.

## 🎯 Prioridade de URLs

Os links seguem esta ordem de prioridade:
1. **PMC URL** (preferido) - Ex: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6747492/`
2. **DOI URL** (fallback) - Ex: `https://doi.org/10.1186/s12870-017-0975-x`

## 🔧 Implementação Técnica

### Arquivos Modificados

#### 1. `src/components/MindMapGenerator.tsx`
```typescript
// Event handler para detectar cliques
useEffect(() => {
  if (!editor) return

  const handleShapeClick = () => {
    const selectedShapes = editor.getSelectedShapes()
    if (selectedShapes.length !== 1) return

    const shape = selectedShapes[0]
    const shapeId = shape.id

    // Buscar nó correspondente na árvore de dados
    const clickedNode = findNodeById(data, shapeId)
    
    // Se é estudo (level 2) com URL, abrir link
    if (clickedNode?.level === 2 && clickedNode.metadata?.url) {
      window.open(clickedNode.metadata.url, '_blank', 'noopener,noreferrer')
    }
  }

  editor.on('event', (event) => {
    if (event.type === 'pointer' && event.name === 'pointer_up') {
      setTimeout(handleShapeClick, 50)
    }
  })
}, [editor, data])
```

#### 2. `src/lib/research-assistant.ts`
Corrigido para **preservar todos os metadados** ao converter documentos:
```typescript
const mainDocuments: DocumentNode[] = searchResult.documents.map(doc => ({
  id: doc.metadata.source,
  content: doc.content,
  metadata: {
    source: doc.metadata.source,
    title: doc.metadata.title || doc.metadata.source,
    type: doc.metadata.type || 'document',
    timestamp: doc.metadata.timestamp || Date.now(),
    authors: doc.metadata.authors,    // ADICIONADO
    doi: doc.metadata.doi,            // ADICIONADO
    year: doc.metadata.year,          // ADICIONADO
    journal: doc.metadata.journal,    // ADICIONADO
    url: doc.metadata.url,            // ADICIONADO
  },
  similarity: doc.similarity,
}))
```

#### 3. `src/lib/exhaustive-search.ts`
Atualizado tipo de interface:
```typescript
export interface ExhaustiveSearchResult {
  documents: Array<{
    content: string
    metadata: DocumentMetadata  // Era 'any', agora tipado corretamente
    similarity: number
  }>
  // ...
}
```

#### 4. `src/lib/document-indexer.ts`
Adicionado tipo de retorno explícito:
```typescript
async search(query: string, k = 5): Promise<Array<{
  content: string
  metadata: DocumentMetadata
  score: number
  similarity: number
}>>
```

#### 5. `src/styles.css`
```css
/* Mind Map - Clickable study nodes */
.tl-shape[data-clickable="true"] {
  cursor: pointer !important;
}

.tl-shape[data-clickable="true"]:hover {
  filter: brightness(1.1);
  transition: filter 0.2s ease;
}
```

## 🧪 Como Testar

1. **Iniciar o servidor**:
   ```bash
   npm run dev
   ```

2. **Acessar a página de pesquisa**:
   ```
   http://localhost:3000/research
   ```

3. **Gerar um mapa mental**:
   - Digite uma pergunta de pesquisa
   - Aguarde a geração do mapa
   - Procure por nós de estudos (retângulos médios com padrão azul-claro)

4. **Clicar em um estudo**:
   - Clique uma vez no nó para selecioná-lo
   - Se houver URL, o link abrirá automaticamente
   - Verifique se a aba abre com o artigo no PMC ou DOI

## 📊 Exemplo de Nó Clicável

```
╔════════════════════════════════════════════╗
║ Mice Exposed to Combined Chronic Low-     ║
║ Dose Irradiation and Modeled              ║
║ Microgravity Develop Long-Term            ║
║ Neurological Sequelae                     ║
║                                            ║
║ Smith J, et al. (2019)                     ║
║                                            ║
║ 🔗 Click to open article                   ║
╚════════════════════════════════════════════╝
   ↓ Clique aqui abre:
   https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6747492/
```

## 🐛 Troubleshooting

### Problema: Link não abre ao clicar
**Solução**: 
- Verifique se o nó tem o texto `🔗 Click to open article`
- Confirme que os metadados foram indexados (re-indexe se necessário)
- Verifique o console do navegador para mensagens de erro

### Problema: Abre link errado
**Solução**:
- Verifique se o CSV de PMC links está correto
- Confirme que o título do PDF foi extraído corretamente
- Re-indexe com `npm run index-all -- --force`

### Problema: Nenhum nó é clicável
**Solução**:
- Verifique se o CSV de PMC links foi carregado: "✓ Loaded 601 PMC links from CSV"
- Confirme que a re-indexação foi completa
- Verifique se há URLs nos metadados (console.log do documento)

## 📈 Estatísticas

- **588 documentos** indexados
- **601 links PMC** disponíveis no CSV
- **~102% cobertura** (alguns artigos têm múltiplos links)
- **Prioridade PMC**: Links PMC são preferidos sobre DOI

## 🔜 Melhorias Futuras

### 1. Indicação Visual Melhorada
- [ ] Adicionar cursor pointer customizado
- [ ] Highlight ao passar o mouse
- [ ] Badge visual diferente para PMC vs DOI
- [ ] Tooltip mostrando URL completo

### 2. Funcionalidades Adicionais
- [ ] Botão de copiar link
- [ ] Abrir em leitor de PDF integrado
- [ ] Preview do artigo em modal
- [ ] Histórico de artigos visitados

### 3. Analytics
- [ ] Rastrear quais artigos são mais clicados
- [ ] Tempo de permanência no artigo
- [ ] Taxa de retorno após leitura

### 4. Atalhos de Teclado
- [ ] `Ctrl/Cmd + Click` = Abrir em aba inativa
- [ ] `Shift + Click` = Copiar URL
- [ ] `Alt + Click` = Abrir em janela

## 📝 Notas Importantes

1. **Segurança**: Usamos `noopener` e `noreferrer` para prevenir ataques de [tabnabbing](https://owasp.org/www-community/attacks/Reverse_Tabnabbing)

2. **Performance**: Event listener usa pequeno delay (50ms) para garantir que a seleção do tldraw seja atualizada antes de processar o clique

3. **Compatibilidade**: Funciona em todos os navegadores modernos (Chrome, Firefox, Safari, Edge)

4. **Acessibilidade**: Próxima versão incluirá suporte para navegação por teclado e screen readers

## 🎓 Referências

- [tldraw Event API](https://tldraw.dev/docs/editor)
- [Window.open() Security](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)
- [PMC URL Structure](https://www.ncbi.nlm.nih.gov/pmc/)
