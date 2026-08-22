import { useState, useEffect } from 'react';
import { masterApi, tripsApi } from '../../api';

/**
 * ActivitySwitcherModal
 * ----------------------
 * Allows the user to replace an existing TripActivity with an alternative
 * from the legacy Activity catalog (/api/activities?city_id=...).
 *
 * IMPORTANT: Uses Activity records (which have real costs), NOT TouristSpots.
 *
 * Props:
 *   isOpen          – boolean, controls visibility
 *   onClose         – () => void
 *   currentActivity – TripActivity object (with nested .activity if applicable)
 *   stopId          – TripStop.id (for the PUT endpoint path)
 *   cityId          – cities.id (to filter alternatives by city)
 *   onReplaced      – callback({ oldName, newName, oldCost, newCost, savings })
 *                     called AFTER a successful replacement so parent can
 *                     call refreshTrip() and show a savings notification.
 */
export default function ActivitySwitcherModal({
  isOpen,
  onClose,
  currentActivity,
  stopId,
  cityId,
  onReplaced,
}) {
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [fetchError, setFetchError]     = useState(null);
  const [replacing, setReplacing]       = useState(null); // id of the activity being replaced
  const [replaceError, setReplaceError] = useState(null);

  // ── Derive "current" display values ────────────────────────────────────────
  const currentName = currentActivity?.custom_place_name
    || currentActivity?.activity?.name
    || 'Current Activity';

  const currentCost =
    currentActivity?.custom_cost !== null && currentActivity?.custom_cost !== undefined
      ? Number(currentActivity.custom_cost)
      : Number(currentActivity?.activity?.cost ?? 0);

  const currentActivityId = currentActivity?.activity?.id ?? null;

  // ── Fetch alternatives whenever the modal opens ─────────────────────────────
  useEffect(() => {
    if (!isOpen || !cityId) return;

    setLoading(true);
    setFetchError(null);
    setReplaceError(null);
    setAlternatives([]);

    masterApi
      .getActivities(cityId)
      .then((activities) => {
        if (!Array.isArray(activities)) {
          setAlternatives([]);
          return;
        }

        const currentNameLower = currentName.toLowerCase();

        // Exclude the currently-selected activity by id or name
        const filtered = activities.filter((a) => {
          if (currentActivityId && a.id === currentActivityId) return false;
          if (a.name.toLowerCase() === currentNameLower) return false;
          return true;
        });

        // Deterministic ranking:
        //   1. Sort by type variety (group different types first)
        //   2. Within same type, sort by cost ascending
        // This gives a diverse, low-cost-first set of 3 alternatives.
        filtered.sort((a, b) => {
          if (a.type !== b.type) return a.type.localeCompare(b.type);
          return a.cost - b.cost;
        });

        setAlternatives(filtered.slice(0, 3));
      })
      .catch(() => {
        setFetchError('Unable to load alternative activities. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, cityId, currentActivityId, currentName]);

  // ── Replacement handler ─────────────────────────────────────────────────────
  const handleReplace = async (selected) => {
    setReplacing(selected.id);
    setReplaceError(null);

    const newCost   = Number(selected.cost ?? 0);
    const savings   = currentCost - newCost;

    try {
      // PUT /api/stops/{stop_id}/activities/{trip_activity_id}
      // Backend uses exclude_unset=True → only sent fields are updated.
      // We explicitly null out activity_id to clear the stale FK and set
      // custom_place_name + custom_cost to the new activity's values.
      // activity_date, start_time, display_order, notes are NOT sent → preserved.
      await tripsApi.updateActivity(stopId, currentActivity.id, {
        activity_id:        null,
        custom_place_name:  selected.name,
        custom_cost:        newCost,
      });

      // Notify parent — parent is responsible for refreshTrip() + notification display
      if (onReplaced) {
        onReplaced({
          oldName:  currentName,
          newName:  selected.name,
          oldCost:  currentCost,
          newCost,
          savings,
        });
      }

      onClose();
    } catch {
      setReplaceError('Activity could not be replaced. Please try again.');
    } finally {
      setReplacing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start p-5 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Better Alternatives</h3>
            <p className="text-sm text-slate-500 mt-0.5">Choose another activity for this stop.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none ml-4 shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Current activity summary ─────────────────────────────────── */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Currently selected
          </p>
          <div className="flex justify-between items-center">
            <span className="font-medium text-slate-700 truncate pr-2">{currentName}</span>
            <span className="text-sm font-semibold text-slate-600 shrink-0">₹{currentCost.toLocaleString()}</span>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1">

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg" />
              ))}
            </div>
          )}

          {/* Fetch error */}
          {!loading && fetchError && (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm mb-3">{fetchError}</p>
              <button
                onClick={onClose}
                className="text-slate-500 text-sm underline"
              >
                Close
              </button>
            </div>
          )}

          {/* No alternatives */}
          {!loading && !fetchError && alternatives.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">🔍</div>
              <p className="text-slate-500 text-sm">
                No alternative activities available for this city.
              </p>
            </div>
          )}

          {/* Replace error */}
          {replaceError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {replaceError}
            </div>
          )}

          {/* Alternatives list */}
          {!loading && !fetchError && alternatives.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-3">Select an alternative:</p>
              {alternatives.map((alt) => {
                const savings = currentCost - Number(alt.cost ?? 0);
                const isReplacing = replacing === alt.id;

                return (
                  <div
                    key={alt.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                  >
                    <div className="flex justify-between items-start gap-3">

                      {/* Activity info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-slate-800 text-sm">{alt.name}</h4>
                          {alt.type && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {alt.type}
                            </span>
                          )}
                        </div>

                        {alt.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                            {alt.description}
                          </p>
                        )}

                        {/* Cost row */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-bold text-slate-800">
                            ₹{Number(alt.cost ?? 0).toLocaleString()}
                          </span>
                          {alt.duration_minutes > 0 && (
                            <span className="text-xs text-slate-400">
                              {alt.duration_minutes} min
                            </span>
                          )}
                          {savings > 0 && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Save ₹{savings.toLocaleString()}
                            </span>
                          )}
                          {savings < 0 && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              +₹{Math.abs(savings).toLocaleString()} more
                            </span>
                          )}
                          {savings === 0 && (
                            <span className="text-xs text-slate-400">Same cost</span>
                          )}
                        </div>
                      </div>

                      {/* Replace button */}
                      <button
                        onClick={() => handleReplace(alt)}
                        disabled={replacing !== null}
                        className="shrink-0 bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {isReplacing ? (
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                            ...
                          </span>
                        ) : (
                          'Replace'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-5 pb-4 shrink-0 border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-1"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
