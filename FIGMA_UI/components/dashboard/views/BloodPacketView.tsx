import { Building2, Calendar, Thermometer, MapPin, User, Clock, Package, TrendingDown } from 'lucide-react';

export function BloodPacketView() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Blood Packet Tracking</h2>
        <p className="text-gray-600">Complete transparency of your blood packet journey</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="col-span-2 space-y-6">
          {/* Packet ID Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-gray-500 mb-1">Blood Packet ID</div>
                <div className="text-gray-900">BB-45892-A-RBC-2024</div>
              </div>
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full">
                Verified & Safe
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-500 mb-1">Blood Group</div>
                <div className="text-gray-900">A+ Positive</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-500 mb-1">Component</div>
                <div className="text-gray-900">RBC (Packed)</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-500 mb-1">Units</div>
                <div className="text-gray-900">2 Units</div>
              </div>
            </div>
          </div>

          {/* Source Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Source Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Source Hospital</div>
                  <p className="text-gray-600">City General Hospital Blood Bank</p>
                  <p className="text-gray-500">123 Main Street, Downtown</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Collection Date</div>
                  <p className="text-gray-600">December 11, 2024 at 09:30 AM</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      2 days old - Fresh
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Donor Information</div>
                  <p className="text-gray-600">Anonymous Donor (ID: DNR-8923)</p>
                  <p className="text-gray-500">Verified & Screened</p>
                </div>
              </div>
            </div>
          </div>

          {/* Freshness Graph */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Freshness Timeline</h3>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Days Since Collection</span>
                <span className="text-green-600">2 / 35 days</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full" style={{ width: '6%' }} />
              </div>
              <div className="flex justify-between text-gray-500 mt-2">
                <span>Fresh (0-7 days)</span>
                <span>Moderate (8-21 days)</span>
                <span>Expiry (35 days)</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <TrendingDown className="w-5 h-5" />
                <span>Optimal for transfusion - Excellent condition</span>
              </div>
            </div>
          </div>

          {/* Staff Handling Log */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Handling Log</h3>
            
            <div className="space-y-3">
              {[
                { time: '09:30 AM', staff: 'Dr. Sarah Johnson', action: 'Blood collection and screening', location: 'Collection Center' },
                { time: '10:15 AM', staff: 'Lab Tech. Rajesh Kumar', action: 'Quality testing and verification', location: 'Laboratory' },
                { time: '10:45 AM', staff: 'Storage Manager Lisa Wong', action: 'Cold storage placement', location: 'Storage Facility' },
                { time: '11:05 AM', staff: 'Dispatch Officer Amit Shah', action: 'Prepared for delivery', location: 'Dispatch Center' },
                { time: '11:12 AM', staff: 'Delivery Agent Rahul Sharma', action: 'Picked up for delivery', location: 'In Transit' },
              ].map((log) => (
                <div key={log.time} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-500">{log.time}</div>
                  <div className="flex-1">
                    <div className="text-gray-900">{log.staff}</div>
                    <p className="text-gray-600">{log.action}</p>
                  </div>
                  <div className="text-gray-500">{log.location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Transport Route */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Transport Route</h3>
            
            <div className="space-y-4">
              {[
                { location: 'Collection Center', time: '09:30 AM', status: 'completed' },
                { location: 'Testing Lab', time: '10:15 AM', status: 'completed' },
                { location: 'Storage Facility', time: '10:45 AM', status: 'completed' },
                { location: 'Dispatch Center', time: '11:05 AM', status: 'completed' },
                { location: 'Delivery Vehicle', time: '11:12 AM', status: 'active' },
                { location: 'Patient Location', time: 'ETA 12 min', status: 'pending' },
              ].map((stop, idx) => (
                <div key={stop.location} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stop.status === 'completed' ? 'bg-green-100 text-green-600' :
                      stop.status === 'active' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {stop.status === 'completed' ? '✓' : idx + 1}
                    </div>
                    {idx < 5 && (
                      <div className={`w-0.5 h-8 ${
                        stop.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900">{stop.location}</div>
                    <p className="text-gray-500">{stop.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Temperature Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Cold Chain Monitoring</h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Current Temp</span>
                <span className="text-green-600">4.2°C</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Within safe range</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Storage</span>
                <span className="text-gray-900">3.8°C</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Dispatch</span>
                <span className="text-gray-900">4.1°C</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">In Transit</span>
                <span className="text-gray-900">4.2°C</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700">Temperature maintained at 2-6°C throughout the journey</p>
            </div>
          </div>

          {/* Quality Certifications */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Quality Checks</h3>
            
            <div className="space-y-2">
              {[
                'HIV Screening',
                'Hepatitis B & C',
                'Blood Grouping',
                'Cross Matching',
                'Hemoglobin Level',
                'Sterility Test',
              ].map((check) => (
                <div key={check} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">{check}</span>
                  <span className="text-green-600">✓ Passed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
