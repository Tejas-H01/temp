import { useMemo } from 'react';
import SeasonalConditionsCard from './SeasonalConditionsCard';

export default function TripOverviewTab({ trip }) {
  const tripDurationDays = useMemo(() => {
    if (!trip.start_date || !trip.end_date) return null;
    const diff = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1;
    return Math.max(1, diff);
  }, [trip.start_date, trip.end_date]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Trip Overview</h2>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Details</h3>
          <p className="font-medium text-slate-800 text-lg">{trip.name}</p>
          <p className="text-slate-600">{trip.start_date} &rarr; {trip.end_date}</p>
          {tripDurationDays && <p className="text-sm text-slate-500 mt-1">{tripDurationDays} Days</p>}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Preferences</h3>
          <p className="text-slate-700"><strong>Budget:</strong> {trip.budget_limit ? `₹${trip.budget_limit}` : 'Not specified'} {trip.budget_tier ? `(${trip.budget_tier})` : ''}</p>
          <p className="text-slate-700"><strong>Interests:</strong> {trip.interests || 'None'}</p>
        </div>
      </div>

      <p className="text-slate-700 mb-6">{trip.description || 'No description provided.'}</p>

      <div className="space-y-8">
        {(trip.stops || []).map(stop => (
          <div key={stop.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">
                {stop.city?.city || 'Unknown'}
                {stop.city?.state && <span className="font-normal text-slate-500 text-base">, {stop.city.state}</span>}
              </h3>
              <p className="text-sm text-slate-500">{stop.start_date} &rarr; {stop.end_date}</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2 pl-4 border-l-2 border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Planned Activities</h4>
                {(stop.activities || []).length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No activities added yet.</p>
                ) : (
                  (stop.activities || []).map(act => (
                    <div key={act.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                      <div>
                        <p className="font-medium text-slate-700">{act.custom_place_name || act.activity?.name}</p>
                        <p className="text-xs text-slate-500">{act.activity_date}{act.start_time ? ` at ${act.start_time}` : ''}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        {act.custom_cost !== null ? <span className="text-sm font-medium text-emerald-600">₹{act.custom_cost}</span> :
                         act.activity?.cost ? <span className="text-sm font-medium text-slate-500">₹{act.activity.cost}</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="md:col-span-1">
                <SeasonalConditionsCard 
                  cityId={stop.city_id}
                  startDate={stop.start_date}
                  cityName={stop.city?.city}
                  dateRange={`${stop.start_date} to ${stop.end_date}`}
                />
              </div>
            </div>
          </div>
        ))}
        {(!trip.stops || trip.stops.length === 0) && (
          <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">No destinations added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

