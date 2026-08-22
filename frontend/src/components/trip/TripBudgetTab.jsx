import { useState } from 'react';
import { tripsApi } from '../../api';
import BudgetReferencePanel from './BudgetReferencePanel';

export default function TripBudgetTab({ trip, budget, refreshTrip }) {
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(budget?.budget_limit || '');

  const [expenseForm, setExpenseForm] = useState({ category: 'OTHER', amount: '', description: '', expense_date: '' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.updateTrip(trip.id, { budget_limit: parseFloat(budgetLimit) });
      setIsEditingLimit(false);
      refreshTrip();
    } catch (err) {
      alert('Error updating budget limit');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.addExpense(trip.id, {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount)
      });
      setIsAddingExpense(false);
      setExpenseForm({ category: 'OTHER', amount: '', description: '', expense_date: '' });
      refreshTrip();
    } catch (err) {
      alert('Error adding expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await tripsApi.deleteExpense(trip.id, expenseId);
        refreshTrip();
      } catch (err) {
        alert('Error deleting expense');
      }
    }
  };

  if (!budget) return <div>Loading budget...</div>;

  const pct = budget.budget_limit ? Math.min((budget.grand_total / budget.budget_limit) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Actual user budget ── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Your Trip Budget</h2>
          {!isEditingLimit ? (
            <button onClick={() => setIsEditingLimit(true)} className="text-indigo-600 hover:underline text-sm font-medium">Edit Limit</button>
          ) : (
            <form onSubmit={handleUpdateLimit} className="flex gap-2">
              <input type="number" required placeholder="New Limit" className="border rounded-md px-2 py-1 text-sm w-32" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} />
              <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm">Save</button>
              <button type="button" onClick={() => setIsEditingLimit(false)} className="text-slate-500 text-sm">Cancel</button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-sm font-medium">Budget Limit</div>
            <div className="text-2xl font-bold text-slate-800">{budget.budget_limit ? `₹${budget.budget_limit.toLocaleString()}` : 'Not set'}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-sm font-medium">Total Spent</div>
            <div className="text-2xl font-bold text-slate-800">₹{budget.grand_total}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-sm font-medium">Remaining</div>
            <div className={`text-2xl font-bold ${budget.is_over_budget ? 'text-red-600' : 'text-emerald-600'}`}>
              {budget.budget_limit ? `₹${(budget.budget_limit - budget.grand_total).toFixed(2)}` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="text-slate-500 text-sm font-medium">Avg / Day</div>
            <div className="text-2xl font-bold text-slate-800">₹{budget.average_per_day.toFixed(2)}</div>
          </div>
        </div>

        {budget.budget_limit && (
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">Budget Usage</span>
              <span className={`font-bold ${budget.is_over_budget ? 'text-red-600' : 'text-slate-700'}`}>{pct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div className={`h-3 rounded-full ${budget.is_over_budget ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-slate-600">Activities (Auto)</span><span className="font-medium">₹{budget.activity_total}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-600">Transport</span><span className="font-medium">₹{budget.transport_total}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-600">Accommodation</span><span className="font-medium">₹{budget.accommodation_total}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-600">Meals</span><span className="font-medium">₹{budget.meal_total}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-600">Other</span><span className="font-medium">₹{budget.other_total}</span></div>
            <div className="pt-2 border-t flex justify-between items-center font-bold text-slate-800">
              <span>Total</span><span>₹{budget.grand_total}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Manual Expenses</h3>
            <button onClick={() => setIsAddingExpense(!isAddingExpense)} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-indigo-100">
              {isAddingExpense ? 'Cancel' : '+ Add Expense'}
            </button>
          </div>

          {isAddingExpense && (
            <form onSubmit={handleAddExpense} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Category</label>
                  <select className="w-full border rounded-md p-2" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                    <option value="TRANSPORT">Transport</option>
                    <option value="ACCOMMODATION">Accommodation</option>
                    <option value="MEAL">Meal</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Amount (₹)</label>
                  <input type="number" step="0.01" required className="w-full border rounded-md p-2" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Date</label>
                  <input type="date" required className="w-full border rounded-md p-2" value={expenseForm.expense_date} onChange={e => setExpenseForm({...expenseForm, expense_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Description</label>
                  <input type="text" className="w-full border rounded-md p-2" placeholder="e.g. Taxi to hotel" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-md font-medium">Save Expense</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                  <th className="py-2 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {budget.expenses && budget.expenses.length > 0 ? (
                  budget.expenses.map(exp => (
                    <tr key={exp.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-3 text-sm">{exp.expense_date}</td>
                      <td className="py-3 text-sm">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{exp.category}</span>
                      </td>
                      <td className="py-3 text-sm text-slate-700">{exp.description || '-'}</td>
                      <td className="py-3 text-sm font-medium text-right">₹{exp.amount}</td>
                      <td className="py-3 text-sm text-center">
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700">Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500">No manual expenses recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Reference Budget — completely separate from actual spending ── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-slate-700">Reference Budget Estimates</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            Approximate only · does not affect your actual spending
          </span>
        </div>
        <BudgetReferencePanel trip={trip} budget={budget} budgetTier={trip.budget_tier} />
      </div>
    </div>
  );
}
