# Estudo: módulo de Pré-Natal — Pregnancy2023.xlsm → Web (standalone + Dr.web)

> Análise detalhada da planilha `biblio/Pregnancy2023.xlsm` (aba **Start** + VBA + abas auxiliares) e plano de implementação web.

---

## 1. Anatomia da aba Start — inventário completo de features

### 1.1 Dados do paciente (cabeçalho)

| Célula | Campo | Observação |
|---|---|---|
| D4 | `ID VP` | ID do Viewpoint (66301 no exemplo) |
| D5 | `Nome` | Texto livre |
| D6 | `DN` | Data nascimento |
| D8 | `Data Hoje` | `=TODAY()` — tudo é relativo a hoje |
| B3 | `ID Astraia` | Vazio no exemplo (cross-ID) |

### 1.2 Métodos de cálculo de IG

A planilha oferece **9 métodos baseados em data** + **9 métodos baseados em biometria**, totalizando **18 métodos indexados de 1 a 18** (tabela consolidada em `AA13:AI31`).

#### Métodos baseados em data (linhas 15–25)

| # | Método | Input | Fórmula (dias de IG) |
|---|---|---|---|
| 1 | **DUM** | data | `hoje − DUM` |
| 2 | **Ovulação** | data | `hoje − ovul + 14` |
| 3 | **FIV 3 dias** | data transfer | `hoje − transfer + 17` (3 + 14) |
| 4 | **FIV 5 dias** | data transfer | `hoje − transfer + 19` (5 + 14) |
| 5 | **DPP** | data | `hoje − DPP + 280` |
| 6 | **IG manual (S+D)** | semanas, dias | `sem × 7 + dias` |
| 7 | **US Anterior 1** | data + IG (s+d) no dia | `hoje − data_us + (s×7 + d)` |
| 8 | **US Anterior 2** | idem | idem |
| 9 | **US Anterior 3** | idem | idem |

Cada um produz: IG em dias (I), IG em semanas decimais (J), IG em "s+d" (K via VBA `IGsdd`), DPP (L = `hoje + 280 − I`), diferença da DPP atual (M).

#### Métodos baseados em biometria (linhas 15–23, col P–V)

Entrada: medida em mm. Saída: IG em dias via funções VBA.

| # | Parâmetro | Função VBA | Referência científica |
|---|---|---|---|
| 10 | **DSG** (saco gestacional) | `IGDSG(mm)` | Bagratee 2009 — `((DSG+31.183)/7.385)×7` |
| 11 | **CCN Robinson** | `IGCCNR(mm)` | Robinson — `8.052·√(CCN·1.037) + 23.73` |
| 12 | **CCN Intergrowth** | `IGCCI(CC)` | Intergrowth-21st (exp. polinomial ln) — **usa CC, não CCN!** (⚠️ revisar) |
| 13 | **CCN Hadlock** | `IGCCNH(mm)` | Hadlock 1992 — exp. polinomial em CCN/10 |
| 14 | **TCD** (diâm. transcerebelar) | `IG_TCD_I(mm, 50)` | Chavez 2003 — cubic em TCD/10 |
| 15 | **DBP** | `IGDBP(mm)` | Hadlock 1984 — `(9.54 + 1.482·DBP + 0.1676·DBP²)×7` |
| 16 | **CC** | `IGCCI(mm)` | Intergrowth-21st |
| 17 | **CF** | `IGCF(mm)` | Hadlock 1984 — `(10.35 + 2.46·CF + 0.17·CF²)×7` |
| 18 | **CC + CF combinado** | `IGCCFI(CC, CF)` | Intergrowth-21st composto |

> ⚠️ **Ambiguidade detectada:** a função `IGCCI` é usada em `S16` (CCN Intergrowth) e também em `S21` (CC). O nome e a fórmula sugerem que é para CC, não CCN. Confirmar com você se é bug da planilha ou intencional.

### 1.3 Consolidação e "IG definida" (o coração do fluxo)

**Mecânica:**

1. Usuário insere dados em quantos métodos quiser (painel de entrada à esquerda + biometria à direita).
2. Cada método calcula IG/DPP em sua linha.
3. A tabela `AA13:AI31` consolida tudo em 18 linhas numeradas.
4. `AA12` é o **índice do método escolhido** (1–18).
5. `VLOOKUP(AA12, AA13:AI31, ...)` puxa IG em dias (`AB12`), DPP (`AC12`), descrição (`AD12`, `AI12`).
6. Botão VBA (`CommandButton1_Click` em `Planilha1.cls`) pergunta: "Deseja definir a IG como X?".
7. Ao confirmar, copia:
   - `AD12` → `I28` (frase "IG definida em X no dia Y")
   - `AI12` → `I29` (frase do racional, ex: "baseado em exame anterior…")
   - `AC12` → `M27` (**DPP definitiva — trava tudo**)
   - `I27` = "IG DEFINIDA!" (ou "IG REDEFINIDA!" na 2ª vez)
8. Se já havia IG, avisa antes de sobrescrever ("Voce quer mesmo redefinir para…?").

**Por que `M27` é crítica:** toda a linha do tempo (`L32:L43`) deriva dela:
- `L43 = M27` → DPP (40s)
- `L32 = L43 − 280` → DUM retroativa (0s)
- Demais marcos: `L32 + N_dias`

### 1.4 Linha do tempo de exames (rows 32–43)

| Label | IG alvo | Cálculo (dias a partir da DUM) |
|---|---|---|
| DUM | 0s | `L43 − 280` |
| Ovulação | 2s | `+14` |
| Ver US (inicial) | 5s | `+35` |
| Inicial | 8–10s | `+56` a `+70` |
| Morfo 1T | 12–13s | `+84` a `+91` |
| Morfo 1T limite | 11–14s | `+77` a `+98` |
| Sexo | 16s | `+112` |
| Morfo 2T | 20–24s | `+140` a `+168` |
| Ecocardio | 28s | `+196` |
| 3D / Doppler | 28–32s | `+196` a `+224` |
| Maturidade | 37s | `L43 − 21` |
| DPP | 40s | `L43` |

**Condicional:** coluna `X30:X41` tem fórmulas `IF((Lnn − hoje) > 1, 1, 0)` — usado em formatação condicional para **ocultar/mostrar** a linha conforme o exame é futuro ou já passou. (range I32:M43, regra `$X30=0`).

### 1.5 Orientações / Receitas (rows 31–38, col P/S)

Caixa lateral com labels fixas (presumivelmente são botões/links para templates):

- **Orientações gerais** — Exames iniciais · Nutricionista · Morfo 1T · Exames 2T · morfo 2T · ecocardio · Exames 3T
- **Receitas** — receita inicial · receita AAS e Cálcio · Corticoide

(Sem conteúdo embutido na planilha — aparentam ser placeholders ou botões.)

### 1.6 Conditional formatting

| Range | Condição | Efeito |
|---|---|---|
| `I32:M43` | `$X30=0` (evento passou) | Oculta a linha |

### 1.7 Array formulas com funções VBA

Toda célula que chama `IGsdd`, `IGdsg`, `IGCCNR`, `IGCCI`, `IGCCNH`, `IGCCFI`, `IG_TCD_I`, `IGDBP`, `igcf` é *array formula* — retorna valor único mas precisa ser entrada como CSE (Ctrl+Shift+Enter).

---

## 2. VBA completo — funções reutilizáveis

### 2.1 Formatação

```vba
IGsdd(dias, tipo)
  ' tipo=1: "85+2"
  ' tipo=2: "85 sem e 2 dias"
```

### 2.2 Biometria → IG (dias)

| Função | Entrada | Fórmula |
|---|---|---|
| `IGDSG(mm)` | DSG mm | `((DSG + 31.183) / 7.385) × 7` |
| `IGCCNR(mm)` | CRL mm | `8.052·√(CCN·1.037) + 23.73` |
| `IGCCNI(mm)` | CRL mm | `40.9041 + 3.21585·√CCN + 0.348956·CCN` |
| `IGCCI(mm)` | CC mm (⚠️ ver §1.2) | `exp(0.0597·ln(CC)² + 6.409e-9·CC³ + 3.3258)` |
| `IGCCNH(mm)` | CRL mm | `exp(1.684969 + 0.315646·x − 0.049306·x² + 0.004057·x³ − 0.000120456·x⁴) × 7` (x = mm/10) |
| `IGDBP(mm)` | BPD mm | `(9.54 + 1.482·x + 0.1676·x²) × 7` (x = mm/10) |
| `IGCF(mm)` | FL mm | `(10.35 + 2.46·x + 0.17·x²) × 7` (x = mm/10) |
| `IGCCFI(CC, CF)` | mm, mm | `exp(0.03243·ln(CC)² + 0.001644·CF·ln(CC) + 3.813)` |
| `IG_TCD_I(mm, 50)` | TCD mm | Chavez 2003 cubic em x=mm/10, ×7 |

### 2.3 IG → Biometria esperada (média + SD + percentis)

Todas assinatura `X_I(IG_sem, form, tipo)` onde `tipo` = 0 (SD), 1, 3, 5, 10, 50, 90, 95, 98, 99 (percentil).

- `HUM_I` — úmero (Chitty 2002)
- `DBP_I`, `DOF_I`, `CC_I`, `TCD_I`, `CF_I` — todas Intergrowth-21st (Papageorghiou 2014)
- `CA_I(IG, form, percentil, tabela)` — AC com escolha de tabela: (1) Intergrowth, (2) Salomon 2006
- `DSG_I` — saco gestacional (Bagratee)

### 2.4 Peso fetal

- `pesoI_HCAC(HC, AC)` — **Intergrowth-21st** (Stirnemann 2017) — 2 parâmetros
- `pesoH_4C(DBP, HC, AC, FL)` — **Hadlock 4C** — 4 parâmetros
- `peso_IG(IG, tipo)` — peso esperado para dada IG (usa Stirnemann; tipo=50 = p50)

### 2.5 Utilitários

- `AlternaCaps(nome)` — proper-case respeitando preposições (e, da, do, das, dos, de)

---

## 3. Aba Edit — carteira de pré-natal (além da Start)

Visão de ficha clínica com:

- **Cabeçalho:** nome, DN, idade (calc), DPP (link Start.M27), IG frase
- **Altura** → feeds IMC automático por visita
- **GPA:** Gesta / Para / Cesária / Aborto / Obs / Tipagem sanguínea
- **Gestações prévias** (5 linhas): data, desfecho, IG, peso RN, nome, obs
- **Lista de problemas / cirurgias** (5)
- **Atopias** (5)
- **História familiar:** Ca mama, Trombose, PE + checkboxes de risco
- **Medicações** (10 linhas): nome, data início, IG (auto), data final, IG (auto), obs
  - Fórmula auto-IG: `ROUND((data − (DPP − 280)), 1)` — dias desde DUM
- **Vacinas** (checklist): DTPA, Anti-HBs, Hepatite, H1N1, Covid
- **Registro de consultas** (linhas 47+):
  - Mãe: data, peso, **IMC auto** (`peso/altura²×10000`), PA, colo, IG dias, **IG s+d auto** via `IGsdd`
  - Feto: BCF, DBP, CC, CA, CF, **peso estimado auto** via `pesoH_4C`, **comprimento auto** (`6.18 + 0.59·CF`), **percentil auto** via lookup
  - Obs livre
- **Marido:** tipagem, exercícios, alimentação
- **Risco:** Ca mama, Trombose, PE

Aba `peso estimado` tem fórmulas adicionais:
- Percentil por IG (Hadlock 1991): `p50 = exp(0.578 + 0.332·IG − 0.00354·IG²)`, SD = 13%×p50, Z = `(peso − p50)/SD`
- Alternativa Kipros (Nicolaides Fetal Diagn Ther 2012)

Aba `Pressao` tem tabela de referência PA por IG (1–40sem): DI<, DI>, SI<, SI>.

---

## 4. Análise crítica: Excel vs Flask vs Java vs alternativas

### 4.1 Critérios de avaliação

| Critério | Peso | Por quê |
|---|---|---|
| **Integração com Dr.web** | ⭐⭐⭐⭐⭐ | Objetivo declarado |
| **Modo standalone (sem backend)** | ⭐⭐⭐⭐ | Calc rápido, uso externo |
| **Acesso a dados do paciente (VP/Astraia)** | ⭐⭐⭐⭐ | Valor clínico real vem daqui |
| **Reprodutibilidade das fórmulas** | ⭐⭐⭐⭐⭐ | Não pode divergir do Excel |
| **Custo de manutenção** | ⭐⭐⭐ | Fórmulas médicas mudam pouco |
| **Deploy fácil** | ⭐⭐⭐ | Já tem Cloudflare Pages |

### 4.2 Comparação

| Opção | Integra Dr.web | Standalone | Dados paciente | Fórmulas | Manutenção | Deploy |
|---|---|---|---|---|---|---|
| **Manter Excel** | ❌ | ✅ (Windows+Excel) | ❌ | ✅ já existe | ⚠️ VBA frágil | ❌ |
| **Flask (novo)** | ⚠️ (duplica stack) | ❌ (precisa server) | ⚠️ refazer conexão | ✅ Python | ✅ | ⚠️ |
| **Java/Spring** | ❌ | ❌ | ❌ | ⚠️ reimpl. | ❌ overkill | ❌ |
| **FastAPI (mesma stack Dr.web)** | ✅ nativo | ❌ | ✅ já tem | ✅ Python | ✅ | ✅ |
| **JS puro (frontend-only)** | ⚠️ (dupla impl.) | ✅✅✅ | ❌ | ✅ portar | ✅ | ✅ Cloudflare |
| **Híbrido: JS no front + Python no Dr.web** | ✅ | ✅ | ✅ | ✅ com golden tests | ⚠️ 2 lugares | ✅ |

### 4.3 Recomendação

**Híbrido com "biblioteca de fórmulas" canônica:**

1. **Standalone (`IG-basica`, `IG-avancada`):** JavaScript puro, client-side. Zero backend. Carrega em 100ms, funciona offline, deploy na Cloudflare Pages grátis. As fórmulas de biometria são funções matemáticas simples — portam direto do VBA para JS em <200 linhas.

2. **Integração Dr.web:** Python (`backend/services/biometria.py`). Mesmas fórmulas, mesmo espírito. Acessa dados do paciente via ViewPoint/Astraia/historia_clinica.json.

3. **Garantia de paridade:** arquivo JSON com casos golden (`tests/biometria-golden.json`) — um conjunto de inputs/outputs de referência. Tanto JS quanto Python devem bater bit-a-bit. Se alguém mexer numa fórmula, quebra o teste do outro lado também.

**Por que não usar só Python (chamando o backend do standalone também):**
- Standalone precisaria de servidor → perde simplicidade.
- Latência de rede para cada slider drag é ruim (hoje `IG-basica` é instantâneo).
- Custo/complexidade não justifica para fórmulas determinísticas.

**Por que não usar só JS:**
- Dr.web backend precisa validar dados que chegam (não confiar no frontend), precisa calcular em fluxos automáticos (ex: pré-preencher ficha com último US do VP), precisa gerar PDFs de carteira. Fazer isso no navegador é frágil.

**Flask vs FastAPI:** Dr.web já é FastAPI. Adicionar Flask é fragmentação sem benefício.

**Java:** sem justificativa. Python é o idioma clínico/científico natural, e é o que o ecossistema Dr.web usa.

---

## 4.4 Entendimento confirmado por você (2026-04-17)

Você validou e acrescentou:

- **Pluralidade de métodos de IG** confirmada: DUM, ovulação, FIV 3d/5d, DPP prévia, IG manual (s+d), US anterior (data+IG-no-dia), US anterior retroativa (data + medida CCN), e US atual com biometria. Ok.
- **Seleção de fórmula por parâmetro biométrico é requisito explícito.** O médico quer poder escolher Robinson vs Hadlock vs Intergrowth para CCN, e similar para cada medida. As fórmulas devem ficar **documentadas e escolhíveis** na UI.
- **Métodos adequados por IG:**
  - Precoce: **DSG**, **CCN** (com múltiplas curvas)
  - ~12sem+: **DBP** (diâmetro biparietal), **TCD** (transcerebelar)
  - 15sem+: combinação **CC+CF** (HC+FL)
- **Lock da IG após definição** é regra de ouro: uma vez definida, não muda sozinha. Próximas consultas/biometrias usam sempre a IG inicial.
- **Unlock requer ação explícita.** "Pra mudar tem que clicar em algum dado e dizer olha, quero mudar."
- **Timeline de exames recomendados** é derivada da IG travada e comparada com hoje, mostrando o que já passou e o que ainda vem.

### Desdobramentos de design decorrentes

1. **Cada linha de biometria tem um dropdown de fórmula.** Default sugerido por IG presumida (se nada definido, começa em Intergrowth; se a IG estimada for <11sem, CCN default vira Robinson por ser mais validada).
2. **A mesma medida exibe resultado paralelo em todas as fórmulas disponíveis** para o médico ver o spread (igual ao Excel faz CCN rob / CCN I / CCN Had em 3 linhas separadas).
3. **Ficha de documentação de fórmulas** (modal "?" ao lado de cada): mostra a equação, referência bibliográfica, faixa de validade (ex: "Robinson válido 6–14sem"). Dados já extraídos em §9.
4. **"Métodos fora de faixa" não somem, mas aparecem acinzentados** com aviso ("CCN fora da faixa de validade para IG >14s"). Médico decide.
5. **Lock da IG cria um objeto persistido:**
   ```json
   {
     "locked": true,
     "method_id": "us_anterior",
     "locked_at": "2026-04-17T10:23:00-03:00",
     "locked_by": "Dr. Rafael",
     "reference": {
       "kind": "ultrasound_with_ga",
       "exam_date": "2024-12-10",
       "ga_days_at_exam": 104,
       "formula": null
     },
     "derived": {
       "dum_estimate": "2024-08-28",
       "dpp": "2025-06-04"
     }
   }
   ```
   O botão de "redefinir" abre diálogo com: motivo (texto obrigatório), comparação antes/depois, confirmação dupla.
6. **Histórico de locks** fica auditável — toda redefinição vira entrada no histórico (quem, quando, por quê, valor antes/depois).
7. **Timeline de exames** é uma função pura `timeline(dpp_locked, today) → [{label, target_ga, target_date, window_start, window_end, status: "past"|"current"|"upcoming"|"overdue"}]`.

---

## 5. Fluxo a entender (perguntas para você)

### 5.1 Sobre "definir IG"

No Excel, o médico olha os 18 métodos, escolhe um, confirma, e aí o DPP fica **travado**. Depois disso, toda a carteira de pré-natal depende desse DPP.

**Q1.** Queremos manter o "definir uma vez e travar"? Ou dinâmico (IG se atualiza se vier US nova)?

**Q2.** Hoje o sistema aceita **apenas um US anterior** como referência. E se tiver 3 US precoces com CCN batendo? Queremos:
- (a) lista flexível de N US, médico escolhe uma, OU
- (b) **auto-pick** pela regra ACOG (US precoce de CCN trumpeia DUM se discrepante), OU
- (c) média ponderada por confiança (CCN mais precisa que BPD etc.)?

### 5.2 Sobre o ciclo de vida da gestação

**Q3.** No Dr.web, um paciente tem `historia_clinica.json::pregnancies[]`. Cada gestação é uma **entidade separada**? Quando começa (primeira consulta? DUM registrada? primeira US?)? Quando encerra (parto? abortamento?)?

**Q4.** Se a paciente tem gestação em curso, onde ela mora no banco de dados? Em `pregnancies[]` com status=ongoing, ou num objeto separado `current_pregnancy`?

### 5.3 Sobre a carteira (aba Edit)

A Edit tem: GPA, gestações prévias, problemas, atopias, família, medicações (com IG auto), vacinas, visitas (peso/PA/IMC/colo + biometria fetal + peso estimado + percentil).

**Q5.** Na v1, vamos implementar tudo isso, ou só a calculadora de IG e a linha do tempo? (Minha sugestão abaixo — ver §6.)

**Q6.** A carteira precisa ser **imprimível no padrão físico** (tipo o "carteira pre natal modelo - salazar cristiano.xlsx")? Ou é só visualização na tela?

### 5.4 Sobre integração com dados existentes

**Q7.** Queremos auto-puxar biometria do último US da Astraia/ViewPoint? Ou só manual (paciente/médico digita)?

**Q8.** Templates de receita (AAS+Cálcio, corticoide) — já existem em algum lugar (Dr.web tem módulo de receitas?) ou é pra criar?

### 5.5 Sobre o standalone (público-alvo)

**Q9.** O `IG-basica` atual é **paciente-facing** (PT-BR simples, Instagram). A versão "avançada" com biometria é **médico-facing**. Confirma que queremos:
- `IG-basica/` — paciente (atual)
- `IG-avancada/` (ou outro nome) — médico quick-calc, sem login, com todos os 18 métodos + linha do tempo
- Dr.web `/prenatal` — carteira completa com dados do paciente

### 5.6 Sobre dependência da web

**Q10.** Consultório fica offline às vezes? Se sim, versão standalone deve ser **PWA instalável** (funciona offline após 1º acesso)?

---

## 5.1 Decisões locked (2026-04-17)

| # | Decisão | Detalhe |
|---|---|---|
| 1 | CCN default | **Robinson** (trocável por Hadlock/Intergrowth no dropdown) |
| 2 | Métodos fora da faixa | **Acinzentados com tooltip**, não somem |
| 3 | Bug `IGCCI` em S16 | Confirmado: portar como **`IGCCNI`** (Intergrowth CRL) |
| 4 | Unlock da IG | "Tem certeza?" + **campo obrigatório de motivo escrito** |
| 5 | Audit trail | Guardar histórico de redefinições (who/when/why/before/after) — **a confirmar** |
| 6 | Auth do standalone | **Sem login na v1** |
| 7 | Número de US anteriores | **Ilimitado** (embora raro >3) |
| 8 | Peso fetal | **Entra na IG-avancada** com dropdown de fórmula (Hadlock 4C, Hadlock 2C, Intergrowth, Kipros) |
| 9 | Templates de orientações/receitas | **Criar do zero** — parte importante do escopo |
| 10 | Protocolo de exames por IG | **Protocolo pessoal** como base + **abas FEBRASGO / ACOG / Barcelona** com referências documentadas |
| 11 | Gatilho de nova gestação no Dr.web | Se houver info prévia (DUM, último US), **sugere** IG; após definir aqui, **trava** |
| 12 | Auto-pull biometria | **Sim no Dr.web** (não-standalone). Puxa do ViewPoint/Astraia. |

---

## 6. Proposta de plano incremental

### Fase 0 — Infra (0,5 dia)

- [x] Mover IG-basica para pasta própria (feito)
- [ ] Criar `IG-avancada/` como nova rota
- [ ] Criar `assets/js/core/biometria.js` — biblioteca de fórmulas portadas do VBA
- [ ] Criar `tests/biometria-golden.json` — casos de referência (inputs + outputs esperados)
- [ ] Criar `tests/biometria.test.html` — página que roda os goldens no navegador

### Fase 1 — IG-avancada standalone (2–3 dias)

Página `IG-avancada/index.html` com:

- Painel de métodos baseados em data (6): DUM, Ovulação, FIV 3d, FIV 5d, DPP, IG manual
- Painel de ultrassons anteriores (N linhas, user pode adicionar): data + IG-no-dia
- Painel de biometria **precoce**: DSG, CCN (com 3 curvas: Robinson, Hadlock, Intergrowth)
- Painel de biometria **tardia**: BPD, HC, FL, TCD, HC+FL combinado
- Tabela consolidada: uma linha por método com IG (s+d), DPP, diferença do "escolhido"
- **Botão "definir IG"** → trava um método como referência
- Linha do tempo com todos os marcos (mesmo layout Excel): dinâmica, cinza no passado
- Orientações por trimestre (texto, dá pra editar)
- Copy-to-clipboard / export JSON
- **(opcional v1.1)** Peso estimado se BPD+HC+AC+FL presentes
- PWA offline

### Fase 2 — Dr.web integration (3–5 dias)

- `backend/services/biometria.py` — port das fórmulas, mesmos goldens
- `backend/services/prenatal.py` — orquestração:
  - Pega paciente ativo
  - Lê `historia_clinica.json::pregnancies[0 ou current]`
  - Lê últimas biometrias do VP (`viewpoint_exams.py` já existe)
  - Computa IG por cada método disponível
  - Retorna `PrenatalState` (pydantic)
- `backend/routers/prenatal.py`:
  - `GET /api/prenatal/{patient_id}` — estado atual
  - `POST /api/prenatal/{patient_id}/set-ig` — trava IG (grava em historia)
  - `POST /api/prenatal/{patient_id}/visit` — adiciona consulta (peso/PA/biometria)
- `frontend/src/pages/PrenatalPage.tsx` — substitui placeholder, reutiliza componentes do IG-avancada quando possível (via lib compartilhada)

### Fase 3 — Carteira completa (5–7 dias)

- Medicações com IG auto
- Vacinas (checklist + alertas de janela: DTPa 20–26sem)
- Registro de consultas com peso/IMC/PA + biometria fetal
- Percentis de peso (Hadlock 1991 ou Intergrowth-21st)
- Exportar PDF (carteira imprimível)

### Fase 4 — Integração com ecossistema (3–4 dias)

- Puxar biometria automática do Astraia/VP via cross-ID
- Templates de receita (AAS+Cálcio, corticoide)
- Alertas contextuais (morfo 1T vencendo, vacina em janela, etc.)
- Link para Questionnaire / Historia / Lab existentes no Dr.web

---

## 7. Decisões técnicas propostas

1. **Linguagem standalone:** JS puro (vanilla), sem framework. Segue o padrão do `IG-basica`.
2. **Linguagem Dr.web:** Python (FastAPI), lib compartilhada com o resto do Dr.web.
3. **Paridade de fórmulas:** arquivo JSON de goldens rodado em CI nos dois lados.
4. **Datas:** sempre ISO 8601 (`YYYY-MM-DD`). TZ fixo São Paulo no backend; navegador usa local.
5. **Unidades:** mm sempre (consistente com VBA). Nunca mistura com cm na API.
6. **Validação:** rejeitar datas futuras (>hoje+1 dia), IG <1s, IG >45s.
7. **"Definir IG":** grava um objeto `defined_ga = {method: "us_anterior", reference_date: "2024-12-10", ga_days_at_reference: 104, dpp: "2025-06-04", locked_at: "2026-04-17T..."}`. Tudo derivável disso.
8. **Cronologia:** "hoje" sempre vem do backend (fuso SP) para evitar divergência cliente/servidor.

---

## 8. Riscos e armadilhas conhecidas

- ⚠️ **Fórmula `IGCCI` ambígua** — aparece em S16 (CCN) e S21 (CC). Conferir se era para ser `IGCCNI` no S16.
- ⚠️ **Datas tempo zero** — no Excel, cells vazias viram `datetime.time(0,0)` na leitura. Converter null no port.
- ⚠️ **Array formulas** — VBA precisa do `WorksheetFunction.Ln` que é natural log; em JS é `Math.log`.
- ⚠️ **Round VBA** — usa banker's rounding por default (!!!) — replicar com cuidado ou documentar divergência.
- ⚠️ **Diferenças de IG por método** — em extremos podem chegar a 2 semanas. UI precisa **mostrar a diferença** (igual Excel faz na coluna M) para o médico decidir.
- ⚠️ **Legal/clínico** — carteira de pré-natal tem implicações. Incluir disclaimer "ferramenta de apoio; decisão clínica é do médico assistente".

---

## 9. Referências bibliográficas (das fórmulas VBA)

1. **CCN Robinson** — Robinson HP. Sonar measurement of fetal crown–rump length as means of assessing maturity in first trimester of pregnancy. *BMJ* 1973.
2. **CCN Hadlock** — Hadlock FP et al. Fetal crown-rump length: reevaluation of relation to menstrual age. *Radiology* 1992; 182:501-5.
3. **BPD/FL Hadlock** — Hadlock FP et al. Estimating fetal age: computer-assisted analysis. *Radiology* 1984; 152:497-501.
4. **Intergrowth-21st biometria** — Papageorghiou AT et al. *Lancet* 2014; 384:869-879.
5. **Intergrowth-21st peso** — Stirnemann J et al. *Ultrasound Obstet Gynecol* 2017; 49:478-486.
6. **Hadlock peso** — Hadlock FP et al. In utero analysis of fetal growth. *Radiology* 1991; 181:129-33.
7. **AC Salomon** — Salomon LJ et al. *Ultrasound Obstet Gynecol* 2006; 28:193-198.
8. **TCD Chavez** — Chavez MR et al. *Am J Obstet Gynecol* 2003; 189:1021-1025.
9. **DSG Bagratee** — Bagratee JS et al. *Ultrasound Obstet Gynecol* 2009; 34:503-509.
10. **Humerus Chitty** — Chitty LS et al. *BJOG* 2002; 109:919-929.
11. **Peso fetal Kipros** — Nicolaides KH et al. *Fetal Diagn Ther* 2012.
