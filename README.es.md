[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | [日本語](README.ja.md) | Español

# oh-my-claudecode

[![npm version](https://img.shields.io/npm/v/oh-my-claude-sisyphus?color=cb3837)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-claude-sisyphus?color=blue)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![GitHub stars](https://img.shields.io/github/stars/z23cc/oh-my-claudecode?style=flat&color=yellow)](https://github.com/z23cc/oh-my-claudecode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤️-red?style=flat&logo=github)](https://github.com/sponsors/z23cc)

**Orquestación multi-agente para Claude Code. Curva de aprendizaje cero.**

*No aprendas Claude Code. Solo usa OMC.*

[Comenzar](#inicio-rápido) • [Documentación](https://yeachan-heo.github.io/oh-my-claudecode-website) • [Guía de Migración](docs/MIGRATION.md)

---

## Inicio Rápido

**Paso 1: Instalar**
```bash
/plugin marketplace add https://github.com/z23cc/oh-my-claudecode
/plugin install oh-my-claudecode
```

**Paso 2: Configurar**
```bash
/oh-my-claudecode:omc-setup
```

**Paso 3: Construye algo**
```
autopilot: build a REST API for managing tasks
```

Eso es todo. Todo lo demás es automático.

## Modo Team (Recomendado)

A partir de **v4.1.7**, **Team** es la superficie de orquestación canónica en OMC. Los puntos de entrada legacy como **swarm** y **ultrapilot** siguen soportados, pero ahora **se enrutan a Team internamente**.

```bash
/oh-my-claudecode:team 3:executor "fix all TypeScript errors"
```

Team se ejecuta como un pipeline por etapas:

`team-plan → team-prd → team-exec → team-verify → team-fix (bucle)`

Habilita los equipos nativos de Claude Code en `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> Si los equipos están deshabilitados, OMC te advertirá y recurrirá a la ejecución sin equipos cuando sea posible.

> **Nota: Nombre del paquete** — El proyecto usa la marca **oh-my-claudecode** (repositorio, plugin, comandos), pero el paquete npm se publica como [`oh-my-claude-sisyphus`](https://www.npmjs.com/package/oh-my-claude-sisyphus). Si instalas las herramientas CLI via npm/bun, usa `npm install -g oh-my-claude-sisyphus`.

### Actualizar

```bash
# 1. Actualizar el plugin
/plugin install oh-my-claudecode

# 2. Volver a ejecutar el setup para actualizar la configuracion
/oh-my-claudecode:omc-setup
```

Si experimentas problemas despues de actualizar, limpia la cache antigua del plugin:

```bash
/oh-my-claudecode:doctor
```

<h1 align="center">Tu Claude acaba de recibir esteroides.</h1>

<p align="center">
  <img src="assets/omc-character.jpg" alt="oh-my-claudecode" width="400" />
</p>

---

## ¿Por qué oh-my-claudecode?

- **Cero configuración requerida** - Funciona inmediatamente con valores predeterminados inteligentes
- **Orquestación Team-first** - Team es la superficie canónica multi-agente (swarm/ultrapilot son facades de compatibilidad)
- **Interfaz de lenguaje natural** - Sin comandos que memorizar, solo describe lo que quieres
- **Paralelización automática** - Tareas complejas distribuidas entre agentes especializados
- **Ejecución persistente** - No se rendirá hasta que el trabajo esté verificado y completo
- **Optimización de costos** - Enrutamiento inteligente de modelos ahorra 30-50% en tokens
- **Aprende de la experiencia** - Extrae y reutiliza automáticamente patrones de resolución de problemas
- **Visibilidad en tiempo real** - Barra de estado HUD muestra lo que está sucediendo internamente

---

## Características

### Modos de Ejecución
Múltiples estrategias para diferentes casos de uso - desde construcciones completamente autónomas hasta refactorización eficiente en tokens. [Aprende más →](https://yeachan-heo.github.io/oh-my-claudecode-website/docs.html#execution-modes)

| Modo | Descripción | Usar Para |
|------|-------------|---------|
| **Team (recomendado)** | Pipeline canónico (`team-plan → team-prd → team-exec → team-verify → team-fix`) | Agentes coordinados en lista de tareas compartida |
| **Autopilot** | Ejecución autónoma (agente líder único) | Trabajo de funcionalidades end-to-end con mínima ceremonia |
| **Ultrawork** | Máximo paralelismo (sin equipo) | Correcciones/refactorizaciones paralelas donde Team no es necesario |
| **Ralph** | Modo persistente con bucles de verificación/corrección | Tareas que deben completarse totalmente (sin parciales silenciosos) |
| **Ecomode** | Enrutamiento eficiente en tokens | Iteración consciente del presupuesto |
| **Pipeline** | Procesamiento secuencial por etapas | Transformaciones multi-etapa con orden estricto |
| **Swarm / Ultrapilot (legacy)** | Facades de compatibilidad que enrutan a **Team** | Flujos de trabajo existentes y documentación antigua |

### Orquestación Inteligente

- **32 agentes especializados** para arquitectura, investigación, diseño, pruebas, ciencia de datos
- **Enrutamiento inteligente de modelos** - Haiku para tareas simples, Opus para razonamiento complejo
- **Delegación automática** - El agente correcto para el trabajo, siempre

### Experiencia de Desarrollo

- **Palabras clave mágicas** - `ralph`, `ulw`, `eco`, `plan` para control explícito
- **Barra de estado HUD** - Métricas de orquestación en tiempo real en tu barra de estado
- **Aprendizaje de habilidades** - Extrae patrones reutilizables de tus sesiones
- **Análisis y seguimiento de costos** - Comprende el uso de tokens en todas las sesiones

[Lista completa de características →](docs/REFERENCE.md)

---

## Palabras Clave Mágicas

Atajos opcionales para usuarios avanzados. El lenguaje natural funciona bien sin ellas.

| Palabra Clave | Efecto | Ejemplo |
|---------|--------|---------|
| `team` | Orquestación Team canónica | `/oh-my-claudecode:team 3:executor "fix all TypeScript errors"` |
| `autopilot` | Ejecución completamente autónoma | `autopilot: build a todo app` |
| `ralph` | Modo persistencia | `ralph: refactor auth` |
| `ulw` | Máximo paralelismo | `ulw fix all errors` |
| `eco` | Ejecución eficiente en tokens | `eco: migrate database` |
| `plan` | Entrevista de planificación | `plan the API` |
| `ralplan` | Consenso de planificación iterativa | `ralplan this feature` |
| `swarm` | Palabra clave legacy (enruta a Team) | `swarm 5 agents: fix lint errors` |
| `ultrapilot` | Palabra clave legacy (enruta a Team) | `ultrapilot: build a fullstack app` |

**Notas:**
- **ralph incluye ultrawork:** Cuando activas el modo ralph, automáticamente incluye la ejecución paralela de ultrawork.
- La sintaxis `swarm N agents` sigue reconociéndose para extracción del conteo de agentes, pero el runtime es Team en v4.1.7+.

---

## Utilidades

### Espera de Límite de Tasa

Reanuda automáticamente sesiones de Claude Code cuando se reinician los límites de tasa.

```bash
omc wait          # Verificar estado, obtener orientación
omc wait --start  # Habilitar demonio de reanudación automática
omc wait --stop   # Deshabilitar demonio
```

**Requiere:** tmux (para detección de sesión)

---

## Documentación

- **[Referencia Completa](docs/REFERENCE.md)** - Documentación completa de características
- **[Monitoreo de Rendimiento](docs/PERFORMANCE-MONITORING.md)** - Seguimiento de agentes, depuración y optimización
- **[Sitio Web](https://yeachan-heo.github.io/oh-my-claudecode-website)** - Guías interactivas y ejemplos
- **[Guía de Migración](docs/MIGRATION.md)** - Actualización desde v2.x
- **[Arquitectura](docs/ARCHITECTURE.md)** - Cómo funciona internamente

---

## Seguridad y Fiabilidad

OMC está construido con seguridad de defensa en profundidad en toda la pila:

- **Bloqueo atómico de archivos** - Bloqueos a nivel kernel `O_CREAT|O_EXCL` previenen condiciones de carrera en tareas
- **Protección contra traversal de rutas** - Todas las operaciones de archivo validadas contra límites de directorio con resolución de symlinks
- **Prevención de inyección Shell** - `execFileSync` con arrays de argumentos en lugar de interpolación shell
- **Sanitización de entrada** - Validación regex en todos los IDs, refs de commits y rutas de archivos
- **Mitigación TOCTOU** - Patrón atómico de escritura-renombrado para todos los archivos de estado JSON
- **Protección ReDoS** - Patrones regex acotados con alternancia segura
- **Degradación elegante** - Todas las operaciones opcionales (evidencia git, heartbeat, auditoría) fallan de forma segura con logging diagnóstico
- **Compatibilidad macOS** - Resolución completa de symlinks para rutas `/var`→`/private/var`, `/tmp`→`/private/tmp`

---

## Requisitos

- CLI de [Claude Code](https://docs.anthropic.com/claude-code)
- Suscripción Claude Max/Pro O clave API de Anthropic

### Opcional: Orquestación Multi-IA

OMC puede opcionalmente orquestar proveedores de IA externos para validación cruzada y consistencia de diseño. **No son necesarios** — OMC funciona completamente sin ellos.

| Proveedor | Instalación | Qué habilita |
|-----------|-------------|--------------|
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli` | Revisión de diseño, consistencia UI (contexto de 1M tokens) |
| [Codex CLI](https://github.com/openai/codex) | `npm install -g @openai/codex` | Validación de arquitectura, verificación cruzada de código |

**Costo:** 3 planes Pro (Claude + Gemini + ChatGPT) cubren todo por ~$60/mes.

---

## Licencia

MIT

---

<div align="center">

**Inspirado por:** [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) • [claude-hud](https://github.com/ryanjoachim/claude-hud) • [Superpowers](https://github.com/NexTechFusion/Superpowers) • [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

**Curva de aprendizaje cero. Poder máximo.**

</div>

## Historial de Estrellas

[![Star History Chart](https://api.star-history.com/svg?repos=z23cc/oh-my-claudecode&type=date&legend=top-left)](https://www.star-history.com/#z23cc/oh-my-claudecode&type=date&legend=top-left)

## 💖 Apoya Este Proyecto

Si Oh-My-ClaudeCode ayuda a tu flujo de trabajo, considera patrocinar:

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-❤️-red?style=for-the-badge&logo=github)](https://github.com/sponsors/z23cc)

### ¿Por qué patrocinar?

- Mantener el desarrollo activo
- Soporte prioritario para patrocinadores
- Influir en la hoja de ruta y características
- Ayudar a mantener el software gratuito y de código abierto

### Otras formas de ayudar

- ⭐ Dale una estrella al repositorio
- 🐛 Reporta errores
- 💡 Sugiere características
- 📝 Contribuye código
