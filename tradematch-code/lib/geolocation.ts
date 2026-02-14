// lib/geolocation.ts

export interface Location {
  latitude: number;
  longitude: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * 現在の位置情報を取得
 */
export async function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject({
          code: error.code,
          message: error.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * 位置情報の変化を監視
 */
export function watchLocation(
  callback: (location: Location) => void,
  errorCallback?: (error: GeolocationError) => void
): number {
  if (!navigator.geolocation) {
    errorCallback?.({
      code: 0,
      message: 'Geolocation is not supported',
    });
    return -1;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => {
      errorCallback?.({
        code: error.code,
        message: error.message,
      });
    },
    {
      enableHighAccuracy: true,
      maximumAge: 30000, // 30秒間キャッシュ
      timeout: 10000,
    }
  );
}

/**
 * 位置情報の監視を停止
 */
export function clearWatch(watchId: number): void {
  if (navigator.geolocation && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * 2点間の距離を計算（メートル単位）
 * Haversine formula
 */
export function calculateDistance(
  loc1: Location,
  loc2: Location
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

  return R * c; // メートル
}
