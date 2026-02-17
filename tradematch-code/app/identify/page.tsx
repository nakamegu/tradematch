'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Match, Event } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import TradeMapWrapper from '@/components/TradeMapWrapper';
import { isWithinEventArea } from '@/lib/geo';

export default function IdentifyPage() {
  const [matchData, setMatchData] = useState<any>(null);
  const [matchRecord, setMatchRecord] = useState<Match | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [isInArea, setIsInArea] = useState(true);
  // tradedQty: key = "groupIdx-give-itemIdx" or "groupIdx-get-itemIdx", value = quantity
  const [tradedQty, setTradedQty] = useState<Record<string, number>>({});
  const [qtyConfirmed, setQtyConfirmed] = useState(false);
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchRecordIdRef = useRef<string | null>(null);

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending': return 'リクエスト送信済み';
      case 'accepted': return '相手が承認しました！';
      case 'completed': return '交換完了！';
      case 'cancelled': return 'キャンセルされました';
      default: return '';
    }
  };

  const updateMatchState = useCallback((record: Match) => {
    setMatchRecord((prev) => {
      // Only update if status actually changed
      if (prev?.status === record.status) return prev;
      console.log('[Identify] Status changed:', prev?.status, '→', record.status);
      setStatusLabel(getStatusLabel(record.status));
      return record;
    });
  }, []);

  // Poll the DB for match status changes
  const pollMatchStatus = useCallback(async () => {
    const id = matchRecordIdRef.current;
    if (!id) return;

    const { data: record } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (record) {
      updateMatchState(record as Match);
    }
  }, [updateMatchState]);

  useEffect(() => {
    const data = localStorage.getItem('currentMatch');
    if (!data) {
      router.push('/matching');
      return;
    }

    const parsed = JSON.parse(data);
    setMatchData(parsed);

    // Get own location for map + area check
    const eventId = localStorage.getItem('selectedEventId');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          if (eventId) {
            const { data: ev } = await supabase
              .from('events')
              .select('*')
              .eq('id', eventId)
              .single();
            if (ev) {
              setIsInArea(isWithinEventArea(loc.lat, loc.lng, ev as Event));
            }
          }
        },
        () => {} // ignore error
      );
    }

    const matchRecordId = parsed.matchRecordId;
    if (!matchRecordId) return;
    matchRecordIdRef.current = matchRecordId;

    // Initial load from DB
    const loadMatch = async () => {
      const { data: record } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchRecordId)
        .single();

      if (record) {
        setMatchRecord(record as Match);
        setStatusLabel(getStatusLabel(record.status));
      }
    };
    loadMatch();

    // Primary: poll every 3 seconds (reliable)
    pollRef.current = setInterval(pollMatchStatus, 3000);

    // Secondary: try Realtime for faster updates
    let cancelled = false;
    const setupTimer = setTimeout(() => {
      if (cancelled) return;

      const channel = supabase
        .channel(`match_sync_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          (payload) => {
            const row = payload.new as Match;
            if (row.id === matchRecordId) {
              console.log('[Realtime] Match update received:', row.status);
              updateMatchState(row);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] identify channel:', status);
          if (status === 'SUBSCRIBED') {
            // Realtime is working - slow down polling
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(pollMatchStatus, 10000);
          }
        });

      channelRef.current = channel;
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(setupTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [router, pollMatchStatus, updateMatchState]);

  const handleFlash = () => {
    setIsFlashing(true);
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    setTimeout(() => setIsFlashing(false), 1500);
  };

  // Initialize tradedQty with default values (1 per item) when trade completes
  const initTradedQty = useCallback((groupMatches: any[]) => {
    const qty: Record<string, number> = {};
    groupMatches.forEach((gm: any, i: number) => {
      (gm.youOffer || []).forEach((_: any, j: number) => {
        qty[`${i}-give-${j}`] = 1;
      });
      (gm.theyOffer || []).forEach((_: any, j: number) => {
        qty[`${i}-get-${j}`] = 1;
      });
    });
    setTradedQty(qty);
  }, []);

  const updateTradedQty = (key: string, delta: number, max: number) => {
    setTradedQty((prev) => {
      const current = prev[key] ?? 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [key]: next };
    });
  };

  // Update tradeGroups in localStorage using edited quantities
  const updateTradeGroupsAfterTrade = useCallback(() => {
    const groupMatches = matchData?.groupMatches;
    if (!groupMatches || groupMatches.length === 0) return;

    const saved = localStorage.getItem('tradeGroups');
    if (!saved) return;

    try {
      const tradeGroups = JSON.parse(saved);
      if (!Array.isArray(tradeGroups)) return;

      for (let i = 0; i < groupMatches.length; i++) {
        const gm = groupMatches[i];
        const idx = gm.myGroupIdx;
        if (idx == null || !tradeGroups[idx]) continue;
        const group = tradeGroups[idx];

        // Reduce have quantities by edited amount for each youOffer item
        (gm.youOffer || []).forEach((item: any, j: number) => {
          const qty = tradedQty[`${i}-give-${j}`] ?? 1;
          if (item.id && group.have[item.id]) {
            group.have[item.id] -= qty;
            if (group.have[item.id] <= 0) {
              delete group.have[item.id];
            }
          }
        });

        // Reduce wantQuantity by max of get quantities
        const maxGetQty = (gm.theyOffer || []).reduce((max: number, _: any, j: number) => {
          return Math.max(max, tradedQty[`${i}-get-${j}`] ?? 1);
        }, 0);
        group.wantQuantity = Math.max(0, (group.wantQuantity || 1) - maxGetQty);
      }

      // Remove empty groups
      const filtered = tradeGroups.filter(
        (g: any) => Object.keys(g.have).length > 0 && g.wantItems.length > 0 && g.wantQuantity > 0
      );

      if (filtered.length > 0) {
        localStorage.setItem('tradeGroups', JSON.stringify(filtered));
      } else {
        localStorage.removeItem('tradeGroups');
      }
    } catch {
      // ignore parse errors
    }
  }, [matchData, tradedQty]);

  const handleComplete = async () => {
    const matchRecordId = matchData?.matchRecordId;
    if (matchRecordId) {
      console.log('[Identify] Updating match to completed:', matchRecordId);
      const { error, data } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchRecordId)
        .select()
        .single();

      if (error) {
        console.error('Error completing match:', error);
      } else {
        console.log('[Identify] Match updated successfully:', data);
        setMatchRecord(data as Match);
        setStatusLabel(getStatusLabel('completed'));
        if (matchData?.groupMatches) {
          initTradedQty(matchData.groupMatches);
        }
      }
    }
  };

  const handleConfirmQty = () => {
    updateTradeGroupsAfterTrade();
    setQtyConfirmed(true);
  };

  const handleGoHome = () => {
    if (!qtyConfirmed) updateTradeGroupsAfterTrade();
    localStorage.removeItem('currentMatch');
    localStorage.removeItem('tradeGroups');
    router.push('/');
  };

  const handleContinueTrade = () => {
    if (!qtyConfirmed) updateTradeGroupsAfterTrade();
    localStorage.removeItem('currentMatch');
    router.push('/register');
  };

  if (!matchData) {
    return null;
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-300 ${
        isFlashing ? 'animate-pulse' : ''
      }`}
      style={{ backgroundColor: matchData.colorCode }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          交換相手を見つけてください
        </h1>

        {/* Status badge */}
        {statusLabel && (
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 ${
            matchRecord?.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : matchRecord?.status === 'accepted'
              ? 'bg-blue-100 text-blue-800'
              : matchRecord?.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {statusLabel}
          </div>
        )}

        {/* Opponent info */}
        <div className="my-6">
          <div className="text-7xl mb-3">👋</div>
          <p className="text-2xl font-bold text-gray-800">{matchData.nickname}</p>
          {matchData.distance > 0 && (
            <p className="text-gray-600 mt-1">約 {matchData.distance}m</p>
          )}
        </div>

        {/* Color code */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">識別カラー</p>
          <div
            className="w-40 h-40 mx-auto rounded-2xl shadow-xl transform hover:scale-105 transition-transform"
            style={{ backgroundColor: matchData.colorCode }}
          />
          <p className="text-xl font-mono font-bold mt-4 text-gray-800">
            {matchData.colorCode}
          </p>
        </div>

        {/* Map (hidden outside event area) */}
        {isInArea && myLocation.lat !== 0 && matchData.lat !== 0 && (
          <div className="mb-6" style={{ height: '180px' }}>
            <TradeMapWrapper
              myLat={myLocation.lat}
              myLng={myLocation.lng}
              otherLat={matchData.lat}
              otherLng={matchData.lng}
              otherName={matchData.nickname}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            💡 この色を画面に表示して、会場で相手を探してください。
            同じ色の画面を持っている人があなたの交換相手です！
          </p>
        </div>

        {/* Action buttons */}
        <button
          onClick={handleFlash}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all mb-3"
        >
          ✨ 画面を点滅させる
        </button>

        {matchRecord?.status !== 'completed' ? (
          <button
            onClick={handleComplete}
            className="w-full bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 transition-colors mb-3"
          >
            ✓ 交換完了
          </button>
        ) : (
          <>
            <div className="w-full bg-green-100 text-green-800 py-3 rounded-full font-semibold mb-3">
              ✓ 交換完了済み
            </div>

            {/* Trade summary — editable quantities */}
            {matchData.groupMatches && matchData.groupMatches.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-left">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  交換内容{!qtyConfirmed && ' (数量を調整できます)'}
                </p>
                {matchData.groupMatches.map((gm: any, i: number) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <div className="flex gap-2 text-xs">
                      <div className="flex-1 bg-purple-50 rounded-lg p-2">
                        <p className="font-semibold text-purple-700 mb-1">渡したもの</p>
                        {gm.youOffer?.map((item: any, j: number) => {
                          const key = `${i}-give-${j}`;
                          const qty = tradedQty[key] ?? 1;
                          const max = item.quantity || 1;
                          return (
                            <div key={j} className="flex items-center justify-between text-gray-700 mb-1">
                              <span className="truncate mr-1">{item.name}</span>
                              {!qtyConfirmed ? (
                                <span className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => updateTradedQty(key, -1, max)}
                                    className="w-5 h-5 rounded bg-purple-200 text-purple-800 font-bold leading-none"
                                  >-</button>
                                  <span className="w-4 text-center font-bold">{qty}</span>
                                  <button
                                    onClick={() => updateTradedQty(key, 1, max)}
                                    className="w-5 h-5 rounded bg-purple-200 text-purple-800 font-bold leading-none"
                                  >+</button>
                                </span>
                              ) : (
                                <span className="font-bold">×{qty}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 bg-pink-50 rounded-lg p-2">
                        <p className="font-semibold text-pink-700 mb-1">もらったもの</p>
                        {gm.theyOffer?.map((item: any, j: number) => {
                          const key = `${i}-get-${j}`;
                          const qty = tradedQty[key] ?? 1;
                          const max = item.quantity || 1;
                          return (
                            <div key={j} className="flex items-center justify-between text-gray-700 mb-1">
                              <span className="truncate mr-1">{item.name}</span>
                              {!qtyConfirmed ? (
                                <span className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => updateTradedQty(key, -1, max)}
                                    className="w-5 h-5 rounded bg-pink-200 text-pink-800 font-bold leading-none"
                                  >-</button>
                                  <span className="w-4 text-center font-bold">{qty}</span>
                                  <button
                                    onClick={() => updateTradedQty(key, 1, max)}
                                    className="w-5 h-5 rounded bg-pink-200 text-pink-800 font-bold leading-none"
                                  >+</button>
                                </span>
                              ) : (
                                <span className="font-bold">×{qty}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {!qtyConfirmed && (
                  <button
                    onClick={handleConfirmQty}
                    className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
                  >
                    数量を確定
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleContinueTrade}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-full font-semibold hover:shadow-xl transition-all mb-3"
            >
              続きの交換へ
            </button>
            <button
              onClick={handleGoHome}
              className="w-full bg-gray-400 text-white py-3 rounded-full font-semibold hover:bg-gray-500 transition-colors mb-3"
            >
              トップに戻る
            </button>
          </>
        )}

        <button
          onClick={() => router.push('/matching')}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors"
        >
          ← 戻る
        </button>
      </div>

      {/* How to find */}
      <div className="mt-8 max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🔍 相手の見つけ方</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>画面を目立つように掲げる</li>
            <li>同じ色の画面を探す</li>
            <li>お互いに確認したら交換開始！</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
