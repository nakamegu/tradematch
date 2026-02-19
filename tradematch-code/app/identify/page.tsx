'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import type { Match, MatchMessage, Event } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import TradeMapWrapper from '@/components/TradeMapWrapper';
import { isWithinEventArea } from '@/lib/geo';
import { User, Lightbulb, Zap, Check, Eye, X, MessageCircle, Send } from 'lucide-react';
import Footer from '@/components/Footer';

export default function IdentifyPage() {
  const [matchData, setMatchData] = useState<any>(null);
  const [matchRecord, setMatchRecord] = useState<Match | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>('');
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [otherLocation, setOtherLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [isInArea, setIsInArea] = useState(true);
  // tradedQty: key = "groupIdx-give-itemIdx" or "groupIdx-get-itemIdx", value = quantity
  const [tradedQty, setTradedQty] = useState<Record<string, number>>({});
  const [qtyConfirmed, setQtyConfirmed] = useState(false);
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchRecordIdRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Chat
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

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
    setOtherLocation({ lat: parsed.lat || 0, lng: parsed.lng || 0 });

    // If groupMatches is empty, compute from DB
    if (!parsed.groupMatches || parsed.groupMatches.length === 0) {
      (async () => {
        const myId = await getCurrentUserId();
        if (!myId) return;
        const partnerId = parsed.id;

        const [myGoodsRes, theirGoodsRes, namesRes] = await Promise.all([
          supabase.from('user_goods').select('goods_id, type, quantity, group_id').eq('user_id', myId),
          supabase.from('user_goods').select('goods_id, type, quantity, group_id').eq('user_id', partnerId),
          supabase.from('goods_master').select('id, name'),
        ]);

        const nameMap: Record<string, string> = {};
        (namesRes.data || []).forEach((g: { id: string; name: string }) => { nameMap[g.id] = g.name; });

        // Build my groups
        const myGroupsMap = new Map<number, { have: Record<string, number>; wantItems: string[]; wantQuantity: number }>();
        for (const row of myGoodsRes.data || []) {
          const gid = row.group_id ?? 0;
          if (!myGroupsMap.has(gid)) myGroupsMap.set(gid, { have: {}, wantItems: [], wantQuantity: 1 });
          const g = myGroupsMap.get(gid)!;
          if (row.type === 'have') g.have[row.goods_id] = row.quantity || 1;
          else { g.wantItems.push(row.goods_id); g.wantQuantity = row.quantity || 1; }
        }

        // Build their groups
        const theirGroupsMap = new Map<number, { have: Record<string, number>; wantItems: string[]; wantQuantity: number }>();
        for (const row of theirGoodsRes.data || []) {
          const gid = row.group_id ?? 0;
          if (!theirGroupsMap.has(gid)) theirGroupsMap.set(gid, { have: {}, wantItems: [], wantQuantity: 1 });
          const g = theirGroupsMap.get(gid)!;
          if (row.type === 'have') g.have[row.goods_id] = row.quantity || 1;
          else { g.wantItems.push(row.goods_id); g.wantQuantity = row.quantity || 1; }
        }

        const myGroups = Array.from(myGroupsMap.entries());
        const theirGroups = Array.from(theirGroupsMap.values());
        const groupMatches: any[] = [];

        for (const [mgIdx, myGroup] of myGroups) {
          const myHaveIds = Object.keys(myGroup.have);
          const myWantIds = myGroup.wantItems;
          for (const theirGroup of theirGroups) {
            const theirHaveIds = Object.keys(theirGroup.have);
            const theirWantIds = theirGroup.wantItems;
            const theyOfferIds = theirHaveIds.filter((id) => myWantIds.includes(id));
            const youOfferIds = myHaveIds.filter((id) => theirWantIds.includes(id));
            if (theyOfferIds.length > 0 && youOfferIds.length > 0) {
              groupMatches.push({
                myGroupIdx: mgIdx,
                theyOffer: theyOfferIds.map((id) => ({ id, name: nameMap[id] || id, quantity: theirGroup.have[id] || 1 })),
                theyWantQty: theirGroup.wantQuantity,
                youOffer: youOfferIds.map((id) => ({ id, name: nameMap[id] || id, quantity: myGroup.have[id] || 1 })),
                myWantQty: myGroup.wantQuantity,
                myGiveCount: 1,
              });
            }
          }
        }

        if (groupMatches.length > 0) {
          const updated = { ...parsed, groupMatches };
          setMatchData(updated);
          localStorage.setItem('currentMatch', JSON.stringify(updated));
        }
      })();
    }

    // Area check helper
    const eventId = localStorage.getItem('selectedEventId');
    let eventCache: Event | null = null;
    if (eventId) {
      supabase.from('events').select('*').eq('id', eventId).single().then(({ data: ev }) => {
        if (ev) eventCache = ev as Event;
      });
    }

    // Continuous location tracking with watchPosition
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          if (eventCache) {
            setIsInArea(isWithinEventArea(loc.lat, loc.lng, eventCache));
          }
          // Update own location in DB
          supabase.rpc('update_user_location', { lat: loc.lat, lng: loc.lng });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    // Poll partner's location every 5 seconds
    const partnerId = parsed.id;
    if (partnerId) {
      const pollOther = async () => {
        const { data: user } = await supabase
          .from('users')
          .select('latitude, longitude')
          .eq('id', partnerId)
          .single();
        if (user?.latitude && user?.longitude) {
          setOtherLocation({ lat: user.latitude, lng: user.longitude });
        }
      };
      pollOther(); // initial fetch
      locationPollRef.current = setInterval(pollOther, 5000);
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
      if (locationPollRef.current) clearInterval(locationPollRef.current);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [router, pollMatchStatus, updateMatchState]);

  // Chat: load messages + subscribe to new ones
  useEffect(() => {
    const data = localStorage.getItem('currentMatch');
    if (!data) return;
    const parsed = JSON.parse(data);
    const matchRecordId = parsed.matchRecordId;
    if (!matchRecordId) return;

    let cancelled = false;

    const setupChat = async () => {
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;
      setMyUserId(userId);

      // Load existing messages
      const { data: msgs } = await supabase
        .from('match_messages')
        .select('*')
        .eq('match_id', matchRecordId)
        .order('created_at', { ascending: true });
      if (msgs && !cancelled) {
        setMessages(msgs as MatchMessage[]);
      }

      // Subscribe to new messages
      const channel = supabase
        .channel(`chat_${matchRecordId}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'match_messages' },
          (payload) => {
            const newMsg = payload.new as MatchMessage;
            if (newMsg.match_id === matchRecordId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              // Increment unread if chat is closed and message is from other user
              if (newMsg.sender_id !== userId) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          }
        )
        .subscribe();

      chatChannelRef.current = channel;
    };

    setupChat();

    return () => {
      cancelled = true;
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  // Clear unread when chat is opened
  useEffect(() => {
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  const sendMessage = async () => {
    const text = chatInput.trim().slice(0, 500);
    if (!text || !myUserId) return;
    const matchRecordId = matchData?.matchRecordId;
    if (!matchRecordId) return;

    setChatInput('');
    await supabase.from('match_messages').insert({
      match_id: matchRecordId,
      sender_id: myUserId,
      message: text,
    });
  };

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

  // When status changes to completed (by either party), initialize tradedQty
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const status = matchRecord?.status;
    if (status === 'completed' && prevStatusRef.current !== 'completed') {
      if (matchData?.groupMatches) {
        initTradedQty(matchData.groupMatches);
      }
    }
    prevStatusRef.current = status ?? null;
  }, [matchRecord?.status, matchData, initTradedQty]);

  const updateTradedQty = (key: string, delta: number, max: number) => {
    setTradedQty((prev) => {
      const current = prev[key] ?? 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [key]: next };
    });
  };

  // Update tradeGroups in localStorage: reduce quantities after trade
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

      const eventId = localStorage.getItem('selectedEventId');
      if (filtered.length > 0) {
        localStorage.setItem('tradeGroups', JSON.stringify(filtered));
        if (eventId) localStorage.setItem(`tradeGroups_${eventId}`, JSON.stringify(filtered));
      } else {
        localStorage.removeItem('tradeGroups');
        if (eventId) localStorage.removeItem(`tradeGroups_${eventId}`);
      }

      // Also update user_goods in DB
      getCurrentUserId().then(async (userId) => {
        if (!userId) return;
        await supabase.from('user_goods').delete().eq('user_id', userId);
        const rows: { user_id: string; goods_id: string; type: 'have' | 'want'; quantity: number; group_id: number }[] = [];
        filtered.forEach((group: any, groupIdx: number) => {
          for (const [goodsId, quantity] of Object.entries(group.have)) {
            rows.push({ user_id: userId, goods_id: goodsId, type: 'have', quantity: quantity as number, group_id: groupIdx });
          }
          for (const goodsId of group.wantItems || []) {
            rows.push({ user_id: userId, goods_id: goodsId, type: 'want', quantity: group.wantQuantity || 1, group_id: groupIdx });
          }
        });
        if (rows.length > 0) {
          await supabase.from('user_goods').insert(rows);
        }
      });
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
      }
    }
  };

  const handleCancel = async () => {
    const matchRecordId = matchData?.matchRecordId;
    if (matchRecordId) {
      await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', matchRecordId);
    }
    localStorage.removeItem('currentMatch');
    router.push('/matching');
  };

  const handleConfirmQty = () => {
    updateTradeGroupsAfterTrade();
    setQtyConfirmed(true);
  };

  const handleGoHome = () => {
    updateTradeGroupsAfterTrade();
    localStorage.removeItem('currentMatch');
    router.push('/');
  };

  const handleContinueTrade = () => {
    updateTradeGroupsAfterTrade();
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
      <div className="bg-slate-50/95 backdrop-blur-sm rounded-2xl p-8 shadow-sm text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">
          交換相手を見つけてください
        </h1>

        {/* Status badge */}
        {statusLabel && (
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 ${
            matchRecord?.status === 'completed'
              ? 'bg-emerald-500/20 text-emerald-600'
              : matchRecord?.status === 'accepted'
              ? 'bg-blue-500/20 text-blue-600'
              : matchRecord?.status === 'cancelled'
              ? 'bg-red-500/20 text-red-600'
              : 'bg-amber-500/20 text-amber-600'
          }`}>
            {statusLabel}
          </div>
        )}

        {/* Opponent info */}
        <div className="my-6">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-2xl font-bold text-slate-800">{matchData.nickname}</p>
          {matchData.distance > 0 && (
            <p className="text-slate-400 mt-1">約 {matchData.distance}m</p>
          )}
        </div>

        {/* Color code */}
        <div className="bg-slate-100 rounded-2xl p-6 mb-6">
          <p className="text-sm text-slate-400 mb-3 font-medium">識別カラー</p>
          <div
            className="w-40 h-40 mx-auto rounded-2xl shadow-sm"
            style={{ backgroundColor: matchData.colorCode }}
          />
          <p className="text-xl font-mono font-bold mt-4 text-slate-700">
            {matchData.colorCode}
          </p>
        </div>

        {/* Map (hidden outside event area) */}
        {isInArea && myLocation.lat !== 0 && otherLocation.lat !== 0 && (
          <div className="mb-6" style={{ height: '180px' }}>
            <TradeMapWrapper
              myLat={myLocation.lat}
              myLng={myLocation.lng}
              otherLat={otherLocation.lat}
              otherLng={otherLocation.lng}
              otherName={matchData.nickname}
            />
          </div>
        )}

        {/* Chat */}
        {matchData.matchRecordId && (
          <div className="mb-6">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 relative"
            >
              <MessageCircle className="w-5 h-5" />
              メッセージ
              {unreadCount > 0 && (
                <span className="absolute right-3 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {chatOpen && (
              <div className="mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Messages */}
                <div className="h-48 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      メッセージはまだありません
                    </p>
                  )}
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === myUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          isMine
                            ? 'bg-indigo-500 text-white rounded-br-md'
                            : 'bg-slate-100 text-slate-700 rounded-bl-md'
                        }`}>
                          <p className="break-words">{msg.message}</p>
                          <p className={`text-[10px] mt-0.5 ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-slate-200 p-2 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendMessage(); }}
                    placeholder="メッセージを入力..."
                    maxLength={500}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim()}
                    className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <span>この色を画面に表示して、会場で相手を探してください。
            同じ色の画面を持っている人があなたの交換相手です！</span>
          </p>
        </div>

        {/* Action buttons */}
        <button
          onClick={handleFlash}
          className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold text-lg transition-colors mb-3 flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" /> 画面を点滅させる
        </button>

        {matchRecord?.status === 'cancelled' ? (
          <div className="w-full bg-red-500/20 text-red-600 py-3 rounded-xl font-semibold mb-3 flex items-center justify-center gap-2">
            <X className="w-5 h-5" /> キャンセル済み
          </div>
        ) : matchRecord?.status !== 'completed' ? (
          <>
            <button
              onClick={handleComplete}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-semibold transition-colors mb-3 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> 交換完了
            </button>
            <button
              onClick={handleCancel}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 py-3 rounded-xl font-semibold transition-colors mb-3 flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" /> 見つからない・キャンセル
            </button>
          </>
        ) : (
          <>
            <div className="w-full bg-emerald-500/20 text-emerald-600 py-3 rounded-xl font-semibold mb-3 flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> 交換完了済み
            </div>

            {/* Trade summary — editable quantities */}
            {matchData.groupMatches && matchData.groupMatches.length > 0 && (
              <div className="bg-slate-100 rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-bold text-slate-600 mb-2">
                  交換内容{!qtyConfirmed && ' (数量を調整できます)'}
                </p>
                {matchData.groupMatches.map((gm: any, i: number) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <div className="flex gap-2 text-xs">
                      <div className="flex-1 bg-slate-50 rounded-lg p-2">
                        <p className="font-semibold text-indigo-600 mb-1">渡したもの</p>
                        {gm.youOffer?.map((item: any, j: number) => {
                          const key = `${i}-give-${j}`;
                          const qty = tradedQty[key] ?? 1;
                          const max = item.quantity || 1;
                          return (
                            <div key={j} className="flex items-center justify-between text-slate-600 mb-1">
                              <span className="truncate mr-1">{item.name}</span>
                              {!qtyConfirmed ? (
                                <span className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => updateTradedQty(key, -1, max)}
                                    className="w-5 h-5 rounded bg-slate-200 text-slate-600 font-bold leading-none"
                                  >-</button>
                                  <span className="w-4 text-center font-bold">{qty}</span>
                                  <button
                                    onClick={() => updateTradedQty(key, 1, max)}
                                    className="w-5 h-5 rounded bg-slate-200 text-slate-600 font-bold leading-none"
                                  >+</button>
                                </span>
                              ) : (
                                <span className="font-bold">×{qty}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-lg p-2">
                        <p className="font-semibold text-indigo-600 mb-1">もらったもの</p>
                        {gm.theyOffer?.map((item: any, j: number) => {
                          const key = `${i}-get-${j}`;
                          const qty = tradedQty[key] ?? 1;
                          const max = item.quantity || 1;
                          return (
                            <div key={j} className="flex items-center justify-between text-slate-600 mb-1">
                              <span className="truncate mr-1">{item.name}</span>
                              {!qtyConfirmed ? (
                                <span className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => updateTradedQty(key, -1, max)}
                                    className="w-5 h-5 rounded bg-slate-200 text-slate-600 font-bold leading-none"
                                  >-</button>
                                  <span className="w-4 text-center font-bold">{qty}</span>
                                  <button
                                    onClick={() => updateTradedQty(key, 1, max)}
                                    className="w-5 h-5 rounded bg-slate-200 text-slate-600 font-bold leading-none"
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
                    className="w-full mt-3 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl font-semibold text-sm transition-colors"
                  >
                    数量を確定
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleContinueTrade}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-semibold transition-colors mb-3"
            >
              続きの交換へ
            </button>
            <button
              onClick={handleGoHome}
              className="w-full bg-slate-100 hover:bg-slate-300 text-slate-600 py-3 rounded-xl font-semibold transition-colors mb-3"
            >
              トップに戻る
            </button>
          </>
        )}

        {(matchRecord?.status === 'cancelled' || matchRecord?.status === 'completed') && (
          <button
            onClick={() => { localStorage.removeItem('currentMatch'); router.push('/matching'); }}
            className="w-full bg-slate-100 hover:bg-slate-300 text-slate-600 py-3 rounded-xl font-semibold transition-colors"
          >
            マッチング画面に戻る
          </button>
        )}
      </div>

      {/* How to find */}
      <div className="mt-8 max-w-md">
        <div className="bg-slate-50/90 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" /> 相手の見つけ方
          </h3>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>画面を目立つように掲げる</li>
            <li>同じ色の画面を探す</li>
            <li>お互いに確認したら交換開始！</li>
          </ol>
        </div>
      </div>
      <Footer />
    </div>
  );
}
