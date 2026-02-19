'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import type { Event } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import TradeMapWrapper from '@/components/TradeMapWrapper';
import { isWithinEventArea } from '@/lib/geo';
import { useDeleteAccount } from '@/lib/useDeleteAccount';
import { MapPin, Loader2, SearchX, Lightbulb, User, Bell } from 'lucide-react';

interface TradeGroup {
  have: Record<string, number>;
  wantItems: string[];
  wantQuantity: number;
  giveCount?: number;
}

interface GoodsWithQuantity {
  id: string;
  name: string;
  quantity: number;
}

interface GroupMatch {
  myGroupIdx: number;
  theyOffer: GoodsWithQuantity[];
  theyWantQty: number;
  youOffer: GoodsWithQuantity[];
  myWantQty: number;
  myGiveCount: number;
}

interface MatchResult {
  id: string;
  nickname: string;
  distance: number;
  groupMatches: GroupMatch[];
  colorCode: string;
  lat: number;
  lng: number;
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
    theyOffer: { name: string; quantity: number }[];
    theyWant: { name: string; quantity: number }[];
  } | null>(null);
  const router = useRouter();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const tradeGroupsRef = useRef<TradeGroup[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [eventData, setEventData] = useState<Event | null>(null);
  const [isInArea, setIsInArea] = useState(true);
  const { showDeleteConfirm, setShowDeleteConfirm, deleting, handleDeleteAllData } = useDeleteAccount();

  const searchMatches = useCallback(async (myGroups: TradeGroup[]) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data: otherUsers, error: matchError } = await supabase
        .from('users')
        .select('id, nickname, latitude, longitude')
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

      // Exclude users with active (pending/accepted/completed) matches
      const [{ data: matchesAsUser1 }, { data: matchesAsUser2 }] = await Promise.all([
        supabase.from('matches').select('user2_id').eq('user1_id', userId).in('status', ['pending', 'accepted']),
        supabase.from('matches').select('user1_id').eq('user2_id', userId).in('status', ['pending', 'accepted']),
      ]);
      const excludeIds = new Set<string>();
      (matchesAsUser1 || []).forEach((m: any) => excludeIds.add(m.user2_id));
      (matchesAsUser2 || []).forEach((m: any) => excludeIds.add(m.user1_id));

      const foundMatches: MatchResult[] = [];

      for (const otherUser of otherUsers || []) {
        if (excludeIds.has(otherUser.id)) continue;
        const { data: theirGoods } = await supabase
          .from('user_goods')
          .select('goods_id, type, quantity, group_id')
          .eq('user_id', otherUser.id);

        if (!theirGoods) continue;

        // Build their groups from DB rows
        const theirGroupsMap = new Map<number, { have: Record<string, number>; wantItems: string[]; wantQuantity: number }>();
        for (const row of theirGoods) {
          const gid = row.group_id ?? 0;
          if (!theirGroupsMap.has(gid)) {
            theirGroupsMap.set(gid, { have: {}, wantItems: [], wantQuantity: 1 });
          }
          const g = theirGroupsMap.get(gid)!;
          if (row.type === 'have') {
            g.have[row.goods_id] = row.quantity || 1;
          } else {
            g.wantItems.push(row.goods_id);
            g.wantQuantity = row.quantity || 1;
          }
        }
        const theirGroups = Array.from(theirGroupsMap.values());

        // Cross-match: my group X vs their group Y
        const groupMatches: GroupMatch[] = [];

        for (let mgIdx = 0; mgIdx < myGroups.length; mgIdx++) {
          const myGroup = myGroups[mgIdx];
          const myHaveIds = Object.keys(myGroup.have);
          const myWantIds = myGroup.wantItems;

          for (const theirGroup of theirGroups) {
            const theirHaveIds = Object.keys(theirGroup.have);
            const theirWantIds = theirGroup.wantItems;

            // They have something I want AND I have something they want
            const theyOfferIds = theirHaveIds.filter((id) => myWantIds.includes(id));
            const youOfferIds = myHaveIds.filter((id) => theirWantIds.includes(id));

            if (theyOfferIds.length > 0 && youOfferIds.length > 0) {
              groupMatches.push({
                myGroupIdx: mgIdx,
                theyOffer: theyOfferIds.map((id) => ({
                  id,
                  name: goodsNameMap[id] || id,
                  quantity: theirGroup.have[id] || 1,
                })),
                theyWantQty: theirGroup.wantQuantity,
                youOffer: youOfferIds.map((id) => ({
                  id,
                  name: goodsNameMap[id] || id,
                  quantity: myGroup.have[id] || 1,
                })),
                myWantQty: myGroup.wantQuantity,
                myGiveCount: myGroup.giveCount || 1,
              });
            }
          }
        }

        if (groupMatches.length > 0) {
          foundMatches.push({
            id: otherUser.id,
            nickname: otherUser.nickname,
            distance: 0,
            groupMatches,
            colorCode: COLOR_CODES[foundMatches.length % COLOR_CODES.length],
            lat: otherUser.latitude || 0,
            lng: otherUser.longitude || 0,
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

  const registerAndMatch = useCallback(async (
    nickname: string,
    myGroups: TradeGroup[],
    lat: number,
    lng: number
  ) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No auth session');
        setIsSearching(false);
        return;
      }

      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          nickname,
          is_active: true,
          last_active: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('Error upserting user:', upsertError);
        setIsSearching(false);
        return;
      }

      setMyLocation({ lat, lng });

      if (lat !== 0 || lng !== 0) {
        await supabase.rpc('update_user_location', {
          lat,
          lng,
        }).then(({ error }) => {
          if (error) console.log('Location update skipped:', error.message);
        });
      }

      // Delete existing user_goods and re-insert with group_id
      await supabase
        .from('user_goods')
        .delete()
        .eq('user_id', userId);

      const userGoodsRows: {
        user_id: string;
        goods_id: string;
        type: 'have' | 'want';
        quantity: number;
        group_id: number;
      }[] = [];

      myGroups.forEach((group, groupIdx) => {
        // Have items
        for (const [goodsId, quantity] of Object.entries(group.have)) {
          userGoodsRows.push({
            user_id: userId,
            goods_id: goodsId,
            type: 'have',
            quantity,
            group_id: groupIdx,
          });
        }
        // Want items — quantity stores the group's wantQuantity
        for (const goodsId of group.wantItems) {
          userGoodsRows.push({
            user_id: userId,
            goods_id: goodsId,
            type: 'want',
            quantity: group.wantQuantity,
            group_id: groupIdx,
          });
        }
      });

      await supabase.from('user_goods').insert(userGoodsRows);

      await searchMatches(myGroups);
    } catch (err) {
      console.error('Registration error:', err);
      setIsSearching(false);
    }
  }, [searchMatches]);

  // Continuous location watch: update is_active based on area
  const watchIdRef = useRef<number | null>(null);
  const prevInAreaRef = useRef<boolean | null>(null);

  const updateActiveStatus = useCallback(async (inArea: boolean) => {
    // Only update DB if status actually changed
    if (prevInAreaRef.current === inArea) return;
    prevInAreaRef.current = inArea;

    const userId = await getCurrentUserId();
    if (!userId) return;

    await supabase
      .from('users')
      .update({ is_active: inArea })
      .eq('id', userId);

    console.log(`[Location] is_active → ${inArea}`);
  }, []);

  useEffect(() => {
    const tradeGroupsData = localStorage.getItem('tradeGroups');
    const nickname = localStorage.getItem('nickname');
    const eventId = localStorage.getItem('selectedEventId');

    if (!tradeGroupsData || !nickname || !eventId) {
      router.push('/register');
      return;
    }

    // Fetch event data for area restriction + trade period check
    supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data) {
          setEventData(data as Event);
          const ev = data as Event;
          const now = new Date().toISOString();
          if ((ev.trade_start && now < ev.trade_start) || (ev.trade_end && now > ev.trade_end)) {
            router.push('/register');
            return;
          }
        }
      });

    const myGroups: TradeGroup[] = JSON.parse(tradeGroupsData);
    tradeGroupsRef.current = myGroups;

    let initialMatchDone = false;

    const startMatching = (lat: number, lng: number) => {
      setLocationGranted(true);
      registerAndMatch(nickname, myGroups, lat, lng);
      initialMatchDone = true;
    };

    if ('geolocation' in navigator) {
      // Use watchPosition for continuous location tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMyLocation({ lat, lng });

          if (!initialMatchDone) {
            startMatching(lat, lng);
          } else {
            // Update location in DB
            if (lat !== 0 || lng !== 0) {
              supabase.rpc('update_user_location', {
                lat,
                lng,
              });
            }
          }
        },
        () => {
          if (!initialMatchDone) startMatching(0, 0);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    } else {
      startMatching(0, 0);
    }

    // Fallback: poll location every 60s for when watchPosition doesn't fire (stationary)
    const locationPollId = setInterval(() => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {},
          { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
        );
      }
    }, 60000);

    // Shared function to process an incoming match request
    const processIncomingMatch = async (matchRow: { id: string; user1_id: string; user2_id: string; color_code: string | null }, currentUserId: string) => {
      const [requesterRes, theirGoodsRes, myGoodsRes, goodsNamesRes] = await Promise.all([
        supabase.from('users').select('nickname').eq('id', matchRow.user1_id).single(),
        supabase.from('user_goods').select('goods_id, type, quantity, group_id').eq('user_id', matchRow.user1_id),
        supabase.from('user_goods').select('goods_id, type, quantity, group_id').eq('user_id', currentUserId),
        supabase.from('goods_master').select('id, name'),
      ]);

      const nameMap: Record<string, string> = {};
      (goodsNamesRes.data || []).forEach((g: { id: string; name: string }) => { nameMap[g.id] = g.name; });

      const theirHave: Record<string, number> = {};
      const theirWant = new Set<string>();
      for (const row of theirGoodsRes.data || []) {
        if (row.type === 'have') theirHave[row.goods_id] = row.quantity || 1;
        else theirWant.add(row.goods_id);
      }

      const myHave = new Set<string>();
      const myWant = new Set<string>();
      for (const row of myGoodsRes.data || []) {
        if (row.type === 'have') myHave.add(row.goods_id);
        else myWant.add(row.goods_id);
      }

      const theyOffer = Object.keys(theirHave)
        .filter((id) => myWant.has(id))
        .map((id) => ({ name: nameMap[id] || id, quantity: theirHave[id] }));
      const theyWant = Array.from(theirWant)
        .filter((id) => myHave.has(id))
        .map((id) => ({ name: nameMap[id] || id, quantity: 1 }));

      setIncomingRequest({
        matchRecordId: matchRow.id,
        requesterName: requesterRes.data?.nickname || '誰か',
        colorCode: matchRow.color_code,
        requesterId: matchRow.user1_id,
        theyOffer,
        theyWant,
      });
    };

    // Poll for incoming match requests every 5 seconds
    let lastSeenMatchId: string | null = null;
    const matchRequestPollId = setInterval(async () => {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data: pending } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, color_code')
        .eq('user2_id', userId)
        .eq('status', 'pending')
        .order('matched_at', { ascending: false })
        .limit(1);

      if (pending && pending.length > 0 && pending[0].id !== lastSeenMatchId) {
        lastSeenMatchId = pending[0].id;
        processIncomingMatch(pending[0], userId);
      }
    }, 5000);

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
          async (payload) => {
            console.log('[Realtime] user_goods INSERT received:', payload.new);
            const currentUserId = await getCurrentUserId();
            const inserted = payload.new as { user_id: string };
            if (inserted.user_id === currentUserId) return;

            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              const groups = tradeGroupsRef.current;
              if (groups.length > 0) {
                console.log('[Realtime] Re-searching matches...');
                searchMatches(groups);
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
            const currentUserId = await getCurrentUserId();
            const newMatch = payload.new as {
              id: string;
              user1_id: string;
              user2_id: string;
              color_code: string | null;
            };
            if (newMatch.user2_id === currentUserId) {
              processIncomingMatch(newMatch, currentUserId);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] matches channel status:', status);
        });

      channelsRef.current = [userGoodsChannel, matchesChannel];
    };

    const setupTimer = setTimeout(setupChannels, 100);

    return () => {
      cancelled = true;
      clearTimeout(setupTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      clearInterval(locationPollId);
      clearInterval(matchRequestPollId);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [router, registerAndMatch, searchMatches]);

  useEffect(() => {
    if (eventData && myLocation.lat !== 0) {
      const inArea = isWithinEventArea(myLocation.lat, myLocation.lng, eventData);
      setIsInArea(inArea);
      updateActiveStatus(inArea);
    }
  }, [myLocation, eventData, updateActiveStatus]);

  const handleMatch = async (matchUserId: string) => {
    const match = matches.find((m) => m.id === matchUserId);
    if (!match) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

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

    localStorage.setItem('currentMatch', JSON.stringify({
      ...match,
      matchRecordId: matchRecord?.id || null,
      lat: match.lat,
      lng: match.lng,
    }));
    router.push('/identify');
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;

    await supabase
      .from('matches')
      .update({ status: 'accepted' })
      .eq('id', incomingRequest.matchRecordId);

    const matchInfo = matches.find((m) => m.id === incomingRequest.requesterId);

    localStorage.setItem('currentMatch', JSON.stringify({
      id: incomingRequest.requesterId,
      nickname: incomingRequest.requesterName,
      distance: matchInfo?.distance || 0,
      groupMatches: matchInfo?.groupMatches || [],
      colorCode: incomingRequest.colorCode || COLOR_CODES[0],
      matchRecordId: incomingRequest.matchRecordId,
      lat: matchInfo?.lat || 0,
      lng: matchInfo?.lng || 0,
    }));
    router.push('/identify');
  };

  if (!locationGranted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4a] p-4">
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <MapPin className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">位置情報の許可</h2>
          <p className="text-slate-400 mb-6">
            近くの交換相手を見つけるために、位置情報の利用を許可してください。
          </p>
        </div>
      </main>
    );
  }

  if (isSearching) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a2d4a] p-4">
        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">マッチング検索中...</h2>
          <p className="text-slate-400">
            近くの交換相手を探しています
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1a2d4a] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Incoming trade request */}
        {incomingRequest && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 p-5 rounded-2xl mb-4">
            <p className="font-bold text-amber-600 text-lg mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5" /> {incomingRequest.requesterName}さんから交換リクエスト！
            </p>

            {/* 交換内容 */}
            {(incomingRequest.theyOffer.length > 0 || incomingRequest.theyWant.length > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white/60 rounded-lg p-2">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">もらえるグッズ</p>
                  <ul className="text-xs text-slate-700 space-y-0.5">
                    {incomingRequest.theyOffer.map((item, i) => (
                      <li key={i}>✓ {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/60 rounded-lg p-2">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">渡すグッズ</p>
                  <ul className="text-xs text-slate-700 space-y-0.5">
                    {incomingRequest.theyWant.map((item, i) => (
                      <li key={i}>✓ {item.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAcceptRequest}
                className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold transition-colors"
              >
                承認して識別へ
              </button>
              <button
                onClick={() => setIncomingRequest(null)}
                className="px-4 bg-slate-100 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
                後で
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">マッチング結果</h1>
          <p className="text-slate-400">
            {matches.length > 0
              ? `${matches.length}人の交換相手が見つかりました！`
              : '近くに交換相手が見つかりませんでした'}
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <SearchX className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              マッチング相手が見つかりませんでした
            </h2>
            <p className="text-slate-400 mb-6">
              近くに交換可能なグッズを持った人がいないようです。
              <br />
              別のグッズを登録してみるか、もう少し待ってみてください。
            </p>
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-600 flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>ヒント:</strong> 新しいユーザーが登録すると自動的に再検索されます。このページを開いたままお待ちください。</span>
              </p>
            </div>
            <button
              onClick={() => router.push('/register')}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold transition-colors"
            >
              グッズ登録に戻る
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div key={match.id} className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <User className="w-10 h-10 text-slate-400" />
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{match.nickname}</h3>
                      {match.distance > 0 && (
                        <p className="text-sm text-slate-400">約 {match.distance}m</p>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-12 h-12 rounded-full shadow-lg"
                    style={{ backgroundColor: match.colorCode }}
                  ></div>
                </div>

                {/* Group matches */}
                <div className="space-y-3 mb-4">
                  {match.groupMatches.map((gm, gmIdx) => (
                    <div key={gmIdx} className="bg-slate-100 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                          {gm.myGiveCount || 1}:{gm.myWantQty} 交換
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">
                            相手が出せる
                          </p>
                          <ul className="text-xs text-slate-600 space-y-0.5">
                            {gm.theyOffer.map((item, i) => (
                              <li key={i}>✓ {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">
                            あなたが出せる
                          </p>
                          <ul className="text-xs text-slate-600 space-y-0.5">
                            {gm.youOffer.map((item, i) => (
                              <li key={i}>✓ {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {isInArea && myLocation.lat !== 0 && match.lat !== 0 && (
                  <div className="mb-4" style={{ height: '150px' }}>
                    <TradeMapWrapper
                      myLat={myLocation.lat}
                      myLng={myLocation.lng}
                      otherLat={match.lat}
                      otherLng={match.lng}
                      otherName={match.nickname}
                    />
                  </div>
                )}

                {isInArea ? (
                  <button
                    onClick={() => handleMatch(match.id)}
                    className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold transition-colors"
                  >
                    この人と交換する
                  </button>
                ) : (
                  <div className="w-full bg-slate-200 text-slate-400 py-3 rounded-xl font-bold text-center">
                    会場エリア外のため交換できません
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center space-y-3">
          <button
            onClick={() => router.push('/register')}
            className="text-indigo-400 underline hover:text-indigo-300"
          >
            グッズ登録に戻る
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="block mx-auto text-slate-500 text-xs hover:text-slate-400 mt-4"
            >
              データを全て削除して終了
            </button>
          ) : (
            <div className="bg-slate-50 rounded-2xl shadow-sm border border-red-500/30 p-4 text-left">
              <p className="text-sm font-bold text-red-600 mb-2">
                本当に削除しますか？
              </p>
              <p className="text-xs text-slate-400 mb-3">
                あなたの登録データ（ユーザー情報・グッズ登録・マッチング履歴）が全て削除されます。この操作は取り消せません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAllData}
                  disabled={deleting}
                  className="flex-1 bg-red-500/20 text-red-600 border border-red-500/30 py-2 rounded-xl text-sm font-bold hover:bg-red-500/30 disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除する'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-sm font-semibold hover:bg-slate-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
