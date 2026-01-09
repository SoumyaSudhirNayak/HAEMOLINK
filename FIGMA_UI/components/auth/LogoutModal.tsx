import { LogOut, AlertCircle } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

export function LogoutModal({ isOpen, onClose, onConfirm, userName }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-8 h-8 text-red-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl text-gray-900 text-center mb-3">
          Log out of HAEMOLINK?
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          {userName && <span className="block mb-2">Hi <strong>{userName}</strong>,</span>}
          Are you sure you want to log out? You'll need to sign in again to access your dashboard.
        </p>

        {/* Info Note */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">
            You will be redirected to the HAEMOLINK welcome screen. Your data is safely saved.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition shadow-lg"
          >
            Confirm Logout
          </button>
        </div>
      </div>
    </div>
  );
}
