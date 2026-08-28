# 技術構成

このプロジェクト（AIエージェント学習対戦）で実際に採用している技術構成を、各要素の役割とともにまとめる。

## 全体構成図

```
  ブラウザ（プレイヤーA・B 双方とも同じ構成）
  ┌───────────────────────────────┐
  │  Next.js フロントエンド        │
  └───────────────────────────────┘
        │ ①               │ ②
        ▼                 ▼
  ┌──────────┐      ┌──────────────┐
  │  Vercel  │      │   Supabase   │
  │ Next.js  │      │ Auth ／ DB   │
  │ ホスティング│     └──────┬───────┘
  └──────────┘             │ ④
        │ ③                │ サービスロールキーで
        ▼                  │ 対戦履歴を書き込み（任意）
  ┌─────────────────────────▼─┐
  │          Render           │
  │   Node.js WSサーバー       │
  │   （Socket.io）            │
  │   ゲームロジック・抽選・    │
  │   状態管理（in-memory）    │
  └────────────────────────────┘
```

- ① ページ取得（HTTPS）: SupabaseやWSサーバーとは無関係に、まずVercelから静的アセット・HTMLを取得する
- ② ログイン・プロフィール取得（HTTPS、任意）: ブラウザはSupabaseへ**直接**アクセスする。Renderのサーバーは経由しない
- ③ 対戦通信（WebSocket）: ルーム作成・攻撃/防御の送受信はすべてRender上のSocket.ioサーバーとの間で行う
- ④ 対戦履歴の保存（HTTPS、任意）: 試合終了時、Renderのサーバーがサービスロールキーを使ってSupabaseに書き込む。ブラウザは関与しない

- フロントエンドとWebSocketサーバーは別ホスティング先にデプロイする構成（VercelはWebSocketの常時接続ホスティングに不向きなため分離）。
- ゲームの判定・抽選ロジックは全てサーバー側で実行するサーバー権威型。クライアントは選択を送るだけで、結果はサーバーが計算して返す。

## 技術スタックと役割

| レイヤー | 技術 | 役割 |
|---|---|---|
| フロントエンド | Next.js（App Router）+ React + TypeScript | 画面表示・ユーザー操作の受付。Socket.ioクライアントでサーバーと通信する |
| スタイリング | Tailwind CSS | UIのスタイリング全般 |
| リアルタイム通信（クライアント） | socket.io-client | WSサーバーとの双方向通信（ルーム作成・攻撃/防御の送受信） |
| リアルタイム通信（サーバー） | Socket.io（Node.js + Express） | ルーム管理・イベントの送受信の基盤 |
| ゲームロジック・共通型 | `@battle/shared`（TypeScriptパッケージ） | フロントエンド・サーバー双方から参照する型定義とゲーム判定の純粋関数（`resolveTurn`・`evaluateMatchOutcome`など）。ロジックの二重実装を防ぐ |
| ゲーム状態管理 | `RoomManager`（サーバー側、in-memoryクラス） | ルームごとのプレイヤー・ライフ・妄想ゲージ・攻守などの状態を保持。永続化はせず、サーバー再起動で消える |
| 認証 | Supabase Auth | メール・パスワードによる任意ログイン。未ログインでもゲストとしてプレイ可能 |
| データ永続化 | Supabase（Postgres） | ログインユーザーのプロフィール・対戦履歴の保存（`supabase/migrations/`でスキーマ管理）。未設定でも動作する（ログイン関連機能のみ無効化） |
| フロントエンドホスティング | Vercel | Next.jsアプリの本番・プレビューデプロイ。GitHub連携で`main`ブランチpush時に自動デプロイ |
| WSサーバーホスティング | Render（Web Service） | Socket.ioサーバーの常時稼働ホスティング。`/health`エンドポイントでヘルスチェック |
| CI | GitHub Actions（`.github/workflows/ci.yml`） | `dev`・`main`宛PRで自動実行。sharedのビルド／server・frontendの型チェック／frontendのLint／serverのユニットテスト／frontendの本番ビルドを検証 |

## モノレポ構成（npm workspaces）

`packages/*` を1つのリポジトリで管理する構成。

| パッケージ | 役割 |
|---|---|
| `packages/shared` | フロントエンド・サーバー共通の型定義とゲーム判定ロジック（純粋関数）。`tsc`でビルドした`dist/`を他パッケージが参照する |
| `packages/server` | Socket.io WSサーバー。ルーム管理・攻撃/防御の受付・判定結果のブロードキャストを担当 |
| `packages/frontend` | Next.jsフロントエンド。画面表示とSocket.io通信、Supabase認証を担当 |

依存関係は `shared` → `server` / `frontend` の一方向。`shared`のコードを変更した場合、他パッケージへの反映には`shared`のビルドが必要（`npm run dev`実行時は`tsc -w`で自動追従）。

## デプロイ構成の要点

- **Vercel（フロントエンド）**: Root Directoryを`packages/frontend`に設定し、`@battle/shared`のビルドを含むよう Build Command をカスタマイズしてデプロイ。環境変数`NEXT_PUBLIC_WS_URL`（Renderのサーバー URL）・`NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_ANON_KEY`をビルド時に埋め込む
- **Render（WSサーバー）**: リポジトリルートを対象に`npm install && npm run build -w @battle/shared && npm run build -w @battle/server`でビルドし、`npm run start -w @battle/server`で起動。環境変数`CORS_ORIGIN`にVercelのフロントエンドURLを設定し、CORSを許可する
- 両者のURLは互いの環境変数として参照し合う関係にあるため、初回セットアップ時は「片方を先にデプロイしてURLを確定させ、それを使ってもう片方を設定し、最後に戻って更新する」という順序で設定する
