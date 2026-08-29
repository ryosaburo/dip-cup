export interface QueuedPlayer {
  socketId: string;
  playerName: string;
  userId?: string;
}

/** 自動マッチングの待機列（同時に並べるのは1人まで）。単一プロセスのメモリ上で管理する */
export class MatchmakingQueue {
  private waiting: QueuedPlayer | null = null;

  /**
   * 待機列に並ぶ。既に他の誰かが並んでいればその相手を返し（マッチ成立、自分は並ばない）、
   * 誰もいなければ自分が並んで null を返す。
   */
  enqueue(player: QueuedPlayer): QueuedPlayer | null {
    if (this.waiting && this.waiting.socketId !== player.socketId) {
      const opponent = this.waiting;
      this.waiting = null;
      return opponent;
    }
    this.waiting = player;
    return null;
  }

  /** 待機列から取り下げる（キャンセル・切断時に使う） */
  remove(socketId: string): void {
    if (this.waiting?.socketId === socketId) {
      this.waiting = null;
    }
  }
}
