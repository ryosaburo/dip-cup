export type CardType = "reality" | "delusion";

export type RoomPhase = "waiting" | "attacking" | "defending" | "gameover";

/** 攻撃側がそのターンに出す内容 */
export interface AttackSelection {
  cardType: CardType;
  /** 妄想カードを選んだ場合のみ、その場で申告する攻撃ダメージ量 */
  delusionDamage?: number;
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
  /** 見破られたことで攻撃側が受けた反動ダメージ（見破られていなければ0） */
  selfDamage: number;
  /** このターンでの攻撃側の妄想ゲージの増減 */
  gaugeDelta: number;
  /** 見破られた妄想カードの敗北抽選に外れて攻撃側が即敗北したか */
  instantDefeat: boolean;
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
}

export interface GameOverResult {
  /** 両者同時に敗北条件を満たした場合はnull（引き分け） */
  winnerId: string | null;
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
}
