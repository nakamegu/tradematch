'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MatchResult {
  id: string;
  nickname: string;
  distance: number;
  theyHave: string[];
  youHave: string[];
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
  const [incomingRequest, setIncomingRequest] = useState<{
    matchRecordId: string;
    requesterName: string;
    colorCode: string | null;
    requesterId: string;
  } | null>(null);
  const router = useRouter();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const matchingParamsRef = useRef<{
    myHaveIds: string[];
    myWantIds: string[];
  } | null>(null);

  // Search-only: does NOT insert/delete user_goods (safe to call from realtime)
  const searchMatches = useCallback(async (
    myHaveIds: string[],
    myWantIds: string[],
  ) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { data: otherUsers, error: matchError } = await supabase
        .from('users')
        .select('id, nickname')
        .eq('is_active', true)
        .neq('id', userId);

      if (matchError) {
        console.error('Error finding users:', matchError);
        return;
      }

      const { data: goodsData } = await supabase
        .from('goods_master')
        .select('id, name');

      const goodsNameMap: Record<string, string> = {};
      (goodsData || []).forEach((g: { id: string; name: string }) => {
        goodsNameMap[g.id] = g.name;
      });

      const foundMatches: MatchResult[] = [];

      for (const otherUser of otherUsers || []) {
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

        const theyHaveIWant = theirHaveIds.filter((id: string) =>
          myWantIds.includes(id)
        );
        const iHaveTheyWant = myHaveIds.filter((id) =>
          theirWantIds.includes(id)
        );

        if (theyHaveIWant.length > 0 && iHaveTheyWant.length > 0) {
          foundMatches.push({
            id: otherUser.id,
            nickname: otherUser.nickname,
            distance: 0,
            theyHave: theyHaveIWant.map((id: string) => goodsNameMap[id] || id),
            youHave: iHaveTheyWant.map((id) => goodsNameMap[id] || id),
            colorCode: COLOR_CODES[foundMatches.length % COLOR_CODES.length],
          });
        }
      }

      setMatches(foundMatches);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Initial registration + first search (called once)
  const registerAndMatch = useCallback(async (
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
        await supabase
          .from('users')
          .update({
            nickname,
            is_active: true,
            last_active: new Date().toISOString(),
          })
          .eq('id', userId);
      } else {
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

      // 4. Now search for matches
      await searchMatches(myHaveIds, myWantIds);
    } catch (err) {
      console.error('Registration error:', err);
      setIsSearching(false);
    }
  }, [searchMatches]);

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
    matchingParamsRef.current = { myHaveIds, myWantIds };

    const startMatching = (lat: number, lng: number) => {
      setLocationGranted(true);
      registerAndMatch(nickname, myHaveIds, myWantIds, lat, lng);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => startMatching(position.coords.latitude, position.coords.longitude),
        () => startMatching(0, 0)
      );
    } else {
      startMatching(0, 0);
    }

    // Subscribe to realtime channels after a short delay to avoid StrictMode race
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const setupChannels = () => {
      if (cancelled) return;

      const channelId = Date.now().toString();

      const userGoodsChannel = supabase
        .channel(`user_goods_${channelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_goods' },
          (payload) => {
            console.log('[Realtime] user_goods INSERT received:', payload.new);
            // Ignore own inserts to prevent loops
            const currentUserId = localStorage.getItem('userId');
            const inserted = payload.new as { user_id: string };
            if (inserted.user_id === currentUserId) return;

            // Debounce: multiple rows are inserted at once
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              const params = matchingParamsRef.current;
              if (params) {
                console.log('[Realtime] Re-searching matches...');
                searchMatches(params.myHaveIds, params.myWantIds);
              }
            }, 1000);
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] user_goods channel status:', status);
        });

      const matchesChannel = supabase
        .channel(`matches_${channelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'matches' },
          async (payload) => {
            console.log('[Realtime] matches INSERT received:', payload.new);
            const currentUserId = localStorage.getItem('userId');
            const newMatch = payload.new as {
              id: string;
              user1_id: string;
              user2_id: string;
              color_code: string | null;
            };
            if (newMatch.user2_id === currentUserId) {
              const { data: requester } = await supabase
                .from('users')
                .select('nickname')
                .eq('id', newMatch.user1_id)
                .single();
              const name = requester?.nickname || '誰か';
              setIncomingRequest({
                matchRecordId: newMatch.id,
                requesterName: name,
                colorCode: newMatch.color_code,
                requesterId: newMatch.user1_id,
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] matches channel status:', status);
        });

      channelsRef.current = [userGoodsChannel, matchesChannel];
    };

    // Delay channel setup slightly to let React StrictMode cleanup pass
    const setupTimer = setTimeout(setupChannels, 100);

    return () => {
      cancelled = true;
      clearTimeout(setupTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [router, registerAndMatch, searchMatches]);

  const handleMatch = async (matchUserId: string) => {
    const match = matches.find((m) => m.id === matchUserId);
    if (!match) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Create a match record in the DB
    const { data: matchRecord, error } = await supabase
      .from('matches')
      .insert({
        user1_id: userId,
        user2_id: matchUserId,
        status: 'pending',
        color_code: match.colorCode,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating match:', error);
    }

    // Store match info for identify page
    localStorage.setItem('currentMatch', JSON.stringify({
      ...match,
      matchRecordId: matchRecord?.id || null,
    }));
    router.push('/identify');
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;

    // Update match status to accepted
    await supabase
      .from('matches')
      .update({ status: 'accepted' })
      .eq('id', incomingRequest.matchRecordId);

    // Find the requester in our matches list for goods info
    const matchInfo = matches.find((m) => m.id === incomingRequest.requesterId);

    // Store match info for identify page (using the SAME matchRecordId)
    localStorage.setItem('currentMatch', JSON.stringify({
      id: incomingRequest.requesterId,
      nickname: incomingRequest.requesterName,
      distance: matchInfo?.distance || 0,
      theyHave: matchInfo?.theyHave || [],
      youHave: matchInfo?.youHave || [],
      colorCode: incomingRequest.colorCode || COLOR_CODES[0],
      matchRecordId: incomingRequest.matchRecordId,
    }));
    router.push('/identify');
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
        {/* Incoming trade request */}
        {incomingRequest && (
          <div className="bg-yellow-50 border-2 border-yellow-400 p-5 rounded-3xl mb-4 shadow-lg">
            <p className="font-bold text-yellow-800 text-lg mb-3">
              🔔 {incomingRequest.requesterName}さんから交換リクエスト！
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAcceptRequest}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                承認して識別へ →
              </button>
              <button
                onClick={() => setIncomingRequest(null)}
                className="px-4 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                後で
              </button>
            </div>
          </div>
        )}

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
                💡 <strong>ヒント:</strong> 新しいユーザーが登録すると自動的に再検索されます。このページを開いたままお待ちください。
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
