export function LoginScreen(): JSX.Element {
  return (
    <main className="flex min-h-screen w-full bg-background text-on-surface font-body-md selection:bg-primary-container selection:text-white">
      {/* Left Panel: Brand & Marketing (45%) */}
      <section className="relative hidden lg:flex lg:w-[45%] flex-col justify-between p-xl overflow-hidden bg-gradient-to-br from-[#0D9488] to-[#042F2E]">
        {/* Decorative Elements */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        ></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-container/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black/20 rounded-full blur-[100px]"></div>
        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <img
              alt="Afya HMS Logo"
              className="h-12 w-12 object-contain filter brightness-0 invert"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbBqa0j5yQ6vvG9-avf4RpGhQOBmcwnYh3ZGAxvRGTNxboTakBaQRDAOtO3KCOLuZhzzH6t4RqQN0_1Zi3A8CytirVObzb7tsYyysjlvKS-dVje6a_4Z9UUlyrN4cCQYjsl6rYBUU6hJUTKhsykiqK63oCySOPdBxicIK4g_ujT6ihsIAkd1zEI2nCYZBmP6TaMybc4AKRaaU9-ip_1bKNPT9W47NzoF0lB0A956FAX-JBrDL4GDTVnVGe9_gtBJochbuc9OVNJC4d"
            />
            <span className="text-white font-headline-md text-headline-md">Afya HMS</span>
          </div>
          {/* Messaging */}
          <div className="mt-auto mb-auto max-w-md">
            <h1 className="text-white font-headline-lg text-[40px] leading-tight mb-lg">
              Hospital Management, <br />
              Simplified.
            </h1>
            <ul className="space-y-md">
              <li className="flex items-center gap-4 text-white/90">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'wght' 300" }}>
                    hub
                  </span>
                </div>
                <span className="font-body-md">Multi-branch Coordination</span>
              </li>
              <li className="flex items-center gap-4 text-white/90">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'wght' 300" }}>
                    insights
                  </span>
                </div>
                <span className="font-body-md">Real-time Clinical Insights</span>
              </li>
              <li className="flex items-center gap-4 text-white/90">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'wght' 300" }}>
                    security
                  </span>
                </div>
                <span className="font-body-md">Secure Patient Records</span>
              </li>
            </ul>
          </div>
          {/* Copyright */}
          <div className="text-white/40 font-body-sm">© 2024 Afya Health Systems. All rights reserved.</div>
        </div>
      </section>
      {/* Right Panel: Login Form (55%) */}
      <section className="flex-1 flex flex-col items-center justify-center bg-[#FAFAF9] p-lg">
        <div className="w-full max-w-[400px]">
          {/* Welcome Section */}
          <div className="mb-xl text-center lg:text-left">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Welcome back</h2>
            <p className="font-body-md text-on-surface-variant">Please enter your details to sign in.</p>
          </div>
          {/* Login Form */}
          <form className="space-y-lg" onSubmit={(e) => e.preventDefault()}>
            {/* Email Field */}
            <div className="space-y-xs group">
              <label className="font-body-sm font-semibold text-on-surface transition-colors group-focus-within:text-primary" htmlFor="email">
                Email address
              </label>
              <input
                className="w-full h-[38px] px-md rounded-lg border border-outline-variant bg-white text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-container/20 transition-all"
                id="email"
                placeholder="dr.johnson@afya.health"
                type="email"
              />
            </div>
            {/* Password Field */}
            <div className="space-y-xs group">
              <div className="flex justify-between items-center">
                <label className="font-body-sm font-semibold text-on-surface transition-colors group-focus-within:text-primary" htmlFor="password">
                  Password
                </label>
                <a className="text-body-sm font-medium text-primary hover:text-primary-container transition-colors" href="#">
                  Forgot password?
                </a>
              </div>
              <input
                className="w-full h-[38px] px-md rounded-lg border border-outline-variant bg-white text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-container/20 transition-all"
                id="password"
                placeholder="••••••••"
                type="password"
              />
            </div>
            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer" id="remember" type="checkbox" />
              <label className="font-body-sm text-on-surface-variant cursor-pointer" htmlFor="remember">
                Remember me for 30 days
              </label>
            </div>
            {/* Submit Button */}
            <button
              className="w-full h-[38px] bg-primary text-white font-body-md font-semibold rounded-xl hover:bg-primary-container active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(0,104,95,0.2)]"
              type="submit"
            >
              Sign In
            </button>
          </form>
          {/* Divider */}
          <div className="relative my-xl">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#FAFAF9] px-sm text-body-sm text-on-surface-variant">Or sign in with</span>
            </div>
          </div>
          {/* Social Sign In */}
          <button className="w-full h-[38px] flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-lg text-on-surface font-body-md hover:bg-surface-container transition-colors active:scale-[0.98]">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              ></path>
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              ></path>
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              ></path>
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              ></path>
            </svg>
            <span>Google</span>
          </button>
          {/* Mobile Footer / Extras */}
          <div className="mt-xl pt-lg border-t border-outline-variant/50 flex flex-col sm:flex-row items-center justify-between gap-md">
            <div className="flex items-center gap-4 text-body-sm text-on-surface-variant">
              <button className="hover:text-primary transition-colors flex items-center gap-1">
                English <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              <button className="hover:text-primary transition-colors">Swahili</button>
            </div>
            <span className="text-body-sm text-outline-variant/70">v2.4.0-stable</span>
          </div>
        </div>
      </section>
    </main>
  );
}
