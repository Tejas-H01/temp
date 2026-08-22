import { useState } from 'react';
import { tripsApi } from '../../api';
import BudgetReferencePanel from './BudgetReferencePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Donut Chart — pure SVG, no external dependencies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * segments: [{ label, value, color }]
 * Uses the stroke-dasharray / stroke-dashoffset technique.
 * Formula: dashoffset = circumference * (1 - cumulative/total)
 * The SVG is rotated -90° so arcs start at the top.
 */
function DonutChart({ segments, size = 180, strokeWidth = 32 }) {
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx           = size / 2;
  const cy           = size / 2;

  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);

  // Empty state
  if (total === 0) {
    return (
      <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
        <svg width={size} height={size}>
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-slate-400 text-center leading-tight">No<br/>expenses</p>
        </div>
      </div>
    );
  }

  // Build arc slices
  let cumulative = 0;
  const slices = segments
    .filter((s) => (s.value || 0) > 0)
    .map((seg) => {
      const fraction   = seg.value / total;
      const dashArray  = fraction * circumference;
      const dashOffset = circumference * (1 - cumulative / total);
      cumulative += seg.value;
      return { ...seg, dashArray, dashOffset };
    });

  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-label="Budget breakdown donut chart"
      >
        {slices.map((slice, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${slice.dashArray} ${circumference}`}
            strokeDashoffset={slice.dashOffset}
          />
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category config — must match backend bucket names exactly
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'activity_total',       label: 'Activities',     color: '#6366f1', bgClass: 'bg-indigo-500'  },
  { key: 'transport_total',      label: 'Transport',      color: '#0ea5e9', bgClass: 'bg-sky-500'     },
  { key: 'accommodation_total',  label: 'Accommodation',  color: '#8b5cf6', bgClass: 'bg-violet-500'  },
  { key: 'meal_total',           label: 'Meals',          color: '#f59e0b', bgClass: 'bg-amber-500'   },
  { key: 'other_total',          label: 'Other',          color: '#64748b', bgClass: 'bg-slate-500'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// TripBudgetTab — enhanced with donut chart; all existing functionality kept
// ─────────────────────────────────────────────────────────────────────────────

export default function TripBudgetTab({ trip, budget, refreshTrip }) {
  // ── existing state ─────────────────────────────────────────────────────────
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [budgetLimit, setBudgetLimit]       = useState(budget?.budget_limit || '');

  const [expenseForm, setExpenseForm]       = useState({ category: 'OTHER', amount: '', description: '', expense_date: '' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // ── existing handlers (unchanged) ─────────────────────────────────────────
  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.updateTrip(trip.id, { budget_limit: parseFloat(budgetLimit) });
      setIsEditingLimit(false);
      refreshTrip();
    } catch {
      alert('Error updating budget limit');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.addExpense(trip.id, {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
      });
      setIsAddingExpense(false);
      setExpenseForm({ category: 'OTHER', amount: '', description: '', expense_date: '' });
      refreshTrip();
    } catch {
      alert('Error adding expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await tripsApi.deleteExpense(trip.id, expenseId);
        refreshTrip();
      } catch {
        alert('Error deleting expense');
      }
    }
  };

  if (!budget) return <div className="p-6 text-slate-500">Loading budget…</div>;

  // ── derived values ─────────────────────────────────────────────────────────
  const hasLimit    = budget.budget_limit != null && budget.budget_limit > 0;
  const pct         = hasLimit ? Math.min((budget.grand_total / budget.budget_limit) * 100, 100) : 0;
  const remaining   = hasLimit ? budget.budget_limit - budget.grand_total : null;
  const isOver      = budget.is_over_budget;

  // Budget status label + colour
  const statusLabel  = isOver ? 'Over Budget' : 'Within Budget';
  const statusColor  = isOver ? 'text-red-600' : 'text-emerald-600';
  const barColor     = isOver ? 'bg-red-500'   : 'bg-emerald-500';

  // Donut segments built from real API data
  const donutSegments = CATEGORIES.map((cat) => ({
    label: cat.label,
    value: Number(budget[cat.key] || 0),
    color: cat.color,
    bgClass: cat.bgClass,
  }));

  return (
    <div className="space-y-6">

      {/* ── 1. Budget Overview Card ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">

        {/* Header row */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-slate-800">Your Trip Budget</h2>
          {!isEditingLimit ? (
            <button
              onClick={() => setIsEditingLimit(true)}
              className="text-indigo-600 hover:underline text-sm font-medium"
            >
              Edit Limit
            </button>
          ) : (
            <form onSubmit={handleUpdateLimit} className="flex gap-2">
              <input
                type="number"
                required
                placeholder="New Limit"
                className="border rounded-md px-2 py-1 text-sm w-32"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
              />
              <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm">Save</button>
              <button type="button" onClick={() => setIsEditingLimit(false)} className="text-slate-500 text-sm">Cancel</button>
            </form>
          )}
        </div>

        {/* ── Main spending summary ── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-4">
          <div>
            <p className="text-4xl font-bold text-slate-800">
              ₹{budget.grand_total.toLocaleString()}
            </p>
            {hasLimit && (
              <p className="text-slate-500 text-sm mt-1">
                of ₹{budget.budget_limit.toLocaleString()} budget
              </p>
            )}
            {!hasLimit && (
              <p className="text-slate-400 text-sm mt-1">No budget limit set</p>
            )}
          </div>
          <div className="sm:ml-auto flex gap-4 text-center">
            {hasLimit && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Remaining</p>
                <p className={`text-xl font-bold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isOver
                    ? `-₹${Math.abs(remaining).toLocaleString()}`
                    : `₹${remaining.toLocaleString()}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Avg / Day</p>
              <p className="text-xl font-bold text-slate-700">
                ₹{budget.average_per_day.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Budget status badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mb-4 ${
          isOver ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          <span>{isOver ? '⚠️' : '✓'}</span>
          <span>{statusLabel}</span>
          {hasLimit && (
            <span className="font-normal opacity-70">— {pct.toFixed(1)}% used</span>
          )}
        </div>

        {/* Progress bar */}
        {hasLimit && (
          <div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>₹0</span>
              <span>₹{budget.budget_limit.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Category Breakdown + Donut Chart ─────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-5">Category Breakdown</h3>
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">

          {/* Donut chart */}
          <div className="shrink-0 flex items-center justify-center">
            <DonutChart segments={donutSegments} size={180} strokeWidth={34} />
          </div>

          {/* Legend + values */}
          <div className="flex-1 space-y-3 w-full">
            {CATEGORIES.map((cat) => {
              const value = Number(budget[cat.key] || 0);
              const share = budget.grand_total > 0
                ? ((value / budget.grand_total) * 100).toFixed(0)
                : '0';
              return (
                <div key={cat.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm text-slate-600 truncate">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 w-20 text-right">
                      ₹{value.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Grand total */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Total</span>
              <span className="text-sm font-bold text-slate-800">
                ₹{budget.grand_total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Manual Expenses ───────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Manual Expenses</h3>
          <button
            onClick={() => setIsAddingExpense(!isAddingExpense)}
            className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-indigo-100"
          >
            {isAddingExpense ? 'Cancel' : '+ Add Expense'}
          </button>
        </div>

        {isAddingExpense && (
          <form onSubmit={handleAddExpense} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Category</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="TRANSPORT">Transport</option>
                  <option value="ACCOMMODATION">Accommodation</option>
                  <option value="MEAL">Meal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Amount (₹)</label>
                <input
                  type="number" step="0.01" required
                  className="w-full border rounded-md p-2"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Date</label>
                <input
                  type="date" required
                  className="w-full border rounded-md p-2"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Description</label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2"
                  placeholder="e.g. Taxi to hotel"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-md font-medium">
                Save Expense
              </button>
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
                budget.expenses.map((exp) => (
                  <tr key={exp.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-3 text-sm">{exp.expense_date}</td>
                    <td className="py-3 text-sm">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-700">{exp.description || '-'}</td>
                    <td className="py-3 text-sm font-medium text-right">₹{exp.amount}</td>
                    <td className="py-3 text-sm text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">
                    No manual expenses recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Reference Budget Estimates (unchanged) ───────────────────────── */}
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
