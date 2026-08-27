import type { RealityCardId } from "./types.js";

/**
 * ゲームバランス設定。
 * hackathon_idea.md 時点で数値は未確定のため、ここに暫定値を集約している。
 * 実プレイでの調整はこのファイルの数値のみ変更すればよい。
 */

/** 対戦開始時の各プレイヤーのライフ */
export const STARTING_LIFE = 100;

/** 妄想カードで申告できるダメージ量の範囲（見破られなければこの値がそのまま通る） */
export const DELUSION_DAMAGE_MIN = 10;
export const DELUSION_DAMAGE_MAX = 60;

/** 現実カードは常にこの11種類から1枚を選んで出す */
export const REALITY_CARD_IDS: RealityCardId[] = [
  "steady_strike",
  "overload_strike",
  "lingering_wound",
  "gauge_drain",
  "heavy_strike",
  "quick_strike",
  "minor_strike",
  "restful_recovery",
  "meditation",
  "reckless_recovery",
  "slow_recovery",
];

export const REALITY_CARD_CONFIG: Record<RealityCardId, { label: string; description: string }> = {
  steady_strike: {
    label: "着実な一撃",
    description: `相手に${20}ダメージ。成功すると自分の妄想ゲージが${15}%下がる（見破られた場合はゲージ変動なし）`,
  },
  overload_strike: {
    label: "圧殺の一撃",
    description: `相手に${25}ダメージ。自分の妄想ゲージが${60}%以上ならダメージが2倍になる`,
  },
  lingering_wound: {
    label: "疼く傷跡",
    description: `相手に${10}ダメージ。以後3ターン、ターン終了時ごとにさらに${10}ダメージを与え続ける`,
  },
  gauge_drain: {
    label: "妄想の解放",
    description: "自分の現在の妄想ゲージの値（%）がそのままダメージになる",
  },
  heavy_strike: { label: "痛烈な一撃", description: "相手に30ダメージ" },
  quick_strike: { label: "素早い一撃", description: "相手に20ダメージ" },
  minor_strike: { label: "小さな一撃", description: "相手に10ダメージ" },
  restful_recovery: {
    label: "休息",
    description: "自分のライフを30回復する（見破られると回復ではなく30の自傷ダメージになる）",
  },
  meditation: {
    label: "瞑想",
    description: "自分の妄想ゲージが30%下がる（見破られると逆に30%上がる）",
  },
  reckless_recovery: {
    label: "無理な回復",
    description:
      "自分のライフを20回復する（見破られると回復ではなく20の自傷ダメージになる）。見破られたかに関わらず、自分の妄想ゲージは常に20%上がる",
  },
  slow_recovery: {
    label: "緩やかな回復",
    description:
      "以後3ターン、ターン終了時ごとに自分のライフが10回復する（見破られると回復ではなく、以後3ターン10ずつ自分にダメージが入り続ける）",
  },
};

export const STEADY_STRIKE_DAMAGE = 20;
export const STEADY_STRIKE_GAUGE_DECREASE = 15;

export const OVERLOAD_STRIKE_DAMAGE = 25;
export const OVERLOAD_STRIKE_GAUGE_THRESHOLD = 60;
export const OVERLOAD_STRIKE_MULTIPLIER = 2;

export const LINGERING_WOUND_INITIAL_DAMAGE = 10;
export const LINGERING_WOUND_TICK_DAMAGE = 10;
export const LINGERING_WOUND_DURATION = 3;

export const HEAVY_STRIKE_DAMAGE = 30;
export const QUICK_STRIKE_DAMAGE = 20;

export const MINOR_STRIKE_DAMAGE = 10;

export const RESTFUL_RECOVERY_AMOUNT = 30;

export const MEDITATION_GAUGE_AMOUNT = 30;

export const RECKLESS_RECOVERY_LIFE_AMOUNT = 20;
export const RECKLESS_RECOVERY_GAUGE_AMOUNT = 20;

export const SLOW_RECOVERY_TICK_AMOUNT = 10;
export const SLOW_RECOVERY_DURATION = 3;
