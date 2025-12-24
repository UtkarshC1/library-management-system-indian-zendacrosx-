import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  TrendingUp, TrendingDown, IndianRupee, Trash2, 
  PieChart, BarChart as BarChartIcon, List, AlertCircle, 
  FileSpreadsheet, MessageCircle, Plus 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const Finance = () => {
  const navigate = useNavigate();
  const transactions = useLiveQuery(() => db.finance.toArray());
  const students = useLiveQuery(() => db.students.toArray());

  const [view, setView] = useState('Dashboard'); 
  const [tab, setTab] = useState('Income'); 
  const [form, setForm] = useState({ amount: '', desc: '', category: 'Fees' });

  // --- ANALYTICS LOGIC ---
  const income = transactions?.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0) || 0;
  const expense = transactions?.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0) || 0;
  const balance = income - expense;

  const calculatePendingFees = () => {
    if (!students || !transactions) return 0;
    let pending = 0;
    students.forEach(s => {
      const payments = transactions.filter(t => t.studentId === s.id && t.type === 'Income');
      const lastPay = payments.sort((a,b) => b.date - a.date)[0];
      const isDue = !lastPay || (new Date() - lastPay.date) / (1000 * 60 * 60 * 24) > 30;
      
      if (isDue && s.monthlyFee) {
        pending += parseFloat(s.monthlyFee);
      }
    });
    return pending;
  };
  const pendingFees = calculatePendingFees();

  // --- CSV EXPORT ---
  const exportCSV = () => {
    if (!transactions || transactions.length === 0) return alert("No transactions to export.");
    
    const headers = ["Date,Type,Category,Amount,Description"];
    const rows = transactions.map(t => 
        `${new Date(t.date).toLocaleDateString()},${t.type},${t.category},${t.amount},"${t.description}"`
    );
    
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Finance_Report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const expenseData = transactions
    ?.filter(t => t.type === 'Expense')
    .reduce((acc, t) => {
      const existing = acc.find(i => i.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, []) || [];
  
  const COLORS = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28', '#FF4444'];
  const barData = [{ name: 'Total', Income: income, Expense: expense }];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.desc) return;

    await db.finance.add({
      type: tab,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.desc,
      date: new Date()
    });

    setForm({ amount: '', desc: '', category: tab === 'Income' ? 'Fees' : 'Rent' });
    alert("Transaction Added!");
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this transaction?")) await db.finance.delete(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-fade-in">
      <div className="bg-white p-2 sticky top-0 z-10 shadow-sm flex gap-2 border-b border-gray-100">
        <button onClick={() => setView('Dashboard')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${view === 'Dashboard' ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>
          <BarChartIcon size={18}/> Analytics
        </button>
        <button onClick={() => setView('Transactions')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${view === 'Transactions' ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>
          <List size={18}/> Cashbook
        </button>
      </div>

      {view === 'Dashboard' && (
        <div className="p-4 space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-blue-800 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <p className="opacity-70 text-xs font-bold uppercase tracking-wider relative z-10">Current Balance</p>
            <h1 className="text-4xl font-bold mt-1 mb-6 relative z-10">₹ {balance.toLocaleString()}</h1>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
               <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                 <div className="flex items-center gap-2 text-green-300 mb-1"><TrendingUp size={16}/><span className="text-xs font-bold">Income</span></div>
                 <p className="font-bold text-lg">₹ {income.toLocaleString()}</p>
               </div>
               <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                 <div className="flex items-center gap-2 text-red-300 mb-1"><TrendingDown size={16}/><span className="text-xs font-bold">Expense</span></div>
                 <p className="font-bold text-lg">₹ {expense.toLocaleString()}</p>
               </div>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
             <button onClick={exportCSV} className="flex-1 flex items-center justify-center gap-2 bg-white border border-green-200 text-green-700 px-4 py-3 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-transform whitespace-nowrap">
                 <FileSpreadsheet size={16}/> Export Excel
             </button>
             {pendingFees > 0 && (
                 <button onClick={() => navigate('/students')} className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-3 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-transform whitespace-nowrap">
                      <MessageCircle size={16}/> Chase Dues
                 </button>
             )}
          </div>

          {pendingFees > 0 && (
             <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertCircle size={20}/></div>
                   <div>
                      <p className="text-xs font-bold text-red-500 uppercase">Pending Collection</p>
                      <p className="text-xl font-bold text-red-700">₹ {pendingFees.toLocaleString()}</p>
                   </div>
                </div>
             </div>
          )}

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BarChartIcon size={18}/> Cash Flow</h3>
             <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={barData}>
                   <XAxis dataKey="name" hide />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'10px', border:'none', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}} />
                   <Bar dataKey="Income" fill="#4ade80" radius={[4,4,4,4]} barSize={40} />
                   <Bar dataKey="Expense" fill="#f87171" radius={[4,4,4,4]} barSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {expenseData.length > 0 && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieChart size={18}/> Expense Breakdown</h3>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={expenseData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:'10px'}} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'Transactions' && (
        <div className="p-4 space-y-4">
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                <button onClick={() => setTab('Income')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'Income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>Income</button>
                <button onClick={() => setTab('Expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'Expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>Expense</button>
              </div>

              <form onSubmit={handleAdd} className="space-y-3">
                 <div className="flex gap-2">
                    <input required type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-1/3 p-3 bg-gray-50 rounded-xl font-bold outline-none border border-gray-100 focus:border-blue-500" />
                    <input required placeholder="Description" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="flex-1 p-3 bg-gray-50 rounded-xl font-medium outline-none border border-gray-100 focus:border-blue-500" />
                 </div>
                 <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-medium outline-none text-gray-600 border border-gray-100">
                    {tab === 'Income' ? (
                        <><option>Fees</option><option>Grants</option><option>Other</option></>
                    ) : (
                        <><option>Rent</option><option>Electricity</option><option>Internet</option><option>Maintenance</option><option>Salary</option><option>Refreshments</option><option>Other</option></>
                    )}
                 </select>
                 <button type="submit" className={`w-full p-3 rounded-xl text-white font-bold shadow-lg active:scale-95 transition-transform flex justify-center gap-2 ${tab === 'Income' ? 'bg-green-600 shadow-green-200' : 'bg-red-500 shadow-red-200'}`}>
                   <Plus size={20} /> Add Transaction
                 </button>
              </form>
           </div>

           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Recent Activity</h3>
           {[...(transactions || [])].reverse().map(t => (
              <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${t.type === 'Income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{t.description}</p>
                    <p className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded inline-block mr-2">{t.category}</p>
                    <span className="text-xs text-gray-400">{t.date.toDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'Income' ? '+' : '-'} ₹ {t.amount}
                  </span>
                  <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={16}/></button>
                </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default Finance;