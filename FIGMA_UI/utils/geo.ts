export async function getBestDeviceFix(timeoutMs: number = 20000, desiredAcc: number = 10) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  const fixes: GeolocationPosition[] = [];
  return new Promise<GeolocationPosition | null>((resolve) => {
    let finished = false;
    let watchId: any = null;
    const done = (pos: GeolocationPosition | null) => {
      if (finished) return;
      finished = true;
      try {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId as number);
      } catch {}
      resolve(pos);
    };
    try {
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          fixes.push(p);
          const acc = typeof p.coords.accuracy === 'number' ? p.coords.accuracy : Infinity;
          if (acc <= desiredAcc) {
            done(p);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } catch {}
    const t = setTimeout(() => {
      clearTimeout(t);
      if (fixes.length) {
        fixes.sort((a, b) => (a.coords.accuracy || Infinity) - (b.coords.accuracy || Infinity));
        done(fixes[0]);
      } else {
        try {
          navigator.geolocation.getCurrentPosition(
            (p) => done(p),
            () => done(null),
            { enableHighAccuracy: true, maximumAge: 0, timeout: Math.min(timeoutMs, 15000) }
          );
        } catch {
          done(null);
        }
      }
    }, timeoutMs);
  });
}

export function computeFareInr(distanceKm: number) {
  const km = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  if (km < 0.01) return 0;
  const baseFare = 30;
  const perKm = 18;
  const minFare = 90;
  const raw = baseFare + km * perKm;
  return Math.round(Math.max(minFare, raw));
}

export async function getOsrmRoute(pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }) {
  const pickLat = pickup?.lat;
  const pickLng = pickup?.lng;
  const dropLat = drop?.lat;
  const dropLng = drop?.lng;
  const isFiniteNum = (v: any) => typeof v === 'number' && Number.isFinite(v);
  if (!isFiniteNum(pickLat) || !isFiniteNum(pickLng) || !isFiniteNum(dropLat) || !isFiniteNum(dropLng)) {
    return null;
  }
  const url = `https://router.project-osrm.org/route/v1/driving/${pickLng},${pickLat};${dropLng},${dropLat}?overview=full&geometries=geojson&steps=true`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const json = await resp.json();
  const route = ((json.routes || [])[0] || {}) as any;
  const coords = (route.geometry || {}).coordinates || [];
  const legs = route.legs || [];
  const steps: Array<{ instruction: string; distance: number }> = [];
  legs.forEach((leg: any) => {
    (leg.steps || []).forEach((s: any) => {
      steps.push({
        instruction: s.maneuver?.instruction || s.name || 'Continue',
        distance: typeof s.distance === 'number' ? s.distance : 0,
      });
    });
  });
  const distanceMeters = typeof route.distance === 'number' ? route.distance : 0;
  const durationSeconds = typeof route.duration === 'number' ? route.duration : 0;
  return {
    distanceKm: distanceMeters / 1000,
    durationMin: durationSeconds / 60,
    coordsLatLng: coords.map((c: any) => [c[1], c[0]] as [number, number]),
    steps,
  };
}
