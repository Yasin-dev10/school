"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function InventoryPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking for now as we don't have backend controllers yet
        setTimeout(() => {
            setItems([
                { _id: '1', itemName: 'Computer Lab Desks', category: 'Furniture', quantity: 30, unit: 'pcs', status: 'available' },
                { _id: '2', itemName: 'Science Lab Beakers', category: 'Lab Equipment', quantity: 150, unit: 'pcs', status: 'available' },
                { _id: '3', itemName: 'Classroom Projectors', category: 'Electronics', quantity: 12, unit: 'pcs', status: 'maintenance' },
            ] as any);
            setLoading(false);
        }, 800);
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Inventory & Assets</h1>
                    <p className="text-slate-500 mt-1">Track institutional property, stock levels, and maintenance status.</p>
                </div>
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition hover:scale-105 active:scale-95">
                    + Add New Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-dark p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total Assets</p>
                    <p className="text-3xl font-black text-white mt-1">{items.length}</p>
                </div>
                <div className="glass-dark p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Under Maintenance</p>
                    <p className="text-3xl font-black text-rose-400 mt-1">{items.filter((i: any) => i.status === 'maintenance').length}</p>
                </div>
                <div className="glass-dark p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Out of Stock</p>
                    <p className="text-3xl font-black text-amber-400 mt-1">0</p>
                </div>
            </div>

            <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                        <tr>
                            <th className="px-8 py-5">Item Name</th>
                            <th className="px-8 py-5">Category</th>
                            <th className="px-8 py-5">Quantity</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-600 animate-pulse italic text-sm">Auditing inventory items...</td></tr>
                        ) : items.map((item: any) => (
                            <tr key={item._id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-4">
                                    <p className="text-white font-bold">{item.itemName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Ref: INV-{item._id}</p>
                                </td>
                                <td className="px-8 py-4">
                                    <span className="text-xs text-slate-400">{item.category}</span>
                                </td>
                                <td className="px-8 py-4">
                                    <p className="text-white font-black">{item.quantity} {item.unit}</p>
                                </td>
                                <td className="px-8 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${item.status === 'available' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <button className="text-indigo-400 hover:text-white text-xs font-bold transition">Manage</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
