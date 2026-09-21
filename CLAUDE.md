## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

---

## Graphify — grafo del código (INSTALADO)

Mapea el proyecto a un grafo que el agente consulta en vez de hacer `grep` por
los archivos. Mismo montaje que en `foody`. Apache-2.0 / MIT.

Estado actual del grafo: **3.338 nodos, 8.328 aristas, 177 comunidades**, a
partir de 530 archivos de código. Ocupa ~8,5 MB en `graphify-out/`, que ya está
en `.gitignore`.

Medido con `graphify benchmark` sobre este repo: **17× menos tokens por
consulta** que leer el corpus entero (222.533 tokens en bruto → ~13.117 de media
por consulta).

### Reconstruir el grafo

Se hace **en local, sin LLM ni API key**, y respeta `.gitignore` — por eso se
salta `node_modules/`, `.next/` y `dist/`:

```bash
graphify update .                     # incremental: solo lo que cambió
graphify extract . --code-only        # reconstrucción completa (añade --force tras un refactor grande)
graphify cluster-only . --no-label    # regenera GRAPH_REPORT.md y graph.html
```

`--no-label` deja las comunidades como «Community N». Ponerles nombre de verdad
requiere una API key; no hace falta.

**Está automatizado:** hay hooks `post-commit` y `post-checkout` en
`.git/hooks/`, así que tras cada commit se re-extraen solo los archivos que
cambiaron. Solo hay que reconstruir a mano tras un refactor que borre mucho
código (`graphify extract . --code-only --force`).

### Consultarlo

```bash
graphify query "cómo se calcula la rentabilidad con salarios"
graphify explain "extractAmounts"
graphify path "receipt-scanner-modal.tsx" "prisma"   # camino más corto entre dos nodos
graphify affected "extractAmounts"                   # qué se rompe si cambia
graphify god-nodes --top 12                          # los nodos más conectados
```

Dentro de Claude Code la skill está registrada como `/graphify`.

### Servidor MCP — OJO con el default

`graphify-mcp` está dado de alta como servidor MCP en la config de la app:

```
C:\Users\tucan\AppData\Roaming\Claude\claude_desktop_config.json
```

**Su grafo por defecto es el de foody, no el de este proyecto.** Es una entrada
única para toda la app, y se decidió no duplicarla: un segundo servidor cargaría
otra vez los ~10 esquemas de herramientas en todas las sesiones, que es
justo lo contrario de ahorrar tokens.

> **Regla obligatoria:** toda llamada a una herramienta `mcp__graphify__*` desde
> computoplus **debe** pasar
> `project_path="C:\Users\tucan\OneDrive\Desktop\computoplus"`.
> Sin ese parámetro la respuesta viene del grafo de **foody** y parecerá válida
> aunque hable de otro repo.

En Claude Code esto casi no aplica: los hooks `PreToolUse` empujan al CLI
`graphify query`, que resuelve el grafo desde el directorio actual y por tanto
siempre acierta. La regla importa en sesiones normales de la app de escritorio.

### Qué es de la máquina y qué es de este proyecto

| Pieza | Alcance |
|---|---|
| Comando `graphify` (en `Scripts\` de Python) | toda la máquina |
| Skill `/graphify` (en `~\.claude\skills\`) | todos los proyectos |
| Entrada MCP en la config de la app (default: foody) | toda la app |
| `graphify-out/` + hooks de git + `.claude/settings.json` | solo computoplus |

### Tras un clon limpio

`graphify-out/` y `.claude/` están en `.gitignore` (el grafo pesa 8,5 MB y los
hooks llevan rutas absolutas de la máquina). Para dejarlo como está aquí:

```bash
graphify extract . --code-only && graphify cluster-only . --no-label
graphify claude install    # hooks PreToolUse en .claude/settings.json
graphify hook install      # post-commit / post-checkout
```
