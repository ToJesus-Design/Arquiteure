#!/usr/bin/env bash
# Instala o Ollama (se necessário) e puxa o modelo para o Consultor ISO.
# Uso: bash scripts/setup-ollama.sh [modelo]
# Exemplo: bash scripts/setup-ollama.sh llama3.1:8b

set -euo pipefail

MODEL="${1:-llama3.1:8b}"

# ── Verificar se Ollama está instalado ────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  echo "Ollama não encontrado. A instalar…"
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -fsSL https://ollama.com/install.sh | sh
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS detetado. Descarregue o Ollama em https://ollama.com/download"
    exit 1
  else
    echo "SO não suportado automaticamente. Visite https://ollama.com/download"
    exit 1
  fi
fi

# ── Iniciar servidor Ollama em background (se não estiver a correr) ───────────
if ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
  echo "A iniciar servidor Ollama em background…"
  ollama serve &>/tmp/ollama.log &
  sleep 3
fi

# ── Puxar modelo ───────────────────────────────────────────────────────────────
echo "A descarregar modelo ${MODEL} (pode demorar na primeira vez)…"
ollama pull "$MODEL"

echo ""
echo "Modelo ${MODEL} pronto."
echo "Adicione ao .env (ou .env.local):"
echo "  OLLAMA_BASE_URL=http://localhost:11434/v1"
echo "  OLLAMA_MODEL=${MODEL}"
