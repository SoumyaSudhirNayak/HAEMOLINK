import { Heart, Users, Truck, Building2, ArrowLeft } from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelect: (role: 'patient' | 'donor' | 'rider' | 'hospital') => void;
  onBackToHome: () => void;
}

export function RoleSelection({ onRoleSelect, onBackToHome }: RoleSelectionProps) {
  const roles = [
    {
      id: 'patient' as const,
      title: 'Patient',
      description: 'Request blood, track delivery, manage transfusions',
      icon: Heart,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'donor' as const,
      title: 'Donor',
      description: 'Save lives, earn rewards, track your impact',
      icon: Users,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 'rider' as const,
      title: 'Delivery Agent',
      description: 'Ensure safe delivery with cold-chain monitoring',
      icon: Truck,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      id: 'hospital' as const,
      title: 'Hospital / Blood Bank',
      description: 'Manage inventory, fulfill requests efficiently',
      icon: Building2,
      gradient: 'from-violet-500 to-violet-600',
      bgGradient: 'from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/30',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background text-foreground">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Home</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <span className="text-xl text-foreground">HAEMOLINK</span>
            </div>
            <div className="w-24 sm:w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-4">
            Continue as
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your role to access your personalized dashboard
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => onRoleSelect(role.id)}
                className="group relative bg-card rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-border hover:border-transparent hover:-translate-y-2 text-left"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${role.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`w-14 h-14 md:w-16 md:h-16 ${role.iconBg} rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 md:w-8 md:h-8 ${role.iconColor}`} />
                  </div>
                  <h3 className="text-lg md:text-xl text-foreground mb-2 md:mb-3">{role.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">{role.description}</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${role.gradient} text-white rounded-lg text-sm md:text-base opacity-0 group-hover:opacity-100 transition-opacity`}>
                    Continue
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tagline */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground italic">
            "Connecting Blood, Saving Lives"
          </p>
        </div>
      </div>
    </div>
  );
}
