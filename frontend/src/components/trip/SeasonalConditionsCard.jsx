import React, { useState, useEffect } from 'react';
import { seasonalApi } from '../../api';

export default function SeasonalConditionsCard({ cityId, startDate, cityName, dateRange }) {
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cityId || !startDate) return;

    // Parse month from startDate string ("YYYY-MM-DD")
    const dateParts = startDate.split('-');
    let month = null;
    if (dateParts.length >= 2) {
      month = parseInt(dateParts[1], 10);
    } else {
      const dateObj = new Date(startDate);
      month = dateObj.getMonth() + 1;
    }

    if (!month || isNaN(month) || month < 1 || month > 12) return;

    setLoading(true);
    setError(false);
    seasonalApi.getConditions(cityId, month)
      .then(res => {
        setConditions(res);
      })
      .catch(err => {
        console.error("Error loading seasonal conditions:", err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [cityId, startDate]);

  if (loading) {
    return (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        <div className="h-2 bg-slate-100 rounded w-3/4"></div>
        <div className="h-6 bg-slate-200 rounded-lg"></div>
        <div className="h-2 bg-slate-100 rounded w-5/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Typical Seasonal Conditions</p>
        <p className="text-xs text-slate-500 italic">Typical seasonal conditions unavailable.</p>
      </div>
    );
  }

  if (!conditions) return null;

  const { season, typical_conditions, suitability, travel_tip } = conditions;

  // Map suitability to UI styles
  let suitabilityLabel = "";
  let suitabilityStyles = "";

  switch (suitability) {
    case 'good':
      suitabilityLabel = "Good time to visit";
      suitabilityStyles = "bg-emerald-50 text-emerald-700 border-emerald-100";
      break;
    case 'moderate':
      suitabilityLabel = "Moderate conditions";
      suitabilityStyles = "bg-amber-50 text-amber-700 border-amber-100";
      break;
    case 'not_ideal':
      suitabilityLabel = "Not an ideal season";
      suitabilityStyles = "bg-rose-50 text-rose-700 border-rose-100";
      break;
    default:
      suitabilityLabel = "Moderate conditions";
      suitabilityStyles = "bg-slate-50 text-slate-600 border-slate-100";
  }

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          Typical Seasonal Conditions
        </p>
        {cityName && (
          <h4 className="font-extrabold text-slate-800 text-xs">
            {cityName}
          </h4>
        )}
        {dateRange && (
          <p className="text-[10px] text-slate-500 font-medium">
            {dateRange}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <div className="bg-white p-2 rounded-lg border border-slate-150">
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Season</span>
          <span className="font-bold text-slate-700 text-xs">{season}</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-slate-150">
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Conditions</span>
          <span className="font-bold text-slate-700 text-[10px] leading-tight block">{typical_conditions}</span>
        </div>
      </div>

      <div className={`p-2 rounded-lg border text-center font-bold text-[10px] uppercase tracking-wider ${suitabilityStyles}`}>
        {suitabilityLabel}
      </div>

      {travel_tip && (
        <div className="text-[10px] text-slate-600 leading-relaxed border-t border-slate-200 pt-2">
          <span className="font-bold text-slate-700 block mb-0.5">Travel Tip:</span>
          {travel_tip}
        </div>
      )}
    </div>
  );
}
