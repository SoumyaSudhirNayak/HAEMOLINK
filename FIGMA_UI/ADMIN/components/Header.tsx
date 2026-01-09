import { Menu, LogOut, Bell, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useEffect, useState } from 'react';
import { getAdminApiBaseUrl, getAdminApiKey, setAdminApiBaseUrl, setAdminApiKey } from '../../supabase/client';

interface HeaderProps {
  onMenuClick: () => void;
  onExit?: () => void;
}

export function Header({ onMenuClick, onExit }: HeaderProps) {
  const [adminKeyOpen, setAdminKeyOpen] = useState(false);
  const [adminKeyValue, setAdminKeyValue] = useState('');
  const [adminBaseUrlValue, setAdminBaseUrlValue] = useState('');
  const [hasAdminKey, setHasAdminKey] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    const k = getAdminApiKey();
    setHasAdminKey(!!k);
    setAdminKeyValue(k ?? '');
    setAdminBaseUrlValue(getAdminApiBaseUrl() ?? '');
    setTestStatus(null);
  }, [adminKeyOpen]);

  const adminApiBaseUrl = (adminBaseUrlValue || '').trim() || getAdminApiBaseUrl();

  const testConnection = async () => {
    setTestStatus('Testing…');
    const key = adminKeyValue.trim();
    if (!adminApiBaseUrl) {
      setTestStatus('Set VITE_ADMIN_API_BASE_URL first.');
      return;
    }
    if (!key) {
      setTestStatus('Paste the Admin API key first.');
      return;
    }
    try {
      const resp = await fetch(`${adminApiBaseUrl}/admin/health`, {
        method: 'GET',
        headers: { 'x-admin-key': key },
      });
      const text = await resp.text();
      if (!resp.ok) {
        setTestStatus(`Failed (${resp.status}). Check ADMIN_API_KEY and server.`);
        return;
      }
      if (text.trim().startsWith('<')) {
        setTestStatus('Got HTML, not JSON. Check VITE_ADMIN_API_BASE_URL.');
        return;
      }
      try {
        const json = JSON.parse(text) as any;
        if (json?.supabase_ok === false) {
          const missing = Array.isArray(json?.missing_env) ? json.missing_env.join(', ') : '';
          const invalid = Array.isArray(json?.invalid_env) ? json.invalid_env.join(', ') : '';
          const parts = [missing ? `Missing: ${missing}` : '', invalid ? `Invalid: ${invalid}` : ''].filter(Boolean);
          setTestStatus(parts.length ? `Server up. ${parts.join(' | ')}` : 'Server up, but Supabase not configured.');
          return;
        }
      } catch {}
      setTestStatus('Connected. Admin data should load now.');
    } catch {
      setTestStatus('Connection failed. Is the admin server running?');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[#EF4444] flex items-center justify-center">
              <div className="size-5 text-white font-bold">H</div>
            </div>
            <span className="font-semibold text-gray-900">HAEMOLINK</span>
            <Badge variant="outline" className="ml-2 bg-[#F5F3FF] text-[#8B5CF6] border-[#8B5CF6]">
              Super Admin
            </Badge>
          </div>
        </div>

        {/* Center: Page Title */}
        <div className="hidden md:block">
          <h1 className="font-semibold text-gray-900">Central Control Portal</h1>
        </div>

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="size-5" />
            <span className="absolute -top-1 -right-1 size-4 bg-[#EF4444] text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          <Dialog open={adminKeyOpen} onOpenChange={setAdminKeyOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className={hasAdminKey ? 'text-[#10B981]' : undefined}>
                <Settings className="size-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Admin Data Access</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900">Admin API Base URL</span>
                    <span className="font-mono text-xs text-gray-700">{adminApiBaseUrl ?? 'Not set'}</span>
                  </div>
                  <div className="mt-2">
                    Do not paste the Supabase Service Role key here. This key must match ADMIN_API_KEY on the server.
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-api-base-url">Admin API Base URL</Label>
                  <Input
                    id="admin-api-base-url"
                    value={adminBaseUrlValue}
                    onChange={(e) => setAdminBaseUrlValue(e.target.value)}
                    placeholder="http://localhost:8000"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-api-key">Admin API Key</Label>
                  <Input
                    id="admin-api-key"
                    value={adminKeyValue}
                    onChange={(e) => setAdminKeyValue(e.target.value)}
                    placeholder="Paste key to load admin data"
                    autoComplete="off"
                    type="password"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-600">{testStatus ?? ''}</div>
                  <Button variant="outline" onClick={testConnection}>
                    Test
                  </Button>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAdminApiKey('');
                      setAdminApiBaseUrl('');
                      setHasAdminKey(false);
                      setAdminKeyValue('');
                      setAdminBaseUrlValue('');
                      setTestStatus(null);
                      setAdminKeyOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    className="bg-[#3B82F6] hover:bg-[#2563EB]"
                    onClick={() => {
                      setAdminApiKey(adminKeyValue);
                      setAdminApiBaseUrl(adminBaseUrlValue);
                      setHasAdminKey(!!adminKeyValue.trim());
                      setTestStatus(null);
                      setAdminKeyOpen(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-[#3B82F6] text-white">SA</AvatarFallback>
            </Avatar>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-gray-900">Super Admin</p>
              <p className="text-xs text-gray-500">admin@haemolink.gov</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-[#EF4444]" onClick={onExit}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
