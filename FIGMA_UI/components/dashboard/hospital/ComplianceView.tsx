import { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, CheckCircle, Upload, FileText, Download } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

export function ComplianceView() {
  const { refreshTick } = useAutoRefresh();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [docType, setDocType] = useState('license');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const total = documents.length;
    const approved = documents.filter((d) => (d?.status || '').toString() === 'approved').length;
    const pending = documents.filter((d) => (d?.status || '').toString() === 'pending_review').length;
    const rejected = documents.filter((d) => (d?.status || '').toString() === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [documents]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ supabase }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') {
        setDocuments([]);
        return;
      }
      const { data } = await supabase
        .from('compliance_documents')
        .select('id, doc_type, file_name, storage_path, mime_type, size_bytes, status, created_at')
        .eq('owner_id', session.user.id)
        .eq('owner_role', 'hospital')
        .order('created_at', { ascending: false })
        .limit(200);
      setDocuments(Array.isArray(data) ? data : []);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Unable to load compliance documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshTick]);

  const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const isBucketNotFoundError = (e: any) => {
    const msg = e && typeof e.message === 'string' ? e.message : '';
    return msg.toLowerCase().includes('bucket not found');
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('Max file size is 5MB.');
      return;
    }
    setUploading(true);
    try {
      const [{ supabase, COMPLIANCE_BUCKET }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') {
        setErrorMessage('Please log in as a hospital to upload documents.');
        return;
      }
      const uid = session.user.id;
      const objectName = `hospital/${uid}/${crypto.randomUUID()}_${sanitizeFileName(selectedFile.name)}`;

      const bucket = typeof COMPLIANCE_BUCKET === 'string' && COMPLIANCE_BUCKET.trim() ? COMPLIANCE_BUCKET.trim() : 'compliance';
      const uploadOnce = () =>
        supabase.storage.from(bucket).upload(objectName, selectedFile, { contentType: selectedFile.type, upsert: false });

      const firstUpload = await uploadOnce();
      if (firstUpload.error) {
        if (isBucketNotFoundError(firstUpload.error)) {
          const created = await supabase.storage.createBucket(bucket, { public: false });
          if (!created.error) {
            const retryUpload = await uploadOnce();
            if (retryUpload.error) throw retryUpload.error;
          } else {
            throw firstUpload.error;
          }
        } else {
          throw firstUpload.error;
        }
      }

      const { data: row, error: dbErr } = await supabase
        .from('compliance_documents')
        .insert({
          owner_id: uid,
          owner_role: 'hospital',
          doc_type: docType,
          file_name: selectedFile.name,
          storage_path: objectName,
          mime_type: selectedFile.type,
          size_bytes: selectedFile.size,
        })
        .select('id, doc_type, file_name, storage_path, mime_type, size_bytes, status, created_at')
        .maybeSingle();
      if (dbErr) throw dbErr;

      setDocuments((prev) => [row, ...prev].filter(Boolean));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setErrorMessage(null);
    } catch (e: any) {
      const msg = e && typeof e.message === 'string' ? e.message : '';
      if (isBucketNotFoundError(e)) {
        setErrorMessage('Compliance storage bucket not found. Create a private bucket named "compliance" in Supabase Storage (or set VITE_COMPLIANCE_BUCKET).');
      } else {
        setErrorMessage(msg || 'Upload failed.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (storagePath: string) => {
    try {
      const [{ supabase, COMPLIANCE_BUCKET }, { getSessionAndRole }] = await Promise.all([
        import('../../../supabase/client'),
        import('../../../services/auth'),
      ]);
      const { session, role } = await getSessionAndRole();
      if (!session || role !== 'hospital') return;

      const bucket = typeof COMPLIANCE_BUCKET === 'string' && COMPLIANCE_BUCKET.trim() ? COMPLIANCE_BUCKET.trim() : 'compliance';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Verification & Compliance</h2>
        <p className="text-gray-600">Regulatory compliance and audit logs</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <h3 className="text-green-900">Compliance Status</h3>
          </div>
          <div className="text-gray-600">
            {loading ? 'Loading...' : summary.approved > 0 ? 'Approved' : summary.total > 0 ? 'Pending Review' : 'No documents uploaded'}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <h3 className="text-blue-900">Audit Logs</h3>
          </div>
          <div className="text-gray-600">No data yet</div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Required Documents</h3>
          <div className="space-y-3">
            {loading ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-gray-600">Loading...</div>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-gray-600">No documents uploaded</div>
              </div>
            ) : (
              documents.slice(0, 10).map((d) => (
                <div key={d.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-gray-900 truncate">{d.file_name}</div>
                    <div className="text-gray-600 text-sm">
                      {(d.doc_type || 'document').toString()} • {(d.status || 'pending_review').toString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(d.storage_path)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                    <span className="text-sm text-gray-700">View</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Upload Documents</h3>
          {errorMessage ? (
            <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <label className="block text-gray-700 mb-2">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              >
                <option value="license">License</option>
                <option value="registration">Registration</option>
                <option value="certification">Certification</option>
                <option value="audit_report">Audit Report</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-violet-400 transition cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                id="hospital-compliance-upload"
              />
              <label htmlFor="hospital-compliance-upload" className="block cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 mb-1">
                  {selectedFile ? selectedFile.name : 'Click to browse'}
                </p>
                <p className="text-gray-500 text-sm">PDF, JPG, PNG (Max 5MB)</p>
              </label>
            </div>

            <button
              type="button"
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
              className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
