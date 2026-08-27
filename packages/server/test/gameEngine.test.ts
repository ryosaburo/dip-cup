import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dealSupportOptions,
  resolveRound,
  SUPPORT_CARD_DEAL_COUNT,
  SUPPORT_CARD_POOL,
} from "@battle/shared";

function rngSequence(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test("片方だけ暴走した場合は相手の即勝利", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: { playerId: "A", selection: { promptCardIds: ["large-1"] } }, // 50%
    playerB: { playerId: "B", selection: { promptCardIds: ["small-1"] } }, // 4%
    matchWins: {},
    rng: rngSequence([0.1, 0.9]), // A: roll=10 < 50 -> bust, B: roll=90 >= 4 -> safe
  });

  assert.equal(result.winnerId, "B");
  assert.equal(result.outcomes.A.busted, true);
  assert.equal(result.outcomes.B.busted, false);
  assert.equal(result.matchWins.B, 1);
});

test("暴走なしならスコアが高い方が勝つ", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: { playerId: "A", selection: { promptCardIds: ["large-1"] } }, // score 50 + no-support bonus 15 = 65
    playerB: { playerId: "B", selection: { promptCardIds: ["small-1"] } }, // score 10 + bonus 15 = 25
    matchWins: {},
    rng: rngSequence([0.9, 0.9]), // どちらも暴走しない高いroll
  });

  assert.equal(result.winnerId, "A");
  assert.equal(result.isReplay, false);
});

test("両者暴走した場合は再戦（勝者なし）", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: { playerId: "A", selection: { promptCardIds: ["large-1"] } },
    playerB: { playerId: "B", selection: { promptCardIds: ["large-1"] } },
    matchWins: {},
    rng: rngSequence([0.1, 0.1]),
  });

  assert.equal(result.winnerId, null);
  assert.equal(result.isReplay, true);
});

test("暴走なしで同点の場合も再戦（勝者なし）", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: { playerId: "A", selection: { promptCardIds: ["small-1"] } },
    playerB: { playerId: "B", selection: { promptCardIds: ["small-1"] } },
    matchWins: {},
    rng: rngSequence([0.9, 0.9]),
  });

  assert.equal(result.winnerId, null);
  assert.equal(result.isReplay, true);
});

test("「破壊」を使うと相手のカードがランダムで1枚無効化される", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: {
      playerId: "A",
      selection: { promptCardIds: ["small-1", "medium-1"] },
    },
    playerB: { playerId: "B", selection: { promptCardIds: [], supportCard: "removeCard" } },
    matchWins: {},
    // [破壊の対象抽選(index=1→medium-1を無効化), Aのロール, Bのロール]
    rng: rngSequence([0.6, 0.9, 0.9]),
  });

  assert.deepEqual(result.outcomes.A.voidedCardIds, ["medium-1"]);
  assert.equal(result.outcomes.A.score, 10 + 15); // small1枚分のみ+未使用ボーナス
  assert.equal(result.winnerId, "A");
});

test("「強化」を使うと自分のカードからランダムで1枚のスコアが2倍になる", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: {
      playerId: "A",
      selection: { promptCardIds: ["small-1", "large-1"], supportCard: "randomBoost" },
    },
    playerB: { playerId: "B", selection: { promptCardIds: [] } },
    matchWins: {},
    // [Aのロール, Bのロール, 強化の対象抽選(index=1→large-1が2倍)]
    rng: rngSequence([0.9, 0.9, 0.6]),
  });

  // small(10)+large(50) + large分をもう一度加算(+50) = 110（未使用ボーナスは無し）
  assert.equal(result.outcomes.A.score, 110);
});

test("「道連れ」は自分が暴走した場合のみ、確率で相手の過学習確率も上げる", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: {
      playerId: "A",
      selection: { promptCardIds: ["large-1"], supportCard: "curse" }, // 過学習50%
    },
    playerB: { playerId: "B", selection: { promptCardIds: ["small-1"] } }, // 過学習4%
    matchWins: {},
    // [Aのロール(10<50で暴走), Bのロール(20, 元の4%では非暴走だが+30%後の34%では暴走), 道連れ発動判定(50<75で発動)]
    rng: rngSequence([0.1, 0.2, 0.5]),
  });

  assert.equal(result.outcomes.A.busted, true);
  assert.equal(result.outcomes.B.overlearnChance, 34);
  assert.equal(result.outcomes.B.busted, true);
  assert.equal(result.winnerId, null); // 両者暴走で再戦
});

test("「道連れ」は自分が暴走しなければ発動しない", () => {
  const result = resolveRound({
    roundNumber: 1,
    playerA: {
      playerId: "A",
      selection: { promptCardIds: ["small-1"], supportCard: "curse" }, // 過学習4%、暴走しない
    },
    playerB: { playerId: "B", selection: { promptCardIds: ["small-1"] } },
    matchWins: {},
    rng: rngSequence([0.9, 0.9]),
  });

  assert.equal(result.outcomes.A.busted, false);
  assert.equal(result.outcomes.B.overlearnChance, 4); // 道連れが発動していないので上がらない
});

test("dealSupportOptionsは重複なく規定枚数を母集団から選ぶ", () => {
  const dealt = dealSupportOptions(rngSequence([0.1, 0.5, 0.9, 0.3]));

  assert.equal(dealt.length, SUPPORT_CARD_DEAL_COUNT);
  assert.equal(new Set(dealt).size, dealt.length);
  for (const type of dealt) {
    assert.ok(SUPPORT_CARD_POOL.includes(type));
  }
});
