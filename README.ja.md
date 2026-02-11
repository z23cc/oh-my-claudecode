[English](README.md) | [한국어](README.ko.md) | [中文](README.zh.md) | 日本語 | [Español](README.es.md)

# oh-my-claudecode

[![npm version](https://img.shields.io/npm/v/oh-my-claude-sisyphus?color=cb3837)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-claude-sisyphus?color=blue)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![GitHub stars](https://img.shields.io/github/stars/z23cc/oh-my-claudecode?style=flat&color=yellow)](https://github.com/z23cc/oh-my-claudecode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-❤️-red?style=flat&logo=github)](https://github.com/sponsors/z23cc)

**Claude Code のためのマルチエージェント・オーケストレーション。学習コストゼロ。**

*Claude Code を学ぶ必要はありません。OMC を使うだけ。*

[はじめる](#クイックスタート) • [ドキュメント](https://yeachan-heo.github.io/oh-my-claudecode-website) • [移行ガイド](docs/MIGRATION.md)

---

## クイックスタート

**ステップ 1: インストール**
```bash
/plugin marketplace add https://github.com/z23cc/oh-my-claudecode
/plugin install oh-my-claudecode
```

**ステップ 2: セットアップ**
```bash
/oh-my-claudecode:omc-setup
```

**ステップ 3: 何か作ってみる**
```
autopilot: build a REST API for managing tasks
```

以上です。あとは自動で進みます。

## Team モード（推奨）

**v4.1.7** 以降、**Team** が OMC の標準オーケストレーション機能です。**swarm** や **ultrapilot** などのレガシーエントリポイントは引き続きサポートされますが、**内部的に Team にルーティング**されます。

```bash
/oh-my-claudecode:team 3:executor "fix all TypeScript errors"
```

Team はステージドパイプラインで実行されます：

`team-plan → team-prd → team-exec → team-verify → team-fix（ループ）`

`~/.claude/settings.json` で Claude Code ネイティブチームを有効にしてください：

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> チームが無効な場合、OMC は警告を表示し、可能な場合は非チーム実行にフォールバックします。

> **注意: パッケージ名について** — プロジェクトのブランド名は **oh-my-claudecode**（リポジトリ、プラグイン、コマンド）ですが、npmパッケージは [`oh-my-claude-sisyphus`](https://www.npmjs.com/package/oh-my-claude-sisyphus) として公開されています。npm/bunでCLIツールをインストールする場合は `npm install -g oh-my-claude-sisyphus` を使用してください。

### アップデート

```bash
# 1. プラグインを更新
/plugin install oh-my-claudecode

# 2. セットアップを再実行して設定を更新
/oh-my-claudecode:omc-setup
```

更新後に問題が発生した場合は、古いプラグインキャッシュをクリアしてください：

```bash
/oh-my-claudecode:doctor
```

<h1 align="center">あなたの Claude がステロイド級にパワーアップ。</h1>

<p align="center">
  <img src="assets/omc-character.jpg" alt="oh-my-claudecode" width="400" />
</p>

---

## なぜ oh-my-claudecode なのか?

- **設定不要** - 賢いデフォルト設定ですぐに使える
- **チーム優先オーケストレーション** - Team が標準のマルチエージェントインターフェース（swarm/ultrapilot は互換レイヤー）
- **自然言語インターフェース** - コマンドを覚える必要なし、やりたいことを話すだけ
- **自動並列化** - 複雑なタスクを専門エージェントに自動分散
- **粘り強い実行** - 検証完了まで諦めない
- **コスト最適化** - スマートなモデルルーティングでトークンを30〜50%節約
- **経験から学習** - 問題解決パターンを自動抽出して再利用
- **リアルタイム可視化** - HUD ステータスラインで裏側の動きが見える

---

## 機能

### 実行モード
用途に応じた複数の戦略 - 完全自律ビルドからトークン効率の良いリファクタリングまで。[詳しくはこちら →](https://yeachan-heo.github.io/oh-my-claudecode-website/docs.html#execution-modes)

| モード | 説明 | 用途 |
|------|------|------|
| **Team（推奨）** | 標準パイプライン（`team-plan → team-prd → team-exec → team-verify → team-fix`）| 共有タスクリストでのエージェント協調 |
| **Autopilot** | 自律実行（単一リードエージェント）| 最小限のセレモニーでのエンドツーエンド機能開発 |
| **Ultrawork** | 最大並列化（非チーム）| Team が不要なバースト並列修正/リファクタリング |
| **Ralph** | 永続モード + 検証/修正ループ | 完全に完了しなければならないタスク |
| **Ecomode** | トークン効率ルーティング | 予算意識のある反復 |
| **Pipeline** | 逐次ステージ処理 | 厳密な順序での多段階変換 |
| **Swarm / Ultrapilot（レガシー）** | 互換ファサード、**Team** にルーティング | 既存ワークフローと旧ドキュメント |

### インテリジェント・オーケストレーション

- **32の専門エージェント** - アーキテクチャ、リサーチ、デザイン、テスト、データサイエンス対応
- **スマートモデルルーティング** - シンプルなタスクは Haiku、複雑な推論は Opus
- **自動委譲** - 常に適材適所

### 開発者体験

- **マジックキーワード** - `ralph`、`ulw`、`eco`、`plan` で明示的制御
- **HUD ステータスライン** - ステータスバーでリアルタイムのオーケストレーション指標を表示
- **スキル学習** - セッションから再利用可能なパターンを抽出
- **分析とコスト追跡** - 全セッションのトークン使用状況を把握

[全機能リスト →](docs/REFERENCE.md)

---

## マジックキーワード

パワーユーザー向けのオプション・ショートカット。自然言語でも問題なく動作します。

| キーワード | 効果 | 例 |
|---------|-----|-----|
| `team` | 標準 Team オーケストレーション | `/oh-my-claudecode:team 3:executor "fix all TypeScript errors"` |
| `autopilot` | 完全自律実行 | `autopilot: build a todo app` |
| `ralph` | 粘り強いモード | `ralph: refactor auth` |
| `ulw` | 最大並列化 | `ulw fix all errors` |
| `eco` | トークン効率実行 | `eco: migrate database` |
| `plan` | 計画インタビュー | `plan the API` |
| `ralplan` | 反復的計画合意形成 | `ralplan this feature` |
| `swarm` | レガシーキーワード（Team にルーティング）| `swarm 5 agents: fix lint errors` |
| `ultrapilot` | レガシーキーワード（Team にルーティング）| `ultrapilot: build a fullstack app` |

**注意:**
- **ralph は ultrawork を含む:** ralph モードを有効にすると、ultrawork の並列実行が自動的に含まれます。
- `swarm N agents` 構文はエージェント数抽出のために認識されますが、v4.1.7+ のランタイムは Team ベースです。

---

## ユーティリティ

### レート制限待機

レート制限がリセットされたら Claude Code セッションを自動再開。

```bash
omc wait          # ステータス確認とガイダンス取得
omc wait --start  # 自動再開デーモンを有効化
omc wait --stop   # デーモンを無効化
```

**必要なもの:** tmux (セッション検出用)

---

## ドキュメント

- **[完全リファレンス](docs/REFERENCE.md)** - 全機能の詳細ドキュメント
- **[パフォーマンス監視](docs/PERFORMANCE-MONITORING.md)** - エージェント追跡、デバッグ、最適化
- **[ウェブサイト](https://yeachan-heo.github.io/oh-my-claudecode-website)** - インタラクティブガイドと例
- **[移行ガイド](docs/MIGRATION.md)** - v2.x からのアップグレード
- **[アーキテクチャ](docs/ARCHITECTURE.md)** - 内部の仕組み

---

## セキュリティと信頼性

OMC はスタック全体にわたる多層防御セキュリティで構築されています：

- **アトミックファイルロック** - `O_CREAT|O_EXCL` カーネルレベルロックでタスクの競合状態を防止
- **パストラバーサル防御** - すべてのファイル操作をシンボリックリンク対応のディレクトリ境界検証
- **Shell インジェクション防止** - shell 補間の代わりに `execFileSync` + 引数配列を使用
- **入力サニタイズ** - すべての ID、コミット参照、ファイルパスに正規表現バリデーション
- **TOCTOU 緩和** - すべての JSON 状態ファイルにアトミック書き込み-リネームパターン
- **ReDoS 防御** - 安全な交替を持つ有界正規表現パターン
- **グレースフルデグラデーション** - すべてのオプション操作（git 証拠、ハートビート、監査）が診断ログ付きで安全に失敗
- **macOS 互換** - `/var`→`/private/var`、`/tmp`→`/private/tmp` パスの完全なシンボリックリンク解決

---

## 動作環境

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- Claude Max/Pro サブスクリプション または Anthropic API キー

### オプション：マルチ AI オーケストレーション

OMC はクロスバリデーションとデザイン一貫性のために、外部 AI プロバイダーをオプションで活用できます。**必須ではありません** — これらがなくても OMC は完全に動作します。

| プロバイダー | インストール | 機能 |
|-------------|-------------|------|
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli` | デザインレビュー、UI 一貫性（1M トークンコンテキスト）|
| [Codex CLI](https://github.com/openai/codex) | `npm install -g @openai/codex` | アーキテクチャ検証、コードレビュークロスチェック |

**コスト：** 3つの Pro プラン（Claude + Gemini + ChatGPT）で月額約 $60 ですべてをカバーできます。

---

## ライセンス

MIT

---

<div align="center">

**インスピレーション元:** [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) • [claude-hud](https://github.com/ryanjoachim/claude-hud) • [Superpowers](https://github.com/NexTechFusion/Superpowers) • [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

**学習コストゼロ。最大パワー。**

</div>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=z23cc/oh-my-claudecode&type=date&legend=top-left)](https://www.star-history.com/#z23cc/oh-my-claudecode&type=date&legend=top-left)

## 💖 このプロジェクトを支援

Oh-My-ClaudeCode があなたのワークフローに役立っているなら、スポンサーをご検討ください:

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-❤️-red?style=for-the-badge&logo=github)](https://github.com/sponsors/z23cc)

### スポンサーになる理由は?

- 開発を活発に保つ
- スポンサー向け優先サポート
- ロードマップと機能に影響力
- 無料オープンソースの維持を支援

### その他の協力方法

- ⭐ リポジトリにスター
- 🐛 バグ報告
- 💡 機能提案
- 📝 コード貢献
