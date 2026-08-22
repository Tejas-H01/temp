import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { recommendationsApi, tripsApi, communityApi } from '../../api';

/**
 * RecommendationPanel
 * --------------------
 * Shows top-3 tourist spot and restaurant recommendations for a city/stop.
 *
 * Props:
 *   cityId           – required, the cities.id
 *   stopId           – required when adding to itinerary (trip_stops.id)
 *   activityDate     – required for "Add to Itinerary" (YYYY-MM-DD string)
 *   interests        – optional comma-separated string, e.g. "Heritage,Nature"
 *   budgetTier       – optional tier string
 *   tripDurationDays – optional int
 *   excludePlaceNames  – optional array of already-selected place names
 *   onAdded          – callback after an item is added to the itinerary
 */
export default function RecommendationPanel({
  cityId,
  stopId,
  activityDate,
  interests,
  budgetTier,
  tripDurationDays,
  excludePlaceNames = [],
  onAdded,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('places');
  const [showAll, setShowAll] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const [expandedCommunityFor, setExpandedCommunityFor] = useState(null);
  const [communityExperiences, setCommunityExperiences] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  const handleToggleCommunity = async (itemId) => {
    if (expandedCommunityFor === itemId) {
      setExpandedCommunityFor(null);
      return;
    }
    setExpandedCommunityFor(itemId);
    setLoadingCommunity(true);
    try {
      const exps = await communityApi.getExperiences({ city: data?.city?.city });
      setCommunityExperiences(exps || []);
    } catch (err) {
      console.error('Failed to fetch community experiences', err);
    } finally {
      setLoadingCommunity(false);
    }
  };

  const fetchRecommendations = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    try {
      const params = { limit: showAll ? 10 : 3 };
      if (interests) params.interests = interests;
      if (budgetTier) params.budget_tier = budgetTier;
      if (tripDurationDays) params.trip_duration_days = tripDurationDays;
      if (excludePlaceNames.length > 0) {
        params.exclude_place_names = excludePlaceNames.join(',');
      }
      const bundle = await recommendationsApi.getCityBundle(cityId, params);
      setData(bundle);
    } catch (err) {
      console.error('Recommendation fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [cityId, interests, budgetTier, tripDurationDays, excludePlaceNames, showAll]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleAddPlace = async (spot) => {
    if (!stopId || !activityDate) return;
    setAddingId(spot.id);
    try {
      await tripsApi.addActivity(stopId, {
        custom_place_name: spot.place_name,
        activity_date: activityDate,
        notes: spot.description?.substring(0, 200) || '',
        custom_cost: 0,
      });
      if (onAdded) onAdded();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Could not add place. Check that the date is within the stop dates.');
    } finally {
      setAddingId(null);
    }
  };
  const handleAddRestaurant = async (rest) => {
    if (!stopId || !activityDate) return;
    setAddingId(rest.id);
    try {
      await tripsApi.addActivity(stopId, {
        custom_place_name: rest.name,
        activity_date: activityDate,
        notes: `Cuisine: ${rest.cuisine}. Must try: ${rest.must_try_dish}`,
        custom_cost: 0,
      });
      if (onAdded) onAdded();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Could not add restaurant. Check that the date is within the stop dates.');
    } finally {
      setAddingId(null);
    }
  };

  if (!cityId) return null;
  if (loading) {
    return (
      <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-pulse">
        <div className="h-4 bg-indigo-200 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-indigo-100 rounded-lg" />)}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const INTEREST_TAGS = ['Heritage', 'Nature', 'Adventure', 'Food', 'Religious', 'Shopping'];
  const selectedInterests = interests ? interests.split(',').map(i => i.trim()) : [];

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">Suggested for You</h4>
          <p className="text-xs text-slate-500">
            {data.city.city}, {data.city.state}
            {selectedInterests.length > 0 && (
              <span className="ml-2 text-indigo-600">· {selectedInterests.join(', ')}</span>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('places')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition ${
              activeTab === 'places'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-indigo-50'
            }`}
          >
            Places
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition ${
              activeTab === 'restaurants'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-indigo-50'
            }`}
          >
            Food
          </button>
        </div>
      </div>

      {/* Places tab */}
      {activeTab === 'places' && (
        <div className="divide-y divide-slate-50">
          {(data.places || []).length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6 italic">No places to suggest right now.</p>
          ) : (
            data.places.map(spot => (
              <div key={spot.id} className="px-4 py-3 hover:bg-slate-50 transition group">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm truncate">{spot.place_name}</span>
                      {spot.must_visit && (
                        <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Must Visit
                        </span>
                      )}
                      <span className="shrink-0 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {spot.reason}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{spot.sub_category} · {spot.duration_needed}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{spot.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Best: {spot.best_time_to_visit}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleCommunity(spot.id)}
                      className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 transition"
                    >
                      Community
                    </button>
                    {stopId && activityDate && (
                      <button
                        onClick={() => handleAddPlace(spot)}
                        disabled={addingId === spot.id}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {addingId === spot.id ? '...' : '+ Add'}
                      </button>
                    )}
                  </div>
                </div>
                {expandedCommunityFor === spot.id && (
                  <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                    <h5 className="text-xs font-semibold text-slate-700 mb-2">Community Experiences</h5>
                    {loadingCommunity ? (
                      <div className="text-xs text-slate-500 animate-pulse">Loading...</div>
                    ) : communityExperiences.length === 0 ? (
                      <div className="text-xs text-slate-500">No community experiences found for {data.city.city}.</div>
                    ) : (
                      <>
                        <ul className="space-y-1.5 mb-2">
                          {communityExperiences.slice(0, 2).map(exp => {
                             const days = Math.round((new Date(exp.trip.end_date) - new Date(exp.trip.start_date)) / (1000 * 3600 * 24)) + 1;
                             return (
                               <li key={exp.id} className="text-xs text-slate-600 flex items-start gap-2">
                                 <span className="text-indigo-400 mt-0.5">•</span>
                                 <span>{exp.trip.name} — {days} Days</span>
                               </li>
                             );
                          })}
                        </ul>
                        {communityExperiences.length > 2 && (
                          <div className="mt-2 pt-2 border-t border-indigo-100/50">
                             <Link to={`/community?city=${encodeURIComponent(data.city.city)}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                               View All
                             </Link>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {(data.places || []).length > 0 && (
            <div className="px-4 py-2 text-center">
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                {showAll ? 'Show fewer' : 'View more suggestions'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Restaurants tab */}
      {activeTab === 'restaurants' && (
        <div className="divide-y divide-slate-50">
          {(data.restaurants || []).length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6 italic">No restaurants to suggest.</p>
          ) : (
            data.restaurants.map(r => (
              <div key={r.id} className="px-4 py-3 hover:bg-slate-50 transition">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{r.name}</span>
                      <span className="shrink-0 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        {r.reason}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{r.cuisine} · {r.category}</p>
                    <p className="text-xs text-indigo-700 mt-1 font-medium">
                      Must Try: {r.must_try_dish}
                    </p>
                    {r.notes && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleCommunity(r.id)}
                      className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 transition"
                    >
                      Community
                    </button>
                    {stopId && activityDate && (
                      <button
                        onClick={() => handleAddRestaurant(r)}
                        disabled={addingId === r.id}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {addingId === r.id ? '...' : '+ Add'}
                      </button>
                    )}
                  </div>
                </div>
                {expandedCommunityFor === r.id && (
                  <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                    <h5 className="text-xs font-semibold text-slate-700 mb-2">Community Experiences</h5>
                    {loadingCommunity ? (
                      <div className="text-xs text-slate-500 animate-pulse">Loading...</div>
                    ) : communityExperiences.length === 0 ? (
                      <div className="text-xs text-slate-500">No community experiences found for {data.city.city}.</div>
                    ) : (
                      <>
                        <ul className="space-y-1.5 mb-2">
                          {communityExperiences.slice(0, 2).map(exp => {
                             const days = Math.round((new Date(exp.trip.end_date) - new Date(exp.trip.start_date)) / (1000 * 3600 * 24)) + 1;
                             return (
                               <li key={exp.id} className="text-xs text-slate-600 flex items-start gap-2">
                                 <span className="text-indigo-400 mt-0.5">•</span>
                                 <span>{exp.trip.name} — {days} Days</span>
                               </li>
                             );
                          })}
                        </ul>
                        {communityExperiences.length > 2 && (
                          <div className="mt-2 pt-2 border-t border-indigo-100/50">
                             <Link to={`/community?city=${encodeURIComponent(data.city.city)}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                               View All
                             </Link>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {(data.restaurants || []).length > 0 && (
            <div className="px-4 py-2 text-center">
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                {showAll ? 'Show fewer' : 'View more restaurants'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
