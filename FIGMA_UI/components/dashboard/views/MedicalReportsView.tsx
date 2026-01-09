import { useEffect, useState } from 'react';
import { Upload, FileText, AlertCircle, Sparkles, TrendingUp, Download } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface PatientReport {
  id: string;
  patient_id: string;
  file_url: string;
  document_type: string | null;
  extracted_data: any | null;
  uploaded_at: string | null;
}

export function MedicalReportsView() {
  const [reports, setReports] = useState<PatientReport[] | null>(null);
  const [latestReport, setLatestReport] = useState<PatientReport | null>(null);
  const { refreshTick } = useAutoRefresh();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ getSessionAndRole }, { supabase }] = await Promise.all([
          import('../../../services/auth'),
          import('../../../supabase/client'),
        ]);
        const { session, role } = await getSessionAndRole();
        if (!session || role !== 'patient') {
          if (active) {
            setReports([]);
            setLatestReport(null);
          }
          return;
        }
        const { data, error } = await supabase
          .from('patient_reports')
          .select('id, patient_id, file_url, document_type, extracted_data, uploaded_at')
          .eq('patient_id', session.user.id)
          .order('uploaded_at', { ascending: false });
        if (error) {
          if (active) {
            setReports([]);
            setLatestReport(null);
          }
          return;
        }
        const items = (data as PatientReport[]) || [];
        if (active) {
          setReports(items);
          setLatestReport(items[0] || null);
        }
      } catch {
        if (active) {
          setReports([]);
          setLatestReport(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const extractedEntries =
    latestReport && latestReport.extracted_data && typeof latestReport.extracted_data === 'object'
      ? Object.entries(latestReport.extracted_data as Record<string, any>).slice(0, 4)
      : [];
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Medical Reports</h2>
        <p className="text-gray-600">Upload and analyze your medical reports with AI</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="col-span-2 space-y-6">
          {/* Upload Card */}
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 transition">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-gray-900 mb-2">Upload Medical Report</h3>
            <p className="text-gray-600 mb-6">Drag and drop your report or click to browse</p>
            <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Select File
            </button>
            <p className="text-gray-500 mt-4">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <h3 className="text-gray-900">AI Extracted Data</h3>
              {latestReport && (
                <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full">
                  Latest Report
                </span>
              )}
            </div>
            {extractedEntries.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {extractedEntries.map(([key, value]) => (
                    <div key={key} className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-gray-500 mb-1">{key}</div>
                      <div className="text-gray-900">
                        {typeof value === 'number' || typeof value === 'string'
                          ? String(value)
                          : 'Recorded'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                    <div className="text-gray-900">Report analyzed</div>
                  </div>
                  <p className="text-gray-700">
                    Insights above are based on the latest uploaded report.
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <p className="text-gray-700">
                  AI extracted data will appear here once your reports are processed.
                </p>
              </div>
            )}
          </div>

          {/* Doctor Verification */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Doctor Verification</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-700">
                Get your reports verified by a medical professional for accurate diagnosis
              </p>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Request Doctor Review
              </button>
              <button className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Share with Hospital
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
            <div className="col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <h3>AI Insights</h3>
            </div>

            <p className="opacity-90">
              Insights based on your reports will appear here once processing is enabled.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Reports</h3>
            {reports && reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => {
                  const uploadedAt = report.uploaded_at
                    ? new Date(report.uploaded_at).toLocaleString()
                    : null;
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-gray-900">
                            {report.document_type || 'Report'}
                          </div>
                          <p className="text-gray-500">
                            {uploadedAt || 'Upload time not recorded'}
                          </p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                No reports uploaded yet. When you upload reports, they will appear here.
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Health Trends</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span className="text-gray-700">
                  Trends will appear once multiple reports are available.
                </span>
              </div>
              <p className="text-gray-500">
                Upload reports over time to see how your key parameters change.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-2">
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                Export All Reports
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                Share with Doctor
              </button>
              <button className="w-full py-2 text-left px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-gray-700">
                Schedule Lab Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
