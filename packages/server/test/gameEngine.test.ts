import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dealRealityCards,
  evaluateMatchOutcome,
  REALITY_CARD_IDS,
  REALITY_HAND_SIZE,
  resolveTurn,
} from "@battle/shared";

function rngSequence(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

const noWounds = {};

test("「着実な一撃」が見破られなければ固定20ダメージが通り、攻撃側のゲージが下がる", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "steady_strike" },
    defense: { prediction: "delusion" }, // 外れ
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 50, B: 0 },
    lingeringWounds: noWounds,
  });

  assert.equal(result.wasCaught, false);
  assert.equal(result.damageDealt, 20);
  assert.equal(result.gaugeDelta, -15);
  assert.equal(result.lifeTotals.B, 80);
  assert.equal(result.delusionGauges.A, 35);
});

test("「着実な一撃」が見破られると反動ダメージのみでゲージは変動しない", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "steady_strike" },
    defense: { prediction: "reality" }, // 的中
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });

  assert.equal(result.wasCaught, true);
  assert.equal(result.selfDamage, 20);
  assert.equal(result.damageDealt, 0);
  assert.equal(result.gaugeDelta, 0);
  assert.equal(result.lifeTotals.A, 80);
});

test("「圧殺の一撃」は妄想ゲージ60%以上でダメージが2倍になる", () => {
  const highGauge = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "overload_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 60, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(highGauge.damageDealt, 50);

  const lowGauge = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "overload_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 59, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(lowGauge.damageDealt, 25);
});

test("「妄想の解放」は攻撃側の現在の妄想ゲージ値がそのままダメージになる", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "gauge_drain" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 42, B: 0 },
    lingeringWounds: noWounds,
  });

  assert.equal(result.damageDealt, 42);
  assert.equal(result.gaugeDelta, 0); // 妄想の解放自体はゲージを変動させない
});

test("「痛烈な一撃」「素早い一撃」は固定ダメージでゲージは変動しない", () => {
  const heavy = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "heavy_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(heavy.damageDealt, 30);
  assert.equal(heavy.gaugeDelta, 0);

  const quick = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "quick_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(quick.damageDealt, 20);
  assert.equal(quick.gaugeDelta, 0);
});

test("「疼く傷跡」は初撃10ダメージ＋以後3ターン、ターン終了時に10ダメージが続く", () => {
  // 1ターン目：命中して継続ダメージが付与される
  const turn1 = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "lingering_wound" },
    defense: { prediction: "delusion" }, // 外れ
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(turn1.damageDealt, 10);
  assert.equal(turn1.dotDamage.B ?? 0, 0); // 付与された直後のターンではまだ発動しない
  assert.equal(turn1.lifeTotals.B, 90);
  assert.deepEqual(turn1.lingeringWounds.B, [{ damage: 10, turnsRemaining: 3 }]);

  // 2ターン目：攻守が入れ替わっても継続ダメージはBに入り続ける
  const turn2 = resolveTurn({
    turnNumber: 2,
    attackerId: "B",
    defenderId: "A",
    attack: { cardType: "reality", realityCardId: "quick_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: turn1.lifeTotals,
    delusionGauges: turn1.delusionGauges,
    lingeringWounds: turn1.lingeringWounds,
  });
  assert.equal(turn2.dotDamage.B, 10);
  assert.equal(turn2.lifeTotals.B, 90 - 10); // 継続ダメージ分
  assert.deepEqual(turn2.lingeringWounds.B, [{ damage: 10, turnsRemaining: 2 }]);

  // 3, 4ターン目でさらに2回発動し、4ターン目で効果が切れる
  const turn3 = resolveTurn({
    turnNumber: 3,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "quick_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: turn2.lifeTotals,
    delusionGauges: turn2.delusionGauges,
    lingeringWounds: turn2.lingeringWounds,
  });
  assert.equal(turn3.dotDamage.B, 10);
  assert.deepEqual(turn3.lingeringWounds.B, [{ damage: 10, turnsRemaining: 1 }]);

  const turn4 = resolveTurn({
    turnNumber: 4,
    attackerId: "B",
    defenderId: "A",
    attack: { cardType: "reality", realityCardId: "quick_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: turn3.lifeTotals,
    delusionGauges: turn3.delusionGauges,
    lingeringWounds: turn3.lingeringWounds,
  });
  assert.equal(turn4.dotDamage.B, 10);
  assert.deepEqual(turn4.lingeringWounds.B ?? [], []); // 3回発動して消滅
});

test("「疼く傷跡」が見破られると、初撃と継続ダメージの両方が攻撃側自身に返る", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "lingering_wound" },
    defense: { prediction: "reality" }, // 的中
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });

  assert.equal(result.wasCaught, true);
  assert.equal(result.selfDamage, 10);
  assert.equal(result.lifeTotals.A, 90);
  assert.deepEqual(result.lingeringWounds.A, [{ damage: 10, turnsRemaining: 3 }]);
  assert.equal(result.lingeringWounds.B ?? undefined, undefined);
});

test("「小さな一撃」は固定10ダメージでゲージは変動しない", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "minor_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(result.damageDealt, 10);
  assert.equal(result.gaugeDelta, 0);
});

test("「休息」は成功すると30回復し、見破られると自分は回復できず見破った相手が30回復する", () => {
  const success = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "restful_recovery" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 60, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(success.selfHeal, 30);
  assert.equal(success.damageDealt, 0);
  assert.equal(success.lifeTotals.A, 90);
  assert.equal(success.gaugeDelta, 0);

  const caught = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "restful_recovery" },
    defense: { prediction: "reality" },
    lifeTotals: { A: 60, B: 70 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(caught.selfHeal, 0);
  assert.equal(caught.selfDamage, 0);
  assert.equal(caught.defenderHeal, 30);
  assert.equal(caught.lifeTotals.A, 60);
  assert.equal(caught.lifeTotals.B, 100);
});

test("回復は開始ライフ（100）を超えて回復しない", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "restful_recovery" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 90, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(result.lifeTotals.A, 100);
});

test("「瞑想」は成功すると妄想ゲージが30%下がり、見破られると逆に30%上がる", () => {
  const success = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "meditation" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 50, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(success.damageDealt, 0);
  assert.equal(success.gaugeDelta, -30);
  assert.equal(success.delusionGauges.A, 20);

  const caught = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "meditation" },
    defense: { prediction: "reality" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 50, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(caught.selfDamage, 0);
  assert.equal(caught.gaugeDelta, 30);
  assert.equal(caught.delusionGauges.A, 80);
});

test("「無理な回復」はライフ部分のみ見破りで防御側回復に反転し、ゲージ+20%は常に発生する", () => {
  const success = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "reckless_recovery" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 40, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(success.selfHeal, 50);
  assert.equal(success.lifeTotals.A, 90);
  assert.equal(success.gaugeDelta, 20);
  assert.equal(success.delusionGauges.A, 20);

  const caught = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "reckless_recovery" },
    defense: { prediction: "reality" },
    lifeTotals: { A: 60, B: 40 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(caught.selfDamage, 0);
  assert.equal(caught.defenderHeal, 50);
  assert.equal(caught.lifeTotals.A, 60);
  assert.equal(caught.lifeTotals.B, 90);
  assert.equal(caught.gaugeDelta, 20); // 見破られてもゲージ上昇は反転しない
  assert.equal(caught.delusionGauges.A, 20);
});

test("「吸血」は成功すると申告量のダメージを与えて同量回復し、見破られると回復できず反動ダメージのみになる", () => {
  const success = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "life_drain", realityAmount: 35 },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 40, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(success.damageDealt, 35);
  assert.equal(success.selfHeal, 35);
  assert.equal(success.selfDamage, 0);
  assert.equal(success.defenderHeal, 0);
  assert.equal(success.lifeTotals.A, 75);
  assert.equal(success.lifeTotals.B, 65);
  assert.equal(success.gaugeDelta, 0);

  const caught = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "life_drain", realityAmount: 35 },
    defense: { prediction: "reality" },
    lifeTotals: { A: 40, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(caught.damageDealt, 0);
  assert.equal(caught.selfHeal, 0);
  assert.equal(caught.defenderHeal, 0);
  assert.equal(caught.selfDamage, 35);
  assert.equal(caught.lifeTotals.A, 5);
  assert.equal(caught.lifeTotals.B, 100);
  assert.equal(caught.gaugeDelta, 0); // 単純な攻撃カードと同じくゲージ変動なし
});

test("「緩やかな回復」は成功すると3ターン継続回復、見破られると見破った相手が3ターン継続回復する", () => {
  const success = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "slow_recovery" },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 60, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(success.lifeTotals.A, 60); // このターンはまだ発動しない
  assert.deepEqual(success.lingeringWounds.A, [{ damage: -10, turnsRemaining: 3 }]);

  // ターン2はAが攻撃側（Bへ攻撃）にして、継続回復の効果だけを純粋に確認する
  const next = resolveTurn({
    turnNumber: 2,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "quick_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: success.lifeTotals,
    delusionGauges: success.delusionGauges,
    lingeringWounds: success.lingeringWounds,
  });
  assert.equal(next.dotDamage.A, -10);
  assert.equal(next.lifeTotals.A, 70); // 60 + 10回復

  const caught = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality", realityCardId: "slow_recovery" },
    defense: { prediction: "reality" },
    lifeTotals: { A: 60, B: 70 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  // 継続回復の対象が見破った側（B）に切り替わる
  assert.equal(caught.lingeringWounds.A, undefined);
  assert.deepEqual(caught.lingeringWounds.B, [{ damage: -10, turnsRemaining: 3 }]);

  // ターン2はBが攻撃側にして、継続回復の効果だけを純粋に確認する
  const nextCaught = resolveTurn({
    turnNumber: 2,
    attackerId: "B",
    defenderId: "A",
    attack: { cardType: "reality", realityCardId: "quick_strike" },
    defense: { prediction: "delusion" },
    lifeTotals: caught.lifeTotals,
    delusionGauges: caught.delusionGauges,
    lingeringWounds: caught.lingeringWounds,
  });
  assert.equal(nextCaught.dotDamage.B, -10);
  assert.equal(nextCaught.lifeTotals.B, 80); // 70 + 10回復
});

test("妄想カードが見破られると攻撃側に反動ダメージ＋ゲージ上昇。抽選に外れれば即敗北しない", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "delusion", delusionEffect: "damage", delusionDamage: 30 },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 40, B: 0 },
    lingeringWounds: noWounds,
    rng: rngSequence([0.5]),
  });

  assert.equal(result.wasCaught, true);
  assert.equal(result.selfDamage, 30);
  assert.equal(result.defenderHeal, 0);
  assert.equal(result.gaugeDelta, 30);
  assert.equal(result.instantDefeat, false);
  assert.equal(result.delusionGauges.A, 70);
});

test("回復系の妄想は成功すると自分が回復し、見破られると自分は回復できず見破った相手が回復する（ゲージ上昇と即敗北抽選は変わらず発生）", () => {
  const success = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "delusion", delusionEffect: "heal", delusionDamage: 30 },
    defense: { prediction: "reality" }, // 外れ
    lifeTotals: { A: 60, B: 100 },
    delusionGauges: { A: 0, B: 0 },
    lingeringWounds: noWounds,
  });
  assert.equal(success.selfHeal, 30);
  assert.equal(success.damageDealt, 0);
  assert.equal(success.defenderHeal, 0);
  assert.equal(success.lifeTotals.A, 90);
  assert.equal(success.gaugeDelta, 0); // 妄想成功時はゲージ変動なし

  const caught = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "delusion", delusionEffect: "heal", delusionDamage: 30 },
    defense: { prediction: "delusion" }, // 的中
    lifeTotals: { A: 60, B: 70 },
    delusionGauges: { A: 40, B: 0 },
    lingeringWounds: noWounds,
    rng: rngSequence([0.5]),
  });
  assert.equal(caught.selfHeal, 0);
  assert.equal(caught.selfDamage, 0);
  assert.equal(caught.defenderHeal, 30);
  assert.equal(caught.lifeTotals.A, 60);
  assert.equal(caught.lifeTotals.B, 100);
  assert.equal(caught.gaugeDelta, 30); // 回復系でもゲージ上昇（bluffの代償）は変わらず発生
  assert.equal(caught.instantDefeat, false);
});

test("見破られた妄想カードの敗北抽選に当たると、妄想ゲージが100になり即敗北扱いになる", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "delusion", delusionEffect: "damage", delusionDamage: 30 },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 40, B: 0 },
    lingeringWounds: noWounds,
    rng: rngSequence([0.3]),
  });

  assert.equal(result.instantDefeat, true);
  assert.equal(result.delusionGauges.A, 100);

  const outcome = evaluateMatchOutcome(result.lifeTotals, result.delusionGauges);
  assert.equal(outcome.gameOver, true);
  assert.equal(outcome.winnerId, "B");
});

test("evaluateMatchOutcome: ライフ0またはゲージ100のプレイヤーがいれば相手の勝ち", () => {
  assert.deepEqual(evaluateMatchOutcome({ A: 50, B: 50 }, { A: 0, B: 0 }), {
    gameOver: false,
    winnerId: null,
  });
  assert.deepEqual(evaluateMatchOutcome({ A: 0, B: 50 }, { A: 0, B: 0 }), {
    gameOver: true,
    winnerId: "B",
  });
  assert.deepEqual(evaluateMatchOutcome({ A: 50, B: 50 }, { A: 100, B: 0 }), {
    gameOver: true,
    winnerId: "B",
  });
});

test("evaluateMatchOutcome: 両者同時に敗北条件を満たした場合は引き分け", () => {
  assert.deepEqual(evaluateMatchOutcome({ A: 0, B: 0 }, { A: 0, B: 0 }), {
    gameOver: true,
    winnerId: null,
  });
});

test("dealRealityCards: REALITY_HAND_SIZE枚を重複なく、全て現実カードの中から配る", () => {
  const hand = dealRealityCards(rngSequence([0.1, 0.5, 0.9]));

  assert.equal(hand.length, REALITY_HAND_SIZE);
  assert.equal(new Set(hand).size, REALITY_HAND_SIZE);
  for (const card of hand) {
    assert.ok(REALITY_CARD_IDS.includes(card));
  }
});

test("dealRealityCards: 同じ乱数列なら同じ手札になる（決定的）", () => {
  const rngValues = [0, 0.3, 0.7];
  const handA = dealRealityCards(rngSequence(rngValues));
  const handB = dealRealityCards(rngSequence(rngValues));

  assert.deepEqual(handA, handB);
});
