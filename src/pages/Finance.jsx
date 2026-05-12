import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  TrendingUp, TrendingDown, IndianRupee, Trash2, 
  PieChart, BarChart as BarChartIcon, List, AlertCircle, 
  FileSpreadsheet, MessageCircle, Plus, Wallet, ChevronRight, Zap, Target, Activity, Calendar, Filter
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  Cell, PieChart as RePieChart, Pie, AreaChart, Area, YAxis
} from 'recharts';

const Finance = () => {
  const transactions = useLiveQuery(() => db.finance.toArray());
  const [showAdd, setShowAdd] = useState(false);
  const [preset, setPreset] = useState('Current Month');
  const [activeCategory, setActiveCategory] = useState('All');
  const [newTx, setNewTx] = useState({
    type: 'Income', category: 'Fee', amount: '', date: new Date().toISOString().split('T')[0], description: ''
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      
      // Category Filter
      if (activeCategory !== 'All' && t.category !== activeCategory) return false;

      // Time Filter
      if (preset === 'Current Month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (preset === 'Previous Month') {
        const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return txDate.getMonth() === pm.getMonth() && txDate.getFullYear() === pm.getFullYear();
      } else if (preset === 'Current Year') {
        return txDate.getFullYear() === now.getFullYear();
      } else if (preset === 'Previous Year') {
        return txDate.getFullYear() === now.getFullYear() - 1;
      }
      return true; // All Time
    });
  }, [transactions, preset, activeCategory]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const handleAdd = async (e) => {
    e.preventDefault();
    await db.finance.add({ ...newTx, amount: parseFloat(newTx.amount), date: new Date(newTx.date) });
    setShowAdd(false);
    setNewTx({ type: 'Income', category: 'Fee', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
  };

  // Group by date for the area chart
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayIncome = transactions?.filter(t => t.type === 'Income' && new Date(t.date).toISOString().split('T')[0] === dateStr).reduce((s, t) => s + t.amount, 0) || 0;
    return { name: d.toLocaleDateString([], {day:'2-digit', month:'short'}), income: dayIncome };
  }).reverse();

  if (!transactions) return null;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-reveal relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 blur-[150px] -z-10 rounded-full"></div>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-200 pb-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Wallet size={22} strokeWidth={2.5} />
             </div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Financial Overview</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none">Finance</h1>
          <p className="text-slate-500 mt-2 font-medium">Monitoring capital flows, revenue streams, and expenditures.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className={`btn-luxury ${showAdd ? 'btn-luxury-secondary border-rose-200 text-rose-600 hover:bg-rose-50' : 'btn-luxury-primary'} px-10`}>
           {showAdd ? <><Trash2 size={20}/> Cancel</> : <><Plus size={20}/> Add Entry</>}
        </button>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
         <div className="lg:col-span-5 luxury-card p-6 md:p-10 bg-gradient-to-br from-blue-600 to-indigo-700 border-none relative overflow-hidden group">
            <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12 text-white"><Wallet size={200}/></div>
            <div className="relative z-10 space-y-6 md:space-y-10">
               <div className="flex justify-between items-center">
                  <p className="text-[8px] md:text-[10px] font-bold text-blue-200 uppercase tracking-[0.4em]">Net Balance ({preset})</p>
                  <div className="flex items-center gap-2 px-2 py-0.5 bg-white/10 rounded-full border border-white/20">
                     <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                     <span className="text-[7px] font-bold text-white tracking-widest">SECURE</span>
                  </div>
               </div>
               <h2 className="text-4xl md:text-6xl font-display font-extrabold text-white tracking-tight leading-none">₹{balance.toLocaleString('en-IN')}</h2>
               <div className="grid grid-cols-2 gap-4 md:gap-6 pt-6 md:pt-10 border-t border-white/20">
                  <div>
                     <p className="text-[8px] md:text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-1">Total Income</p>
                     <p className="text-lg md:text-xl font-bold text-white tracking-tight">₹{totalIncome.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                     <p className="text-[8px] md:text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-1">Total Expense</p>
                     <p className="text-lg md:text-xl font-bold text-white tracking-tight">₹{totalExpense.toLocaleString('en-IN')}</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-7 luxury-card shadow-sm p-6 md:p-10 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Revenue Forecast</h3>
               <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <TrendingUp size={14}/> +12.4%
               </div>
            </div>
            <div className="flex-1 min-h-[140px] md:min-h-[180px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7Days}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                      itemStyle={{ color: '#0f172a', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      <div className="space-y-8">
         {/* Optimized Filter Bar */}
         <div className="flex flex-col gap-6 bg-white p-4 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="space-y-4">
               <div className="flex items-center gap-2 px-1">
                  <Calendar size={14} className="text-blue-500"/>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Time Period</span>
               </div>
               <div className="flex flex-wrap gap-2">
                  {['Current Month', 'Previous Month', 'Current Year', 'Previous Year', 'All Time'].map(p => (
                    <button key={p} onClick={() => setPreset(p)} className={`px-5 py-2.5 rounded-xl text-[10px] font-bold transition-all border ${preset === p ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}>
                       {p}
                    </button>
                  ))}
               </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
               <div className="flex items-center gap-2 px-1">
                  <Filter size={14} className="text-indigo-500"/>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Category Focus</span>
               </div>
               <div className="flex flex-wrap gap-2">
                  {['All', 'Fee', 'Salary', 'Electricity', 'Rent', 'Maintenance', 'Other'].map(f => (
                    <button key={f} onClick={() => setActiveCategory(f)} className={`px-5 py-2.5 rounded-xl text-[10px] font-bold transition-all border ${activeCategory === f ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}>
                       {f === 'Fee' ? 'Member Fees' : f}
                    </button>
                  ))}
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Transaction Input */}
            {showAdd && (
              <div className="lg:col-span-4 luxury-card p-8 animate-reveal border-blue-200 shadow-lg h-fit sticky top-8">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Plus size={16} strokeWidth={3}/></div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Add Entry</h3>
                 </div>
                 <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Type</label>
                          <select value={newTx.type} onChange={e=>setNewTx({...newTx, type:e.target.value})} className="input-luxury text-xs h-12">
                             <option>Income</option>
                             <option>Expense</option>
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Category</label>
                          <select value={newTx.category} onChange={e=>setNewTx({...newTx, category:e.target.value})} className="input-luxury text-xs h-12">
                             <option value="Fee">Member Fees</option>
                             <option value="Salary">Staff Salary</option>
                             <option value="Electricity">Electricity</option>
                             <option value="Rent">Rent/Lease</option>
                             <option value="Maintenance">Maintenance</option>
                             <option value="Other">Other</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Amount (₹)</label>
                       <input required type="number" placeholder="0.00" value={newTx.amount} onChange={e=>setNewTx({...newTx, amount:e.target.value})} className="input-luxury font-bold h-12 text-lg" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Description</label>
                       <input required placeholder="Context..." value={newTx.description} onChange={e=>setNewTx({...newTx, description:e.target.value})} className="input-luxury h-12 text-sm" />
                    </div>
                    <button type="submit" className="w-full btn-luxury btn-luxury-primary py-4 mt-2">Save Record</button>
                 </form>
              </div>
            )}

            {/* Transaction Ledger */}
            <div className={`${showAdd ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
               <div className="luxury-table-container relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
                  <table className="luxury-table">
                     <thead>
                       <tr>
                          <th>Context</th>
                          <th>Date</th>
                          <th className="text-right">Amount</th>
                          <th className="text-right">Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {[...filteredTransactions].reverse().map(t => (
                         <tr key={t.id} className="group hover:bg-slate-50/80 transition-colors">
                            <td>
                               <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${t.type === 'Income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                     <Activity size={16} strokeWidth={2.5}/>
                                  </div>
                                  <div>
                                     <p className="font-bold text-slate-900 tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors text-sm">{t.description}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.category}</p>
                                  </div>
                               </div>
                            </td>
                            <td>
                               <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-tighter">
                                  <Calendar size={12} className="text-slate-400"/> {new Date(t.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}
                               </div>
                            </td>
                            <td className="text-right">
                               <p className={`text-lg md:text-xl font-display font-extrabold ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {t.type === 'Income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                                </p>
                            </td>
                            <td className="text-right">
                               <button onClick={() => { if(confirm("Delete record?")) db.finance.delete(t.id); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                            </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
               </div>
               {filteredTransactions.length === 0 && (
                 <div className="text-center py-40">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                       <AlertCircle size={32} className="text-slate-400"/>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">No records found for {preset}</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Finance;