"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, GitBranch, Plus, Search, Settings2, Trash2, UsersRound, Workflow as WorkflowIcon, X } from 'lucide-react';
import api from '../../utils/api';

type Branch = { id: string; name: string; code: string; address?: string; phone?: string; email?: string; managerName?: string; isMain: boolean; isActive: boolean; _count?: { users: number; classes: number } };
type Field = { id: string; entityType: string; label: string; fieldKey: string; fieldType: string; placeholder?: string; options?: string[]; isRequired: boolean; isActive: boolean };
type Step = { id: string; name: string; assigneeRole: string; action: string };
type Flow = { id: string; name: string; description?: string; entityType: string; trigger: string; steps: Step[]; isActive: boolean };
type BranchUser = { id: string; firstName: string; lastName: string; username?: string; email?: string; role: string; status: string; branchId?: string | null };
type BranchClass = { id: string; name: string; section: string; grade: string; status: string; branchId?: string | null };

const entities = ['student', 'teacher', 'class', 'invoice', 'expense', 'inventory', 'assignment'];
const roles = ['school-admin', 'teacher', 'accountant', 'receptionist', 'librarian'];
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800';
const emptyBranch = { name: '', code: '', address: '', phone: '', email: '', managerName: '', isMain: false, isActive: true };
const emptyField = { entityType: 'student', label: '', fieldKey: '', fieldType: 'text', placeholder: '', options: '', isRequired: false, isActive: true };
const newStep = (index = 0): Step => ({ id: `step-${Date.now()}-${index}`, name: '', assigneeRole: 'school-admin', action: 'approve' });
const emptyFlow = () => ({ name: '', description: '', entityType: 'student', trigger: 'manual', steps: [newStep()], isActive: true });

export default function CustomizationPage() {
    const [tab, setTab] = useState<'branches' | 'fields' | 'workflows'>('branches');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [flows, setFlows] = useState<Flow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [branchForm, setBranchForm] = useState(emptyBranch);
    const [fieldForm, setFieldForm] = useState(emptyField);
    const [flowForm, setFlowForm] = useState(emptyFlow());
    const [manageBranch, setManageBranch] = useState<Branch | null>(null);
    const [resources, setResources] = useState<{users: BranchUser[]; classes: BranchClass[]}>({ users: [], classes: [] });
    const [resourceTab, setResourceTab] = useState<'users' | 'classes'>('users');
    const [resourceSearch, setResourceSearch] = useState('');
    const [resourceLoading, setResourceLoading] = useState(false);
    const [assigningId, setAssigningId] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [branchRes, fieldRes, flowRes] = await Promise.all([
                api.get('/customization/branches'), api.get('/customization/custom-fields'), api.get('/customization/workflows')
            ]);
            setBranches(branchRes.data.data || []); setFields(fieldRes.data.data || []); setFlows(flowRes.data.data || []);
        } catch (error: any) { toast.error(error.response?.data?.message || 'Could not load customization settings'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditing(null);
        if (tab === 'branches') setBranchForm(emptyBranch);
        if (tab === 'fields') setFieldForm(emptyField);
        if (tab === 'workflows') setFlowForm(emptyFlow());
        setModal(true);
    };
    const openEdit = (item: any) => {
        setEditing(item);
        if (tab === 'branches') setBranchForm({ ...emptyBranch, ...item });
        if (tab === 'fields') setFieldForm({ ...emptyField, ...item, options: (item.options || []).join(', ') });
        if (tab === 'workflows') setFlowForm({ ...emptyFlow(), ...item, steps: item.steps || [newStep()] });
        setModal(true);
    };

    const save = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true);
        try {
            if (tab === 'branches') {
                const url = editing ? `/customization/branches/${editing.id}` : '/customization/branches';
                await (editing ? api.put(url, branchForm) : api.post(url, branchForm));
            } else if (tab === 'fields') {
                const payload = { ...fieldForm, options: fieldForm.options.split(',').map(v => v.trim()).filter(Boolean) };
                const url = editing ? `/customization/custom-fields/${editing.id}` : '/customization/custom-fields';
                await (editing ? api.put(url, payload) : api.post(url, payload));
            } else {
                const url = editing ? `/customization/workflows/${editing.id}` : '/customization/workflows';
                await (editing ? api.put(url, flowForm) : api.post(url, flowForm));
            }
            toast.success(editing ? 'Changes saved' : 'Created successfully'); setModal(false); await load();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Could not save'); }
        finally { setSaving(false); }
    };

    const remove = async (item: any) => {
        if (!confirm(`Delete “${item.name || item.label}”?`)) return;
        const segment = tab === 'branches' ? 'branches' : tab === 'fields' ? 'custom-fields' : 'workflows';
        try { await api.delete(`/customization/${segment}/${item.id}`); toast.success('Deleted'); await load(); }
        catch (error: any) { toast.error(error.response?.data?.message || 'Could not delete'); }
    };

    const openManage = async (branch: Branch) => {
        setManageBranch(branch); setResourceSearch(''); setResourceTab('users'); setResourceLoading(true);
        try {
            const response = await api.get('/customization/branches/resources');
            setResources(response.data.data || { users: [], classes: [] });
        } catch (error: any) { toast.error(error.response?.data?.message || 'Could not load users and classes'); setManageBranch(null); }
        finally { setResourceLoading(false); }
    };

    const setAssignment = async (resourceType: 'user' | 'class', resourceId: string, assigned: boolean) => {
        if (!manageBranch) return;
        setAssigningId(resourceId);
        try {
            await api.patch('/customization/branches/assign/resource', { resourceType, resourceId, branchId: assigned ? manageBranch.id : null });
            const key = resourceType === 'user' ? 'users' : 'classes';
            setResources(previous => ({ ...previous, [key]: previous[key].map((item: any) => item.id === resourceId ? { ...item, branchId: assigned ? manageBranch.id : null } : item) }));
            setBranches(previous => previous.map(branch => branch.id === manageBranch.id ? { ...branch, _count: { ...branch._count!, [key]: Math.max(0, (branch._count?.[key] || 0) + (assigned ? 1 : -1)) } } : branch));
            toast.success(assigned ? 'Assigned to branch' : 'Removed from branch');
        } catch (error: any) { toast.error(error.response?.data?.message || 'Could not update assignment'); }
        finally { setAssigningId(''); }
    };

    const tabs = [
        { id: 'branches', label: 'Branches', icon: GitBranch, count: branches.length },
        { id: 'fields', label: 'Custom Fields', icon: Settings2, count: fields.length },
        { id: 'workflows', label: 'Workflows', icon: WorkflowIcon, count: flows.length },
    ] as const;

    return <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><h1 className="text-3xl font-black text-slate-900 dark:text-white">Branches & Customization</h1><p className="mt-1 text-sm text-slate-500">Manage school locations, flexible data fields, and approval processes.</p></div>
            <button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"><Plus className="h-4 w-4"/> Add {tab === 'branches' ? 'Branch' : tab === 'fields' ? 'Field' : 'Workflow'}</button>
        </div>
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            {tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><item.icon className="h-4 w-4"/>{item.label}<span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{item.count}</span></button>)}
        </div>
        {loading ? <div className="py-20 text-center text-slate-500">Loading settings…</div> : <>
            {tab === 'branches' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{branches.length ? branches.map(item => <article key={item.id} className="surface-card p-5">
                <div className="flex items-start justify-between"><div className="flex gap-3"><div className="rounded-xl bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-500/10"><Building2 className="h-5 w-5"/></div><div><h2 className="font-black">{item.name}</h2><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.code}</p></div></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isMain ? 'Main' : item.isActive ? 'Active' : 'Inactive'}</span></div>
                <div className="mt-5 space-y-2 text-sm text-slate-500"><p>{item.managerName || 'No manager assigned'}</p><p>{item.address || 'No address provided'}</p><p>{item._count?.users || 0} users · {item._count?.classes || 0} classes</p></div>
                <div className="mt-5 flex items-center justify-between border-t pt-4 dark:border-slate-700"><button onClick={() => openManage(item)} className="flex items-center gap-2 text-sm font-bold text-emerald-600"><UsersRound className="h-4 w-4"/> Manage</button><div className="flex gap-4"><button onClick={() => openEdit(item)} className="text-sm font-bold text-indigo-600">Edit</button><button onClick={() => remove(item)} className="text-sm font-bold text-rose-500">Delete</button></div></div>
            </article>) : <Empty text="No branches yet. Add the main campus first."/>}</div>}
            {tab === 'fields' && <div className="surface-card overflow-hidden"><table className="w-full min-w-[700px] text-left"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-4">Field</th><th>Entity</th><th>Type</th><th>Rules</th><th className="pr-4 text-right">Actions</th></tr></thead><tbody className="divide-y dark:divide-slate-700">{fields.map(item => <tr key={item.id}><td className="p-4"><p className="font-bold">{item.label}</p><p className="text-xs text-slate-400">{item.fieldKey}</p></td><td className="capitalize">{item.entityType}</td><td className="capitalize">{item.fieldType}</td><td className="text-sm text-slate-500">{item.isRequired ? 'Required' : 'Optional'} · {item.isActive ? 'Active' : 'Inactive'}</td><td className="pr-4"><Actions edit={() => openEdit(item)} remove={() => remove(item)} compact/></td></tr>)}</tbody></table>{!fields.length && <Empty text="No custom fields have been created."/>}</div>}
            {tab === 'workflows' && <div className="grid gap-4 lg:grid-cols-2">{flows.length ? flows.map(item => <article key={item.id} className="surface-card p-5"><div className="flex justify-between gap-3"><div><h2 className="font-black">{item.name}</h2><p className="text-sm capitalize text-slate-500">{item.entityType} · {item.trigger}</p></div><span className={`text-xs font-bold ${item.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{item.isActive ? 'ACTIVE' : 'INACTIVE'}</span></div><p className="mt-3 text-sm text-slate-500">{item.description || 'No description'}</p><div className="mt-4 flex flex-wrap items-center gap-2">{item.steps.map((step, index) => <div key={step.id} className="flex items-center gap-2"><span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{index + 1}. {step.name}</span>{index < item.steps.length - 1 && <span className="text-slate-300">→</span>}</div>)}</div><Actions edit={() => openEdit(item)} remove={() => remove(item)}/></article>) : <Empty text="No workflows yet. Build your first approval process."/>}</div>}
        </>}
        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4"><form onSubmit={save} className="my-8 w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{editing ? 'Edit' : 'Add'} {tab === 'branches' ? 'Branch' : tab === 'fields' ? 'Custom Field' : 'Workflow'}</h2><button type="button" onClick={() => setModal(false)}><X/></button></div>
            {tab === 'branches' && <BranchForm form={branchForm} setForm={setBranchForm}/>} {tab === 'fields' && <FieldForm form={fieldForm} setForm={setFieldForm} editing={!!editing}/>} {tab === 'workflows' && <WorkflowForm form={flowForm} setForm={setFlowForm}/>} 
            <button disabled={saving} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </form></div>}
        {manageBranch && <BranchManager branch={manageBranch} resources={resources} tab={resourceTab} setTab={setResourceTab} search={resourceSearch} setSearch={setResourceSearch} loading={resourceLoading} assigningId={assigningId} onAssign={setAssignment} onClose={() => { setManageBranch(null); load(); }}/>} 
    </div>;
}

function BranchManager({ branch, resources, tab, setTab, search, setSearch, loading, assigningId, onAssign, onClose }: any) {
    const items = (tab === 'users' ? resources.users : resources.classes).filter((item: any) => {
        const text = tab === 'users' ? `${item.firstName} ${item.lastName} ${item.username || ''} ${item.role}` : `${item.name} ${item.section} ${item.grade}`;
        return text.toLowerCase().includes(search.toLowerCase());
    });
    const assignedCount = (tab === 'users' ? resources.users : resources.classes).filter((item: any) => item.branchId === branch.id).length;
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"><div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b p-5 dark:border-slate-700"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Manage branch</p><h2 className="text-2xl font-black">{branch.name}</h2><p className="text-sm text-slate-500">Assign existing users and classes to {branch.code}.</p></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X/></button></div>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button onClick={() => setTab('users')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'users' ? 'bg-white text-indigo-600 shadow dark:bg-slate-700' : 'text-slate-500'}`}>Users ({resources.users.filter((u:any)=>u.branchId===branch.id).length})</button><button onClick={() => setTab('classes')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'classes' ? 'bg-white text-indigo-600 shadow dark:bg-slate-700' : 'text-slate-500'}`}>Classes ({resources.classes.filter((c:any)=>c.branchId===branch.id).length})</button></div><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${tab}…`} className="w-full rounded-xl border bg-transparent py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 sm:w-64"/></div></div>
        <div className="overflow-y-auto p-4"><div className="mb-3 flex items-center justify-between text-sm"><span className="font-bold">{assignedCount} assigned to this branch</span><span className="text-slate-400">An item can belong to one branch</span></div>{loading ? <div className="py-16 text-center text-slate-500">Loading…</div> : <div className="space-y-2">{items.map((item:any) => { const assigned = item.branchId === branch.id; const elsewhere = item.branchId && !assigned; return <div key={item.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 dark:border-slate-700 ${assigned ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}><div className="min-w-0"><p className="truncate font-bold">{tab === 'users' ? `${item.firstName} ${item.lastName}` : `${item.name} — ${item.section}`}</p><p className="truncate text-xs capitalize text-slate-500">{tab === 'users' ? `${item.role.replaceAll('_','-')} · ${item.username || item.email || 'No login ID'}` : `${item.grade} · ${item.status}`}{elsewhere ? ' · Assigned to another branch' : ''}</p></div><button disabled={assigningId === item.id} onClick={() => onAssign(tab === 'users' ? 'user' : 'class', item.id, !assigned)} className={`min-w-24 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${assigned ? 'bg-rose-100 text-rose-700' : 'bg-indigo-600 text-white'}`}>{assigningId === item.id ? 'Saving…' : assigned ? 'Remove' : elsewhere ? 'Move here' : 'Assign'}</button></div>; })}{!items.length && <div className="py-14 text-center text-slate-500">No matching {tab} found.</div>}</div>}</div>
        <div className="border-t p-4 text-right dark:border-slate-700"><button onClick={onClose} className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white">Done</button></div>
    </div></div>;
}

function Label({ text, children, wide = false }: { text: string; children: React.ReactNode; wide?: boolean }) { return <label className={`text-sm font-semibold ${wide ? 'sm:col-span-2' : ''}`}>{text}{children}</label>; }
function BranchForm({ form, setForm }: any) { return <div className="grid gap-4 sm:grid-cols-2"><Label text="Branch name"><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} className={inputClass}/></Label><Label text="Code"><input required value={form.code} onChange={e => setForm({...form,code:e.target.value})} className={inputClass}/></Label><Label text="Manager"><input value={form.managerName} onChange={e => setForm({...form,managerName:e.target.value})} className={inputClass}/></Label><Label text="Phone"><input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} className={inputClass}/></Label><Label text="Email"><input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} className={inputClass}/></Label><Label text="Address"><input value={form.address} onChange={e => setForm({...form,address:e.target.value})} className={inputClass}/></Label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isMain} onChange={e => setForm({...form,isMain:e.target.checked})}/> Main branch</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form,isActive:e.target.checked})}/> Active</label></div>; }
function FieldForm({ form, setForm, editing }: any) { return <div className="grid gap-4 sm:grid-cols-2"><Label text="Applies to"><select disabled={editing} value={form.entityType} onChange={e => setForm({...form,entityType:e.target.value})} className={inputClass}>{entities.map(v=><option key={v}>{v}</option>)}</select></Label><Label text="Label"><input required value={form.label} onChange={e => setForm({...form,label:e.target.value})} className={inputClass}/></Label><Label text="Field key"><input disabled={editing} required value={form.fieldKey} onChange={e => setForm({...form,fieldKey:e.target.value})} placeholder="e.g. blood_group" className={inputClass}/></Label><Label text="Field type"><select value={form.fieldType} onChange={e => setForm({...form,fieldType:e.target.value})} className={inputClass}>{['text','textarea','number','date','select','multiselect','checkbox','email','phone'].map(v=><option key={v}>{v}</option>)}</select></Label><Label text="Placeholder"><input value={form.placeholder} onChange={e => setForm({...form,placeholder:e.target.value})} className={inputClass}/></Label><Label text="Options (comma-separated)"><input disabled={!['select','multiselect'].includes(form.fieldType)} value={form.options} onChange={e => setForm({...form,options:e.target.value})} className={inputClass}/></Label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isRequired} onChange={e => setForm({...form,isRequired:e.target.checked})}/> Required</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form,isActive:e.target.checked})}/> Active</label></div>; }
function WorkflowForm({ form, setForm }: any) { const changeStep=(i:number,key:string,value:string)=>setForm({...form,steps:form.steps.map((s:Step,n:number)=>n===i?{...s,[key]:value}:s)}); return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Label text="Workflow name"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={inputClass}/></Label><Label text="Applies to"><select value={form.entityType} onChange={e=>setForm({...form,entityType:e.target.value})} className={inputClass}>{entities.map(v=><option key={v}>{v}</option>)}</select></Label><Label text="Trigger"><select value={form.trigger} onChange={e=>setForm({...form,trigger:e.target.value})} className={inputClass}><option value="manual">Manual</option><option value="on_create">When created</option><option value="on_update">When updated</option></select></Label><Label text="Description"><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className={inputClass}/></Label></div><div><div className="mb-2 flex justify-between"><p className="font-bold">Workflow steps</p><button type="button" onClick={()=>setForm({...form,steps:[...form.steps,newStep(form.steps.length)]})} className="text-sm font-bold text-indigo-600">+ Add step</button></div><div className="space-y-3">{form.steps.map((step:Step,i:number)=><div key={step.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_160px_120px_auto] dark:border-slate-700"><input required placeholder={`Step ${i+1} name`} value={step.name} onChange={e=>changeStep(i,'name',e.target.value)} className={inputClass}/><select value={step.assigneeRole} onChange={e=>changeStep(i,'assigneeRole',e.target.value)} className={inputClass}>{roles.map(v=><option key={v}>{v}</option>)}</select><select value={step.action} onChange={e=>changeStep(i,'action',e.target.value)} className={inputClass}><option>approve</option><option>review</option><option>notify</option><option>complete</option></select><button type="button" disabled={form.steps.length===1} onClick={()=>setForm({...form,steps:form.steps.filter((_:Step,n:number)=>n!==i)})} className="text-rose-500 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div>)}</div></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Active workflow</label></div>; }
function Actions({ edit, remove, compact=false }: {edit:()=>void;remove:()=>void;compact?:boolean}) { return <div className={`flex justify-end gap-4 ${compact?'':'mt-5 border-t pt-4 dark:border-slate-700'}`}><button onClick={edit} className="text-sm font-bold text-indigo-600">Edit</button><button onClick={remove} className="text-sm font-bold text-rose-500">Delete</button></div>; }
function Empty({ text }: {text:string}) { return <div className="col-span-full py-16 text-center text-slate-500">{text}</div>; }
