import { useEffect, useState } from 'react';
import { CreditCard, Wallet, Shield, Download, DollarSign, TrendingUp } from 'lucide-react';
import { useAutoRefresh } from '../../../context/AutoRefreshContext';

interface PatientPayment {
  id: string;
  patient_id: string;
  delivery_id?: string | null;
  distance_km?: number | null;
  amount: number | null;
  payment_type: string | null;
  payment_method?: string | null;
  status: string | null;
  created_at: string | null;
}

export function PaymentsView() {
  const [payments, setPayments] = useState<PatientPayment[] | null>(null);
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
            setPayments([]);
          }
          return;
        }
        const { data, error } = await supabase
          .from('patient_payments')
          .select('id, patient_id, delivery_id, distance_km, amount, payment_type, payment_method, status, created_at')
          .eq('patient_id', session.user.id)
          .order('created_at', { ascending: false });
        if (error) {
          if (active) {
            setPayments([]);
          }
          return;
        }
        const items = (data as PatientPayment[]) || [];
        if (active) {
          setPayments(items);
        }
      } catch {
        if (active) {
          setPayments([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const totalAmount =
    payments && payments.length > 0
      ? payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">Payments & Benefits</h2>
        <p className="text-gray-600">Manage your payments, wallet, and insurance benefits</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="opacity-90 mb-2">Total Payments Recorded</p>
                <div style={{ fontSize: '2.5rem' }}>
                  {payments && payments.length > 0 ? `₹${totalAmount.toLocaleString()}` : '₹0'}
                </div>
              </div>
              <Wallet className="w-12 h-12 opacity-80" />
            </div>

            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition">
                Payment options will be linked in a later phase
              </button>
              <button className="flex-1 py-2.5 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition">
                Export statements
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-6">Payment Methods</h3>

            <p className="text-gray-600">
              Linked payment methods will appear here once billing is configured for your account.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Emergency Support Programs</h3>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-2">Insurance Linked Billing</div>
                  <p className="text-gray-600 mb-4">
                    Insurance details can be linked to your HAEMOLINK profile in a later phase.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Transactions</h3>

            {payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((txn) => {
                  const date = txn.created_at
                    ? new Date(txn.created_at).toLocaleString()
                    : null;
                  const amountDisplay =
                    txn.amount != null ? `₹${txn.amount.toLocaleString()}` : 'Amount not recorded';
                  return (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="text-gray-900">
                            {txn.payment_method || txn.payment_type || 'Payment'}
                          </div>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            {txn.status || 'Status not recorded'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-gray-500">
                          <span>{txn.delivery_id ? `Delivery ${(txn.delivery_id || '').slice(0, 8)}` : txn.id}</span>
                          <span>•</span>
                          <span>{date || 'Time not recorded'} </span>
                          {typeof txn.distance_km === 'number' && Number.isFinite(txn.distance_km) && (
                            <>
                              <span>•</span>
                              <span>{txn.distance_km.toFixed(1)} km</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-gray-900">
                          {amountDisplay}
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                No payment history available. Your transactions will appear here once payments are recorded.
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Spending Summary</h3>

            <p className="text-gray-600">
              Spending trends and charts will be available once more payment data is recorded.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Cost Breakdown</h3>

            <p className="text-gray-600">
              Category-wise breakdown will be shown here when detailed billing data is available.
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6" />
              <h3>Savings This Year</h3>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4 mb-3">
              <div className="mb-2">Insurance Coverage</div>
              <div style={{ fontSize: '2rem' }}>₹0</div>
            </div>

            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="mb-2">Emergency Assistance</div>
              <div style={{ fontSize: '2rem' }}>₹0</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Download Receipts</h3>

            <button className="w-full mt-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
              Download All (PDF)
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Tax Benefits</h3>

            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
              <div className="text-gray-700 mb-2">Eligible for Deduction</div>
              <div className="text-violet-600 mb-3" style={{ fontSize: '1.5rem' }}>₹0</div>
              <p className="text-gray-600 mb-4">
                Tax benefit calculations will be available once payment data is connected.
              </p>
              <button className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition">
                Download Tax Certificate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
