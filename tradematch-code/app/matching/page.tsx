'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// デモ用のユーザーデータ（実際のSupabase連携時に置き換わる）
const DEMO_USERS = [
  {
    id: '1',
    nickname: 'さくら',
    distance: 45,
    haveGoods: ['キーホルダーB', 'ステッカーA', 'バッジB', 'タオルB'],
    wantGoods: ['バッジA', 'キーホルダーA', 'ポストカードA'],
  },
  {
    id: '2',
    nickname: 'たけし',
    distance: 89,
    haveGoods: ['ポストカードB', 'ペンライトA', 'Tシャツ'],
    wantGoods: ['キーホルダーA', 'タオルA', 'ステッカーB'],
  },
  {
    id: '3',
    nickname: 'ゆい',
    distance: 120,
    haveGoods: ['キーホルダーA', 'バッジC', 'クリアファイル'],
    wantGoods: ['キーホルダーB', 'ペンライトB'],
  },
  {
    id: '4',
    nickname: 'けんた',
    distance: 156,
    haveGoods: ['ステッカーB', 'タオルA', 'トートバッグ'],
    wantGoods: ['ポストカードB', 'バッジA'],
  }
];

const COLOR_CODES = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', 
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'
];

export default function MatchingPage() {
  const [isSearching, setIsSearching] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [myHaveGoods, setMyHaveGoods] = useState<string[]>([]);
  const [myWantGoods, setMyWantGoods] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    // 自分のグッズデータを取得
    const haveData = localStorage.getItem('haveGoods');
    const wantData = localStorage.getItem('wantGoods');
    
    if (haveData && wantData) {
      setMyHaveGoods(JSON.parse(haveData));
      setMyWantGoods(JSON.parse(wantData));
    } else {
      // データがない場合は登録画面に戻る
      router.push('/register');
      return;
    }

    // 位置情報の許可をリクエスト
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationGranted(true);
          // マッチング処理を実行
          performMatching(JSON.parse(haveData!), JSON.parse(wantData!));
        },
        (error) => {
          console.error('位置情報の取得エラー:', error);
          alert('位置情報の利用を許可してください');
        }
      );
    } else {
      alert('このブラウザは位置情報に対応していません');
    }
  }, [router]);

  const performMatching = (myHave: string[], myWant: string[]) => {
    // マッチング処理
    const foundMatches: any[] = [];

    DEMO_USERS.forEach((user) => {
      // 相手が持っていて、自分が欲しいもの
      const theyHaveIWant = user.haveGoods.filter(item => myWant.includes(item));
      
      // 自分が持っていて、相手が欲しいもの
      const iHaveTheyWant = myHave.filter(item => user.wantGoods.includes(item));

      // 相互マッチング: 両方に交換可能なアイテムがある
      if (theyHaveIWant.length > 0 && iHaveTheyWant.length > 0) {
        foundMatches.push({
          id: user.id,
          nickname: user.nickname,
          distance: user.distance,
          theyHave: theyHaveIWant,
          youHave: iHaveTheyWant,
          colorCode: COLOR_CODES[foundMatches.length % COLOR_CODES.length]
        });
      }
    });

    // 2秒後に結果を表示（実際の検索をシミュレート）
    setTimeout(() => {
      setMatches(foundMatches);
      setIsSearching(false);
    }, 2000);
  };

  const handleMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
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
                    <p className="text-sm text-gray-500">約 {match.distance}m</p>
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
