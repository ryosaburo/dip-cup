export type CardType = "reality" | "delusion";

/** 現実カードの種類。攻撃側は妄想カードの代わりにこの中から1枚を選んで出す */
export type RealityCardId =
  | "steady_strike"
  | "overload_strike"
  | "lingering_wound"
  | "gauge_drain"
  | "heavy_strike"
  | "quick_strike"
  | "minor_strike"
  | "restful_recovery"
  | "meditation"
  | "reckless_recovery"
  | "slow_recovery"
  | "life_drain";

export type RoomPhase = "waiting" | "attacking" | "defending" | "gameover";

/** 妄想カードが成功した場合に発生する効果の種類 */
export type DelusionEffect = "damage" | "heal";

/** 攻撃側がそのターンに出す内容 */
export interface AttackSelection {
  cardType: CardType;
  /** 現実カードを選んだ場合のみ、どの現実カードかを指定する */
  realityCardId?: RealityCardId;
  /** 現実カードのうち、量を自分で選べるカード（吸血）を選んだ場合のみ、その申告ダメージ量 */
  realityAmount?: number;
  /** 妄想カードを選んだ場合のみ、成功時にダメージを与えるか自分を回復するか */
  delusionEffect?: DelusionEffect;
  /** 妄想カードを選んだ場合のみ、その場で申告する量（ダメージ量または回復量） */
  delusionDamage?: number;
}

/** ターン終了時ごとに発生する継続効果（「疼く傷跡」「緩やかな回復」など） */
export interface LingeringWound {
  /** 正ならダメージ、負なら回復（例: -10は毎ターン終了時にライフ+10） */
  damage: number;
  /** これから追加で効果が発生する残りターン数 */
  turnsRemaining: number;
}

/** 防御側がそのターンに出す予想 */
export interface DefenseSelection {
  prediction: CardType;
}

/** 1ターン（攻撃側の1手＋防御側の見破り判定）の結果 */
export interface TurnResult {
  turnNumber: number;
  attackerId: string;
  defenderId: string;
  attack: AttackSelection;
  defense: DefenseSelection;
  /** 防御側が攻撃側のカードの種類を見破ったか */
  wasCaught: boolean;
  /** 防御側が受けたダメージ（見破っていた場合は0） */
  damageDealt: number;
  /** 見破られたことで攻撃側が受けた反動ダメージ（ダメージ系カードが見破られた場合。対象外・回復系カードなら0） */
  selfDamage: number;
  /** 回復系カード（現実・妄想問わず）の成功によって攻撃側が回復したライフ（対象外なら0） */
  selfHeal: number;
  /** 回復系カードを見破ったことで防御側（見破った側）が回復したライフ（対象外なら0） */
  defenderHeal: number;
  /** このターンでの攻撃側の妄想ゲージの増減 */
  gaugeDelta: number;
  /** 見破られた妄想カードの敗北抽選に外れて攻撃側が即敗北したか */
  instantDefeat: boolean;
  /** このターン終了時に継続効果として各プレイヤーが受けたライフ変化量（正はダメージ、負は回復） */
  dotDamage: Record<string, number>;
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
  lingeringWounds: Record<string, LingeringWound[]>;
}

export interface GameOverResult {
  /** 両者同時に敗北条件を満たした場合はnull（引き分け） */
  winnerId: string | null;
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
}
