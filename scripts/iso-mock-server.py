#!/usr/bin/env python3
"""
Mock OpenAI-compatible server para o Agente Consultor ISO.
Expõe POST /v1/chat/completions com suporte a streaming (SSE).
Usa lógica especializada em normas ISO, sem dependências externas de rede.
"""
import json
import re
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

# ─── Base de conhecimento ISO ────────────────────────────────────────────────

KNOWLEDGE = {
    "iso9001": {
        "clausulas": {
            "4": "Contexto da organização — identificar partes interessadas, âmbito do SGQ, processos.",
            "5": "Liderança — política da qualidade, papéis e responsabilidades, comprometimento da direção.",
            "6": "Planeamento — gestão de riscos e oportunidades, objetivos da qualidade, planeamento de mudanças.",
            "7": "Suporte — recursos, competências, consciencialização, comunicação, informação documentada.",
            "8": "Operação — planeamento operacional, requisitos de produtos/serviços, controlo de produção.",
            "9": "Avaliação do desempenho — monitorização, auditoria interna, revisão pela direção.",
            "10": "Melhoria — não conformidades, ações corretivas, melhoria contínua.",
        },
        "documentos": [
            "Política da Qualidade",
            "Manual da Qualidade (opcional, mas recomendado)",
            "Procedimento de Controlo de Documentos",
            "Procedimento de Auditoria Interna",
            "Procedimento de Não Conformidades e Ações Corretivas",
            "Procedimento de Revisão pela Direção",
            "Objetivos da Qualidade e indicadores (KPIs)",
            "Mapa de Processos",
            "Registos de auditorias internas",
            "Atas de revisão pela direção",
        ],
    },
    "iso22000": {
        "clausulas": {
            "4": "Contexto da organização — partes interessadas, âmbito do SGSA.",
            "5": "Liderança — política de segurança alimentar, equipa HACCP.",
            "6": "Planeamento — riscos e oportunidades, objetivos de segurança alimentar.",
            "7": "Suporte — recursos, competências, comunicação, documentação.",
            "8": "Operação — PPRs, análise de perigos, plano HACCP, rastreabilidade.",
            "9": "Avaliação do desempenho — monitorização de PCCs, auditorias, revisão pela direção.",
            "10": "Melhoria — não conformidades, retiradas de produto, melhoria contínua.",
        },
        "documentos": [
            "Política de Segurança Alimentar",
            "Plano HACCP (análise de perigos, PCCs, limites críticos)",
            "Programas de Pré-Requisitos (PPRs): BPH, HACCP de suporte",
            "Procedimentos de rastreabilidade e gestão de retiradas",
            "Plano de limpeza e desinfeção",
            "Plano de controlo de pragas",
            "Plano de formação em higiene alimentar",
            "Registos de monitorização de PCCs",
            "Especificações de matérias-primas e produto acabado",
        ],
    },
    "iso14001": {
        "clausulas": {
            "4": "Contexto — partes interessadas, questões ambientais internas e externas.",
            "5": "Liderança — política ambiental, responsabilidades.",
            "6": "Planeamento — aspetos ambientais significativos, obrigações de conformidade, objetivos.",
            "7": "Suporte — competências, consciencialização, comunicação.",
            "8": "Operação — controlo operacional, preparação e resposta a emergências.",
            "9": "Avaliação — monitorização, auditorias, revisão pela direção.",
            "10": "Melhoria — não conformidades, melhoria contínua.",
        },
        "documentos": [
            "Política Ambiental",
            "Registo de aspetos e impactos ambientais",
            "Plano de resposta a emergências ambientais",
            "Procedimento de identificação de requisitos legais ambientais",
            "Objetivos e metas ambientais",
            "Plano de monitorização ambiental",
            "Registos de auditorias ambientais internas",
        ],
    },
    "iso45001": {
        "clausulas": {
            "4": "Contexto — partes interessadas, âmbito do SGSST.",
            "5": "Liderança — política SST, consulta e participação dos trabalhadores.",
            "6": "Planeamento — avaliação de riscos, identificação de perigos, requisitos legais.",
            "7": "Suporte — competências, formação SST, comunicação.",
            "8": "Operação — controlo de perigos, gestão de mudanças, aquisição.",
            "9": "Avaliação — monitorização, investigação de acidentes, auditorias.",
            "10": "Melhoria — incidentes, não conformidades, melhoria contínua.",
        },
        "documentos": [
            "Política de Segurança e Saúde no Trabalho",
            "Avaliação e gestão de riscos profissionais",
            "Plano de emergência e evacuação",
            "Procedimento de investigação de acidentes e incidentes",
            "Registo de equipamentos de proteção individual (EPI)",
            "Plano de formação SST",
            "Registos de inspeções de segurança",
        ],
    },
}

GAP_TEMPLATE = """## Gap Analysis — {norma}

Com base na sua descrição, realizei um diagnóstico preliminar:

### Situação identificada
{situacao}

### Tabela de lacunas (Gap Analysis)

| Cláusula | Requisito | Situação Atual | Gap Identificado | Prioridade |
|----------|-----------|----------------|-----------------|------------|
{gaps}

### Plano de Ação Sugerido

**Curto prazo (0–3 meses):**
{curto_prazo}

**Médio prazo (3–6 meses):**
{medio_prazo}

**Longo prazo (6–12 meses):**
{longo_prazo}

---
> ⚠️ Este diagnóstico é preliminar e deve ser validado pelo Responsável interno pelo sistema de gestão e por um auditor qualificado."""

DOCS_TEMPLATE = """## Documentos obrigatórios — {norma}

Para a {norma}, a norma exige ou recomenda os seguintes documentos e registos:

{lista}

### Modelo de Política

---
**POLÍTICA DE {politica_tipo}**

A {empresa_tipo} compromete-se a:

1. **Satisfazer os requisitos** aplicáveis à {politica_area}, incluindo os requisitos legais e regulamentares.
2. **Melhorar continuamente** a eficácia do sistema de gestão.
3. **Envolver e sensibilizar** todos os colaboradores para a importância da {politica_area}.
4. **Estabelecer e rever** objetivos mensuráveis alinhados com esta política.
5. **Comunicar** esta política a todas as partes interessadas relevantes.

Esta política é comunicada, compreendida e aplicada em toda a organização. É revista anualmente pela Gestão de Topo.

*[Data] — [Assinatura da Direção]*

---
> Adapte este modelo ao contexto específico da sua organização."""

AUDIT_TEMPLATE = """## Apoio a Auditoria Interna — {norma}

### Plano de Auditoria Interna

| # | Cláusula | Processo/Área | Auditor | Data Prevista | Duração |
|---|----------|---------------|---------|---------------|---------|
| 1 | 4–5 | Contexto e Liderança | Auditor Interno A | T+1 mês | 2h |
| 2 | 6–7 | Planeamento e Suporte | Auditor Interno A | T+1 mês | 3h |
| 3 | 8 | Operação / Produção | Auditor Interno B | T+2 meses | 4h |
| 4 | 9 | Avaliação do Desempenho | Auditor Interno B | T+2 meses | 2h |
| 5 | 10 | Melhoria | Auditor Interno A | T+3 meses | 1h |

### Checklist por Cláusula

{checklist}

### Modelo de Não Conformidade (NC)

---
**RELATÓRIO DE NÃO CONFORMIDADE**

- **Nº NC:** NC-[ano]-[sequência]
- **Data:** ___________
- **Cláusula:** ___________
- **Processo/Área:** ___________
- **Descrição da NC:** ___________
- **Evidências objetivas:** ___________
- **Causa raiz (5 Porquês / Ishikawa):** ___________
- **Ação corretiva proposta:** ___________
- **Responsável:** ___________ | **Prazo:** ___________
- **Verificação da eficácia:** ___________ | **Data:** ___________

---"""

GENERIC_RESPONSE = """Obrigado pela sua questão sobre **{tema}**.

Posso ajudá-lo com:

### Áreas de suporte disponíveis

1. **Diagnóstico (Gap Analysis)** — Descreva a situação atual da sua empresa e identificarei as lacunas face à norma.
2. **Plano de Certificação** — Elaboro um plano com etapas, responsáveis e artefactos para cada fase.
3. **Documentação** — Sugiro e redijo políticas, procedimentos, instruções, formulários e registos.
4. **Auditorias Internas** — Preparo checklists, planos de auditoria e modelos de relatórios de NC.
5. **Preparação para auditoria externa** — Listo o que o auditor certificador vai verificar e simulo perguntas.

### Para avançar, diga-me:
- Qual a **norma ISO** que pretende implementar? (ex.: ISO 9001, ISO 22000, ISO 14001, ISO 45001)
- Qual o **setor** da sua empresa e **porte** (micro, pequena, média, grande)?
- Já tem algum **sistema de gestão existente**, ou é um projeto de raiz?
- Qual o **prazo pretendido** para a certificação?

Com estas informações, poderei dar-lhe um apoio muito mais direcionado e eficaz."""


# ─── Motor de resposta ────────────────────────────────────────────────────────

def detect_norm(text: str) -> str:
    text = text.lower()
    if "22000" in text or "fssc" in text or "haccp" in text or "alimentar" in text:
        return "ISO 22000"
    if "14001" in text or "ambiental" in text or "ambiente" in text:
        return "ISO 14001"
    if "45001" in text or "sst" in text or "segurança" in text and "saúde" in text:
        return "ISO 45001"
    if "9001" in text or "qualidade" in text:
        return "ISO 9001"
    return ""


def detect_intent(text: str) -> str:
    t = text.lower()
    # Priority: audit > docs > gap > plan > generic
    audit_words = ["auditoria interna", "auditoria externa", "auditor", "checklist",
                   "não conformidade", " nc ", "verificação", "certificadora",
                   "preparar auditoria", "simula perguntas"]
    doc_words   = ["document", "política", "procedimento", "formulário", "registo",
                   "instrução", "manual", "template", "modelo de", "escreve", "redige",
                   "cria um", "obrigatórios para"]
    gap_words   = ["gap", "diagnós", "análise", "lacuna", "situação atual", "estado atual",
                   "o que nos falta", "o que falta", "o que precis", "requisitos",
                   "nunca tiv", "sem sistema", "sem qualquer", "quais são os",
                   "não cumprimos", "implementar iso", "de raiz"]
    plan_words  = ["por onde começo", "por onde começar", "cronograma", "fases",
                   "meses para", "certificar em", "quando posso", "quanto demora",
                   "como certificar", "passos para"]
    if any(w in t for w in audit_words): return "audit"
    if any(w in t for w in doc_words):   return "docs"
    if any(w in t for w in gap_words):   return "gap"
    if any(w in t for w in plan_words):  return "plan"
    # Fallback: if company context + norm → gap analysis
    if any(w in t for w in ["trabalhadores", "empresa", "fábrica", "indústria",
                             "temos", "nunca", "queremos", "precisamos"]):
        return "gap"
    return "generic"


def build_response(messages: list) -> str:
    user_msgs = [m["content"] for m in messages if m.get("role") == "user"]
    sys_msgs  = [m["content"] for m in messages if m.get("role") == "system"]

    last = user_msgs[-1] if user_msgs else ""

    # Extract only the context-specific lines from system (after "## Contexto desta sessão")
    sys_ctx = ""
    for s in sys_msgs:
        if "Contexto desta sessão" in s:
            sys_ctx = s.split("## Contexto desta sessão")[-1]

    # Detect norm from context lines + user messages only (not full system prompt)
    norm_ctx = sys_ctx + " " + " ".join(user_msgs)
    norm = detect_norm(norm_ctx)
    intent = detect_intent(last)

    norm_key = norm.lower().replace(" ", "").replace("/", "").replace("-", "")
    kb = KNOWLEDGE.get(norm_key, KNOWLEDGE.get("iso9001"))

    if intent == "gap":
        maturity = "inicial"
        if any(w in last.lower() for w in ["parcial", "algum", "existe", "temos"]):
            maturity = "parcial"

        if norm == "ISO 9001":
            gaps = (
                "| 4 | Contexto da organização | Análise SWOT não formalizada | Sem matriz de partes interessadas | Alta |\n"
                "| 5 | Política da Qualidade | Política verbal, não documentada | Inexistência de documento formal | Alta |\n"
                "| 6 | Objetivos da qualidade | Sem indicadores definidos | KPIs não monitorizados | Alta |\n"
                "| 7 | Controlo de documentos | Documentos em papel sem controlo | Sistema de gestão documental inexistente | Média |\n"
                "| 8 | Controlo de processos | Processos informais | Sem procedimentos documentados | Alta |\n"
                "| 9 | Auditoria interna | Nunca realizada | Ausência de programa de auditorias | Alta |\n"
                "| 10 | Ações corretivas | Tratamento informal | Sem registo de NCs e ações corretivas | Média |"
            )
            curto = "1. Nomear Responsável pela Qualidade\n2. Documentar Política da Qualidade\n3. Mapear processos críticos\n4. Definir KPIs prioritários"
            medio = "1. Elaborar procedimentos documentados\n2. Implementar controlo de documentos\n3. Realizar primeira auditoria interna\n4. Formar equipa interna"
            longo = "1. Ciclo completo de auditoria interna\n2. Revisão pela Direção formal\n3. Pré-auditoria com consultora\n4. Auditoria de certificação"
        elif norm == "ISO 22000":
            gaps = (
                "| 4 | Contexto da organização | Sem análise formal | Partes interessadas não identificadas | Alta |\n"
                "| 5 | Equipa HACCP | Responsável informal | Equipa multidisciplinar não formada | Alta |\n"
                "| 8.5 | Análise de perigos | Parcial (alguns perigos) | Plano HACCP incompleto | Crítica |\n"
                "| 8.5.4 | PCCs definidos | 0–2 PCCs | Limites críticos não validados | Crítica |\n"
                "| 7 | PPRs | Limpeza básica | PPRs não documentados nem monitorizados | Alta |\n"
                "| 8.9 | Rastreabilidade | Manual, parcial | Sistema de rastreabilidade não validado | Alta |\n"
                "| 9 | Auditorias internas | Inexistente | Ausência de programa de auditorias | Alta |"
            )
            curto = "1. Constituir equipa HACCP multidisciplinar\n2. Documentar PPRs básicos (limpeza, pragas, higiene pessoal)\n3. Realizar análise de perigos preliminar"
            medio = "1. Completar plano HACCP com PCCs e limites críticos\n2. Implementar sistema de rastreabilidade\n3. Primeira auditoria interna"
            longo = "1. Validação do plano HACCP\n2. Pré-auditoria FSSC/BRC\n3. Auditoria de certificação"
        else:
            gaps = (
                "| 4 | Contexto | Informal | Partes interessadas não mapeadas | Alta |\n"
                "| 5 | Política | Verbal | Não documentada formalmente | Alta |\n"
                "| 6 | Planeamento | Ad-hoc | Objetivos não mensuráveis | Média |\n"
                "| 7 | Documentação | Escassa | Procedimentos em falta | Alta |\n"
                "| 9 | Auditorias | Inexistente | Programa por criar | Alta |"
            )
            curto = "1. Nomear Responsável pelo sistema\n2. Documentar política\n3. Identificar requisitos legais"
            medio = "1. Elaborar procedimentos\n2. Realizar auditoria interna\n3. Definir indicadores"
            longo = "1. Ciclo completo de auditoria\n2. Revisão pela Direção\n3. Certificação"

        situacao = f"Empresa com maturidade **{maturity}** no sistema de gestão"
        if "anos" in last.lower() or "existe" in last.lower():
            situacao = "Empresa com sistema parcial existente — foco em atualização e formalização"

        return GAP_TEMPLATE.format(
            norma=norm or "ISO 9001",
            situacao=situacao,
            gaps=gaps,
            curto_prazo=curto,
            medio_prazo=medio,
            longo_prazo=longo,
        )

    elif intent == "docs":
        docs = kb["documentos"]
        lista = "\n".join(f"| {i+1} | {d} | Obrigatório |" for i, d in enumerate(docs))
        lista = "| # | Documento | Requisito |\n|---|-----------|----------|\n" + lista

        tipo_map = {"ISO 9001": ("QUALIDADE", "qualidade", "qualidade dos produtos e serviços"),
                    "ISO 22000": ("SEGURANÇA ALIMENTAR", "segurança alimentar", "segurança dos alimentos"),
                    "ISO 14001": ("AMBIENTE", "ambiental", "proteção ambiental"),
                    "ISO 45001": ("SST", "segurança e saúde no trabalho", "segurança dos trabalhadores")}
        t = tipo_map.get(norm, ("QUALIDADE", "qualidade", "qualidade"))

        return DOCS_TEMPLATE.format(
            norma=norm or "ISO 9001",
            lista=lista,
            politica_tipo=t[0],
            empresa_tipo="organização",
            politica_area=t[1],
        )

    elif intent == "audit":
        if norm == "ISO 9001":
            checklist = (
                "**Cláusula 4 — Contexto:**\n"
                "- [ ] Existe análise do contexto interno e externo documentada?\n"
                "- [ ] As partes interessadas e os seus requisitos estão identificados?\n"
                "- [ ] O âmbito do SGQ está definido e documentado?\n\n"
                "**Cláusula 5 — Liderança:**\n"
                "- [ ] A Política da Qualidade está documentada, comunicada e disponível?\n"
                "- [ ] As responsabilidades pela qualidade estão definidas?\n\n"
                "**Cláusula 6 — Planeamento:**\n"
                "- [ ] Os riscos e oportunidades foram identificados e tratados?\n"
                "- [ ] Os objetivos da qualidade são mensuráveis e monitorizados?\n\n"
                "**Cláusula 8 — Operação:**\n"
                "- [ ] Os processos críticos estão documentados?\n"
                "- [ ] Existe controlo de produtos/serviços não conformes?\n\n"
                "**Cláusula 9 — Avaliação:**\n"
                "- [ ] O programa de auditorias internas está implementado?\n"
                "- [ ] As revisões pela direção são realizadas e registadas?"
            )
        elif norm == "ISO 22000":
            checklist = (
                "**Pré-Requisitos (PPRs):**\n"
                "- [ ] Os PPRs estão documentados e em vigor?\n"
                "- [ ] Existe registo de monitorização dos PPRs?\n\n"
                "**Plano HACCP:**\n"
                "- [ ] Os perigos biológicos, químicos e físicos foram identificados?\n"
                "- [ ] Os PCCs e limites críticos estão validados?\n"
                "- [ ] Os registos de monitorização dos PCCs estão completos?\n\n"
                "**Rastreabilidade:**\n"
                "- [ ] O sistema de rastreabilidade permite identificar lotes em 4h?\n"
                "- [ ] Existe procedimento de retirada de produto testado?\n\n"
                "**Higiene e formação:**\n"
                "- [ ] Os colaboradores têm formação em higiene alimentar atualizada?\n"
                "- [ ] Existem registos de limpeza e desinfeção?"
            )
        else:
            checklist = (
                "**Geral:**\n"
                "- [ ] A política está documentada e comunicada?\n"
                "- [ ] Os objetivos são mensuráveis e monitorizados?\n"
                "- [ ] Os requisitos legais estão identificados e cumpridos?\n"
                "- [ ] Os procedimentos críticos estão documentados?\n"
                "- [ ] Existem registos de formação dos colaboradores?\n"
                "- [ ] As não conformidades são registadas e tratadas?\n"
                "- [ ] As auditorias internas são realizadas conforme plano?"
            )
        return AUDIT_TEMPLATE.format(norma=norm or "ISO 9001", checklist=checklist)

    elif intent == "plan":
        norm_display = norm or "ISO 9001"
        return f"""## Plano de Certificação — {norm_display}

### Fase 1: Diagnóstico e Preparação (Mês 1–2)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 1 | Nomear Responsável pelo sistema | Direção | Carta de nomeação |
| 2 | Realizar Gap Analysis completa | Resp. Sistema | Relatório de diagnóstico |
| 3 | Definir equipa de implementação | Resp. Sistema | Lista de equipa e funções |
| 4 | Elaborar cronograma detalhado | Resp. Sistema | Plano de projeto |
| 5 | Identificar requisitos legais aplicáveis | Resp. Sistema | Registo de requisitos legais |

### Fase 2: Desenvolvimento Documental (Mês 2–5)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 6 | Documentar Política e objetivos | Direção | Política + Objetivos |
| 7 | Mapear e documentar processos | Donos de processo | Mapa de processos + Procedimentos |
| 8 | Elaborar procedimentos obrigatórios | Resp. Sistema | Procedimentos documentados |
| 9 | Implementar controlo de documentos | Resp. Sistema | Lista mestra de documentos |
| 10 | Formar colaboradores na norma | Resp. Formação | Registos de formação |

### Fase 3: Implementação e Verificação (Mês 5–9)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 11 | Implementar procedimentos no terreno | Donos de processo | Registos de implementação |
| 12 | Realizar 1.ª auditoria interna | Auditor interno | Relatório de auditoria |
| 13 | Tratar não conformidades internas | Resp. Sistema | Planos de ação corretiva |
| 14 | Realizar Revisão pela Direção | Direção | Ata de revisão |

### Fase 4: Certificação (Mês 9–12)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 15 | Contactar e selecionar organismo certificador | Direção | Proposta/contrato |
| 16 | Pré-auditoria (opcional, recomendado) | Certificadora | Relatório de pré-auditoria |
| 17 | Tratar observações da pré-auditoria | Resp. Sistema | Plano de ação |
| 18 | **Auditoria de Certificação — Fase 1** (documental) | Certificadora | Relatório fase 1 |
| 19 | **Auditoria de Certificação — Fase 2** (no terreno) | Certificadora | Relatório fase 2 |
| 20 | Emissão do certificado | Certificadora | **Certificado {norm_display}** |

---
> 📋 Este plano é adaptável ao tamanho e maturidade da organização. Partilhe mais detalhes para o ajustar ao seu caso específico."""

    else:
        tema = norm if norm else "sistemas de gestão ISO"
        return GENERIC_RESPONSE.format(tema=tema)


# ─── HTTP Server ──────────────────────────────────────────────────────────────

class OllamaCompatHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # Suppress default HTTP logs

    def do_GET(self):
        if self.path.startswith("/api/tags"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = {"models": [{"name": "iso-consultant:latest", "modified_at": "2026-01-01T00:00:00Z"}]}
            self.wfile.write(json.dumps(payload).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path.startswith("/v1/chat/completions") or self.path.startswith("/api/chat"):
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            messages = body.get("messages", [])
            stream = body.get("stream", False)
            model = body.get("model", "iso-consultant:latest")

            response_text = build_response(messages)
            cid = f"chatcmpl-{uuid.uuid4().hex[:8]}"
            ts = int(time.time())

            if stream:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()

                # Stream word by word for a natural effect
                words = response_text.split(" ")
                chunk_size = 3
                for i in range(0, len(words), chunk_size):
                    chunk = " ".join(words[i:i+chunk_size])
                    if i + chunk_size < len(words):
                        chunk += " "
                    delta = {"id": cid, "object": "chat.completion.chunk", "created": ts,
                             "model": model, "choices": [{"delta": {"content": chunk}, "index": 0, "finish_reason": None}]}
                    self.wfile.write(f"data: {json.dumps(delta)}\n\n".encode())
                    self.wfile.flush()
                    time.sleep(0.02)

                done = {"id": cid, "object": "chat.completion.chunk", "created": ts,
                        "model": model, "choices": [{"delta": {}, "index": 0, "finish_reason": "stop"}]}
                self.wfile.write(f"data: {json.dumps(done)}\n\n".encode())
                self.wfile.write(b"data: [DONE]\n\n")
                self.wfile.flush()
            else:
                payload = {
                    "id": cid, "object": "chat.completion", "created": ts, "model": model,
                    "choices": [{"message": {"role": "assistant", "content": response_text},
                                 "index": 0, "finish_reason": "stop"}],
                    "usage": {"prompt_tokens": 100, "completion_tokens": len(response_text.split()), "total_tokens": 100 + len(response_text.split())}
                }
                body_bytes = json.dumps(payload).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body_bytes)))
                self.end_headers()
                self.wfile.write(body_bytes)
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 11434), OllamaCompatHandler)
    print("ISO Consultant mock server running on http://localhost:11434")
    print("Model: iso-consultant:latest")
    print("Endpoints: GET /api/tags  |  POST /v1/chat/completions")
    server.serve_forever()
