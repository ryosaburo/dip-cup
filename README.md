# AIエージェント学習対戦ゲーム

`hackathon_idea.md` のゲーム仕様を `tech_stack.md` の技術構成（Next.js フロントエンド／Socket.io WSサーバーの分離構成）で実装したもの。

## 構成

npm workspacesモノレポ。

- `packages/shared` — フロントエンド／サーバー共通の型・ゲーム設定・ゲーム判定ロジック（純粋関数）
- `packages/server` — Socket.io WSサーバー（Express + Socket.io、ルーム管理・ラウンド判定をサーバー権威で実行）
- `packages/frontend` — Next.js（App Router）フロントエンド

## 開発フロー（ブランチ運用）

- `main` — 本番用。`dev` からのPRのみでマージする
- `dev` — 開発統合ブランチ。各作業ブランチはここに向けてPRを送る
- `feature/<内容>` — 新機能実装用。`dev` から分岐し、`dev` へPR（例: `feature/support-card-effects`）
- `fix/<内容>` — バグ修正用。`dev` から分岐し、`dev` へPR（例: `fix/round-result-sync`）

複数人での並行作業になるため、作業前に必ず最新の `dev` から新しいブランチを切ること。コンフリクトを避けるため、他人が触っているファイル・機能と重なる変更をする場合は事前に一声かける。

## セットアップ

```bash
npm install
```

`packages/server/.env`:

```
PORT=4000
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`packages/frontend/.env.local`:

```
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase関連の変数は任意。未設定でもゲスト対戦としてアプリは動作する（ログイン機能とその依存機能のみ無効化される）。設定する場合は `supabase/migrations/` 配下のSQLをSupabaseプロジェクトのSQL Editorで実行してテーブルを作成すること。

## 起動

```bash
npm run dev
```

`shared`（tscウォッチ）・`server`（:4000）・`frontend`（:3000）が同時に起動する。`shared`の型やロジックを変更した場合、ウォッチが自動で`dist`を再ビルドするので、サーバー・フロントエンドの再起動は基本不要（フロントエンドはHMRで反映、サーバーはtsx watchで自動再起動）。

## 動作確認手順（手動E2E）

1. ブラウザ2タブで `http://localhost:3000` を開く
2. タブ1: プレイヤー名を入力し「ルーム作成」→ 発行されたルームコードをコピー
3. タブ2: 別のプレイヤー名を入力し、コードを入力して「入室する」
4. 両タブでカード枚数（小・中・大）とサポートカードを選び「この内容で決定」
5. 両者が決定するとサーバーが抽選・判定を行い、結果（暴走の有無・スコア・勝者）が両画面に表示される
6. 「次のラウンドへ」で次ラウンドに進み、規定の先取数に達するまで繰り返す

## テスト

```bash
npm test
```

## CI

`dev`・`main`宛のPRでは `.github/workflows/ci.yml` が自動実行される（sharedのビルド／server・frontendの型チェック／frontendのLint／serverのユニットテスト／frontendの本番ビルド）。`build-and-test` がRequired status checkとして設定されているため、CIが通らないとマージできない。

`packages/server/test/gameEngine.test.ts` が、暴走勝ち・スコア勝ち・両者暴走の引き分け・同点の引き分けの4パターンを検証する（Node標準のテストランナーを使用、追加依存なし）。

## ゲームバランスの暫定値

カードのスコア値・サポートカードの効果・過学習確率は `hackathon_idea.md` 時点で未確定だったため、`packages/shared/src/gameConfig.ts` に暫定値を集約している。実プレイでの調整はこのファイルの数値を変更するだけでよい。

## 実装上の仮定（doc未記載のため採用したルール）

- **両者が同時に過学習で暴走した場合**、そのラウンドは引き分けとして再戦になる（相打ちで即敗北にはしない）
- **暴走がなく学習スコアが同点の場合**も、そのラウンドは引き分けとして再戦になる
- サポートカードは全7種類（軽減・妨害・ブースト・強化・破壊・道連れ・偵察）を用意し、各ラウンド開始時にランダムで3種類を配布、その中から1枚（または「使わない」）を選んで使うという前提で実装している（種類・枚数は`hackathon_idea.md`で「実装しながらチームで検討」とされている項目）。相手のサポートカードの中身は「偵察」を使わない限り非公開

## 未実装（次フェーズ）

- Vercel（フロントエンド）／Render・Railway（WSサーバー）への実デプロイ、CORS本番設定
- Supabase等によるDB永続化（対戦履歴・ランキング）— デモ用途のため現状は全てin-memory管理
- カード数値・サポートカード効果の本バランス調整
- リビール演出・アニメーション等のUI/UXポリッシュ
- 切断時の再接続・再開処理（現状は相手切断で試合終了扱い）
