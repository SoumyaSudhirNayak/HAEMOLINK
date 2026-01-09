import { useEffect, useState } from 'react';
import { Heart, Search, Truck, Shield, Activity, Users, Building2, TrendingUp, ArrowRight, Play, CheckCircle, Award, Lock, Zap, Menu, X } from 'lucide-react';
import { useAutoRefresh } from '../context/AutoRefreshContext';

interface LandingPageProps {
  onGetStarted: () => void;
  onGoToAdmin: () => void;
}

type ThemeMode = 'clean' | 'healthcare' | 'warm';

export function LandingPage({ onGetStarted, onGoToAdmin }: LandingPageProps) {
  const { refreshTick } = useAutoRefresh();
  const [theme, setTheme] = useState<ThemeMode>('clean');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [impactStats, setImpactStats] = useState({
    livesSaved: 0,
    activeDonors: 0,
    hospitals: 0,
    successRatePct: 0,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ supabase }] = await Promise.all([import('../supabase/client')]);
      const { data, error } = await supabase.rpc('get_landing_impact_stats');
      if (!active) return;
      if (error || !data) {
        setImpactStats({
          livesSaved: 0,
          activeDonors: 0,
          hospitals: 0,
          successRatePct: 0,
        });
        return;
      }

      const livesSaved = Number(data.livesSaved ?? 0);
      const activeDonors = Number(data.activeDonors ?? 0);
      const hospitals = Number(data.hospitals ?? 0);
      const totalRequests = Number(data.totalRequests ?? 0);
      const successRatePct = totalRequests > 0 ? (livesSaved / totalRequests) * 100 : 0;
      setImpactStats({ livesSaved, activeDonors, hospitals, successRatePct });
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  // Theme configurations
  const themes = {
    clean: {
      name: 'Clean Light',
      heroBg: 'bg-gradient-to-br from-white via-blue-50 to-blue-50 dark:from-background dark:via-muted dark:to-background',
      heroText: 'text-gray-900 dark:text-foreground',
      heroSubtext: 'text-gray-600 dark:text-muted-foreground',
      headerText: 'text-gray-900 dark:text-foreground',
      headerNav: 'text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground',
      headerButton: 'bg-blue-600 text-white hover:bg-blue-700',
      impactBg: 'bg-gradient-to-br from-blue-50 via-violet-50 to-blue-50 dark:from-background dark:via-muted dark:to-background',
      impactText: 'text-gray-900 dark:text-foreground',
      impactSubtext: 'text-gray-600 dark:text-muted-foreground',
      statCard: 'bg-white border-2 border-blue-100 dark:bg-card dark:border-border',
      statValue: 'text-blue-600',
      statLabel: 'text-gray-700 dark:text-muted-foreground',
    },
    healthcare: {
      name: 'Soft Healthcare',
      heroBg: 'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-background dark:via-muted dark:to-background',
      heroText: 'text-slate-900 dark:text-foreground',
      heroSubtext: 'text-slate-600 dark:text-muted-foreground',
      headerText: 'text-slate-900 dark:text-foreground',
      headerNav: 'text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground',
      headerButton: 'bg-blue-600 text-white hover:bg-blue-700',
      impactBg: 'bg-gradient-to-br from-green-50 via-blue-50 to-green-50 dark:from-background dark:via-muted dark:to-background',
      impactText: 'text-slate-900 dark:text-foreground',
      impactSubtext: 'text-slate-600 dark:text-muted-foreground',
      statCard: 'bg-white/80 backdrop-blur border border-slate-200 dark:bg-card/80 dark:border-border',
      statValue: 'text-green-600',
      statLabel: 'text-slate-700 dark:text-muted-foreground',
    },
    warm: {
      name: 'Warm Neutral',
      heroBg: 'bg-gradient-to-br from-stone-50 via-orange-50 to-stone-50 dark:from-background dark:via-muted dark:to-background',
      heroText: 'text-gray-900 dark:text-foreground',
      heroSubtext: 'text-gray-600 dark:text-muted-foreground',
      headerText: 'text-gray-900 dark:text-foreground',
      headerNav: 'text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground',
      headerButton: 'bg-orange-600 text-white hover:bg-orange-700',
      impactBg: 'bg-gradient-to-br from-orange-50 via-violet-50 to-orange-50 dark:from-background dark:via-muted dark:to-background',
      impactText: 'text-gray-900 dark:text-foreground',
      impactSubtext: 'text-gray-600 dark:text-muted-foreground',
      statCard: 'bg-white border border-orange-100 dark:bg-card dark:border-border',
      statValue: 'text-orange-600',
      statLabel: 'text-gray-700 dark:text-muted-foreground',
    },
  };

  const currentTheme = themes[theme];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header - Light & Clean */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-7 h-7 text-white" fill="white" />
            </div>
            <span className={currentTheme.headerText}>HAEMOLINK</span>
          </div>
          
          <nav className="flex items-center gap-8">
            <a href="#about" className={`${currentTheme.headerNav} transition`}>About</a>
            <a href="#how-it-works" className={`${currentTheme.headerNav} transition`}>How It Works</a>
            <a href="#roles" className={`${currentTheme.headerNav} transition`}>Roles</a>
            <a href="#impact" className={`${currentTheme.headerNav} transition`}>Impact</a>
            <a href="#contact" className={`${currentTheme.headerNav} transition`}>Contact</a>
          </nav>

          <button
            onClick={onGetStarted}
            className={`px-8 py-3 rounded-xl transition shadow-lg ${currentTheme.headerButton}`}
          >
            Let's Start
          </button>
          <button
            onClick={onGoToAdmin}
            className="px-6 py-3 rounded-xl transition shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
          >
            Admin Portal
          </button>
        </div>
      </header>

      {/* Hero Section - Light, Clean, Calm */}
      <section className={`relative min-h-[90vh] flex items-center justify-center ${currentTheme.heroBg}`}>
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-blue-200 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-violet-200 rounded-full blur-3xl"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-12 py-32 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className={`${currentTheme.heroText} mb-6`} style={{ fontSize: '4rem', lineHeight: '1.1' }}>
              When Every Drop Matters,<br />We Deliver Hope.
            </h1>
            <p className={`${currentTheme.heroSubtext} mb-12 max-w-3xl mx-auto`} style={{ fontSize: '1.25rem' }}>
              A real-time digital ecosystem connecting patients, donors, hospitals, and delivery agents saving lives faster.
            </p>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={onGetStarted}
                className="px-10 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition shadow-xl flex items-center gap-3"
              >
                Let's Start
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-10 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition border-2 border-gray-200 flex items-center gap-3 shadow-lg">
                <Play className="w-5 h-5" />
                Watch How It Works
              </button>
            </div>
          </div>

          {/* Floating Stats - Clean Cards */}
          <div className="grid grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto">
            {[
              { value: impactStats.livesSaved.toLocaleString(), label: 'Lives Saved', icon: Heart, color: 'red' },
              { value: impactStats.activeDonors.toLocaleString(), label: 'Active Donors', icon: Users, color: 'green' },
              { value: impactStats.hospitals.toLocaleString(), label: 'Hospitals', icon: Building2, color: 'violet' },
              { value: `${impactStats.successRatePct.toFixed(1)}%`, label: 'Success Rate', icon: TrendingUp, color: 'blue' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`${currentTheme.statCard} rounded-2xl p-6 shadow-lg hover:shadow-xl transition`}>
                  <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                  <div className={`${currentTheme.statValue} mb-1`} style={{ fontSize: '2rem' }}>{stat.value}</div>
                  <p className={currentTheme.statLabel}>{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works - High Fidelity */}
      <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="text-center mb-16">
            <h2 className="text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontSize: '1.125rem' }}>
              Our intelligent system connects every stakeholder in real-time for seamless blood delivery
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-8 relative">
            {/* Connecting Arrows */}
            <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-blue-200 -translate-y-1/2 hidden lg:block"></div>

            {[
              { 
                icon: Activity, 
                title: 'Patient raises request',
                desc: 'Emergency or scheduled blood request with specific requirements',
                color: 'blue',
                gradient: 'from-blue-500 to-blue-600'
              },
              { 
                icon: Search, 
                title: 'AI finds nearest blood',
                desc: 'Smart matching based on location, freshness, and availability',
                color: 'violet',
                gradient: 'from-violet-500 to-violet-600'
              },
              { 
                icon: Building2, 
                title: 'Hospital prepares',
                desc: 'Quality checks and cold-chain packaging for safe transport',
                color: 'green',
                gradient: 'from-green-500 to-green-600'
              },
              { 
                icon: Truck, 
                title: 'Safe delivery',
                desc: 'Real-time tracking and temperature monitoring',
                color: 'orange',
                gradient: 'from-orange-500 to-orange-600'
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative">
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2">
                    <div className={`w-16 h-16 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg relative z-10`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-gray-900 mb-3">{step.title}</div>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roles Section - Premium Cards */}
      <section id="roles" className="py-24 bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="text-center mb-16">
            <h2 className="text-gray-900 mb-4">Choose Your Role</h2>
            <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontSize: '1.125rem' }}>
              Join our ecosystem and make a difference in healthcare delivery
            </p>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {[
              {
                role: 'Patient',
                icon: Heart,
                desc: 'Request blood, track delivery, manage transfusions',
                color: 'blue',
                gradient: 'from-blue-500 to-blue-600'
              },
              {
                role: 'Donor',
                icon: Users,
                desc: 'Save lives, earn rewards, track your impact',
                color: 'green',
                gradient: 'from-green-500 to-green-600'
              },
              {
                role: 'Delivery Agent',
                icon: Truck,
                desc: 'Ensure safe delivery with cold-chain monitoring',
                color: 'orange',
                gradient: 'from-orange-500 to-orange-600'
              },
              {
                role: 'Hospital',
                icon: Building2,
                desc: 'Manage inventory, fulfill requests efficiently',
                color: 'violet',
                gradient: 'from-violet-500 to-violet-600'
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.role}
                  className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 cursor-pointer hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-gray-900 mb-3">{item.role}</h3>
                  <p className="text-gray-600 mb-6">{item.desc}</p>
                  <button 
                    onClick={onGetStarted}
                    className={`w-full py-3 bg-gradient-to-r ${item.gradient} text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2`}
                  >
                    Explore
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact Section - Light Background */}
      <section id="impact" className={`py-24 relative overflow-hidden ${currentTheme.impactBg}`}>
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-300 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-[1440px] mx-auto px-12 relative z-10">
          <div className="text-center mb-16">
            <h2 className={`${currentTheme.impactText} mb-4`}>Our Impact</h2>
            <p className={`${currentTheme.impactSubtext} max-w-2xl mx-auto`} style={{ fontSize: '1.125rem' }}>
              Real numbers, real lives saved every single day
            </p>
          </div>

          <div className="grid grid-cols-4 gap-8">
            {[
              { value: impactStats.livesSaved.toLocaleString(), label: 'Lives Saved' },
              { value: impactStats.activeDonors.toLocaleString(), label: 'Active Donors' },
              { value: impactStats.hospitals.toLocaleString(), label: 'Hospitals Connected' },
              { value: `${impactStats.successRatePct.toFixed(1)}%`, label: 'Emergency Success Rate' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg text-center hover:shadow-xl transition">
                <div className={`${currentTheme.statValue} mb-2`} style={{ fontSize: '3rem' }}>{stat.value}</div>
                <p className="text-gray-900 mb-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Compliance */}
      <section className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {[
              { icon: Award, label: 'NABH Accredited' },
              { icon: Shield, label: 'Blood Safety Standards' },
              { icon: Zap, label: 'Cold Chain Verified' },
              { icon: Lock, label: 'Data Privacy Compliant' },
            ].map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-xl shadow-sm border border-gray-200">
                  <Icon className="w-6 h-6 text-blue-600" />
                  <span className="text-gray-700">{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Theme Switcher - Demo Element */}
      <section className="py-8 bg-gray-100 border-t border-gray-200">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="flex items-center justify-center gap-6">
            <span className="text-gray-600">Visual Theme:</span>
            {(['clean', 'healthcare', 'warm'] as ThemeMode[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-6 py-2 rounded-lg transition ${
                  theme === t
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {themes[t].name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Light */}
      <footer className="bg-gray-50 text-gray-900 py-12 border-t border-gray-200">
        <div className="max-w-[1440px] mx-auto px-12">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" fill="white" />
                </div>
                <span className="text-gray-900">HAEMOLINK</span>
              </div>
              <p className="text-gray-600">
                Saving lives through technology and compassion.
              </p>
            </div>
            
            <div>
              <div className="text-gray-900 mb-4">Quick Links</div>
              <div className="space-y-2">
                <a href="#about" className="block text-gray-600 hover:text-gray-900 transition">About Us</a>
                <a href="#how-it-works" className="block text-gray-600 hover:text-gray-900 transition">How It Works</a>
                <a href="#roles" className="block text-gray-600 hover:text-gray-900 transition">Roles</a>
              </div>
            </div>

            <div>
              <div className="text-gray-900 mb-4">Legal</div>
              <div className="space-y-2">
                <a href="#privacy" className="block text-gray-600 hover:text-gray-900 transition">Privacy Policy</a>
                <a href="#terms" className="block text-gray-600 hover:text-gray-900 transition">Terms of Service</a>
                <a href="#compliance" className="block text-gray-600 hover:text-gray-900 transition">Compliance</a>
              </div>
            </div>

            <div>
              <div className="text-gray-900 mb-4">Contact</div>
              <div className="space-y-2 text-gray-600">
                <p>team Kryptos</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex items-center justify-between">
            <p className="text-gray-600">© 2026 HAEMOLINK. TEAM KRYPTOS.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-600 hover:text-gray-900 transition">Twitter</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition">LinkedIn</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition">Facebook</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
