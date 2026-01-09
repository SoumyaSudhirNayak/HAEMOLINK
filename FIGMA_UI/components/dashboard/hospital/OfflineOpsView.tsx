import { WifiOff, CheckCircle, AlertCircle, QrCode, MessageSquare } from 'lucide-react';

export function OfflineOpsView() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Offline Operations</h2>
        <p className="text-gray-600">Maintain operations during connectivity issues</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <h3 className="text-green-900">Sync Status</h3>
          </div>
          <p className="text-green-700 mb-2">Last synced: 2 mins ago</p>
          <p className="text-green-600">All systems online</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-4">Offline Mode</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-gray-700">Enable offline mode</span>
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Offline Capabilities</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <QrCode className="w-6 h-6 text-blue-600 mb-2" />
              <div className="text-gray-900 mb-1">QR-Only Operation</div>
              <p className="text-gray-600">Manual scanning mode active</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600 mb-2" />
              <div className="text-gray-900 mb-1">SMS Alerts</div>
              <p className="text-gray-600">Backup notification system</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Sync Queue</h3>
          <div className="space-y-2">
            {[
              { action: 'Inventory update', items: 3, status: 'pending' },
              { action: 'Request completion', items: 2, status: 'pending' },
            ].map((item) => (
              <div key={item.action} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-gray-900">{item.action}</div>
                  <p className="text-gray-600">{item.items} items pending</p>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">Queued</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
