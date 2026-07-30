"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

type InventoryItem = {
    id: string;
    _id?: string;
    itemName: string;
    category: string;
    quantity: number;
    unit: string;
    location?: string;
    status: 'available' | 'out_of_stock' | 'maintenance';
};

const emptyForm = {
    itemName: '',
    category: '',
    quantity: '0',
    unit: 'pcs',
    location: '',
    status: 'available'
};

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<InventoryItem | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(emptyForm);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/inventory', { params: search ? { search } : undefined });
            setItems(response.data.data || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Could not load inventory');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = window.setTimeout(fetchItems, 250);
        return () => window.clearTimeout(timer);
    }, [fetchItems]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (item: InventoryItem) => {
        setEditing(item);
        setForm({
            itemName: item.itemName,
            category: item.category,
            quantity: String(item.quantity),
            unit: item.unit,
            location: item.location || '',
            status: item.status
        });
        setModalOpen(true);
    };

    const saveItem = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, quantity: Number(form.quantity) };
            if (editing) await api.put(`/inventory/${editing.id || editing._id}`, payload);
            else await api.post('/inventory', payload);
            toast.success(editing ? 'Inventory item updated' : 'Inventory item added');
            setModalOpen(false);
            await fetchItems();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Could not save inventory item');
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (item: InventoryItem) => {
        if (!window.confirm(`Delete "${item.itemName}"?`)) return;
        try {
            await api.delete(`/inventory/${item.id || item._id}`);
            toast.success('Inventory item deleted');
            await fetchItems();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Could not delete inventory item');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Inventory & Assets</h1>
                    <p className="text-sm text-slate-500 mt-1">Track institutional property, stock levels, and maintenance.</p>
                </div>
                <button onClick={openCreate} className="w-full sm:w-auto px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition">
                    + Add New Item
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    ['Total Assets', items.length, 'text-indigo-500'],
                    ['Under Maintenance', items.filter(item => item.status === 'maintenance').length, 'text-rose-500'],
                    ['Out of Stock', items.filter(item => item.status === 'out_of_stock' || item.quantity === 0).length, 'text-amber-500']
                ].map(([label, value, color]) => (
                    <div key={String(label)} className="surface-card p-5">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{label}</p>
                        <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search item, category, or location..."
                className="w-full sm:max-w-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="surface-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left">
                        <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-5 py-4">Item</th><th className="px-5 py-4">Category</th>
                                <th className="px-5 py-4">Quantity</th><th className="px-5 py-4">Location</th>
                                <th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan={6} className="py-16 text-center text-slate-500">Loading inventory...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={6} className="py-16 text-center text-slate-500">No inventory items found.</td></tr>
                            ) : items.map(item => (
                                <tr key={item.id || item._id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{item.itemName}</td>
                                    <td className="px-5 py-4 text-sm text-slate-500">{item.category}</td>
                                    <td className="px-5 py-4 font-bold">{item.quantity} {item.unit}</td>
                                    <td className="px-5 py-4 text-sm text-slate-500">{item.location || '—'}</td>
                                    <td className="px-5 py-4 text-sm capitalize">{item.status.replaceAll('_', ' ')}</td>
                                    <td className="px-5 py-4 text-right space-x-3">
                                        <button onClick={() => openEdit(item)} className="text-indigo-500 font-semibold">Edit</button>
                                        <button onClick={() => deleteItem(item)} className="text-rose-500 font-semibold">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto">
                    <form onSubmit={saveItem} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black">{editing ? 'Edit Item' : 'Add Inventory Item'}</h2>
                            <button type="button" onClick={() => setModalOpen(false)} className="text-slate-500 text-2xl">×</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                ['itemName', 'Item name', 'text'],
                                ['category', 'Category', 'text'],
                                ['quantity', 'Quantity', 'number'],
                                ['unit', 'Unit', 'text'],
                                ['location', 'Location', 'text']
                            ].map(([key, label, type]) => (
                                <label key={key} className={key === 'itemName' ? 'sm:col-span-2 text-sm font-semibold' : 'text-sm font-semibold'}>
                                    {label}
                                    <input
                                        type={type}
                                        min={type === 'number' ? 0 : undefined}
                                        required={key !== 'location'}
                                        value={(form as any)[key]}
                                        onChange={event => setForm({ ...form, [key]: event.target.value })}
                                        className="mt-1 w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </label>
                            ))}
                            <label className="text-sm font-semibold">
                                Status
                                <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className="mt-1 w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <option value="available">Available</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="out_of_stock">Out of stock</option>
                                </select>
                            </label>
                        </div>
                        <button disabled={saving} className="w-full py-3 bg-indigo-600 disabled:opacity-60 text-white rounded-xl font-bold">
                            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Item'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
