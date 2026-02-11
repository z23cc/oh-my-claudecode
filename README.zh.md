[English](README.md) | [한국어](README.ko.md) | 中文 | [日本語](README.ja.md) | [Español](README.es.md)

# oh-my-claudecode

[![npm version](https://img.shields.io/npm/v/oh-my-claude-sisyphus?color=cb3837)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-claude-sisyphus?color=blue)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![GitHub stars](https://img.shields.io/github/stars/z23cc/oh-my-claudecode?style=flat&color=yellow)](https://github.com/z23cc/oh-my-claudecode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤️-red?style=flat&logo=github)](https://github.com/sponsors/z23cc)

**Claude Code 的多智能体编排系统。零学习曲线。**

*无需学习 Claude Code，直接使用 OMC。*

[快速开始](#快速开始) • [文档](https://yeachan-heo.github.io/oh-my-claudecode-website) • [迁移指南](docs/MIGRATION.md)

---

## 快速开始

**第一步：安装**
```bash
/plugin marketplace add https://github.com/z23cc/oh-my-claudecode
/plugin install oh-my-claudecode
```

**第二步：配置**
```bash
/oh-my-claudecode:omc-setup
```

**第三步：开始构建**
```
autopilot: build a REST API for managing tasks
```

就这么简单。其余都是自动的。

## Team 模式（推荐）

从 **v4.1.7** 开始，**Team** 是 OMC 中的标准编排入口。旧的入口点如 **swarm** 和 **ultrapilot** 仍然支持，但它们现在**底层路由到 Team**。

```bash
/oh-my-claudecode:team 3:executor "fix all TypeScript errors"
```

Team 以流水线模式运行：

`team-plan → team-prd → team-exec → team-verify → team-fix (循环)`

在 `~/.claude/settings.json` 中启用 Claude Code 原生团队：

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> 如果未启用团队功能，OMC 会发出警告并尽可能回退到非团队执行。

> **注意：包命名** — 项目品牌名为 **oh-my-claudecode**（仓库、插件、命令），但 npm 包以 [`oh-my-claude-sisyphus`](https://www.npmjs.com/package/oh-my-claude-sisyphus) 发布。通过 npm/bun 安装 CLI 工具时，请使用 `npm install -g oh-my-claude-sisyphus`。

### 更新

```bash
# 1. 更新插件
/plugin install oh-my-claudecode

# 2. 重新运行设置以刷新配置
/oh-my-claudecode:omc-setup
```

如果更新后遇到问题，清除旧的插件缓存：

```bash
/oh-my-claudecode:doctor
```

<h1 align="center">你的 Claude 已被注入超能力。</h1>

<p align="center">
  <img src="assets/omc-character.jpg" alt="oh-my-claudecode" width="400" />
</p>

---

## 为什么选择 oh-my-claudecode？

- **无需配置** - 开箱即用，智能默认设置
- **团队优先编排** - Team 是标准的多智能体入口（swarm/ultrapilot 为兼容层）
- **自然语言交互** - 无需记忆命令，只需描述你的需求
- **自动并行化** - 复杂任务自动分配给专业智能体
- **持久执行** - 不会半途而废，直到任务验证完成
- **成本优化** - 智能模型路由节省 30-50% 的 token
- **从经验中学习** - 自动提取并复用问题解决模式
- **实时可见性** - HUD 状态栏显示底层运行状态

---

## 功能特性

### 执行模式
针对不同场景的多种策略 - 从全自动构建到 token 高效重构。[了解更多 →](https://yeachan-heo.github.io/oh-my-claudecode-website/docs.html#execution-modes)

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **Team（推荐）** | 标准流水线（`team-plan → team-prd → team-exec → team-verify → team-fix`）| 多智能体协作的共享任务列表 |
| **Autopilot** | 自主执行（单主智能体）| 最少流程的端到端功能开发 |
| **Ultrawork** | 最大并行化（非团队）| 不需要 Team 的批量并行修复/重构 |
| **Ralph** | 持久模式 + 验证/修复循环 | 必须完整完成的任务（无静默部分完成）|
| **Ecomode** | token 高效路由 | 预算有限的迭代 |
| **Pipeline** | 顺序分阶段处理 | 严格顺序的多步骤转换 |
| **Swarm / Ultrapilot（旧版）** | 兼容层，路由到 **Team** | 现有工作流和旧文档 |

### 智能编排

- **32 个专业智能体** 涵盖架构、研究、设计、测试、数据科学
- **智能模型路由** - 简单任务用 Haiku，复杂推理用 Opus
- **自动委派** - 每次都选择最合适的智能体

### 开发者体验

- **魔法关键词** - `ralph`、`ulw`、`eco`、`plan` 提供显式控制
- **HUD 状态栏** - 状态栏实时显示编排指标
- **技能学习** - 从会话中提取可复用模式
- **分析与成本追踪** - 了解所有会话的 token 使用情况

[完整功能列表 →](docs/REFERENCE.md)

---

## 魔法关键词

为高级用户提供的可选快捷方式。不用它们，自然语言也能很好地工作。

| 关键词 | 效果 | 示例 |
|---------|--------|---------|
| `team` | 标准 Team 编排 | `/oh-my-claudecode:team 3:executor "fix all TypeScript errors"` |
| `autopilot` | 全自动执行 | `autopilot: build a todo app` |
| `ralph` | 持久模式 | `ralph: refactor auth` |
| `ulw` | 最大并行化 | `ulw fix all errors` |
| `eco` | token 高效执行 | `eco: migrate database` |
| `plan` | 规划访谈 | `plan the API` |
| `ralplan` | 迭代规划共识 | `ralplan this feature` |
| `swarm` | 旧版关键词（路由到 Team）| `swarm 5 agents: fix lint errors` |
| `ultrapilot` | 旧版关键词（路由到 Team）| `ultrapilot: build a fullstack app` |

**说明：**
- **ralph 包含 ultrawork：** 激活 ralph 模式时，会自动包含 ultrawork 的并行执行。
- `swarm N agents` 语法仍可识别用于提取智能体数量，但在 v4.1.7+ 中运行时为 Team 驱动。

---

## 实用工具

### 速率限制等待

当速率限制重置时自动恢复 Claude Code 会话。

```bash
omc wait          # 检查状态，获取指导
omc wait --start  # 启用自动恢复守护进程
omc wait --stop   # 禁用守护进程
```

**需要：** tmux（用于会话检测）

---

## 文档

- **[完整参考](docs/REFERENCE.md)** - 完整功能文档
- **[性能监控](docs/PERFORMANCE-MONITORING.md)** - 智能体追踪、调试和优化
- **[网站](https://yeachan-heo.github.io/oh-my-claudecode-website)** - 交互式指南和示例
- **[迁移指南](docs/MIGRATION.md)** - 从 v2.x 升级
- **[架构](docs/ARCHITECTURE.md)** - 底层工作原理

---

## 安全性与可靠性

OMC 在整个技术栈中采用纵深防御安全策略：

- **原子文件锁** - `O_CREAT|O_EXCL` 内核级锁防止任务竞态条件
- **路径遍历防护** - 所有文件操作经过目录边界验证，支持符号链接感知解析
- **Shell 注入防护** - 使用 `execFileSync` 配合参数数组，而非 shell 字符串拼接
- **输入净化** - 对所有 ID、commit 引用和文件路径在使用前进行正则验证
- **TOCTOU 缓解** - 对所有 JSON 状态文件采用原子写入-重命名模式
- **ReDoS 防护** - 使用有界正则模式和安全的交替匹配
- **优雅降级** - 所有可选操作（git 证据、心跳、审计）安全失败并附带诊断日志
- **macOS 兼容** - 完整的符号链接解析，支持 `/var`→`/private/var`、`/tmp`→`/private/tmp` 路径

---

## 环境要求

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- Claude Max/Pro 订阅 或 Anthropic API 密钥

### 可选：多 AI 编排

OMC 可以选择性地调用外部 AI 提供商进行交叉验证和设计一致性检查。**非必需** — 没有它们 OMC 也能完整运行。

| 提供商 | 安装 | 功能 |
|--------|------|------|
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli` | 设计审查、UI 一致性（1M token 上下文）|
| [Codex CLI](https://github.com/openai/codex) | `npm install -g @openai/codex` | 架构验证、代码审查交叉检查 |

**费用：** 3 个 Pro 计划（Claude + Gemini + ChatGPT）每月约 $60 即可覆盖所有功能。

---

## 开源协议

MIT

---

<div align="center">

**灵感来源：** [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) • [claude-hud](https://github.com/ryanjoachim/claude-hud) • [Superpowers](https://github.com/NexTechFusion/Superpowers) • [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

**零学习曲线。最强大能。**

</div>

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=z23cc/oh-my-claudecode&type=date&legend=top-left)](https://www.star-history.com/#z23cc/oh-my-claudecode&type=date&legend=top-left)

## 💖 支持本项目

如果 Oh-My-ClaudeCode 帮助了你的工作流，请考虑赞助：

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-❤️-red?style=for-the-badge&logo=github)](https://github.com/sponsors/z23cc)

### 为什么赞助？

- 保持项目活跃开发
- 赞助者获得优先支持
- 影响路线图和功能
- 帮助维护自由开源

### 其他帮助方式

- ⭐ 为仓库加星
- 🐛 报告问题
- 💡 提出功能建议
- 📝 贡献代码
