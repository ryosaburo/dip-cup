/**
 * ゲームバランス設定。
 * hackathon_idea.md 時点で数値は未確定のため、ここに暫定値を集約している。
 * 実プレイでの調整はこのファイルの数値のみ変更すればよい。
 */

/** 対戦開始時の各プレイヤーのライフ */
export const STARTING_LIFE = 100;

/** 現実カードの固定ダメージ量 */
export const REALITY_DAMAGE = 20;

/** 現実カードが見破られずに通った場合、自分の妄想ゲージを下げる量（%） */
export const REALITY_GAUGE_DECREASE = 15;

/** 妄想カードで申告できるダメージ量の範囲（見破られなければこの値がそのまま通る） */
export const DELUSION_DAMAGE_MIN = 10;
export const DELUSION_DAMAGE_MAX = 60;
