import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scan, Plus, CheckCircle, AlertCircle, Calendar, Droplet } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function InventoryView() {
  const { refreshTick } = useAutoRefresh();
  const [loading, setLoading] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [recentUnits, setRecentUnits] = useState<Array<any>>([]);
  const [nearExpiryUnits, setNearExpiryUnits] = useState<Array<any>>([]);
  const [nearExpiryCount, setNearExpiryCount] = useState<number | null>(null);
  const [todayUnitsCount, setTodayUnitsCount] = useState<number | null>(null);
  const [todayBatchCount, setTodayBatchCount] = useState<number | null>(null);
  const [batchResult, setBatchResult] = useState<{ inserted: number; duplicates: number; failed: number } | null>(null);
  const [manual, setManual] = useState({
    blood_group: '',
    component_type: '',
    collection_date: '',
    expiry_date: '',
    storage: '',
    batch_number: '',
    volume_ml: '',
    quality_notes: '',
    donor_name: '',
    patient_name: '',
  });

  const qrReaderId = 'hospital-inventory-qr-reader';
  const html5QrcodeRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hospitalNameRef = useRef<string | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') return;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const cutoff = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
      try {
        await supabase
          .from('hospital_inventory_units')
          .update({ status: 'expired' })
          .eq('hospital_id', session.user.id)
          .lt('expiry_date', todayStr)
          .in('status', ['available', 'reserved']);
      } catch {}

      const [unitsResp, batchesResp, nearExpiryResp, nearExpiryCountResp] = await Promise.all([
        supabase
          .from('hospital_inventory_units')
          .select('id, blood_group, component_type, collection_date, expiry_date, storage_condition, status, qr_hash, created_at')
          .eq('hospital_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('hospital_inventory_batches')
          .select('id, uploaded_at', { count: 'exact' })
          .eq('hospital_id', session.user.id)
          .gte('uploaded_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase
          .from('hospital_inventory_units')
          .select('id, blood_group, component_type, expiry_date, status')
          .eq('hospital_id', session.user.id)
          .gte('expiry_date', todayStr)
          .lte('expiry_date', cutoffStr)
          .in('status', ['available', 'reserved'])
          .order('expiry_date', { ascending: true })
          .limit(6),
        supabase
          .from('hospital_inventory_units')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', session.user.id)
          .gte('expiry_date', todayStr)
          .lte('expiry_date', cutoffStr)
          .in('status', ['available', 'reserved']),
      ]);

      const units = Array.isArray((unitsResp as any)?.data) ? (unitsResp as any).data : (unitsResp as any)?.data ? [(unitsResp as any).data] : [];
      setRecentUnits(units);
      const near = Array.isArray((nearExpiryResp as any)?.data) ? (nearExpiryResp as any).data : (nearExpiryResp as any)?.data ? [(nearExpiryResp as any).data] : [];
      setNearExpiryUnits(near);
      setNearExpiryCount(typeof (nearExpiryCountResp as any)?.count === 'number' ? (nearExpiryCountResp as any).count : null);

      const unitsTodayResp = await supabase
        .from('hospital_inventory_units')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', session.user.id)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      setTodayUnitsCount(typeof (unitsTodayResp as any)?.count === 'number' ? (unitsTodayResp as any).count : null);

      setTodayBatchCount(typeof (batchesResp as any)?.count === 'number' ? (batchesResp as any).count : null);

      if (!hospitalNameRef.current) {
        const { data: profile } = await supabase
          .from('hospital_profiles')
          .select('organization_name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        hospitalNameRef.current = typeof (profile as any)?.organization_name === 'string' ? (profile as any).organization_name : null;
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll, refreshTick]);

  useEffect(() => {
    let active = true;
    let channel: any = null;

    (async () => {
      try {
        const [{ supabase }, { getSessionAndRole }] = await Promise.all([
          import('../../../supabase/client'),
          import('../../../services/auth'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'hospital') return;

        await refreshAll();
        setScannerReady(true);

        channel = supabase
          .channel('hospital_inventory_units_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'hospital_inventory_units', filter: `hospital_id=eq.${session.user.id}` },
            () => {
              if (!active) return;
              refreshAll();
            },
          )
          .subscribe();
      } catch {}
    })();

    return () => {
      active = false;
      try {
        if (channel) channel.unsubscribe();
      } catch {}
    };
  }, [refreshAll]);

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

  const mostRecent = recentUnits && recentUnits[0] ? recentUnits[0] : null;
  const freshness = useMemo(() => {
    if (!mostRecent) return { label: 'No data yet', collection: 'No data', storage: 'No data', age: 'No data' };
    const collection = typeof mostRecent.collection_date === 'string' ? mostRecent.collection_date : 'No data';
    const storage = typeof mostRecent.storage_condition === 'string' && mostRecent.storage_condition ? mostRecent.storage_condition : 'No data';
    const createdAt = typeof mostRecent.created_at === 'string' ? new Date(mostRecent.created_at) : null;
    const ageDays = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))) : null;
    return {
      label: typeof mostRecent.blood_group === 'string' && typeof mostRecent.component_type === 'string' ? `${mostRecent.blood_group} • ${mostRecent.component_type}` : 'No data yet',
      collection,
      storage,
      age: typeof ageDays === 'number' ? `${ageDays} days` : 'No data',
    };
  }, [mostRecent]);

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

  const startScan = async () => {
    if (loading) return;
    setScannerError(null);
    setBatchResult(null);
    setScannerStatus('Opening camera…');
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
        setScannerStatus('Processing…');
        try {
          const parsed = JSON.parse(decodedText);
          const normalized = normalizePayload(parsed);
          if (!normalized.blood_group || !normalized.component_type || !normalized.collection_date || !normalized.expiry_date || !normalized.storage) {
            throw new Error('Invalid QR payload (required: blood_group, component_type, collection_date, expiry_date, storage/storage_condition)');
          }

          const canonical = JSON.stringify(normalized);
          const qr_hash = await sha256Hex(canonical);

          const [{ supabase }, { getSessionAndRole }] = await Promise.all([
            import('../../../supabase/client'),
            import('../../../services/auth'),
          ]);
          const { session, role } = await getSessionAndRole();
          if (!session || role !== 'hospital') throw new Error('Not signed in');

          const { data, error } = await supabase.rpc('add_inventory_unit_from_qr', {
            p_qr_hash: qr_hash,
            p_payload: normalized,
            p_batch_id: null,
          } as any);
          if (error) throw error;

          const inserted = !!(data as any)?.inserted;
          setScannerStatus(inserted ? 'Added to inventory.' : 'Duplicate scan blocked.');
          setScannerError(null);
          refreshAll();
        } catch (e: any) {
          const message = e && typeof e.message === 'string' ? e.message : 'Scan failed';
          setScannerError(message);
          setScannerStatus(null);
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

      setScannerStatus('Camera active. Scan the QR.');
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
      setScannerError(message);
      setScannerStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const parseCsv = (csvText: string) => {
    const parseCsvLine = (line: string) => {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i += 1;
            continue;
          }
          inQuotes = !inQuotes;
          continue;
        }
        if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
          continue;
        }
        cur += ch;
      }
      out.push(cur);
      return out.map((v) => v.trim());
    };

    const lines = csvText
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (!lines.length) return [];

    const header = parseCsvLine(lines[0]);
    const idx = (names: string[]) =>
      header.findIndex((h) => names.some((n) => h.toLowerCase() === n.toLowerCase()));

    const iQrPayload = idx(['qr_payload', 'qrPayload', 'payload']);
    const iBlood = idx(['blood_group', 'bloodGroup']);
    const iComp = idx(['component_type', 'componentType']);
    const iCol = idx(['collection_date', 'collectionDate']);
    const iExp = idx(['expiry_date', 'expiryDate']);
    const iStorage = idx(['storage', 'storage_condition', 'storageCondition']);
    const iDonor = idx(['donor_name', 'donorName']);
    const iPatient = idx(['patient_name', 'patientName']);

    if (iQrPayload < 0 && [iBlood, iComp, iCol, iExp, iStorage].some((i) => i < 0)) return [];

    return lines.slice(1).map((line) => {
      const parts = parseCsvLine(line);
      const qrPayloadRaw = iQrPayload >= 0 ? parts[iQrPayload] : '';
      let qrPayload: any = null;
      if (qrPayloadRaw) {
        try {
          qrPayload = JSON.parse(qrPayloadRaw);
        } catch {
          qrPayload = null;
        }
      }
      const base = qrPayload && typeof qrPayload === 'object' ? qrPayload : {};
      const storageValue = iStorage >= 0 ? parts[iStorage] : '';
      const donorValue = iDonor >= 0 ? parts[iDonor] : '';
      const patientValue = iPatient >= 0 ? parts[iPatient] : '';
      return {
        ...base,
        blood_group: typeof base?.blood_group === 'string' && base.blood_group ? base.blood_group : iBlood >= 0 ? parts[iBlood] : '',
        component_type:
          typeof base?.component_type === 'string' && base.component_type ? base.component_type : iComp >= 0 ? parts[iComp] : '',
        collection_date:
          typeof base?.collection_date === 'string' && base.collection_date ? base.collection_date : iCol >= 0 ? parts[iCol] : '',
        expiry_date: typeof base?.expiry_date === 'string' && base.expiry_date ? base.expiry_date : iExp >= 0 ? parts[iExp] : '',
        storage:
          typeof base?.storage === 'string' && base.storage
            ? base.storage
            : typeof base?.storage_condition === 'string' && base.storage_condition
              ? base.storage_condition
              : typeof base?.storageCondition === 'string' && base.storageCondition
                ? base.storageCondition
                : storageValue,
        donor_name: typeof base?.donor_name === 'string' && base.donor_name ? base.donor_name : donorValue,
        patient_name: typeof base?.patient_name === 'string' ? base.patient_name : patientValue,
      };
    });
  };

  const handleBatchFile = async (file: File) => {
    setBatchResult(null);
    setScannerError(null);
    setScannerStatus('Importing batch…');
    setLoading(true);
    try {
      const csvText = await file.text();
      const rows = parseCsv(csvText).slice(0, 100);
      if (!rows.length) throw new Error('Invalid CSV format');

      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') throw new Error('Not signed in');

      if (!hospitalNameRef.current) {
        const { data: profile } = await supabase
          .from('hospital_profiles')
          .select('organization_name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        hospitalNameRef.current = typeof (profile as any)?.organization_name === 'string' ? (profile as any).organization_name : null;
      }

      const batchName = file.name;
      const { data: batchRow, error: batchErr } = await supabase
        .from('hospital_inventory_batches')
        .insert({ hospital_id: session.user.id, batch_name: batchName, total_units: rows.length })
        .select('id')
        .maybeSingle();
      if (batchErr) throw batchErr;
      const batchId = (batchRow as any)?.id as string | undefined;
      if (!batchId) throw new Error('Batch create failed');

      let inserted = 0;
      let duplicates = 0;
      let failed = 0;

      for (const r of rows) {
        try {
          const payload = normalizePayload({
            ...r,
            hospital_name: hospitalNameRef.current || '',
          });
          if (!payload.blood_group || !payload.component_type || !payload.collection_date || !payload.expiry_date || !payload.storage) {
            failed += 1;
            continue;
          }
          const qr_hash = await sha256Hex(JSON.stringify(payload));
          const { data, error } = await supabase.rpc('add_inventory_unit_from_qr', {
            p_qr_hash: qr_hash,
            p_payload: payload,
            p_batch_id: batchId,
          } as any);
          if (error) throw error;
          if ((data as any)?.inserted) inserted += 1;
          else duplicates += 1;
        } catch {
          failed += 1;
        }
      }

      setBatchResult({ inserted, duplicates, failed });
      setScannerStatus('Batch import complete.');
      refreshAll();
    } catch (e: any) {
      const message = e && typeof e.message === 'string' ? e.message : 'Batch import failed';
      setScannerError(message);
      setScannerStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (loading) return;
    setBatchResult(null);
    setScannerError(null);
    setScannerStatus('Adding unit…');
    setLoading(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') throw new Error('Not signed in');

      if (!hospitalNameRef.current) {
        const { data: profile } = await supabase
          .from('hospital_profiles')
          .select('organization_name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        hospitalNameRef.current = typeof (profile as any)?.organization_name === 'string' ? (profile as any).organization_name : null;
      }

      const basePayload = normalizePayload({
        ...manual,
        hospital_name: hospitalNameRef.current || '',
      });
      const volumeNum = Number((manual as any).volume_ml);
      const payload = {
        ...basePayload,
        batch_number: typeof (manual as any).batch_number === 'string' ? (manual as any).batch_number.trim() : '',
        volume_ml: Number.isFinite(volumeNum) && volumeNum > 0 ? volumeNum : null,
        quality_notes: typeof (manual as any).quality_notes === 'string' ? (manual as any).quality_notes.trim() : '',
      };
      if (!payload.blood_group || !payload.component_type || !payload.collection_date || !payload.expiry_date || !payload.storage) {
        throw new Error('Fill required fields: blood group, component, collection date, expiry date, storage');
      }

      const qr_hash = await sha256Hex(JSON.stringify(payload));
      const { data, error } = await supabase.rpc('add_inventory_unit_from_qr', {
        p_qr_hash: qr_hash,
        p_payload: payload,
        p_batch_id: null,
      } as any);
      if (error) throw error;

      const inserted = !!(data as any)?.inserted;
      setScannerStatus(inserted ? 'Added to inventory.' : 'Duplicate blocked.');
      setScannerError(null);
      refreshAll();
    } catch (e: any) {
      const message = e && typeof e.message === 'string' ? e.message : 'Manual add failed';
      setScannerError(message);
      setScannerStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Inventory Logging & Scanning</h2>
        <p className="text-gray-600">Add new blood units to the system</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Input Panel */}
        <div className="col-span-2 space-y-6">
          {/* Scan Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Scan Blood Bag</h3>

            <div onClick={startScan} className="border-4 border-dashed border-blue-300 rounded-xl p-12 text-center mb-6 bg-blue-50 hover:bg-blue-100 transition cursor-pointer">
              <Scan className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-900 mb-2">Scan QR Code or Barcode</p>
              <p className="text-gray-500">Place bag code in scanner area</p>
            </div>

            <div id={qrReaderId} className="w-full overflow-hidden rounded-lg mb-6" />

            <div className={`flex items-center justify-between p-4 rounded-lg border ${scannerError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-3">
                {scannerError ? <AlertCircle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                <span className={`${scannerError ? 'text-red-700' : 'text-green-700'}`}>
                  {scannerError ? scannerError : scannerStatus ? scannerStatus : scannerReady ? 'Scanner Ready • Auto-sync enabled' : 'Initializing scanner…'}
                </span>
              </div>
              <div className={`w-3 h-3 rounded-full ${scannerError ? 'bg-red-500' : 'bg-green-500'} ${loading ? '' : 'animate-pulse'}`}></div>
            </div>
          </div>

          {/* Manual Entry Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Manual Entry</h3>
              <span className="text-gray-500">Fallback mode</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Blood Group *</label>
                <select
                  value={manual.blood_group}
                  onChange={(e) => setManual((p) => ({ ...p, blood_group: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select blood group</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Component Type *</label>
                <select
                  value={manual.component_type}
                  onChange={(e) => setManual((p) => ({ ...p, component_type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select component</option>
                  <option>Whole Blood</option>
                  <option>RBC</option>
                  <option>Platelets</option>
                  <option>Plasma</option>
                  <option>Cryoprecipitate</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Batch Number</label>
                <input
                  type="text"
                  placeholder="BT-XXXX-XX"
                  value={(manual as any).batch_number}
                  onChange={(e) => setManual((p) => ({ ...p, batch_number: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Volume (ml)</label>
                <input
                  type="number"
                  placeholder="450"
                  value={(manual as any).volume_ml}
                  onChange={(e) => setManual((p) => ({ ...p, volume_ml: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Collection Date *</label>
                <input
                  type="date"
                  value={manual.collection_date}
                  onChange={(e) => setManual((p) => ({ ...p, collection_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Expiry Date *</label>
                <input
                  type="date"
                  value={manual.expiry_date}
                  onChange={(e) => setManual((p) => ({ ...p, expiry_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Donor ID</label>
                <input
                  type="text"
                  placeholder="DNR-XXXX"
                  value={manual.donor_name}
                  onChange={(e) => setManual((p) => ({ ...p, donor_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Storage Location</label>
                <input
                  type="text"
                  placeholder="Fridge A-12"
                  value={manual.storage}
                  onChange={(e) => setManual((p) => ({ ...p, storage: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Quality Notes</label>
              <textarea
                rows={3}
                placeholder="Visual inspection notes, quality checks..."
                value={(manual as any).quality_notes}
                onChange={(e) => setManual((p) => ({ ...p, quality_notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-4">
              <button onClick={handleManualAdd} className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add to Inventory
              </button>
              <button
                onClick={() => {
                  setScannerError(null);
                  setScannerStatus(null);
                  setBatchResult(null);
                  setManual({
                    blood_group: '',
                    component_type: '',
                    collection_date: '',
                    expiry_date: '',
                    storage: '',
                    batch_number: '',
                    volume_ml: '',
                    quality_notes: '',
                    donor_name: '',
                    patient_name: '',
                  });
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Clear Form
              </button>
            </div>
          </div>

          {/* Batch Entry */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Batch Entry</h3>
            <p className="text-gray-600 mb-4">Upload CSV file for multiple units</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                if (f) handleBatchFile(f);
                e.target.value = '';
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer"
            >
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 mb-2">Drop CSV file or click to browse</p>
              <p className="text-gray-500">Maximum 100 units per upload</p>
            </div>

            {batchResult && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-gray-700">
                Imported: {batchResult.inserted} • Duplicates: {batchResult.duplicates} • Failed: {batchResult.failed}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Freshness Indicator */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Freshness Score</h3>

            <div className="text-center mb-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="text-gray-600">{freshness.label}</div>
              </div>
              <p className="text-gray-600">{mostRecent ? 'Latest unit scanned' : 'No assessment available'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Collection</span>
                <span className="text-gray-600">{freshness.collection}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Storage</span>
                <span className="text-gray-600">{freshness.storage}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Age</span>
                <span className="text-gray-600">{freshness.age}</span>
              </div>
            </div>
          </div>

          {/* Auto Alerts */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-orange-700 mb-4">
              <AlertCircle className="w-5 h-5" />
              <h3>Auto-Alert Settings</h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Alert at 7 days to expiry</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Alert at 3 days to expiry</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-700">Critical at 1 day to expiry</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Near-Expiry Units</h3>
            <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <span className="text-gray-600">Next 7 days</span>
              <span className="text-gray-900">{typeof nearExpiryCount === 'number' ? nearExpiryCount : '—'}</span>
            </div>
            <div className="space-y-3">
              {nearExpiryUnits.length ? nearExpiryUnits.slice(0, 5).map((u) => (
                <div key={u.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-900">{u.blood_group} • {u.component_type}</div>
                    <div className="text-gray-700">{u.expiry_date}</div>
                  </div>
                  <div className="text-gray-600 mt-1">{typeof u.status === 'string' ? u.status : ''}</div>
                </div>
              )) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">No near-expiry units</div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Additions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Additions</h3>

            <div className="space-y-3">
              {recentUnits.length ? recentUnits.slice(0, 5).map((u) => (
                <div key={u.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-900">{u.blood_group} • {u.component_type}</div>
                    <div className="text-gray-500">{typeof u.status === 'string' ? u.status : ''}</div>
                  </div>
                  <div className="text-gray-600 mt-1">Expiry: {u.expiry_date}</div>
                </div>
              )) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">No recent additions</div>
                </div>
              )}
            </div>
          </div>

          {/* Daily Stats */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <h3 className="mb-4">Today's Entries</h3>

            <div className="space-y-3">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="mb-1">Total Units Logged</div>
                <div className="opacity-90">{typeof todayUnitsCount === 'number' ? todayUnitsCount : 'No data yet'}</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="mb-1">Batch Operations</div>
                <div className="opacity-90">{typeof todayBatchCount === 'number' ? todayBatchCount : 'No data yet'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
