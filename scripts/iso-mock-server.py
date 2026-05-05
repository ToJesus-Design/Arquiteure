#!/usr/bin/env python3
"""
Motor de Conhecimento ISO Local — 100% gratuito, sem API, sem rede.
Expõe POST /v1/chat/completions compatível com OpenAI SDK (streaming SSE).
Suporta: ISO 9001, ISO 22000, ISO 14001, ISO 45001, ISO 50001.
"""
import json
import re
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

# ─── Base de conhecimento ISO ──────────────────────────────────────────────────

KNOWLEDGE = {
    "iso9001": {
        "nome": "ISO 9001:2015",
        "area": "Sistemas de Gestão da Qualidade",
        "clausulas": {
            "4": "Contexto da organização — contexto interno/externo, partes interessadas, âmbito, processos.",
            "5": "Liderança — comprometimento, política da qualidade, papéis e responsabilidades.",
            "6": "Planeamento — riscos e oportunidades, objetivos da qualidade, planeamento de mudanças.",
            "7": "Suporte — recursos humanos e infra-estrutura, competências, consciencialização, comunicação, informação documentada.",
            "8": "Operação — planeamento operacional, requisitos, conceção, controlo de produção, não conformidades.",
            "9": "Avaliação do desempenho — monitorização, satisfação do cliente, auditoria interna, revisão pela direção.",
            "10": "Melhoria — não conformidades, ações corretivas, melhoria contínua.",
        },
        "documentos_obrigatorios": [
            "Âmbito do SGQ (cl. 4.3)",
            "Política da Qualidade (cl. 5.2)",
            "Objetivos da Qualidade e respetivo plano (cl. 6.2)",
            "Competências dos colaboradores — evidências (cl. 7.2)",
            "Informação documentada de origem externa (cl. 7.5)",
            "Resultados de planeamento operacional (cl. 8.1)",
            "Resultados da revisão de requisitos (cl. 8.2.3)",
            "Registos de conceção e desenvolvimento (cl. 8.3) — se aplicável",
            "Resultados de avaliação de fornecedores (cl. 8.4)",
            "Identificação e rastreabilidade (cl. 8.5.2) — se aplicável",
            "Propriedade do cliente — incidências (cl. 8.5.3) — se aplicável",
            "Controlo de saídas não conformes (cl. 8.7)",
            "Resultados de monitorização e medição (cl. 9.1)",
            "Programa de auditorias internas (cl. 9.2)",
            "Relatórios de auditoria interna (cl. 9.2)",
            "Resultados da revisão pela direção (cl. 9.3)",
            "Não conformidades e ações corretivas (cl. 10.2)",
        ],
        "documentos_recomendados": [
            "Manual da Qualidade",
            "Mapa de Processos",
            "Procedimento de Controlo de Documentos e Registos",
            "Procedimento de Auditorias Internas",
            "Procedimento de Não Conformidades e Ações Corretivas",
            "Procedimento de Revisão pela Direção",
            "Fichas de processo (Process Approach)",
            "KPIs e Dashboard da Qualidade",
        ],
        "perguntas_auditoria": [
            "Mostre-me o âmbito documentado do SGQ e explique as exclusões.",
            "Como identifica e monitoriza os riscos e oportunidades?",
            "Qual o processo para tratar uma reclamação de cliente?",
            "Mostre os registos da última auditoria interna e as ações tomadas.",
            "Como garante a competência dos colaboradores em funções críticas?",
            "Demonstre o controlo de um produto não conforme — desde a deteção até ao fecho.",
            "Como são definidos e monitorizados os objetivos da qualidade?",
            "Mostre a última ata de revisão pela direção e as decisões tomadas.",
        ],
    },
    "iso22000": {
        "nome": "ISO 22000:2018",
        "area": "Sistemas de Gestão de Segurança Alimentar",
        "clausulas": {
            "4": "Contexto — partes interessadas, âmbito do SGSA, cadeia alimentar.",
            "5": "Liderança — política de segurança alimentar, equipa de segurança alimentar.",
            "6": "Planeamento — riscos e oportunidades, objetivos de segurança alimentar.",
            "7": "Suporte — recursos, infra-estrutura, ambiente, competências, comunicação interna/externa.",
            "8": "Operação — PPRs, rastreabilidade, preparação/resposta a emergências, controlo de perigos (HACCP), plano HACCP.",
            "8.5": "Análise de perigos — identificação de perigos, avaliação, seleção de medidas de controlo.",
            "8.5.4": "PCCs — pontos críticos de controlo, limites críticos, monitorização, ações corretivas.",
            "8.9": "Controlo de não conformidades — produtos potencialmente inseguros, retirada/recuperação.",
            "9": "Avaliação do desempenho — monitorização, validação/verificação, auditorias internas, revisão pela direção.",
            "10": "Melhoria — não conformidades, melhoria contínua, atualização do SGSA.",
        },
        "documentos_obrigatorios": [
            "Política de Segurança Alimentar (cl. 5.2)",
            "Âmbito do SGSA (cl. 4.3)",
            "Plano de Segurança Alimentar — Plano HACCP (cl. 8.5)",
            "Programas de Pré-Requisitos — PPRs (cl. 8.2)",
            "Procedimento de rastreabilidade (cl. 8.3)",
            "Plano de emergência — retirada/recuperação de produto (cl. 8.4)",
            "Registos de monitorização dos PCCs (cl. 8.5.4)",
            "Registos de verificação do plano HACCP (cl. 9.1)",
            "Relatórios de auditoria interna (cl. 9.2)",
            "Não conformidades e ações corretivas (cl. 10.1)",
            "Registo de calibração de equipamentos de medição (cl. 8.7)",
        ],
        "documentos_recomendados": [
            "Análise de perigos completa (biológicos, químicos, físicos, alergénios)",
            "Plano de controlo de alergénios",
            "Plano de limpeza e desinfeção (L&D) com registos",
            "Plano de controlo de pragas",
            "Plano de higiene pessoal e formação",
            "Especificações de matérias-primas e produto acabado",
            "Fluxograma do processo com descrição de cada etapa",
            "Plano de manutenção preventiva de equipamentos críticos",
            "Matriz de comunicação interna e externa (fornecedores, clientes, autoridades)",
        ],
        "perguntas_auditoria": [
            "Mostre o fluxograma do processo e confirme que foi verificado no terreno.",
            "Como identifica e controla os alergénios na sua linha de produção?",
            "Demonstre o sistema de rastreabilidade — simule a recuperação de um lote.",
            "Quais são os PCCs definidos? Mostre os limites críticos e os registos de monitorização.",
            "O que acontece quando um limite crítico é excedido? Mostre uma ocorrência real.",
            "Mostre os registos de L&D da última semana e explique a validação dos produtos utilizados.",
            "Como comunica incidentes de segurança alimentar às autoridades competentes?",
            "Demonstre a eficácia das medidas de controlo de pragas — mostre o mapa de iscos.",
        ],
    },
    "iso14001": {
        "nome": "ISO 14001:2015",
        "area": "Sistemas de Gestão Ambiental",
        "clausulas": {
            "4": "Contexto — questões ambientais internas/externas, partes interessadas, âmbito do SGA.",
            "5": "Liderança — comprometimento, política ambiental, responsabilidades.",
            "6": "Planeamento — aspetos ambientais significativos, obrigações de conformidade, riscos e oportunidades, objetivos.",
            "7": "Suporte — recursos, competências, consciencialização, comunicação interna/externa.",
            "8": "Operação — controlo operacional, ciclo de vida, preparação e resposta a emergências.",
            "9": "Avaliação — monitorização de indicadores ambientais, avaliação de conformidade, auditorias, revisão pela direção.",
            "10": "Melhoria — não conformidades, ações corretivas, melhoria contínua.",
        },
        "documentos_obrigatorios": [
            "Política Ambiental (cl. 5.2)",
            "Âmbito do SGA (cl. 4.3)",
            "Registo de aspetos e impactos ambientais (cl. 6.1.2)",
            "Registo de obrigações de conformidade — requisitos legais (cl. 6.1.3)",
            "Objetivos ambientais e planos de ação (cl. 6.2)",
            "Plano de preparação e resposta a emergências (cl. 8.2)",
            "Resultados de monitorização e medição (cl. 9.1)",
            "Avaliação de conformidade legal (cl. 9.1.2)",
            "Relatórios de auditoria interna (cl. 9.2)",
            "Resultados da revisão pela direção (cl. 9.3)",
            "Não conformidades e ações corretivas (cl. 10.2)",
        ],
        "documentos_recomendados": [
            "Registo de consumos energéticos e hídricos",
            "Plano de gestão de resíduos",
            "Fichas de dados de segurança (FDS) de produtos químicos",
            "Plano de monitorização de emissões e efluentes",
            "Procedimento de comunicação ambiental externa",
            "Registo de ocorrências ambientais e derramamentos",
            "Matriz de conformidade legal atualizada",
        ],
        "perguntas_auditoria": [
            "Mostre o registo de aspetos e impactos ambientais e explique a metodologia de avaliação.",
            "Como mantém atualizada a lista de requisitos legais ambientais aplicáveis?",
            "Demonstre o plano de resposta a emergência ambiental — simule um derramamento.",
            "Quais são os aspetos ambientais significativos? Como são controlados?",
            "Mostre os registos de monitorização de consumos e efluentes dos últimos 12 meses.",
            "Como é feita a gestão de resíduos perigosos? Mostre os manifestos.",
            "Mostre a avaliação de conformidade legal mais recente.",
        ],
    },
    "iso45001": {
        "nome": "ISO 45001:2018",
        "area": "Sistemas de Gestão de Segurança e Saúde no Trabalho",
        "clausulas": {
            "4": "Contexto — partes interessadas, âmbito do SGSST.",
            "5": "Liderança — política SST, consulta e participação dos trabalhadores.",
            "6": "Planeamento — identificação de perigos, avaliação de riscos profissionais, requisitos legais, objetivos.",
            "7": "Suporte — recursos, competências, consciencialização, comunicação, informação documentada.",
            "8": "Operação — controlo de perigos, gestão de mudanças, aquisição, contratação externa.",
            "9": "Avaliação — monitorização, investigação de acidentes/incidentes, auditorias internas, revisão pela direção.",
            "10": "Melhoria — incidentes, não conformidades, ações corretivas, melhoria contínua.",
        },
        "documentos_obrigatorios": [
            "Política de SST (cl. 5.2)",
            "Âmbito do SGSST (cl. 4.3)",
            "Metodologia de identificação de perigos e avaliação de riscos (cl. 6.1.2)",
            "Registo de perigos e avaliação de riscos profissionais (cl. 6.1.2)",
            "Registo de obrigações legais SST (cl. 6.1.3)",
            "Objetivos SST e planos para os atingir (cl. 6.2)",
            "Plano de emergência e evacuação (cl. 8.2)",
            "Registo de equipamentos de proteção individual — EPI (cl. 8.1.2)",
            "Resultados de monitorização e medição SST (cl. 9.1)",
            "Relatórios de investigação de acidentes e incidentes (cl. 9.1.1)",
            "Relatórios de auditoria interna (cl. 9.2)",
            "Resultados da revisão pela direção (cl. 9.3)",
            "Não conformidades e ações corretivas (cl. 10.2)",
        ],
        "documentos_recomendados": [
            "Fichas de aptidão médica dos trabalhadores",
            "Plano de formação e sensibilização SST",
            "Registos de simulacros de emergência",
            "Plano de inspeções de segurança periódicas",
            "Registo de trabalhos com risco especial (espaços confinados, trabalho em altura)",
            "Procedimento de permissão de trabalho (PTW)",
            "Relatórios de medições higiénicas (ruído, vibrações, agentes químicos)",
        ],
        "perguntas_auditoria": [
            "Mostre a avaliação de riscos para um posto de trabalho crítico e as medidas de controlo implementadas.",
            "Como é feita a investigação de acidentes? Mostre um caso real com causa raiz identificada.",
            "Demonstre o processo de consulta e participação dos trabalhadores na SST.",
            "Mostre o plano de emergência e os registos do último simulacro.",
            "Como controla os contratados externos em matéria de SST?",
            "Quais são os requisitos legais SST aplicáveis? Como verifica o seu cumprimento?",
            "Mostre os registos de entrega e verificação de EPI para os trabalhadores.",
        ],
    },
    "iso50001": {
        "nome": "ISO 50001:2018",
        "area": "Sistemas de Gestão de Energia",
        "clausulas": {
            "4": "Contexto — partes interessadas, âmbito do SGEn.",
            "5": "Liderança — política energética, responsável de energia.",
            "6": "Planeamento — revisão energética, linha de base, IDEn, objetivos.",
            "7": "Suporte — competências, comunicação, informação documentada.",
            "8": "Operação — controlo operacional de usos energéticos significativos.",
            "9": "Avaliação — monitorização de IDEn, auditorias energéticas, revisão pela direção.",
            "10": "Melhoria — não conformidades, melhoria do desempenho energético.",
        },
        "documentos_obrigatorios": [
            "Política Energética (cl. 5.2)",
            "Revisão Energética (cl. 6.3)",
            "Linha de Base Energética (cl. 6.4)",
            "Indicadores de Desempenho Energético — IDEn (cl. 6.4)",
            "Plano de medição energética (cl. 6.6)",
            "Objetivos energéticos e planos de ação (cl. 6.2)",
            "Registos de monitorização de consumos (cl. 9.1)",
            "Relatórios de auditoria interna (cl. 9.2)",
        ],
        "documentos_recomendados": [
            "Mapa de usos energéticos significativos (UES)",
            "Plano de manutenção de equipamentos consumidores de energia",
            "Procedimento de aquisição de equipamentos eficientes",
            "Registo de projetos de melhoria energética e poupanças obtidas",
        ],
        "perguntas_auditoria": [
            "Mostre a revisão energética — como identificou os usos energéticos significativos?",
            "Quais são os IDEn e como são monitorizados?",
            "Demonstre a evolução do desempenho energético face à linha de base.",
            "Como são controlados operacionalmente os maiores consumidores de energia?",
        ],
    },
}

# ─── Deteção de norma e intenção ─────────────────────────────────────────────

def detect_norm(text: str) -> str:
    t = text.lower()
    scores = {
        "ISO 50001": sum([
            3 if "50001" in t else 0,
            2 if "energia" in t or "energético" in t or "energétic" in t else 0,
            1 if "kw" in t or "kwh" in t or "consumo eléctric" in t else 0,
        ]),
        "ISO 22000": sum([
            3 if "22000" in t else 0,
            2 if "fssc" in t or "haccp" in t else 0,
            2 if "segurança alimentar" in t or "alimentar" in t else 0,
            1 if "pcc" in t or "ppr" in t or "rastreabilidade" in t else 0,
        ]),
        "ISO 14001": sum([
            3 if "14001" in t else 0,
            2 if "ambiental" in t or "ambiente" in t else 0,
            1 if "resíduo" in t or "emissão" in t or "efluente" in t else 0,
        ]),
        "ISO 45001": sum([
            3 if "45001" in t else 0,
            3 if "sst" in t else 0,
            2 if ("segurança" in t and "saúde" in t) else 0,
            1 if "acidente" in t or "perigo" in t or "risco profissional" in t else 0,
        ]),
        "ISO 9001": sum([
            3 if "9001" in t else 0,
            2 if "qualidade" in t else 0,
            1 if "sgq" in t or "cliente" in t or "satisfação" in t else 0,
        ]),
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else ""


def score_intent(text: str) -> str:
    t = text.lower()

    weights = {
        "audit": {
            "auditoria interna": 5, "auditoria externa": 5, "auditor": 3,
            "checklist": 4, "não conformidade": 4, " nc ": 3,
            "certificadora": 3, "preparar auditoria": 5,
            "simula perguntas": 5, "perguntas do auditor": 5,
            "verificação": 2, "evidência": 2,
        },
        "docs": {
            "documento": 4, "política": 4, "procedimento": 4,
            "formulário": 3, "registo": 3, "instrução de trabalho": 4,
            "manual": 3, "template": 4, "modelo de": 4,
            "escreve": 3, "redige": 3, "cria um": 2,
            "obrigatórios para": 4, "que documentos": 4,
            "informação documentada": 4,
        },
        "gap": {
            "gap": 5, "diagnós": 5, "análise": 3, "lacuna": 5,
            "situação atual": 4, "estado atual": 4,
            "o que nos falta": 5, "o que falta": 4, "o que precis": 4,
            "nunca tiv": 4, "sem sistema": 5, "sem qualquer": 4,
            "quais são os requisitos": 4, "não cumprimos": 5,
            "implementar iso": 5, "de raiz": 5, "implementação": 3,
            "ponto de situação": 4, "onde estamos": 4,
        },
        "plan": {
            "por onde começo": 5, "por onde começar": 5,
            "cronograma": 5, "fases": 3, "meses para": 4,
            "certificar em": 4, "quando posso": 4, "quanto demora": 5,
            "como certificar": 5, "passos para": 4, "etapas": 3,
            "plano de implementação": 5, "plano de certificação": 5,
            "quanto tempo": 4,
        },
        "concepts": {
            "o que é": 3, "o que significa": 3, "explica": 2,
            "diferença entre": 4, "para que serve": 3, "como funciona": 3,
            "pdca": 4, "deming": 3, "kaizen": 3, "melhoria contínua": 2,
            "ciclo de": 3, "abordagem por processos": 4,
        },
    }

    scores = {intent: 0 for intent in weights}
    for intent, kws in weights.items():
        for kw, w in kws.items():
            if kw in t:
                scores[intent] += w

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        # context fallback
        if any(w in t for w in ["trabalhadores", "empresa", "fábrica", "indústria",
                                  "temos", "nunca", "queremos", "precisamos", "colaboradores"]):
            return "gap"
        return "generic"
    return best


# ─── Templates de resposta ────────────────────────────────────────────────────

def response_gap(norm: str, kb: dict, last_msg: str) -> str:
    t = last_msg.lower()

    # Detect maturity
    if any(w in t for w in ["nunca", "nenhum", "sem sistema", "zero", "raiz", "inexistente"]):
        maturity = "inicial (0%–20%)"
        prefix = "A empresa parte **de raiz**, sem sistema de gestão formal."
    elif any(w in t for w in ["algum", "parcial", "existe", "temos alguns", "básico"]):
        maturity = "em desenvolvimento (20%–60%)"
        prefix = "A empresa tem bases informais — foco em **formalização e sistematização**."
    else:
        maturity = "a avaliar"
        prefix = "Diagnóstico baseado na descrição fornecida."

    # Build clause gap table
    rows = []
    for cl, desc in kb["clausulas"].items():
        rows.append(f"| {cl} | {desc.split('—')[0].strip()} | Não implementado | Alta |")
    gaps_table = "\n".join(rows[:7])

    # Count docs
    n_docs = len(kb["documentos_obrigatorios"])

    return f"""## Gap Analysis — {kb['nome']}

{prefix}

**Maturidade estimada:** {maturity}

### Tabela de lacunas identificadas

| Cláusula | Área | Situação Atual | Prioridade |
|----------|------|----------------|------------|
{gaps_table}

### Documentação em falta

A {kb['nome']} exige **{n_docs} registos e documentos obrigatórios**. Os mais críticos para iniciar:

1. **{kb['documentos_obrigatorios'][0]}** — documento âncora do sistema
2. **{kb['documentos_obrigatorios'][1]}** — comprometimento da gestão de topo
3. **{kb['documentos_obrigatorios'][2]}** — base do sistema operacional

### Plano de ação recomendado

**Curto prazo (0–3 meses):**
- Nomear Responsável pelo sistema de gestão
- Documentar a Política e o âmbito
- Mapear os processos/atividades críticas
- Identificar requisitos legais aplicáveis

**Médio prazo (3–6 meses):**
- Elaborar procedimentos e documentos obrigatórios
- Formar a equipa interna na norma
- Implementar controlos operacionais
- Realizar a 1.ª auditoria interna

**Longo prazo (6–12 meses):**
- Ciclo completo de auditoria interna
- Revisão pela Direção formal
- Pré-auditoria com organismo certificador
- **Auditoria de certificação**

---
> ⚠️ Este diagnóstico é preliminar. Para um gap analysis detalhado cláusula a cláusula, descreva os processos específicos da sua empresa e o setor de atividade."""


def response_docs(norm: str, kb: dict, last_msg: str) -> str:
    t = last_msg.lower()

    # Check if asking for a specific document type
    if "política" in t:
        tipo = kb["area"]
        area_lower = tipo.lower()
        area_short = tipo.split(" de ")[-1] if " de " in tipo else tipo.lower()
        return f"""## Modelo de Política — {kb['nome']}

---

### POLÍTICA DE {kb['area'].upper()}

A nossa organização reconhece a importância da **{area_short}** como fator estratégico e compromete-se a:

1. **Cumprir os requisitos** aplicáveis, incluindo os requisitos legais e regulamentares em vigor.
2. **Melhorar continuamente** a eficácia do sistema de gestão e o desempenho em {area_short}.
3. **Envolver e sensibilizar** todos os colaboradores, fornecedores e partes interessadas.
4. **Definir objetivos mensuráveis**, monitorizá-los regularmente e garantir os recursos necessários.
5. **Prevenir** não conformidades, incidentes e impactos negativos através de uma abordagem proativa ao risco.
6. **Comunicar** esta política interna e externamente, garantindo que é compreendida por todos.

Esta política é aprovada pela Gestão de Topo, comunicada a toda a organização e revista anualmente.

**Elaborado por:** ___________________
**Aprovado por:** ___________________ (Administração/Direção)
**Data de aprovação:** _______________
**Próxima revisão:** _________________

---
> Adapte os pontos ao contexto específico da sua organização. A política deve ser **concisa (1 página)**, realista e alinhada com a estratégia do negócio."""

    if "procedimento" in t or "auditoria" in t:
        return f"""## Modelo de Procedimento — Auditorias Internas ({kb['nome']})

**Código:** PRO-AI-001 | **Versão:** 1.0 | **Data:** ___________

---

### 1. Objetivo
Definir a metodologia para planear, executar e registar auditorias internas ao sistema de gestão, assegurando a conformidade com os requisitos da {kb['nome']}.

### 2. Âmbito
Aplicável a todos os processos e áreas incluídos no âmbito do sistema de gestão.

### 3. Responsabilidades
| Função | Responsabilidade |
|--------|-----------------|
| Responsável do Sistema | Elaborar o Programa Anual de Auditorias |
| Auditor Interno | Executar auditorias, emitir relatórios |
| Auditado | Colaborar e implementar ações corretivas |
| Gestão de Topo | Analisar resultados na Revisão pela Direção |

### 4. Processo

**4.1 Programa Anual de Auditorias**
- Elaborado anualmente pelo Responsável do Sistema
- Cobre todos os processos num ciclo de 12 meses
- Tem em conta os resultados das auditorias anteriores e a importância dos processos

**4.2 Preparação**
- O auditor prepara o plano de auditoria (cláusulas, áreas, data, duração)
- Comunica ao auditado com antecedência mínima de 5 dias úteis
- Prepara a checklist baseada nos requisitos da norma e procedimentos internos

**4.3 Execução**
- Reunião de abertura: apresentação do plano e objetivos
- Recolha de evidências: entrevistas, observação, análise documental
- Reunião de encerramento: apresentação das constatações

**4.4 Relatório**
- Emitido no prazo de 5 dias úteis após a auditoria
- Inclui: conformidades, não conformidades (NC) e observações
- Classificação das NC: Maior (requisito não implementado) / Menor (falha pontual)

**4.5 Seguimento**
- O auditado propõe ação corretiva no prazo de 10 dias úteis
- O auditor verifica a eficácia no prazo acordado
- O Responsável do Sistema regista o fecho da NC

### 5. Registos
- FRM-AI-001 Programa Anual de Auditorias
- FRM-AI-002 Plano de Auditoria
- FRM-AI-003 Checklist de Auditoria
- FRM-AI-004 Relatório de Auditoria
- FRM-NC-001 Relatório de Não Conformidade e Ação Corretiva

---
> Adapte os códigos e prazos à sua organização."""

    # Default: full document list
    obrig = "\n".join(f"| {i+1} | {d} | ✅ Obrigatório |"
                      for i, d in enumerate(kb["documentos_obrigatorios"]))
    recom = "\n".join(f"| {i+1} | {d} | ⭐ Recomendado |"
                      for i, d in enumerate(kb["documentos_recomendados"]))

    return f"""## Documentação — {kb['nome']}

### Documentos e Registos Obrigatórios

| # | Documento / Registo | Requisito |
|---|---------------------|-----------|
{obrig}

### Documentos Recomendados (boas práticas)

| # | Documento | Tipo |
|---|-----------|------|
{recom}

### Dicas de implementação

**Estrutura documental sugerida (3 níveis):**
```
Nível 1: Política e Manual (visão estratégica)
Nível 2: Procedimentos (como fazer — Quem, O quê, Quando)
Nível 3: Instruções de Trabalho + Formulários/Registos (evidências)
```

**Controlo de documentos:**
- Use uma **Lista Mestra de Documentos** com código, versão, data e responsável
- Defina um sistema de revisão periódica (ex.: revisão anual ou por alteração significativa)
- Garanta que versões obsoletas são retiradas de circulação

Quer que elabore um **template específico** de algum destes documentos? Diga qual e adapto ao seu contexto."""


def response_audit(norm: str, kb: dict, last_msg: str) -> str:
    perguntas = "\n".join(f"- [ ] {p}" for p in kb["perguntas_auditoria"])
    clausulas_check = "\n".join(
        f"- [ ] Cláusula {cl}: {desc}" for cl, desc in list(kb["clausulas"].items())[:6]
    )

    return f"""## Preparação para Auditoria — {kb['nome']}

### Plano de Auditoria Interna (modelo)

| # | Cláusula(s) | Processo / Área | Auditor | Data Prevista | Duração |
|---|-------------|-----------------|---------|---------------|---------|
| 1 | 4–5 | Contexto e Liderança | Auditor Interno A | T+1 mês | 2h |
| 2 | 6–7 | Planeamento e Suporte | Auditor Interno A | T+1 mês | 3h |
| 3 | 8 | Operação / Produção | Auditor Interno B | T+2 meses | 4h |
| 4 | 9 | Avaliação do Desempenho | Auditor Interno B | T+2 meses | 2h |
| 5 | 10 | Melhoria | Auditor Interno A | T+3 meses | 1h |

### Checklist de conformidade por cláusula

{clausulas_check}

### Perguntas típicas do auditor certificador

{perguntas}

### Modelo de Relatório de Não Conformidade (NC)

---
**RELATÓRIO DE NÃO CONFORMIDADE — {kb['nome']}**

- **Nº NC:** NC-[ano]-[seq]
- **Data:** ___________
- **Cláusula / Requisito:** ___________
- **Processo / Área:** ___________
- **Tipo:** ☐ Maior  ☐ Menor  ☐ Observação
- **Descrição da NC (evidências objetivas):**
  _________________________________________
- **Causa raiz (5 Porquês / Diagrama de Ishikawa):**
  _________________________________________
- **Ação corretiva proposta:**
  _________________________________________
- **Responsável:** ___________ | **Prazo:** ___________
- **Data de verificação de eficácia:** ___________
- **Resultado da verificação:** ☐ Eficaz  ☐ Não eficaz (reabrir)
- **Auditor:** ___________ | **Auditado:** ___________

---

### O que o auditor NUNCA aceita sem evidência

1. **Declarações verbais** — tudo precisa de registo documentado
2. **Datas inconsistentes** — os documentos devem ter datas credíveis
3. **Desconhecimento da política** — qualquer colaborador deve saber resumir a política
4. **NC sem causa raiz** — a ação corretiva tem de atacar a causa, não o sintoma
5. **Objetivos sem dados de monitorização** — os KPIs precisam de histórico

Quer que simule perguntas de auditoria para uma cláusula específica?"""


def response_plan(norm: str, kb: dict) -> str:
    return f"""## Plano de Certificação — {kb['nome']}

### Visão geral do projeto (12 meses tipo)

```
Mês  1-2  │ DIAGNÓSTICO ──────────────────────────────│
Mês  2-5  │            DESENVOLVIMENTO DOCUMENTAL ────│
Mês  4-7  │                        IMPLEMENTAÇÃO ────│
Mês  6-8  │                              FORMAÇÃO ───│
Mês  8-10 │                        AUDITORIA INTERNA │
Mês 10-11 │                        REVISÃO DIREÇÃO  │
Mês 11-12 │                             CERTIFICAÇÃO │
```

### Fase 1 — Diagnóstico e Preparação (Mês 1–2)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 1 | Nomear Responsável pelo sistema | Direção | Carta de nomeação |
| 2 | Realizar Gap Analysis completa | Resp. Sistema | Relatório de diagnóstico |
| 3 | Constituir equipa de projeto | Resp. Sistema | Lista de equipa + funções |
| 4 | Elaborar cronograma detalhado | Resp. Sistema | Plano de projeto |
| 5 | Identificar requisitos legais aplicáveis | Resp. Sistema + Jurídico | Registo de req. legais |

### Fase 2 — Desenvolvimento Documental (Mês 2–5)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 6 | Documentar Política e âmbito | Direção | Política aprovada |
| 7 | Mapear e documentar processos | Donos de processo | Mapa de processos |
| 8 | Elaborar procedimentos obrigatórios | Resp. Sistema | Procedimentos v1.0 |
| 9 | Implementar controlo documental | Resp. Sistema | Lista mestra |
| 10 | Elaborar formulários e registos | Resp. Sistema | Formulários v1.0 |

### Fase 3 — Implementação e Formação (Mês 4–8)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 11 | Formação na norma para toda a equipa | Resp. Formação | Registos de formação |
| 12 | Implementar procedimentos no terreno | Donos de processo | Evidências de implementação |
| 13 | Definir e monitorizar KPIs | Resp. Sistema | Dashboard de indicadores |
| 14 | Tratar não conformidades internas | Resp. Sistema | Registos de NC e AC |

### Fase 4 — Verificação (Mês 8–10)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 15 | Realizar 1.ª Auditoria Interna completa | Auditor Interno | Relatório de auditoria |
| 16 | Tratar NCs da auditoria interna | Resp. Sistema | Planos de ação corretiva |
| 17 | Revisão pela Direção | Direção | Ata de revisão |

### Fase 5 — Certificação (Mês 10–12)

| # | Ação | Responsável | Artefacto |
|---|------|-------------|-----------|
| 18 | Selecionar e contratar organismo certificador | Direção | Contrato de certificação |
| 19 | Pré-auditoria (recomendado) | Certificadora | Relatório de pré-auditoria |
| 20 | Tratar observações da pré-auditoria | Resp. Sistema | Plano de ação |
| 21 | **Auditoria Fase 1** (revisão documental) | Certificadora | Relatório fase 1 |
| 22 | **Auditoria Fase 2** (verificação no terreno) | Certificadora | Relatório fase 2 |
| 23 | **Emissão do Certificado** | Certificadora | 🏆 **Certificado {kb['nome']}** |

### Organismos certificadores em Portugal (referência)

- **SGS Portugal** — sgsglobal.com/pt-PT
- **Bureau Veritas** — bureauveritas.pt
- **TÜV Rheinland Portugal** — tuv.com/portugal
- **APCER** — apcer.pt
- **EIC** — eic.pt

---
> 📋 Este plano é ajustável ao tamanho e maturidade da organização. Uma empresa com sistema parcial existente pode comprimir este plano para 6–8 meses."""


def response_concepts(last_msg: str) -> str:
    t = last_msg.lower()

    if "pdca" in t or "deming" in t:
        return """## Ciclo PDCA — Fundamento dos Sistemas de Gestão ISO

O **Ciclo PDCA** (também chamado Ciclo de Deming) é o modelo de melhoria contínua que serve de base a todas as normas ISO de sistemas de gestão.

```
        ┌─────────────────────────────────┐
        │           P — PLAN              │
        │  Planear: definir objetivos,    │
        │  identificar riscos, estabelecer│
        │  processos para atingir metas   │
        └───────────┬─────────────────────┘
                    │
    ┌───────────────▼────────────────┐
    │         D — DO                 │
    │ Executar: implementar o que    │
    │ foi planeado, recolher dados   │
    └───────────┬────────────────────┘
                │
    ┌───────────▼────────────────────┐
    │         C — CHECK              │
    │ Verificar: auditorias internas,│
    │ análise de indicadores,        │
    │ revisão pela direção           │
    └───────────┬────────────────────┘
                │
    ┌───────────▼────────────────────┐
    │         A — ACT                │
    │ Agir: ações corretivas,        │
    │ melhoria contínua, atualização │
    │ do sistema                     │
    └────────────────────────────────┘
```

**Na prática:**
- **Auditoria interna** → fase CHECK
- **Ação corretiva** → fase ACT
- **Objetivos da qualidade** → fase PLAN
- **Procedimentos operacionais** → fase DO

Todas as cláusulas 6 a 10 das normas ISO seguem esta estrutura."""

    if "diferença" in t and ("nc" in t or "não conformidade" in t or "observação" in t):
        return """## NC vs. Observação vs. Oportunidade de Melhoria

| Conceito | Definição | Prazo de resposta | Exemplo |
|----------|-----------|-------------------|---------|
| **Não Conformidade Maior (NC Maior)** | Requisito da norma completamente ausente ou falha sistemática | Obrigatório antes da certificação | Nunca foi feita uma auditoria interna |
| **Não Conformidade Menor (NC Menor)** | Falha pontual num requisito implementado | 3–6 meses | Um registo de calibração em falta |
| **Observação** | Ponto de atenção — pode tornar-se NC no futuro | Sem prazo obrigatório | Procedimento desatualizado mas ainda correto |
| **Oportunidade de Melhoria (OM)** | Sugestão do auditor — não é falha | Opcional | "Poderiam automatizar este registo" |

**Regra de ouro:** Uma NC Maior impede a emissão do certificado. Uma NC Menor permite certificar com prazo de resolução. Observações não bloqueiam."""

    if "abordagem por processos" in t or "process approach" in t:
        return """## Abordagem por Processos (ISO 9001 cl. 4.4)

A **abordagem por processos** é uma das 7 bases das normas ISO. Em vez de gerir a organização por departamentos isolados, gere-se por **processos que criam valor**.

### Tipos de processos

| Tipo | Descrição | Exemplos |
|------|-----------|---------|
| **Processos de gestão** | Definem a estratégia e governam o sistema | Gestão da qualidade, Revisão pela direção |
| **Processos operacionais** | Criam diretamente valor para o cliente | Produção, Prestação de serviço, Vendas |
| **Processos de suporte** | Apoiam os operacionais | RH, Compras, Manutenção, TI |

### Componentes de uma ficha de processo
- **Entradas** (inputs) e **Saídas** (outputs)
- **Dono do processo** (responsável)
- **Indicadores de desempenho** (KPIs)
- **Riscos** associados
- **Recursos** necessários
- **Documentos** relacionados

Quer um template de ficha de processo?"""

    return """## Conceitos fundamentais dos Sistemas de Gestão ISO

### As 7 bases comuns às normas ISO (Anexo SL)

| # | Princípio | Descrição prática |
|---|-----------|-------------------|
| 1 | **Foco no cliente** | Compreender e superar as expetativas dos clientes |
| 2 | **Liderança** | Gestão de topo comprometida e visível |
| 3 | **Envolvimento das pessoas** | Colaboradores competentes e motivados |
| 4 | **Abordagem por processos** | Gerir atividades como processos interligados |
| 5 | **Melhoria** | Ciclo PDCA contínuo |
| 6 | **Tomada de decisão baseada em evidências** | Dados e análises — não intuição |
| 7 | **Gestão das relações** | Fornecedores e partes interessadas como parceiros |

### Estrutura de Alto Nível (Anexo SL / HLS)
Todas as normas ISO de sistemas de gestão partilham a **mesma estrutura de 10 cláusulas**. Isto permite **integrar** vários sistemas (ex.: ISO 9001 + ISO 14001 + ISO 45001) numa única estrutura documental — poupando recursos e reduzindo a burocracia.

Qual o conceito que quer aprofundar?"""


def response_generic(norm: str, last_msg: str) -> str:
    n = norm or "sistemas de gestão ISO"
    return f"""Boa questão sobre **{n}**. Posso ajudá-lo em cinco áreas:

### O que posso fazer por si

| Área | Descrição | Como pedir |
|------|-----------|------------|
| 🔍 **Gap Analysis** | Diagnóstico face à norma — identifico as lacunas e prioridades | "Faz um diagnóstico da minha empresa" |
| 📋 **Plano de Certificação** | Cronograma faseado com ações, responsáveis e artefactos | "Cria um plano para certificar em 9 meses" |
| 📄 **Documentação** | Políticas, procedimentos, formulários, registos prontos a usar | "Que documentos preciso?" ou "Cria uma política de qualidade" |
| ✅ **Auditorias Internas** | Planos, checklists e modelos de NC | "Prepara-me para a auditoria interna" |
| 🎓 **Conceitos e dúvidas** | Explicações sobre a norma, PDCA, diferenças entre NCs, etc. | "O que é o PDCA?" |

### Para uma resposta mais precisa, diga-me:
- **Norma ISO** pretendida: ISO 9001, ISO 22000, ISO 14001, ISO 45001, ISO 50001?
- **Setor** da empresa: indústria alimentar, construção, serviços, manufatura, saúde...?
- **Ponto de situação**: está a implementar de raiz ou já tem um sistema parcial?
- **Prazo**: qual o objetivo de certificação?

Estou aqui para apoiar todo o processo — da análise inicial à preparação para auditoria."""


# ─── Construção da resposta ───────────────────────────────────────────────────

def build_response(messages: list) -> str:
    user_msgs = [m["content"] for m in messages if m.get("role") == "user"]
    sys_msgs  = [m["content"] for m in messages if m.get("role") == "system"]

    if not user_msgs:
        return response_generic("", "")

    last = user_msgs[-1]

    # Extract norm from system context section only (avoid false positives from full prompt)
    sys_ctx = ""
    for s in sys_msgs:
        if "Contexto desta sessão" in s:
            sys_ctx = s.split("## Contexto desta sessão")[-1]

    # Combine all user messages for norm detection (accumulates context across turns)
    all_user = " ".join(user_msgs)
    norm_src = sys_ctx + " " + all_user
    norm = detect_norm(norm_src)
    intent = score_intent(last)

    norm_key = norm.lower().replace(" ", "").replace(":", "").replace(".", "")
    kb = KNOWLEDGE.get(norm_key, KNOWLEDGE["iso9001"])
    if not norm:
        norm = "ISO 9001"
        kb = KNOWLEDGE["iso9001"]

    if intent == "gap":
        return response_gap(norm, kb, last)
    elif intent == "docs":
        return response_docs(norm, kb, last)
    elif intent == "audit":
        return response_audit(norm, kb, last)
    elif intent == "plan":
        return response_plan(norm, kb)
    elif intent == "concepts":
        return response_concepts(last)
    else:
        return response_generic(norm, last)


# ─── HTTP Server ──────────────────────────────────────────────────────────────

class ISOKnowledgeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # Silent mode

    def do_GET(self):
        if self.path.startswith("/api/tags"):
            self._json({"models": [
                {"name": "iso-consultant:latest", "modified_at": "2026-01-01T00:00:00Z",
                 "size": 0, "digest": "local"}
            ]})
        elif self.path == "/health":
            self._json({"status": "ok", "engine": "ISO Knowledge Engine v2", "free": True})
        else:
            self.send_response(404); self.end_headers()

    def do_POST(self):
        if self.path.startswith("/v1/chat/completions") or self.path.startswith("/api/chat"):
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            messages = body.get("messages", [])
            stream = body.get("stream", False)
            model = body.get("model", "iso-consultant:latest")

            text = build_response(messages)
            cid = f"chatcmpl-{uuid.uuid4().hex[:8]}"
            ts = int(time.time())

            if stream:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                # Stream in small word groups for natural feel
                words = text.split(" ")
                chunk_size = 4
                for i in range(0, len(words), chunk_size):
                    chunk = " ".join(words[i:i+chunk_size])
                    if i + chunk_size < len(words):
                        chunk += " "
                    delta = {
                        "id": cid, "object": "chat.completion.chunk",
                        "created": ts, "model": model,
                        "choices": [{"delta": {"content": chunk}, "index": 0, "finish_reason": None}]
                    }
                    try:
                        self.wfile.write(f"data: {json.dumps(delta)}\n\n".encode())
                        self.wfile.flush()
                    except BrokenPipeError:
                        return
                    time.sleep(0.018)

                done = {
                    "id": cid, "object": "chat.completion.chunk",
                    "created": ts, "model": model,
                    "choices": [{"delta": {}, "index": 0, "finish_reason": "stop"}]
                }
                try:
                    self.wfile.write(f"data: {json.dumps(done)}\n\n".encode())
                    self.wfile.write(b"data: [DONE]\n\n")
                    self.wfile.flush()
                except BrokenPipeError:
                    pass
            else:
                payload = {
                    "id": cid, "object": "chat.completion", "created": ts, "model": model,
                    "choices": [{"message": {"role": "assistant", "content": text},
                                 "index": 0, "finish_reason": "stop"}],
                    "usage": {"prompt_tokens": 50, "completion_tokens": len(text.split()),
                              "total_tokens": 50 + len(text.split())}
                }
                self._json(payload)
        else:
            self.send_response(404); self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def _json(self, data: dict):
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = 11434
    server = HTTPServer(("0.0.0.0", port), ISOKnowledgeHandler)
    print(f"╔══════════════════════════════════════════════════════╗")
    print(f"║   Motor de Conhecimento ISO — 100% Local e Gratuito ║")
    print(f"║   http://localhost:{port}                              ║")
    print(f"║   Normas: ISO 9001 · 22000 · 14001 · 45001 · 50001  ║")
    print(f"║   Sem API · Sem rede · Sem custo                    ║")
    print(f"╚══════════════════════════════════════════════════════╝")
    server.serve_forever()
