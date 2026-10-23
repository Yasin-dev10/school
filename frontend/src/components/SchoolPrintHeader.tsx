type SchoolPrintHeaderProps = {
    name?: string | null;
    logoUrl?: string | null;
    subtitle?: string;
};

export default function SchoolPrintHeader({ name, logoUrl, subtitle }: SchoolPrintHeaderProps) {
    return (
        <div className="print-only mb-6 hidden items-center justify-center gap-4 border-b-2 border-slate-900 pb-4 text-center text-slate-900">
            {logoUrl ? (
                <img src={logoUrl} alt="Astaanta dugsiga" className="h-20 w-20 shrink-0 object-contain" />
            ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-3xl font-black">
                    {(name || 'S').charAt(0)}
                </div>
            )}
            <div>
                <h1 className="text-2xl font-black uppercase tracking-wide">{name || 'Dugsiga'}</h1>
                {subtitle && <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-600">{subtitle}</p>}
            </div>
        </div>
    );
}
