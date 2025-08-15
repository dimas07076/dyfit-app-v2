set -euo pipefail

OUT_DIR="export_txt_$(date +%Y%m%d_%H%M%S)"
MAX_LINES="${1:-4000}"   # use: ./export_source_txt.sh 5000 (ou o número que quiser)
mkdir -p "$OUT_DIR"

COMBINED="$OUT_DIR/projeto_completo.txt"

# Lista de arquivos (ordenada, e ignorando pastas pesadas)
mapfile -t FILES < <(find . -type f \
  \( -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.json" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/coverage/*" \
  -not -path "*/.vercel/*" \
  -not -path "*/.git/*" \
  -not -path "*/.turbo/*" \
  -not -path "*/.pnpm-store/*" \
| LC_ALL=C sort)

# Gera o .txt combinado com cabeçalho por arquivo
: > "$COMBINED"
for f in "${FILES[@]}"; do
  echo "===== ${f#./} =====" >> "$COMBINED"
  cat "$f" >> "$COMBINED"
  printf "\n\n" >> "$COMBINED"
done

# Divide por número de linhas
split -d -a 3 -l "$MAX_LINES" "$COMBINED" "$OUT_DIR/parte_"

# Renomeia as partes para .txt
for p in "$OUT_DIR"/parte_*; do mv "$p" "${p}.txt"; done

# Manifesto
MANIFEST="$OUT_DIR/manifest.txt"
{
  echo "Export timestamp: $(date -Is)"
  echo "Max lines per part: $MAX_LINES"
  echo "Total source files: ${#FILES[@]}"
  echo
  echo "Included files (in order):"
  for f in "${FILES[@]}"; do echo "${f#./}"; done
  echo
  echo "Parts generated:"
  ls -1 "$OUT_DIR"/parte_*.txt
} > "$MANIFEST"

# ZIP opcional (pronto pra baixar)
ZIP="$OUT_DIR.zip"
zip -q -j "$ZIP" "$OUT_DIR"/parte_*.txt "$MANIFEST"

echo
echo "✅ Pronto!"
echo "Pasta de saída:  $OUT_DIR"
echo "Arquivo ZIP:     $ZIP"
