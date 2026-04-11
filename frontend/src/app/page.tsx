import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Navbar */}
      <nav className="w-full px-8 py-6 flex justify-between items-center glass-dark sticky top-0 z-50 border-b border-white/5">
        <div className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-serif italic font-bold">S</span>
          </div>
          <span>School<span className="text-indigo-400">OS</span></span>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          {/* <Link href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition">Dashboard</Link>
          <Link href="https://github.com" target="_blank" className="text-sm font-medium text-slate-300 hover:text-white transition">Documentation</Link> */}
          <Link href="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition">Contact</Link>
          <Link href="/team" className="text-sm font-medium text-slate-300 hover:text-white transition">Team</Link>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="hidden md:block text-sm font-medium text-white hover:text-indigo-300 transition">
            Log in
          </Link>
          <Link href="/register" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition shadow-lg shadow-indigo-500/30 text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center text-center px-4 py-24 relative">
        {/* Background Elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>

        <div className="z-10 max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span>Now with Multi-Tenancy v2.0</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.1]">
            The Operating System for <br />
            <span className="premium-text">Modern Education.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            A unified, secure, and scalable platform that connects administrators, teachers, parents, and students.
            Powering huge institutions with data-driven insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center pt-8">
            <Link href="/register" className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-indigo-50 transition transform hover:-translate-y-1 hover:shadow-2xl shadow-white/10">
              Start Free Trial
            </Link>
            <Link href="/contact" className="px-8 py-4 glass-dark text-white rounded-full font-bold text-lg hover:bg-slate-800 transition transform hover:-translate-y-1 hover:shadow-xl border border-white/10">
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Dashboard Preview / Bento Grid */}
      <section className="px-4 py-20 bg-slate-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-dark p-8 rounded-3xl border border-white/5 col-span-1 md:col-span-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 bg-gradient-to-br from-indigo-500/10 to-transparent w-full h-full"></div>
              <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Centralized Administration</h3>
              <p className="text-slate-400 mb-8 max-w-md relative z-10">Manage multiple campuses and schools from a single super-admin panel with role-based access control.</p>
              <div className="bg-slate-900/80 rounded-t-xl border border-white/10 h-48 w-full relative -bottom-8 shadow-2xl p-4">
                {/* Mock UI */}
                <div className="flex gap-4 mb-4">
                  <div className="h-2 w-20 bg-slate-700/50 rounded"></div>
                  <div className="h-2 w-10 bg-slate-700/50 rounded"></div>
                </div>
                <div className="h-24 bg-indigo-500/10 rounded-lg w-full border border-indigo-500/20"></div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="glass-dark p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition">
              <h3 className="text-2xl font-bold text-white mb-2">Flutter Mobile App</h3>
              <p className="text-slate-400 mb-6">Native iOS and Android apps for on-the-go access.</p>
              <div className="flex justify-center">
                <div className="w-32 h-48 bg-slate-900 border-4 border-slate-700 rounded-2xl relative shadow-xl">
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-700 rounded-full"></div>
                  <div className="mt-4 mx-2 h-8 bg-indigo-600/20 rounded"></div>
                  <div className="mt-2 mx-2 h-20 bg-slate-800 rounded"></div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="glass-dark p-8 rounded-3xl border border-white/5 col-span-1 md:col-span-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Secure & Scalable</h3>
                  <p className="text-slate-400 max-w-xl">Built on MongoDB with tenant-level isolation. Your data is encrypted and backed up automatically.</p>
                </div>
                <div className="flex gap-3">
                  <span className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-mono border border-indigo-500/20">JWT Auth</span>
                  <span className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm font-mono border border-green-500/20">99.9% Uptime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
