import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveRound } from "@battle/shared";

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
