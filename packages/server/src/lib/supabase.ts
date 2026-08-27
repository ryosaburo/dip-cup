import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定でもサーバーは起動できるようにし、
 * その場合はログイン連携（ユーザー紐付け・対戦履歴保存）だけを無効化する。
 * 値が設定されていても不正（例: プレースホルダーの貼り忘れ）だとcreateClient()が
 * 例外を投げてサーバー起動自体が落ちてしまうため、必ずtry/catchでnullにフォールバックする。
 *
 * realtime機能は使わないが、Node 20にはグローバルWebSocketが無く
 * supabase-jsの初期化自体がそれを要求するため、`ws` を明示的に渡す。
 */
function createSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !serviceRoleKey) return null;
  try {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      realtime: { transport: WebSocket as any },
    });
  } catch (err) {
    console.warn(
      `[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY の値が不正なため初期化に失敗しました。ログイン連携は無効です: ${(err as Error).message}`,
    );
    return null;
  }
}

export const supabaseAdmin: SupabaseClient | null = createSupabaseAdmin();

if (!supabaseAdmin) {
  console.warn(
    "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定または不正なため、ログイン連携は無効です（ゲスト対戦のみ）。",
  );
}

/** アクセストークンを検証し、成功すれば Supabase の user id を返す */
export async function verifyAccessToken(accessToken: string | undefined): Promise<string | undefined> {
  if (!accessToken || !supabaseAdmin) return undefined;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) return undefined;
  return data.user.id;
}
