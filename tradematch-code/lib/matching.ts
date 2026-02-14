// lib/matching.ts

export interface GoodItem {
  id: string;
  name: string;
  type: 'have' | 'want';
}

export interface User {
  id: string;
  nickname: string;
  location: {
    latitude: number;
    longitude: number;
  };
  goods: GoodItem[];
}

export interface MatchResult {
  user: User;
  distance: number;
  matchedItems: {
    theyHave: string[]; // 相手が持っていて、自分が欲しいもの
    youHave: string[];  // 自分が持っていて、相手が欲しいもの
  };
  colorCode: string;
}

/**
 * カラーコードをランダム生成
 */
export function generateColorCode(): string {
  const colors = [
    '#FF6B6B', // 赤
    '#4ECDC4', // 青緑
    '#FFE66D', // 黄色
    '#95E1D3', // ミント
    '#F38181', // ピンク
    '#AA96DA', // 紫
    '#FCBAD3', // ライトピンク
    '#A8D8EA', // 水色
    '#FF9A8B', // サーモンピンク
    '#6A89CC', // 青
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * マッチング判定
 * 相互に交換可能なアイテムがあるかチェック
 */
export function checkMatch(
  myGoods: GoodItem[],
  theirGoods: GoodItem[]
): {
  isMatch: boolean;
  theyHave: string[];
  youHave: string[];
} {
  const myWants = myGoods.filter((g) => g.type === 'want').map((g) => g.name);
  const myHaves = myGoods.filter((g) => g.type === 'have').map((g) => g.name);

  const theyWant = theirGoods.filter((g) => g.type === 'want').map((g) => g.name);
  const theyHave = theirGoods.filter((g) => g.type === 'have').map((g) => g.name);

  // 相手が持っていて、自分が欲しいもの
  const theyHaveIWant = theyHave.filter((item) => myWants.includes(item));

  // 自分が持っていて、相手が欲しいもの
  const iHaveTheyWant = myHaves.filter((item) => theyWant.includes(item));

  // 相互マッチング: 両方に交換可能なアイテムがある
  const isMatch = theyHaveIWant.length > 0 && iHaveTheyWant.length > 0;

  return {
    isMatch,
    theyHave: theyHaveIWant,
    youHave: iHaveTheyWant,
  };
}

/**
 * 複数ユーザーとのマッチング判定
 */
export function findMatches(
  currentUser: User,
  nearbyUsers: User[],
  maxDistance: number = 200
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const user of nearbyUsers) {
    // 距離チェック
    if (user.id === currentUser.id) continue;

    const distance = calculateDistance(
      currentUser.location,
      user.location
    );

    if (distance > maxDistance) continue;

    // マッチング判定
    const matchResult = checkMatch(currentUser.goods, user.goods);

    if (matchResult.isMatch) {
      matches.push({
        user,
        distance: Math.round(distance),
        matchedItems: {
          theyHave: matchResult.theyHave,
          youHave: matchResult.youHave,
        },
        colorCode: generateColorCode(),
      });
    }
  }

  // 距離でソート（近い順）
  return matches.sort((a, b) => a.distance - b.distance);
}

/**
 * Haversine formula で2点間の距離を計算
 */
function calculateDistance(
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number }
): number {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
