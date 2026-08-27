import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * createClient()は不正なURLを渡すと例外を投げ、これがモジュール評価時（SSR含む）に
 * 発生すると画面全体が真っ白になってしまう。値が未設定／不正のどちらの場合も
 * ログイン機能だけを無効化してゲスト対戦は続行できるよう、必ずnullにフォールバックする。
 */
function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。ログイン機能は無効になります。",
    );
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY の値が不正なため初期化に失敗しました。ログイン機能は無効になります: ${(err as Error).message}`,
    );
    return null;
  }
}

export const supabase = createSupabaseClient();
