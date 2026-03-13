# Design: Prompt Config Completa (Task 14)

**Data:** 2026-03-10
**Status:** Aprovado
**Abordagem escolhida:** A — Estender TenantConfig + melhorias no admin
**Escopo:** 3 melhorias independentes entregues como uma task única

---

## Contexto

A `PromptConfig` já tem CRUD completo no admin (lista, criar nova versão, desativar). O que falta:

1. Preview do prompt montado (o que a IA recebe de fato)
2. Histórico de versões com reativação
3. Gerente configura os blocos da loja via briefing guiado (sem saber o que é um "prompt")

Os dados do gerente são salvos em `TenantConfig.briefing` (JSON) via `PATCH /api/[slug]/config`, que já existe. O `process-message` já lê esse briefing para montar o contexto — basta expandir os campos usados.

---

## Seção 1: Admin — Preview do Prompt Montado

### Comportamento

- Botão **"👁 Preview"** na tela admin de prompts (visível durante edição e ao selecionar um prompt da lista)
- Abre dialog modal com o texto final montado client-side:

```
{promptBase}

=== Contexto da Loja ===
{blockStoreContext}

=== Políticas Comerciais ===
{blockPolicies}

=== Segurança ===
{blockSecurity}

=== Campanhas Ativas ===
{blockCampaigns}

=== Handoff ===
{blockHandoff}

=== Tom de Voz ===
{blockToneOfVoice}
```

- Blocos vazios são omitidos (não exibe o header se o bloco for vazio/null)
- Badge com contagem de caracteres e tokens estimados (`Math.ceil(chars / 4)`)
- Textarea read-only com scroll, font-mono

### Sem requisição de API — tudo client-side com o estado do formulário

---

## Seção 2: Admin — Histórico de Versões

### Comportamento

- Toggle **"Mostrar histórico"** no topo da lista de prompts (coluna esquerda)
- Quando ativado: GET inclui `?showAll=true` e retorna versões inativas também
- Versões inativas: badge "Inativo" (cinza) + botão **"Reativar"**
- Versões ativas: badge "Ativo" (verde) + botão "Desativar" (já existe)
- Reativar: `PATCH /api/admin/prompts/[id]` com `{ reactivate: true }`
  - API desativa a versão ativa atual do mesmo (tenantId, agentType)
  - Depois ativa o prompt solicitado

### Ajustes de API

**`GET /api/admin/prompts`**
- Novo parâmetro: `?showAll=true` → remove filtro `isActive: true`

**`PATCH /api/admin/prompts/[id]`**
- Aceitar corpo `{ reactivate: true }`:
  1. Buscar o prompt pelo id para obter (tenantId, agentType)
  2. `updateMany` → desativar todos ativos do mesmo (tenantId, agentType)
  3. `update` → ativar o prompt solicitado

---

## Seção 3: Loja Config — Briefing Guiado de IA

### Princípio

O gerente nunca escreve "prompt". Ele responde perguntas sobre a loja dele. O sistema monta os blocos internamente.

### Localização

Nova seção **"Configuração de IA"** na página `/app/(loja)/[tenantSlug]/config/page.tsx`, abaixo das configurações existentes.

### Campos do Briefing

Todos salvos em `TenantConfig.briefing` (JSON). Campos novos adicionados ao JSON existente sem breaking changes.

#### Bloco: Sobre a Loja

| Campo JSON | Pergunta exibida | Tipo |
|---|---|---|
| `cidade` | Em qual cidade/bairro fica sua loja? | `<input type="text">` |
| `marcas` | Quais marcas você trabalha? | `<input type="text">` (ex: Honda, Yamaha) |
| `foco` | Sua loja foca em qual segmento? | `<select>` (0km / Usadas / Ambos) |
| `diferencial` | Qual é o grande diferencial da sua loja? | `<textarea rows={2}>` |

#### Bloco: Políticas Comerciais

| Campo JSON | Pergunta exibida | Tipo |
|---|---|---|
| `formasPagamento` | Quais formas de pagamento aceita? | checkboxes múltiplos: Dinheiro, Pix, Cartão, Financiamento, Consórcio |
| `aceitaTroca` | Aceita troca de moto? | toggle (boolean) |
| `condicaoTroca` | Se sim, quais condições? | `<textarea rows={2}>` (condicional — só aparece se `aceitaTroca=true`) |
| `prazoEntrega` | Qual o prazo de entrega para motos 0km? | `<input type="text">` (ex: "até 7 dias úteis") |

#### Bloco: Campanhas Ativas

| Campo JSON | Pergunta exibida | Tipo |
|---|---|---|
| `currentCampaigns` | Tem alguma promoção ou campanha ativa agora? | `<textarea rows={3}>` (já existe) |
| `validadeCampanha` | Válida até quando? | `<input type="date">` |

#### Bloco: Tom de Voz

| Campo JSON | Pergunta exibida | Tipo |
|---|---|---|
| `toneOfVoice` | Como a IA deve se comunicar? | radio: Formal / Amigável / Descontraído (já existe como campo separado) |
| `nomeAtendente` | Como a IA deve se apresentar ao cliente? | `<input type="text">` (ex: "Mavi da Moto Center") |

### Montagem automática do texto de prompt

No `process-message`, os campos do briefing são montados em texto para o contexto da IA:

```typescript
function buildBriefingText(briefing: Record<string, unknown>, config: TenantConfig): string {
  const parts: string[] = []

  // Bloco: Loja
  if (briefing.cidade || briefing.marcas || briefing.diferencial) {
    const loja = [
      briefing.cidade      && `Cidade/Bairro: ${briefing.cidade}`,
      briefing.marcas      && `Marcas: ${briefing.marcas}`,
      briefing.foco        && `Segmento: ${briefing.foco}`,
      briefing.diferencial && `Diferencial: ${briefing.diferencial}`,
    ].filter(Boolean).join('\n')
    parts.push(`SOBRE A LOJA:\n${loja}`)
  }

  // Bloco: Políticas
  const politicas = [
    briefing.formasPagamento && `Pagamento aceito: ${(briefing.formasPagamento as string[]).join(', ')}`,
    briefing.aceitaTroca     && `Aceita troca: Sim${briefing.condicaoTroca ? ` — ${briefing.condicaoTroca}` : ''}`,
    !briefing.aceitaTroca    && `Aceita troca: Não`,
    briefing.prazoEntrega    && `Prazo entrega 0km: ${briefing.prazoEntrega}`,
    briefing.additionalPolicies && briefing.additionalPolicies,
  ].filter(Boolean).join('\n')
  if (politicas) parts.push(`POLÍTICAS COMERCIAIS:\n${politicas}`)

  // Bloco: Campanhas
  const campanhas = [
    briefing.currentCampaigns  && briefing.currentCampaigns,
    briefing.validadeCampanha  && `Válida até: ${briefing.validadeCampanha}`,
  ].filter(Boolean).join('\n')
  if (campanhas) parts.push(`CAMPANHAS ATIVAS:\n${campanhas}`)

  // Tom de voz
  const tom = [
    config.toneOfVoice         && `Tom de voz: ${config.toneOfVoice}`,
    briefing.nomeAtendente     && `Nome do atendente: ${briefing.nomeAtendente}`,
  ].filter(Boolean).join('\n')
  if (tom) parts.push(`TOM DE VOZ:\n${tom}`)

  return parts.join('\n\n')
}
```

---

## Seção 4: API — Resumo dos ajustes

| Rota | Mudança |
|---|---|
| `GET /api/admin/prompts` | Aceitar `?showAll=true` → sem filtro `isActive` |
| `PATCH /api/admin/prompts/[id]` | Aceitar `{ reactivate: true }` → swap de versão ativa |
| `PATCH /api/[slug]/config` | Aceitar `storeContext`, `cidade`, `marcas`, `foco`, `diferencial`, `formasPagamento`, `aceitaTroca`, `condicaoTroca`, `prazoEntrega`, `validadeCampanha`, `nomeAtendente` no briefing JSON |
| `POST /api/webhooks/internal/process-message` | Expandir `buildBriefingText` para usar os novos campos |

---

## Arquivos afetados

```
app/(admin)/prompts/page.tsx              ← + Preview dialog + toggle histórico
app/(loja)/[tenantSlug]/config/page.tsx  ← + Seção "Configuração de IA" (briefing guiado)
app/api/admin/prompts/route.ts           ← + showAll param
app/api/admin/prompts/[id]/route.ts      ← + reactivate logic
app/api/webhooks/internal/process-message/route.ts  ← + buildBriefingText expandido
```

Sem migrations de banco — todos os campos novos do briefing cabem no JSON existente.

---

## Critérios de aceite

- [ ] Admin vê preview do prompt montado antes de salvar (client-side)
- [ ] Admin pode ver versões inativas e reativar com 1 clique
- [ ] Gerente preenche briefing com perguntas claras (sem jargão de "prompt")
- [ ] Campo `aceitaTroca=false` oculta `condicaoTroca`
- [ ] `formasPagamento` com checkboxes persiste como array no JSON
- [ ] `buildBriefingText` usa todos os novos campos no process-message
- [ ] Zero breaking changes em dados existentes
