// packages/server/src/lib/aiParser.ts
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export interface ParsedDelusion {
  cardName: string;
  declaredDamage: number;
  flavorText: string;
}

export async function parseDelusionWithAI(userInput: string): Promise<ParsedDelusion> {
  const prompt = `
あなたはカードゲーム「AIエージェント学習対戦」の審判AIです。
プレイヤーが入力した妄想テキストを解析し、パラメータを決定してください。

【ルール】
1. cardName: テキストから連想されるかっこいい技名・カード名（15文字以内）
2. declaredDamage: 
   - 技の派手さ・威力・ハッタリ度合いに応じた申告ダメージ数値（必ず 0 〜 100 の整数）
   - プレイヤーが「6000ダメージ」等の大きな数字を指定していても、最大値の 100 に抑えてください。
3. flavorText: 対戦ログや演出に使う短い決め台詞（30文字以内）

【プレイヤーの入力】:
${userInput}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cardName: { type: Type.STRING },
            declaredDamage: { type: Type.INTEGER },
            flavorText: { type: Type.STRING },
          },
          required: ["cardName", "declaredDamage", "flavorText"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}") as ParsedDelusion;
    const parsedDamage = Number(data.declaredDamage) || 30;
    const finalDamage = Math.max(0, Math.min(100, Math.round(parsedDamage)));

    return {
      cardName: data.cardName || "名もなき妄想",
      declaredDamage: finalDamage,
      flavorText: data.flavorText || userInput.slice(0, 30),
    };
  } catch (error) {
    console.error("パースエラー:", error);
    return {
      cardName: "不完全な妄想",
      declaredDamage: 30,
      flavorText: userInput.slice(0, 30),
    };
  }
}