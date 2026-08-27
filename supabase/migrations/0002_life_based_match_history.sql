-- ゲームルール変更（過学習率を廃止し、ライフを削り合う形式に変更）に伴うスキーマ更新
-- rounds_option（本勝負制）は概念自体が無くなったため削除し、
-- player{1,2}_wins（勝利数）は player{1,2}_final_life（最終ライフ）に置き換える

alter table public.match_history drop column if exists rounds_option;

alter table public.match_history rename column player1_wins to player1_final_life;
alter table public.match_history rename column player2_wins to player2_final_life;
