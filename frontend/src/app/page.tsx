import Link from "next/link";
import {
  BarChart3,
  BellRing,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const platformStats = [
  { value: "4", label: "Role portals" },
  { value: "20+", label: "School modules" },
  { value: "24/7", label: "Cloud access" },
  { value: "100%", label: "Tenant isolation" },
];

const coreModules = [
  {
    title: "Student Management",
    description: "Admissions, profiles, guardians, documents, promotion, and class placement in one clean workflow.",
    icon: GraduationCap,
  },
  {
    title: "Attendance Tracking",
    description: "Daily attendance, class-level registers, absence visibility, and parent-ready records.",
    icon: CalendarCheck,
  },
  {
    title: "Exams & Grades",
    description: "Exam setup, grade systems, mark entry, result publishing, complaints, and printable reports.",
    icon: BookOpenCheck,
  },
  {
    title: "Finance & Invoices",
    description: "Fee types, student balances, invoices, payments, salaries, expenses, payroll, and payslips.",
    icon: CreditCard,
  },
  {
    title: "Assignments & Materials",
    description: "Teacher uploads, class resources, assignment permissions, submissions, and student learning files.",
    icon: ClipboardList,
  },
  {
    title: "Communication Hub",
    description: "Notifications, contact messages, announcements, and real-time updates for school communities.",
    icon: MessageSquareText,
  },
];

const rolePortals = [
  "Super admins manage schools, tenants, subscriptions, logs, and platform settings.",
  "School admins run daily operations across students, teachers, classes, finance, and reports.",
  "Teachers handle attendance, marks, assignments, subjects, materials, and timetable work.",
  "Parents and students follow results, payments, attendance, certificates, and announcements.",
];

const workflowSteps = [
  {
    title: "Register the school",
    text: "Create the tenant, configure settings, and give each institution its own secure workspace.",
  },
  {
    title: "Build the academic structure",
    text: "Set classes, subjects, teachers, timetable, grade rules, exam sessions, and fee types.",
  },
  {
    title: "Run daily operations",
    text: "Track attendance, collect payments, publish marks, send notices, and monitor activity.",
  },
  {
    title: "Report with confidence",
    text: "Generate certificates, finance summaries, exam reports, payroll views, and audit-ready logs.",
  },
];

const securityItems = [
  "JWT authentication",
  "Role-based permissions",
  "Tenant-level separation",
  "Audit logs",
  "Secure file uploads",
  "Stripe-ready payments",
];

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(14,165,233,0.16),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_46%,#020617_100%)]" />

      <nav className="w-full px-5 sm:px-8 py-5 flex justify-between items-center glass-dark sticky top-0 z-50 border-b border-white/10">
        <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="text-white font-serif italic font-bold">S</span>
          </div>
          <span>
            School<span className="text-indigo-400">OS</span>
          </span>
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          <a href="#modules" className="text-sm font-medium text-slate-300 hover:text-white transition">
            Modules
          </a>
          <a href="#workflow" className="text-sm font-medium text-slate-300 hover:text-white transition">
            Workflow
          </a>
          <a href="#security" className="text-sm font-medium text-slate-300 hover:text-white transition">
            Security
          </a>
          <Link href="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition">
            Contact
          </Link>
        </div>

        <div className="flex gap-3 sm:gap-4 items-center">
          <Link href="/login" className="hidden sm:block text-sm font-medium text-white hover:text-indigo-300 transition">
            Log in
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition shadow-lg shadow-indigo-500/30 text-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="px-5 py-20 sm:py-24 lg:py-28 relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.02fr_0.98fr] gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-tenant school management platform</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05]">
                A complete system for running a modern school.
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                SchoolOS connects admissions, attendance, exams, finance, payroll, certificates, communication, and reports
                inside one secure dashboard for every role in the institution.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-base sm:text-lg hover:bg-indigo-50 transition transform hover:-translate-y-1 hover:shadow-2xl shadow-white/10 text-center"
              >
                Start Your School
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-slate-900/80 text-white rounded-full font-bold text-base sm:text-lg hover:bg-slate-800 transition transform hover:-translate-y-1 hover:shadow-xl border border-white/10 text-center"
              >
                Book a Demo
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {platformStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-indigo-500/20 blur-3xl" />
            <div className="relative rounded-[1.5rem] border border-white/10 bg-slate-900/80 shadow-2xl shadow-indigo-950/60 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Today Overview</p>
                  <h2 className="text-lg font-bold">SchoolOS Control Center</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Live
                </div>
              </div>

              <div className="grid sm:grid-cols-[0.82fr_1.18fr] min-h-[460px]">
                <aside className="border-b sm:border-b-0 sm:border-r border-white/10 p-4 bg-slate-950/50">
                  {["Dashboard", "Students", "Attendance", "Finance", "Exams", "Reports"].map((item, index) => (
                    <div
                      key={item}
                      className={`mb-2 rounded-xl px-3 py-3 text-sm ${
                        index === 0 ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </aside>

                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                      <p className="text-xs text-slate-400">Students</p>
                      <p className="text-3xl font-black mt-2">1,248</p>
                      <p className="text-xs text-emerald-300 mt-2">+42 this term</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                      <p className="text-xs text-slate-400">Attendance</p>
                      <p className="text-3xl font-black mt-2">96%</p>
                      <p className="text-xs text-sky-300 mt-2">Morning register</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-semibold">Fee collection</p>
                      <span className="text-xs text-indigo-200">This month</span>
                    </div>
                    <div className="space-y-3">
                      {[78, 64, 91].map((width, index) => (
                        <div key={width} className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>{["Tuition", "Transport", "Exam fees"][index]}</span>
                            <span>{width}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-400" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                    <p className="font-semibold mb-3">Recent activity</p>
                    <div className="space-y-3">
                      {["Grade 8 marks published", "12 invoices paid", "New timetable uploaded"].map((item) => (
                        <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                          <span className="h-2 w-2 rounded-full bg-indigo-300" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="px-5 py-20 bg-slate-950/70 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 text-indigo-300 text-sm font-semibold mb-4">
              <Sparkles className="h-4 w-4" />
              Everything the school needs
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">One platform, many connected modules.</h2>
            <p className="text-slate-400 mt-4 text-lg">
              Instead of spreading data across paper files, chat apps, spreadsheets, and separate tools, SchoolOS keeps the
              whole institution working from the same source of truth.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {coreModules.map((module) => {
              const Icon = module.icon;

              return (
                <div
                  key={module.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-indigo-400/40 hover:bg-white/[0.07] transition"
                >
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center mb-5">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{module.title}</h3>
                  <p className="text-slate-400 mt-3 leading-relaxed">{module.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[0.92fr_1.08fr] gap-10 items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-indigo-300 font-semibold mb-3">Built around real school roles</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Every user gets the tools they actually need.</h2>
            <p className="text-slate-400 mt-5 text-lg leading-relaxed">
              Permissions keep the platform simple and controlled. Staff, teachers, parents, and students see focused
              dashboards instead of one overloaded screen.
            </p>
          </div>

          <div className="grid gap-4">
            {rolePortals.map((portal, index) => (
              <div key={portal} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-500/15 text-indigo-200 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <p className="text-slate-300 leading-relaxed">{portal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-5 py-20 bg-slate-900/50 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
            <div>
              <p className="text-indigo-300 font-semibold mb-3">From setup to reports</p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">A daily operating flow that stays organized.</h2>
              <p className="text-slate-400 mt-5 text-lg leading-relaxed">
                SchoolOS is designed to follow how schools already work: enroll students, organize classes, run lessons,
                manage money, publish results, and keep leadership informed.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-5 top-6 bottom-6 w-px bg-indigo-400/30 hidden sm:block" />
              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-5 sm:pl-16">
                    <div className="sm:absolute sm:left-0 sm:top-5 sm:-translate-x-1/2 h-10 w-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black mb-4 sm:mb-0">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="text-slate-400 mt-2 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="px-5 py-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-indigo-500/10 p-7">
            <ShieldCheck className="h-12 w-12 text-indigo-200 mb-6" />
            <h2 className="text-3xl font-black tracking-tight">Secure by design.</h2>
            <p className="text-indigo-100/80 mt-4 leading-relaxed">
              Multi-tenant data separation, permission checks, protected routes, and activity logs help schools stay in
              control as they grow.
            </p>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {securityItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-slate-950/70 border border-white/10 px-4 py-4">
                  <LockKeyhole className="h-5 w-5 text-emerald-300" />
                  <span className="text-sm font-semibold text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              <div className="rounded-xl bg-slate-950/70 border border-white/10 p-5">
                <Building2 className="h-6 w-6 text-indigo-300 mb-3" />
                <h3 className="font-bold">Multi-school ready</h3>
                <p className="text-sm text-slate-400 mt-2">Run multiple institutions without mixing their users or data.</p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-white/10 p-5">
                <BarChart3 className="h-6 w-6 text-indigo-300 mb-3" />
                <h3 className="font-bold">Analytics focused</h3>
                <p className="text-sm text-slate-400 mt-2">Track attendance, finance, exams, and school performance quickly.</p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-white/10 p-5">
                <BellRing className="h-6 w-6 text-indigo-300 mb-3" />
                <h3 className="font-bold">Real-time updates</h3>
                <p className="text-sm text-slate-400 mt-2">Keep staff and families informed through notifications and messages.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24">
        <div className="max-w-7xl mx-auto rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-8 sm:p-10 lg:p-12 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-indigo-500/20 to-transparent" />
          <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <p className="text-indigo-200 font-semibold mb-3">Ready for daily school operations</p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Bring the whole institution into one system.</h2>
              <p className="text-slate-300 mt-4 max-w-2xl">
                Start with the core modules, then expand into finance, payroll, certificates, inventory, logs, and advanced
                reporting as your school grows.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="px-7 py-4 bg-white text-slate-950 rounded-full font-bold text-center">
                Get Started
              </Link>
              <Link href="/contact" className="px-7 py-4 bg-slate-950/70 text-white rounded-full font-bold border border-white/10 text-center">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-5 py-8 border-t border-white/10 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-4">
          <span>SchoolOS - Modern Multi-Tenant School Management</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-white transition">
              Login
            </Link>
            <Link href="/contact" className="hover:text-white transition">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
