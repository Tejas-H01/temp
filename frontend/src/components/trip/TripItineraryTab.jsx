import { useState, useMemo, useEffect } from 'react';
import { tripsApi, masterApi } from '../../api';
import RecommendationPanel from './RecommendationPanel';

export default function TripItineraryTab({ trip, refreshTrip }) {
  const [cities, setCities] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCityName, setSelectedCityName] = useState('');

  const [activitiesForCity, setActivitiesForCity] = useState([]);
  
  // Modals visibility
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Forms
  const [stopForm, setStopForm] = useState({ city_id: '', start_date: '', end_date: '' });
  const [placeForm, setPlaceForm] = useState({ custom_place_name: '', activity_date: '', start_time: '', custom_cost: '', notes: '' });
  const [activityForm, setActivityForm] = useState({ activity_id: '', custom_place_name: '', activity_date: '', start_time: '', custom_cost: '', notes: '' });
  
  const [activeEditItem, setActiveEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ activity_date: '', start_time: '', custom_cost: '', notes: '' });
  
  const [activeStopId, setActiveStopId] = useState(null);
  const [activeDateStr, setActiveDateStr] = useState(null);

  useEffect(() => {
    if (showStopModal && citySearch !== selectedCityName) {
      const timer = setTimeout(() => {
        masterApi.getCities(citySearch).then(res => setCities(res)).catch(console.error);
        setShowSuggestions(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showStopModal, citySearch, selectedCityName]);

  const selectCity = (city) => {
    setStopForm({...stopForm, city_id: city.id});
    const fullName = `${city.city}, ${city.state}`;
    setCitySearch(fullName);
    setSelectedCityName(fullName);
    setShowSuggestions(false);
  };

  const itineraryDays = useMemo(() => {
    if (!trip || !trip.start_date || !trip.end_date) return [];

    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const days = [];
    let current = new Date(start);
    let dayNum = 1;

    while (current <= end) {
      const currentDateStr = current.toISOString().split('T')[0];
      
      const activeStop = (trip.stops || []).find(s => {
        return currentDateStr >= s.start_date && currentDateStr <= s.end_date;
      });

      const activeActivities = [];
      if (activeStop) {
        activeActivities.push(...(activeStop.activities || []).filter(a => a.activity_date === currentDateStr));
      }

      activeActivities.sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      });

      days.push({
        dayNum,
        dateStr: currentDateStr,
        displayDate: current.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        stop: activeStop,
        activities: activeActivities
      });

      current.setDate(current.getDate() + 1);
      dayNum++;
    }
    return days;
  }, [trip]);

  // --- Handlers ---
  const handleAddStop = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.addStop(trip.id, {
        city_id: parseInt(stopForm.city_id),
        start_date: stopForm.start_date,
        end_date: stopForm.end_date
      });
      setShowStopModal(false);
      setStopForm({ city_id: '', start_date: '', end_date: '' });
      setCitySearch('');
      setSelectedCityName('');
      refreshTrip();
    } catch (err) {
      alert(err.response?.data?.detail || "Error adding destination.");
    }
  };

  const handleRemoveStop = async (stopId) => {
    if(window.confirm('Remove this destination?')) {
      await tripsApi.deleteStop(trip.id, stopId);
      refreshTrip();
    }
  };

  const openPlaceModal = (stopId, dateStr) => {
    setActiveStopId(stopId);
    setPlaceForm({ ...placeForm, activity_date: dateStr, custom_place_name: '', start_time: '', custom_cost: '', notes: '' });
    setShowPlaceModal(true);
  };

  const openActivityModal = (stopId, dateStr, cityId) => {
    setActiveStopId(stopId);
    setActivityForm({ activity_id: '', custom_place_name: '', activity_date: dateStr, start_time: '', custom_cost: '', notes: '' });
    masterApi.getActivities(cityId).then(res => setActivitiesForCity(res)).catch(console.error);
    setShowActivityModal(true);
  };

  const handleAddPlace = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.addActivity(activeStopId, {
        custom_place_name: placeForm.custom_place_name,
        activity_date: placeForm.activity_date,
        start_time: placeForm.start_time || null,
        custom_cost: placeForm.custom_cost ? parseFloat(placeForm.custom_cost) : 0,
        notes: placeForm.notes
      });
      setShowPlaceModal(false);
      refreshTrip();
    } catch (err) {
      alert("Error adding custom place.");
    }
  };

  const handleAddCatalogActivity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        activity_date: activityForm.activity_date,
        start_time: activityForm.start_time || null,
        custom_cost: activityForm.custom_cost ? parseFloat(activityForm.custom_cost) : null,
        notes: activityForm.notes
      };
      
      if (activityForm.activity_id) {
        payload.activity_id = parseInt(activityForm.activity_id);
      } else {
        payload.custom_place_name = activityForm.custom_place_name;
      }
      
      await tripsApi.addActivity(activeStopId, payload);
      setShowActivityModal(false);
      refreshTrip();
    } catch (err) {
      alert("Error adding activity.");
    }
  };

  const handleDeleteActivity = async (stopId, activityId) => {
    if(window.confirm('Delete this item?')) {
      await tripsApi.deleteActivity(stopId, activityId);
      refreshTrip();
    }
  };

  const openEditModal = (stopId, act) => {
    setActiveStopId(stopId);
    setActiveEditItem(act.id);
    setEditForm({
      activity_date: act.activity_date,
      start_time: act.start_time || '',
      custom_cost: act.custom_cost !== null ? act.custom_cost : '',
      notes: act.notes || ''
    });
  };

  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.updateActivity(activeStopId, activeEditItem, {
        activity_date: editForm.activity_date,
        start_time: editForm.start_time || null,
        custom_cost: editForm.custom_cost ? parseFloat(editForm.custom_cost) : null,
        notes: editForm.notes
      });
      setActiveEditItem(null);
      refreshTrip();
    } catch (err) {
      alert("Error updating item.");
    }
  };

  if (!trip) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Interactive Itinerary</h2>
        <button onClick={() => setShowStopModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-700">
          + Add Destination
        </button>
      </div>
      
      {itineraryDays.length === 0 ? (
        <p className="text-slate-500">Invalid trip dates.</p>
      ) : (
        <div className="space-y-8">
          {itineraryDays.map((day) => (
            <div key={day.dateStr} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Day {day.dayNum} &mdash; {day.dateStr}</h3>
                    <p className="text-sm text-slate-500">{day.displayDate}</p>
                  </div>
                  {day.stop && (
                    <div className="flex items-center gap-3">
                      <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                        📍 {day.stop.city?.city || 'Unknown'}{day.stop.city?.state ? `, ${day.stop.city.state}` : ''}
                      </span>
                      <button onClick={() => handleRemoveStop(day.stop.id)} className="text-red-500 text-xs hover:underline">Remove Stop</button>
                    </div>
                  )}
                </div>
              
                <div className="p-5">
                  {!day.stop ? (
                    <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                      <p className="text-slate-500 text-sm">No destination scheduled for this date.</p>
                    </div>
                  ) : (
                  <div className="space-y-6">
                    <div className="flex gap-2">
                      <button onClick={() => openPlaceModal(day.stop.id, day.dateStr)} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-indigo-100">+ Add Place</button>
                      <button onClick={() => openActivityModal(day.stop.id, day.dateStr, day.stop.city_id)} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-slate-200">+ Add Activity</button>
                    </div>

                    <div className="space-y-4">
                      {day.activities.length === 0 ? (
                        <p className="text-slate-400 italic text-sm pt-2">No items planned for this day.</p>
                      ) : (
                        day.activities.map(act => (
                          <div key={act.id} className="flex gap-4 group">
                            <div className="w-20 pt-1 shrink-0 text-slate-500 text-sm font-medium text-right">
                              {act.start_time ? act.start_time.substring(0, 5) : 'Anytime'}
                            </div>
                            <div className="w-px bg-slate-200 shrink-0 relative">
                              <div className="absolute w-2 h-2 bg-indigo-400 rounded-full -left-[3.5px] top-2"></div>
                            </div>
                            <div className="pb-4 w-full flex justify-between">
                              <div>
                                <h4 className="font-bold text-slate-800">{act.custom_place_name || act.activity?.name}</h4>
                                <p className="text-sm text-slate-500 mt-1">{act.notes || act.activity?.description || 'No description.'}</p>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-slate-700">₹{act.custom_cost !== null ? act.custom_cost : (act.activity?.cost || 0)}</div>
                                <div className="mt-2 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditModal(day.stop.id, act)} className="text-indigo-600 text-xs font-medium hover:underline">Edit</button>
                                  <button onClick={() => handleDeleteActivity(day.stop.id, act.id)} className="text-red-500 text-xs font-medium hover:underline">Delete</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Recommendations for this stop/day */}
                    <RecommendationPanel
                      cityId={day.stop.city_id}
                      stopId={day.stop.id}
                      activityDate={day.dateStr}
                      interests={trip.interests}
                      budgetTier={trip.budget_tier}
                      tripDurationDays={Math.max(1, Math.round((new Date(day.stop.end_date) - new Date(day.stop.start_date)) / 86400000) + 1)}
                      excludePlaceNames={(trip.stops || []).flatMap(s => (s.activities || []).map(a => a.custom_place_name).filter(Boolean))}
                      onAdded={refreshTrip}
                    />
                  </div>
                )}
                </div>
              </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Destination</h3>
            <form onSubmit={handleAddStop} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700">City</label>
                <input
                  type="text" placeholder="Type city name..." className="mt-1 w-full border rounded-md p-2 text-sm"
                  value={citySearch}
                  onChange={e => {
                    setCitySearch(e.target.value);
                    setStopForm({...stopForm, city_id: ''});
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && cities.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {cities.map(c => (
                      <li key={c.id} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => selectCity(c)}>
                        {c.city}, {c.state}
                      </li>
                    ))}
                  </ul>
                )}
                <input type="text" required className="opacity-0 absolute h-0 w-0" value={stopForm.city_id} onChange={() => {}} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start Date</label>
                  <input type="date" required className="mt-1 w-full border rounded-md p-2" 
                    min={trip.start_date} max={trip.end_date}
                    value={stopForm.start_date} onChange={e => setStopForm({...stopForm, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">End Date</label>
                  <input type="date" required className="mt-1 w-full border rounded-md p-2" 
                    min={trip.start_date} max={trip.end_date}
                    value={stopForm.end_date} onChange={e => setStopForm({...stopForm, end_date: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowStopModal(false)} className="text-slate-500 px-4 py-2">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Custom Place</h3>
            <form onSubmit={handleAddPlace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Place Name</label>
                <input type="text" required className="mt-1 w-full border rounded-md p-2" placeholder="e.g. Baga Beach" value={placeForm.custom_place_name} onChange={e => setPlaceForm({...placeForm, custom_place_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Date</label>
                <input type="date" required className="mt-1 w-full border rounded-md p-2" value={placeForm.activity_date} onChange={e => setPlaceForm({...placeForm, activity_date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Time (Optional)</label>
                  <input type="time" className="mt-1 w-full border rounded-md p-2" value={placeForm.start_time} onChange={e => setPlaceForm({...placeForm, start_time: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cost (₹)</label>
                  <input type="number" className="mt-1 w-full border rounded-md p-2" value={placeForm.custom_cost} onChange={e => setPlaceForm({...placeForm, custom_cost: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <input type="text" className="mt-1 w-full border rounded-md p-2" placeholder="e.g. Morning visit" value={placeForm.notes} onChange={e => setPlaceForm({...placeForm, notes: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowPlaceModal(false)} className="text-slate-500 px-4 py-2">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium">Add Place</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Activity</h3>
            <form onSubmit={handleAddCatalogActivity} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700">Activity</label>
                <input 
                  type="text" required placeholder="Type activity name..." className="mt-1 w-full border rounded-md p-2" 
                  value={activityForm.custom_place_name} 
                  onChange={e => {
                    setActivityForm({...activityForm, custom_place_name: e.target.value, activity_id: ''});
                  }}
                  onFocus={() => setShowActivitySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowActivitySuggestions(false), 200)}
                />
                {showActivitySuggestions && activitiesForCity.filter(a => a.name.toLowerCase().includes((activityForm.custom_place_name || '').toLowerCase())).length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {activitiesForCity.filter(a => a.name.toLowerCase().includes((activityForm.custom_place_name || '').toLowerCase())).map(a => (
                      <li key={a.id} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => {
                        setActivityForm({...activityForm, activity_id: a.id, custom_place_name: a.name, custom_cost: a.cost});
                        setShowActivitySuggestions(false);
                      }}>
                        {a.name} (₹{a.cost})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Date</label>
                <input type="date" required className="mt-1 w-full border rounded-md p-2" value={activityForm.activity_date} onChange={e => setActivityForm({...activityForm, activity_date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Time (Optional)</label>
                  <input type="time" className="mt-1 w-full border rounded-md p-2" value={activityForm.start_time} onChange={e => setActivityForm({...activityForm, start_time: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Override Cost (Optional)</label>
                  <input type="number" className="mt-1 w-full border rounded-md p-2" value={activityForm.custom_cost} onChange={e => setActivityForm({...activityForm, custom_cost: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <input type="text" className="mt-1 w-full border rounded-md p-2" value={activityForm.notes} onChange={e => setActivityForm({...activityForm, notes: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowActivityModal(false)} className="text-slate-500 px-4 py-2">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium">Add Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeEditItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Item</h3>
            <form onSubmit={handleEditItemSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Date</label>
                  <input type="date" required className="mt-1 w-full border rounded-md p-2" value={editForm.activity_date} onChange={e => setEditForm({...editForm, activity_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Time</label>
                  <input type="time" className="mt-1 w-full border rounded-md p-2" value={editForm.start_time} onChange={e => setEditForm({...editForm, start_time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Cost (₹)</label>
                <input type="number" className="mt-1 w-full border rounded-md p-2" value={editForm.custom_cost} onChange={e => setEditForm({...editForm, custom_cost: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Notes</label>
                <input type="text" className="mt-1 w-full border rounded-md p-2" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setActiveEditItem(null)} className="text-slate-500 px-4 py-2">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
