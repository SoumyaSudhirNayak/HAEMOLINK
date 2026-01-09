import { useEffect, useRef, useState } from 'react';
import { ScanLine, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function PickupVerificationView() {
  const { refreshTick } = useAutoRefresh();
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [bagVerified, setBagVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpStatus, setOtpStatus] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [pickupAcceptedByType, setPickupAcceptedByType] = useState<string | null>(null);
  const [currentUnit, setCurrentUnit] = useState<any | null>(null);
  const [recentPickups, setRecentPickups] = useState<Array<any>>([]);

  const isDonorPickup = pickupAcceptedByType === 'donor';

  const qrReaderId = 'rider-pickup-qr-reader';
  const html5QrcodeRef = useRef<any>(null);

  const sha256Hex = async (text: string) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const normalizePayload = (payload: any) => {
    const blood_group = typeof payload?.blood_group === 'string' ? payload.blood_group.trim() : '';
    const component_type = typeof payload?.component_type === 'string' ? payload.component_type.trim() : '';
    const collection_date = typeof payload?.collection_date === 'string' ? payload.collection_date.trim() : '';
    const expiry_date = typeof payload?.expiry_date === 'string' ? payload.expiry_date.trim() : '';
    const storageRaw =
      typeof payload?.storage === 'string'
        ? payload.storage
        : typeof payload?.storage_condition === 'string'
          ? payload.storage_condition
          : typeof payload?.storageCondition === 'string'
            ? payload.storageCondition
            : '';
    const storage = typeof storageRaw === 'string' ? storageRaw.trim() : '';
    const donor_name = typeof payload?.donor_name === 'string' ? payload.donor_name.trim() : '';
    const patient_name = typeof payload?.patient_name === 'string' ? payload.patient_name.trim() : '';
    const hospital_name = typeof payload?.hospital_name === 'string' ? payload.hospital_name.trim() : '';
    return { blood_group, component_type, collection_date, expiry_date, storage, donor_name, patient_name, hospital_name };
  };

  const refreshRecent = async () => {
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'rider') return;

      const { data, error } = await supabase
        .from('inventory_movements')
        .select('id, action, created_at, inventory_unit_id')
        .eq('performed_by', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;

      const moves = Array.isArray(data) ? data : [];
      if (!moves.length) {
        setRecentPickups([]);
        return;
      }

      const unitIds = Array.from(new Set(moves.map((m: any) => m.inventory_unit_id).filter(Boolean)));
      const { data: unitsData } = await supabase
        .from('hospital_inventory_units')
        .select('id, blood_group, component_type, status, expiry_date')
        .in('id', unitIds);
      const units = new Map<string, any>((Array.isArray(unitsData) ? unitsData : []).map((u: any) => [u.id, u]));

      setRecentPickups(
        moves.map((m: any) => ({
          ...m,
          unit: units.get(m.inventory_unit_id) || null,
        })),
      );
    } catch {}
  };

  useEffect(() => {
    refreshRecent();
  }, [refreshTick]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'rider') return;
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select('id, request_id, status, created_at')
          .eq('rider_id', session.user.id)
          .in('status', ['assigned', 'in_transit'])
          .order('created_at', { ascending: false })
          .limit(1);
        const current = Array.isArray(deliveries) && deliveries[0] ? deliveries[0] : null;
        const deliveryId = typeof (current as any)?.id === 'string' ? (current as any).id : null;
        if (!active) return;
        setActiveDeliveryId(deliveryId);
        const requestId = typeof (current as any)?.request_id === 'string' ? (current as any).request_id : null;
        if (requestId) {
          const { data: brRow } = await supabase
            .from('blood_requests')
            .select('accepted_by_type')
            .eq('id', requestId)
            .maybeSingle();
          const acceptedByType = typeof (brRow as any)?.accepted_by_type === 'string' ? (brRow as any).accepted_by_type : null;
          setPickupAcceptedByType(acceptedByType);
          if (acceptedByType === 'donor') {
            setBagVerified(true);
            setScanError(null);
            setScanStatus('Bag scan not required for donor pickup.');
          }
        } else {
          setPickupAcceptedByType(null);
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  useEffect(() => {
    return () => {
      (async () => {
        try {
          const inst = html5QrcodeRef.current;
          if (inst) {
            try {
              await inst.stop();
            } catch {}
            try {
              await inst.clear();
            } catch {}
          }
        } catch {}
      })();
    };
  }, []);

  const startBagScan = async () => {
    if (loading || isDonorPickup) return;
    setScanError(null);
    setScanStatus('Opening camera…');
    setBagVerified(false);
    setOtpVerified(false);
    setOtp('');
    setOtpStatus(null);
    setOtpError(null);
    setCurrentUnit(null);
    setLoading(true);

    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalhost = host === 'localhost' || host === '127.0.0.1';
      if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
        throw new Error('Camera requires HTTPS (or localhost). Open the site via https:// or http://localhost.');
      }
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      if (!document.getElementById(qrReaderId)) {
        throw new Error('Scanner UI not ready');
      }

      const instExisting = html5QrcodeRef.current;
      if (instExisting) {
        try {
          await instExisting.stop();
        } catch {}
        try {
          await instExisting.clear();
        } catch {}
      }

      const { Html5Qrcode } = await import('html5-qrcode');
      const inst = new Html5Qrcode(qrReaderId);
      html5QrcodeRef.current = inst;

      const onScanSuccess = async (decodedText: string) => {
        setScanStatus('Processing…');
        try {
          const parsed = JSON.parse(decodedText);
          const normalized = normalizePayload(parsed);
          if (!normalized.blood_group || !normalized.component_type || !normalized.collection_date || !normalized.expiry_date || !normalized.storage) {
            throw new Error('Invalid QR payload (required: blood_group, component_type, collection_date, expiry_date, storage/storage_condition)');
          }

          const qr_hash = await sha256Hex(JSON.stringify(normalized));

          const [{ supabase }, { getSessionAndRole }] = await Promise.all([
            import('../../../supabase/client'),
            import('../../../services/auth'),
          ]);
          const { session, role } = await getSessionAndRole();
          if (!session || role !== 'rider') throw new Error('Not signed in');

          const { data: unit, error: unitErr } = await supabase
            .from('hospital_inventory_units')
            .select('id, blood_group, component_type, collection_date, expiry_date, status, hospital_id')
            .eq('qr_hash', qr_hash)
            .maybeSingle();
          if (unitErr) throw unitErr;
        if (!unit) throw new Error('Unit not found');

          setCurrentUnit(unit);
          setBagVerified(true);
          setScanStatus('Bag scanned. Enter OTP to complete pickup.');
        } catch (e: any) {
          const message = e && typeof e.message === 'string' ? e.message : 'Scan failed';
          setScanError(message);
          setScanStatus(null);
        } finally {
          try {
            await inst.stop();
          } catch {}
          try {
            await inst.clear();
          } catch {}
        }
      };

      try {
        await inst.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } as any },
          onScanSuccess,
          () => {},
        );
      } catch {
        await inst.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 250, height: 250 } as any },
          onScanSuccess,
          () => {},
        );
      }

      setScanStatus('Camera active. Scan the blood bag QR.');
    } catch (e: any) {
      const name = e && typeof e.name === 'string' ? e.name : '';
      const messageRaw = e && typeof e.message === 'string' ? e.message : '';
      const message =
        name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access and try again.'
          : name === 'NotFoundError'
            ? 'No camera found on this device.'
            : name === 'NotReadableError'
              ? 'Camera is already in use by another app or tab.'
              : messageRaw || 'Unable to start camera';
      setScanError(message);
      setScanStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const confirmPickup = async () => {
    if (loading || otpVerified) return;
    const otpValue = otp.replace(/\D/g, '').slice(0, 6);
    setOtp(otpValue);
    setOtpError(null);
    setOtpStatus('Verifying OTP…');
    setLoading(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'rider') throw new Error('Not signed in');
      if (!isDonorPickup && !currentUnit?.id) throw new Error('Scan the blood bag first');

      let deliveryId = activeDeliveryId;
      if (!deliveryId) {
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select('id, status, created_at')
          .eq('rider_id', session.user.id)
          .in('status', ['assigned', 'in_transit'])
          .order('created_at', { ascending: false })
          .limit(1);
        const current = Array.isArray(deliveries) && deliveries[0] ? deliveries[0] : null;
        deliveryId = typeof (current as any)?.id === 'string' ? (current as any).id : null;
        setActiveDeliveryId(deliveryId);
      }
      if (!deliveryId) throw new Error('No active delivery found');
      if (otpValue.length !== 6) throw new Error('Enter a 6-digit OTP');

      const { data: navData, error: navErr } = await supabase.rpc('get_delivery_navigation', { p_delivery_id: deliveryId });
      if (navErr) throw navErr;
      const expectedOtp = typeof (navData as any)?.otp === 'string' ? (navData as any).otp : null;
      if (!expectedOtp || otpValue !== expectedOtp) {
        setOtpStatus(null);
        setOtpError('Invalid OTP');
        return;
      }

      if (isDonorPickup) {
        setOtpVerified(true);
        setOtpStatus('Pickup completed.');
        setScanError(null);
        setScanStatus('Pickup completed.');
        return;
      }

      const { data, error } = await supabase.rpc('pickup_inventory_unit', {
        p_unit_id: currentUnit.id,
        p_rider_id: session.user.id,
      } as any);
      if (error) throw error;

      if ((data as any)?.picked_up) {
        setCurrentUnit((prev: any) => (prev ? { ...prev, status: 'picked_up' } : prev));
        setOtpVerified(true);
        setOtpStatus('Pickup completed.');
        setScanError(null);
        setScanStatus('Pickup completed.');
        refreshRecent();
      } else {
        setOtpStatus(null);
        setOtpError('Pickup not completed.');
      }
    } catch (e: any) {
      const message = e && typeof e.message === 'string' ? e.message : 'OTP verification failed';
      setOtpStatus(null);
      setOtpError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Pickup Workflow & Verification</h2>
        <p className="text-gray-600">Complete verification before pickup</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          {/* Step 1: Arrival Check-in */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">1</div>
              <h3 className="text-gray-900">Arrival Check-in</h3>
            </div>

            {isDonorPickup ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 bg-gray-50">
                <p className="text-gray-900 mb-2">Donor pickup</p>
                <p className="text-gray-600">No hospital check-in required</p>
              </div>
            ) : (
              <div className="border-4 border-dashed border-blue-300 rounded-xl p-12 text-center mb-6 bg-blue-50 hover:bg-blue-100 transition cursor-pointer">
                <ScanLine className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-900 mb-2">Scan Hospital QR Code</p>
                <p className="text-gray-500">Notify staff of your arrival</p>
              </div>
            )}

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-gray-600">No data available yet</div>
            </div>
          </div>

          {/* Step 2: Blood Packet Verification */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-700">2</div>
              <h3 className="text-gray-900">Blood Packet Verification</h3>
            </div>

            {isDonorPickup ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 bg-gray-50">
                <p className="text-gray-900 mb-2">Bag scan skipped</p>
                <p className="text-gray-600">Only OTP confirmation is required for donor pickup</p>
              </div>
            ) : (
              <div
                onClick={startBagScan}
                className="border-4 border-dashed border-violet-300 rounded-xl p-12 text-center mb-6 bg-violet-50 hover:bg-violet-100 transition cursor-pointer"
              >
                <ScanLine className="w-16 h-16 text-violet-600 mx-auto mb-4" />
                <p className="text-gray-900 mb-2">Scan Blood Bag QR Code</p>
                <p className="text-gray-500">Verify packet details</p>
              </div>
            )}

            {!isDonorPickup && <div id={qrReaderId} className="w-full overflow-hidden rounded-lg mb-6" />}

            <div className={`flex items-center justify-between p-4 rounded-lg border ${scanError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-3">
                {scanError ? <AlertCircle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                <span className={`${scanError ? 'text-red-700' : 'text-green-700'}`}>
                  {scanError ? scanError : scanStatus ? scanStatus : isDonorPickup ? 'Bag scan not required for donor pickup' : 'Ready to scan'}
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full ${scanError ? 'bg-red-500' : 'bg-green-500'} ${loading ? '' : 'animate-pulse'}`}></div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-gray-900 mb-3">System Checklist</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded border border-gray-200">
                    {isDonorPickup ? (
                      <div className="text-gray-600">Bag scan not required for donor pickup</div>
                    ) : currentUnit ? (
                      <div className="text-gray-600">
                        {currentUnit.blood_group} • {currentUnit.component_type} • Expiry: {currentUnit.expiry_date} • Status: {currentUnit.status}
                      </div>
                    ) : (
                      <div className="text-gray-600">No data available yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: OTP Confirmation */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700">3</div>
              <h3 className="text-gray-900">OTP Confirmation</h3>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Enter 6-Digit OTP</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                value={otp}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(next);
                  setOtpError(null);
                  setOtpStatus(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmPickup();
                }}
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-2xl tracking-widest"
              />
              {otpError && <div className="mt-2 text-sm text-red-700">{otpError}</div>}
              {otpStatus && !otpError && <div className="mt-2 text-sm text-gray-600">{otpStatus}</div>}
            </div>

            <button
              onClick={confirmPickup}
              disabled={loading || otpVerified || (!bagVerified && !isDonorPickup) || otp.replace(/\D/g, '').length !== 6}
              className={`w-full py-3 rounded-lg transition flex items-center justify-center gap-2 ${loading || otpVerified || (!bagVerified && !isDonorPickup) || otp.replace(/\D/g, '').length !== 6 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              <CheckCircle className="w-5 h-5" />
              {otpVerified ? 'Pickup Confirmed' : 'Confirm Pickup'}
            </button>
          </div>
        </div>

          {/* Right Sidebar */}
          <div className="col-span-1 space-y-6">
            {/* Current Pickup */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Current Pickup</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  {isDonorPickup ? (
                    <div className="text-gray-600">Donor pickup • OTP only</div>
                  ) : currentUnit ? (
                    <div className="text-gray-600">
                      {currentUnit.blood_group} • {currentUnit.component_type} • {currentUnit.status}
                    </div>
                  ) : (
                    <div className="text-gray-600">No data available yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-green-700 mb-4">
              <Shield className="w-5 h-5" />
              <h3>Verification Progress</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-gray-700">Check-in</span>
                <div className="w-5 h-5 border-2 border-gray-400 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded">
                <span className="text-gray-700">Bag Scan</span>
                {bagVerified ? <CheckCircle className="w-5 h-5 text-green-600" /> : <div className="w-5 h-5 border-2 border-gray-400 rounded-full"></div>}
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                <span className="text-gray-700">OTP</span>
                {otpVerified ? <CheckCircle className="w-5 h-5 text-green-600" /> : <div className="w-5 h-5 border-2 border-gray-400 rounded-full"></div>}
              </div>
            </div>
          </div>

          {/* Safety Reminder */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-orange-700 mb-4">
              <AlertCircle className="w-5 h-5" />
              <h3>Safety Reminder</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Handle blood bags gently</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Place in cold box immediately</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Verify seal integrity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Check temperature monitor</span>
              </li>
            </ul>
          </div>

            {/* Recent Pickups */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Recent Pickups</h3>
              <div className="space-y-2">
                {recentPickups.length ? (
                  recentPickups.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">
                        {m.unit ? `${m.unit.blood_group} • ${m.unit.component_type}` : m.inventory_unit_id?.slice?.(0, 8)}
                      </span>
                      <span className="text-gray-500">{m.action}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">No records found</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
