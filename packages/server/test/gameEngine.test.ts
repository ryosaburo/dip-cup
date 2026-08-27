import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateMatchOutcome, resolveTurn } from "@battle/shared";

function rngSequence(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test("現実カードが見破られなければ固定ダメージが通り、攻撃側のゲージが下がる", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality" },
    defense: { prediction: "delusion" }, // 外れ
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 50, B: 0 },
  });

  assert.equal(result.wasCaught, false);
  assert.equal(result.damageDealt, 20); // REALITY_DAMAGE
  assert.equal(result.selfDamage, 0);
  assert.equal(result.gaugeDelta, -15);
  assert.equal(result.lifeTotals.B, 80);
  assert.equal(result.lifeTotals.A, 100);
  assert.equal(result.delusionGauges.A, 35);
});

test("妄想カードが見破られなければ申告ダメージがそのまま通り、ゲージは変動しない", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "delusion", delusionDamage: 35 },
    defense: { prediction: "reality" }, // 外れ
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
  });

  assert.equal(result.wasCaught, false);
  assert.equal(result.damageDealt, 35);
  assert.equal(result.gaugeDelta, 0);
  assert.equal(result.lifeTotals.B, 65);
  assert.equal(result.delusionGauges.A, 0);
});

test("妄想カードが見破られると攻撃側に反動ダメージ＋ゲージ上昇。抽選に外れれば即敗北しない", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "delusion", delusionDamage: 30 },
    defense: { prediction: "delusion" }, // 的中
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 40, B: 0 },
    rng: rngSequence([0.5]), // 0.5 >= 40/100 なので抽選には外れる
  });

  assert.equal(result.wasCaught, true);
  assert.equal(result.damageDealt, 0);
  assert.equal(result.selfDamage, 30);
  assert.equal(result.gaugeDelta, 30);
  assert.equal(result.instantDefeat, false);
  assert.equal(result.lifeTotals.A, 70);
  assert.equal(result.lifeTotals.B, 100);
  assert.equal(result.delusionGauges.A, 70);
});

test("見破られた妄想カードの敗北抽選に当たると、妄想ゲージが100になり即敗北扱いになる", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "delusion", delusionDamage: 30 },
    defense: { prediction: "delusion" },
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 40, B: 0 },
    rng: rngSequence([0.3]), // 0.3 < 40/100 なので抽選に当たる
  });

  assert.equal(result.instantDefeat, true);
  assert.equal(result.delusionGauges.A, 100);

  const outcome = evaluateMatchOutcome(result.lifeTotals, result.delusionGauges);
  assert.equal(outcome.gameOver, true);
  assert.equal(outcome.winnerId, "B");
});

test("現実カードが見破られても反動ダメージのみで、ゲージは変動しない", () => {
  const result = resolveTurn({
    turnNumber: 1,
    attackerId: "A",
    defenderId: "B",
    attack: { cardType: "reality" },
    defense: { prediction: "reality" }, // 的中
    lifeTotals: { A: 100, B: 100 },
    delusionGauges: { A: 0, B: 0 },
  });

  assert.equal(result.wasCaught, true);
  assert.equal(result.damageDealt, 0);
  assert.equal(result.selfDamage, 20);
  assert.equal(result.gaugeDelta, 0);
  assert.equal(result.lifeTotals.A, 80);
  assert.equal(result.lifeTotals.B, 100);
  assert.equal(result.delusionGauges.A, 0);
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
