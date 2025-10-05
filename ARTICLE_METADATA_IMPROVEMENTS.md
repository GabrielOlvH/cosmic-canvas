# Melhorias nos Metadados dos Artigos no Mapa Mental

## 📋 Resumo das Mudanças

Implementamos melhorias significativas na exibição dos artigos no mapa mental, substituindo os IDs de arquivos por informações reais dos artigos científicos.

## ✨ O Que Mudou

### Antes
- Títulos apareciam como IDs de arquivos: `pone-0104830`, `nihms404145`
- Sem informação de autores
- Sem links para os artigos
- Dados limitados

### Depois
- **Títulos reais dos artigos** extraídos dos PDFs
- **Autores** exibidos abaixo do título
- **Ano de publicação** entre parênteses
- **Indicador de link** (🔗) quando há URL disponível
- **URLs PMC ou DOI** incluídos nos metadados

## 🔧 Alterações Técnicas

### 1. Interface DocumentNode Atualizada
```typescript
export interface DocumentNode {
  metadata: {
    source: string
    title: string
    type: string
    timestamp: number
    authors?: string      // NOVO
    doi?: string         // NOVO
    year?: number        // NOVO
    journal?: string     // NOVO
    url?: string         // NOVO (PMC ou DOI)
  }
}
```

### 2. Interface MindMapNode Estendida
```typescript
export interface MindMapNode {
  metadata?: {
    // ... campos existentes
    authors?: string
    doi?: string
    year?: number
    url?: string
  }
}
```

### 3. Canvas Generator
- Método `convertToMindMapFormat` agora recebe array de `DocumentNode`
- Cria mapa `documentId → document` para busca rápida
- Extrai metadados reais do documento correspondente
- Passa título, autores, ano e URL para os nós do mapa mental

### 4. Mind Map Generator
- **Altura dos nós de estudos aumentada**: 120px → 180px
- **Formatação do texto** nos nós de nível 2 (estudos):
  ```
  Título do Artigo
  Nome dos Autores (2024)
  🔗 Link to article
  ```

## 📊 Dados da Re-indexação

- ✅ **588 documentos** re-indexados com sucesso
- ✅ **39,858 chunks** criados
- ✅ **601 links PMC** carregados do CSV
- ✅ Metadados completos incluindo:
  - Títulos reais extraídos dos PDFs
  - Autores (quando disponíveis)
  - DOIs (quando disponíveis)
  - Anos de publicação
  - URLs (PMC prioritário, DOI como fallback)

## 🎯 Próximos Passos Sugeridos

### 1. Tornar Links Clicáveis
Atualmente o link só aparece como indicador visual. Podemos:
- Adicionar handler de clique nos nós de estudos
- Abrir URL em nova aba ao clicar
- Adicionar tooltip mostrando o URL completo

### 2. Melhorar Extração de Metadados
- Implementar parsers mais robustos para diferentes formatos de PDF
- Adicionar mais fontes de metadados (CrossRef, PubMed API)
- Melhorar detecção de autores e títulos

### 3. UI Enhancements
- Adicionar badge visual para indicar presença de link
- Destacar nós que têm URLs disponíveis
- Adicionar painel lateral com metadados completos ao selecionar nó

### 4. Exportação
- Incluir URLs na exportação do mapa mental
- Gerar lista de referências bibliográficas
- Exportar BibTeX com metadados completos

## 🧪 Como Testar

1. Execute o dev server:
   ```bash
   npm run dev
   ```

2. Acesse `/research`

3. Gere um novo mapa mental com qualquer pergunta de pesquisa

4. Observe os nós de nível 2 (estudos):
   - Devem mostrar títulos reais dos artigos
   - Devem incluir autores (quando disponíveis)
   - Devem mostrar ano de publicação
   - Devem ter indicador 🔗 para artigos com links

## 📝 Notas Importantes

- A re-indexação foi feita com `--force` para garantir que todos os documentos fossem atualizados
- Os metadados são extraídos dos PDFs durante o carregamento
- URLs PMC têm prioridade sobre DOI URLs
- Nem todos os PDFs têm metadados completos (alguns podem não ter autores ou DOI)

## 🐛 Resolução de Problemas

### PDFs sem metadados
Se um PDF não tem metadados extraíveis:
- O título padrão será o nome do arquivo
- Campos opcionais (authors, doi, year) ficarão undefined
- O nó ainda será exibido normalmente, apenas sem as informações adicionais

### Links não funcionam
- Verifique se o documento tem `metadata.url` definido
- Confirme que o CSV de PMC links foi carregado corretamente
- O indicador 🔗 só aparece quando há URL disponível
