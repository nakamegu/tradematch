'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface MatchResult {
  id: string;
  nickname: string;
  distance: number;
  theyHave: string[];  // goods names the other person has that I want
  youHave: string[];   // goods names I have that the other person wants
  colorCode: string;
}

const COLOR_CODES = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'
];

export default function MatchingPage() {
  const [isSearching, setIsSearching] = useState(true);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const haveData = localStorage.getItem('haveGoodsIds');
    const wantData = localStorage.getItem('wantGoodsIds');
    const nickname = localStorage.getItem('nickname');
    const eventId = localStorage.getItem('selectedEventId');

    if (!haveData || !wantData || !nickname || !eventId) {
      router.push('/register');
      return;
    }

    const myHaveIds: string[] = JSON.parse(haveData);
    const myWantIds: string[] = JSON.parse(wantData);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationGranted(true);
          performMatching(
            nickname,
            myHaveIds,
            myWantIds,
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (error) => {
          console.error('位置情報の取得エラー:', error);
          // Still allow matching without location (distance won't be accurate)
          setLocationGranted(true);
          performMatching(nickname, myHaveIds, myWantIds, 0, 0);
        }
      );
    } else {
      setLocationGranted(true);
      performMatching(nickname, myHaveIds, myWantIds, 0, 0);
    }
  }, [router]);

  const performMatching = async (
    nickname: string,
    myHaveIds: string[],
    myWantIds: string[],
    lat: number,
    lng: number
  ) => {
    try {
      // 1. Create or update user
      let userId = localStorage.getItem('userId');

      if (userId) {
        // Update existing user
        await supabase
          .from('users')
          .update({
            nickname,
            is_active: true,
            last_active: new Date().toISOString(),
          })
          .eq('id', userId);
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            nickname,
            is_active: true,
            last_active: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error || !newUser) {
          console.error('Error creating user:', error);
          setIsSearching(false);
          return;
        }
        userId = newUser.id;
        localStorage.setItem('userId', userId!);
      }

      // 2. Update user location if available
      if (lat !== 0 || lng !== 0) {
        await supabase.rpc('update_user_location', {
          user_id_input: userId,
          lat,
          lng,
        }).then(({ error }) => {
          // Location update is best-effort; RPC may not exist yet
          if (error) console.log('Location update skipped:', error.message);
        });
      }

      // 3. Delete existing user_goods and re-insert
      await supabase
        .from('user_goods')
        .delete()
        .eq('user_id', userId);

      const userGoodsRows = [
        ...myHaveIds.map((goodsId) => ({
          user_id: userId!,
          goods_id: goodsId,
          type: 'have' as const,
        })),
        ...myWantIds.map((goodsId) => ({
          user_id: userId!,
          goods_id: goodsId,
          type: 'want' as const,
        })),
      ];

      await supabase.from('user_goods').insert(userGoodsRows);

      // 4. Find matching users
      // Get other active users who have goods I want AND want goods I have
      const { data: otherUsers, error: matchError } = await supabase
        .from('users')
        .select('id, nickname')
        .eq('is_active', true)
        .neq('id', userId);

      if (matchError) {
        console.error('Error finding users:', matchError);
        setIsSearching(false);
        return;
      }

      // Build a goods name lookup
      const allGoodsIds = [...new Set([...myHaveIds, ...myWantIds])];
      const { data: goodsData } = await supabase
        .from('goods_master')
        .select('id, name');

      const goodsNameMap: Record<string, string> = {};
      (goodsData || []).forEach((g: { id: string; name: string }) => {
        goodsNameMap[g.id] = g.name;
      });

      const foundMatches: MatchResult[] = [];

      for (const otherUser of otherUsers || []) {
        // Get the other user's goods
        const { data: theirGoods } = await supabase
          .from('user_goods')
          .select('goods_id, type')
          .eq('user_id', otherUser.id);

        if (!theirGoods) continue;

        const theirHaveIds = theirGoods
          .filter((g: { type: string }) => g.type === 'have')
          .map((g: { goods_id: string }) => g.goods_id);
        const theirWantIds = theirGoods
          .filter((g: { type: string }) => g.type === 'want')
          .map((g: { goods_id: string }) => g.goods_id);

        // They have what I want
        const theyHaveIWant = theirHaveIds.filter((id: string) =>
          myWantIds.includes(id)
        );
        // I have what they want
        const iHaveTheyWant = myHaveIds.filter((id) =>
          theirWantIds.includes(id)
        );

        if (theyHaveIWant.length > 0 && iHaveTheyWant.length > 0) {
          foundMatches.push({
            id: otherUser.id,
            nickname: otherUser.nickname,
            distance: 0, // TODO: calculate real distance with PostGIS
            theyHave: theyHaveIWant.map((id: string) => goodsNameMap[id] || id),
            youHave: iHaveTheyWant.map((id) => goodsNameMap[id] || id),
            colorCode: COLOR_CODES[foundMatches.length % COLOR_CODES.length],
          });
        }
      }

      setMatches(foundMatches);
    } catch (err) {
      console.error('Matching error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMatch = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      localStorage.setItem('currentMatch', JSON.stringify(match));
      router.push('/identify');
    }
  };

  if (!locationGranted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">位置情報の許可</h2>
          <p className="text-gray-600 mb-6">
            近くの交換相手を見つけるために、位置情報の利用を許可してください。
          </p>
        </div>
      </main>
    );
  }

  if (isSearching) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">マッチング検索中...</h2>
          <p className="text-gray-600">
            近くの交換相手を探しています
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">マッチング結果</h1>
          <p className="text-gray-600">
            {matches.length > 0
              ? `${matches.length}人の交換相手が見つかりました！`
              : '近くに交換相手が見つかりませんでした'}
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              マッチング相手が見つかりませんでした
            </h2>
            <p className="text-gray-600 mb-6">
              近くに交換可能なグッズを持った人がいないようです。
              <br />
              別のグッズを登録してみるか、もう少し待ってみてください。
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700">
                💡 <strong>ヒント:</strong> より多くのグッズを登録すると、マッチングの可能性が高まります
              </p>
            </div>
            <button
              onClick={() => router.push('/register')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              グッズ登録に戻る
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div key={match.id} className="bg-white rounded-3xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">👤</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{match.nickname}</h3>
                      {match.distance > 0 && (
                        <p className="text-sm text-gray-500">約 {match.distance}m</p>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-12 h-12 rounded-full shadow-lg"
                    style={{ backgroundColor: match.colorCode }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-sm font-semibold text-purple-700 mb-2">相手が持っている</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {match.theyHave.map((item: string, idx: number) => (
                        <li key={idx}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-3">
                    <p className="text-sm font-semibold text-pink-700 mb-2">あなたが持っている</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {match.youHave.map((item: string, idx: number) => (
                        <li key={idx}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => handleMatch(match.id)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  この人と交換する →
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/register')}
            className="text-white underline hover:text-purple-200"
          >
            ← グッズ登録に戻る
          </button>
        </div>
      </div>
    </main>
  );
}
