import { useState, useEffect, useCallback } from 'react';
import { recommendationsApi } from '../../api';

/**
 * BudgetReferencePanel
 * ---------------------
 * Shows reference budget estimates for all stops in a trip,
 * multi-city total, and budget nudge/status.
 *
 * Props:
 *   trip         – full trip object with stops[]
 *   budget       – budget summary from /api/trips/{id}/budget
 *   budgetTier   – tier string (from trip.budget_tier, defaults mid-range)
 */
export default function BudgetReferencePanel({ trip, budget, budgetTier }) {
  const [refData, setRefData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReference = useCallback(async () => {
    if (!trip?.stops?.length) return;
    setLoading(true);
    try {
      const stops = trip.stops.map(stop => {
        const days = Math.max(
          1,
          Math.round(
            (new Date(stop.end_date) - new Date(stop.start_date)) / 86400000
          ) + 1
        );
        return {
          city_id: stop.city_id,
          tier: budgetTier || null,
          days,
        };
      });

      const remaining = budget?.budget_limit
        ? budget.budget_limit - (budget.grand_total || 0)
        : null;

      const data = await recommendationsApi.getMultiCityBudget(stops, remaining);
      setRefData(data);
    } catch (err) {
      console.error('Budget reference fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [trip, budgetTier, budget]);

  useEffect(() => {
    fetchReference();
  }, [fetchReference]);

  if (!trip?.stops?.length) return null;

  const TIER_COLORS = {
    budget: 'bg-green-100 text-green-700',
    'mid-range': 'bg-blue-100 text-blue-700',
    luxury: 'bg-purple-100 text-purple-700',
  };

  const STATUS_CONFIG = {
    comfortable: { color: 'text-emerald-600', bar: 'bg-emerald-500', label: 'Comfortable' },
    moderate:    { color: 'text-amber-600',   bar: 'bg-amber-500',   label: 'Moderate' },
    near_limit:  { color: 'text-orange-600',  bar: 'bg-orange-500',  label: 'Near Limit' },
    over_budget: { color: 'text-red-600',     bar: 'bg-red-500',     label: 'Over Budget' },
    no_limit:    { color: 'text-slate-500',   bar: 'bg-slate-400',   label: 'No Limit Set' },
  };

  const pct = budget?.budget_limit
    ? Math.min((budget.grand_total / budget.budget_limit) * 100, 110)
    : 0;
  const statusKey = budget?.budget_limit
    ? (pct > 100 ? 'over_budget' : pct > 80 ? 'near_limit' : pct > 50 ? 'moderate' : 'comfortable')
    : 'no_limit';
  const statusCfg = STATUS_CONFIG[statusKey];

  return (
    <div className="space-y-4 mt-6">
      {/* Budget status card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">
          Budget Status
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Limit</div>
            <div className="font-bold text-slate-800">
              {budget?.budget_limit ? `₹${budget.budget_limit.toLocaleString()}` : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Spent</div>
            <div className="font-bold text-slate-800">₹{(budget?.grand_total || 0).toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Remaining</div>
            <div className={`font-bold ${statusCfg.color}`}>
              {budget?.budget_limit
                ? `₹${(budget.budget_limit - budget.grand_total).toLocaleString()}`
                : '—'}
            </div>
          </div>
        </div>
        {budget?.budget_limit && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
              <span className="text-slate-500">{Math.min(pct, 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${statusCfg.bar}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Reference budget card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            Reference Daily Costs
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[budgetTier] || TIER_COLORS['mid-range']}`}>
            {budgetTier || 'mid-range'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded" />)}
          </div>
        ) : refData ? (
          <>
            {/* Nudge */}
            {refData.nudge && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{refData.nudge.message}</span>
              </div>
            )}

            {/* Per-city breakdown */}
            <div className="space-y-2 mb-3">
              {refData.breakdown.map((stop, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                  <div>
                    <span className="font-medium text-slate-700">{stop.city_name}</span>
                    <span className="text-xs text-slate-400 ml-2">{stop.days}d</span>
                  </div>
                  <div className="text-right">
                    {stop.reference_total != null ? (
                      <>
                        <div className="font-semibold text-slate-800">₹{stop.reference_total.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">₹{stop.total_per_day.toLocaleString()}/day</div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">No data</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Grand total */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-700">Reference Total</span>
              <span className="font-bold text-lg text-indigo-700">
                ₹{refData.grand_total.toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              * Reference estimates only. Actual costs may vary. Track real spending with manual expenses.
            </p>
          </>
        ) : (
          <p className="text-slate-400 text-sm text-center py-4">
            Add destinations to see reference budget estimates.
          </p>
        )}
      </div>
    </div>
  );
}
