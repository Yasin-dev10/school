import Link from 'next/link';

export default function TeamPage() {
    const teamMembers = [
        {
            name: "Yasin Mohamud Abdullahi",
            id: "C1220926",
            role: "Team Leader & Project Lead",
            isLeader: true,
            expertise: ["Full-Stack Development", "System Architecture", "Project Management"],
            gradient: "from-indigo-500 to-purple-600"
        },
        {
            name: "Abdibasid Mohamed Ahmed",
            id: "C1221173",
            role: "Backend Developer",
            expertise: ["Node.js", "MongoDB", ""],
            gradient: "from-blue-500 to-cyan-600"
        },
        {
            name: "Falastin Mohamud Adow",
            id: "C1220745",
            role: "Frontend Developer",
            expertise: ["React", "Next.js", "UI/UX Design"],
            gradient: "from-pink-500 to-rose-600"
        },
        {
            name: "Yasmin Osman Mohamud",
            id: "C1220724",
            role: "Mobile Developer",
            expertise: ["React", "Next.js", "Node.js"],
            gradient: "from-emerald-500 to-teal-600"
        },
        {
            name: "Samiira Faysal Ahmed",
            id: "C1220738",
            role: "Database Specialist",
            expertise: ["React", "Next.js", "Node.js"],
            gradient: "from-amber-500 to-orange-600"
        },
        {
            name: "Aamino Osmaan Mohamed",
            id: "C1220731",
            role: "QA Engineer",
            expertise: ["React", "Next.js", "Node.js"],
            gradient: "from-violet-500 to-purple-600"
        },
        {
            name: "Manal Jabril Hussein",
            id: "C1220722",
            role: "UI/UX Designer",
            expertise: ["React", "Next.js", "Node.js"],
            gradient: "from-fuchsia-500 to-pink-600"
        },
        {
            name: "Maryan Liban Abuker",
            id: "C1220782",
            role: "DevOps Engineer",
            expertise: ["React", "Next.js", "Node.js"],
            gradient: "from-cyan-500 to-blue-600"
        }
    ];

    return (
        <main className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Navbar */}
            <nav className="w-full px-8 py-6 flex justify-between items-center glass-dark sticky top-0 z-50 border-b border-white/5">
                <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-serif italic font-bold">S</span>
                    </div>
                    <span>School<span className="text-indigo-400">OS</span></span>
                </Link>
                <div className="hidden md:flex gap-8 items-center">
                    <Link href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition">Dashboard</Link>
                    <Link href="https://web-mobile-5fu8.vercel.app/login" target="_blank" className="text-sm font-medium text-slate-300 hover:text-white transition">Documentation</Link>
                    <Link href="/contact" className="text-sm font-medium text-slate-300 hover:text-white transition">Contact</Link>
                    <Link href="/team" className="text-sm font-medium text-white">Team</Link>
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

            {/* Team Section */}
            <section className="flex-1 flex flex-col justify-center items-center text-center px-4 py-24 relative">
                {/* Background Elements */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none"></div>

                <div className="z-10 max-w-7xl w-full space-y-16">
                    {/* Header */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                            <span>Meet Our Team</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
                            The Minds Behind <br />
                            <span className="premium-text">SchoolOS</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-light">
                            A passionate team of developers and designers dedicated to revolutionizing educational management systems.
                        </p>
                    </div>

                    {/* Team Leader Spotlight */}
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                        <div className="glass-dark p-8 md:p-12 rounded-3xl border border-white/5 max-w-4xl mx-auto relative overflow-hidden group">
                            {/* Animated gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                                                <span className="text-5xl font-bold text-white">
                                                    {teamMembers[0].name.split(' ').map(n => n[0]).join('')}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Leader badge */}
                                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                            <span>👑 Leader</span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-3xl font-bold text-white mb-2">{teamMembers[0].name}</h2>
                                        <p className="text-indigo-400 font-semibold mb-1">{teamMembers[0].id}</p>
                                        <p className="text-lg text-slate-300 mb-4">{teamMembers[0].role}</p>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                            {teamMembers[0].expertise.map((skill, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-sm font-medium border border-indigo-500/20"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Members Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        {teamMembers.slice(1).map((member, index) => (
                            <div
                                key={index}
                                className="glass-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                                style={{ animationDelay: `${(index + 3) * 100}ms` }}
                            >
                                {/* Gradient overlay on hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                                <div className="relative z-10">
                                    {/* Avatar */}
                                    <div className="mb-4">
                                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.gradient} p-1 mx-auto`}>
                                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                                                <span className="text-2xl font-bold text-white">
                                                    {member.name.split(' ').map(n => n[0]).join('')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                                        <p className="text-indigo-400 text-sm font-semibold mb-2">{member.id}</p>
                                        <p className="text-slate-300 text-sm mb-4">{member.role}</p>

                                        {/* Expertise tags */}
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {member.expertise.map((skill, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 rounded-md bg-slate-800/50 text-slate-300 text-xs font-medium border border-white/5"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Decorative corner */}
                                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${member.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}></div>
                            </div>
                        ))}
                    </div>

                    {/* Call to Action */}
                    <div className="pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                        <div className="glass-dark p-8 rounded-3xl border border-white/5 max-w-3xl mx-auto">
                            <h3 className="text-2xl font-bold text-white mb-3">Want to Join Our Mission?</h3>
                            <p className="text-slate-400 mb-6">
                                We're always looking for talented individuals passionate about education technology.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    href="/contact"
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition transform hover:-translate-y-1 hover:shadow-2xl shadow-indigo-500/30"
                                >
                                    Get in Touch
                                </Link>
                                <Link
                                    href="https://web-mobile-5fu8.vercel.app/login"
                                    target="_blank"
                                    className="px-8 py-4 glass-dark text-white rounded-full font-bold text-lg hover:bg-slate-800 transition transform hover:-translate-y-1 hover:shadow-xl border border-white/10"
                                >
                                    View on GitHub
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
