import { FlaskConical, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

export function CrossmatchView() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Crossmatch Verification</h2>
        <p className="text-gray-600">Verify compatibility before transfusion</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          {/* Crossmatch Input */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">New Crossmatch Test</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Patient ID</label>
                <input type="text" placeholder="P-XXXX" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Blood Bag ID</label>
                <input type="text" placeholder="BT-XXXX-XX" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>

            <button className="w-full py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition flex items-center justify-center gap-2">
              <FlaskConical className="w-5 h-5" />
              Run Crossmatch Test
            </button>
          </div>

          {/* AI Warnings */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <h3>AI Compatibility Check</h3>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="mb-2">Antigen Analysis</div>
              <p className="opacity-90">No data yet</p>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Dual Human Verification</h3>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="mt-1" />
                <div>
                  <div className="text-gray-900 mb-1">Verified by Technician 1</div>
                  <p className="text-gray-600">Awaiting verification</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="mt-1" />
                <div>
                  <div className="text-gray-900 mb-1">Verified by Technician 2</div>
                  <p className="text-gray-600">Awaiting verification</p>
                </div>
              </label>
            </div>

            <div className="flex gap-4 mt-6">
              <button className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                Approve & Log
              </button>
              <button className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                Reject
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-2 text-green-700 mb-4">
              <CheckCircle className="w-6 h-6" />
              <h3>Status</h3>
            </div>
            <p className="text-gray-600 mb-4">No results yet</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Tests</h3>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-600">No records available</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
