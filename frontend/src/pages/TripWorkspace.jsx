import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tripsApi } from '../api';
import TripOverviewTab from '../components/trip/TripOverviewTab';
import TripItineraryTab from '../components/trip/TripItineraryTab';
import TripBudgetTab from '../components/trip/TripBudgetTab';

const INTEREST_OPTIONS = ['Heritage', 'Nature', 'Adventure', 'Food', 'Religious', 'Shopping'];
const TIER_OPTIONS = ['budget', 'mid-range', 'luxury'];

export default function TripWorkspace() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [budget, setBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [editTripForm, setEditTripForm] = useState({});

  const refreshTrip = useCallback(() => {
    tripsApi.getTrip(tripId).then(res => setTrip(res)).catch(console.error);
    tripsApi.getBudget(tripId).then(res => setBudget(res)).catch(console.error);
  }, [tripId]);

  useEffect(() => {
    refreshTrip();
  }, [refreshTrip]);

  const handlePublishToggle = async () => {
    try {
      if (trip.is_published) {
        await tripsApi.unpublishTrip(tripId);
        setTrip({ ...trip, is_published: false });
      } else {
        await tripsApi.publishTrip(tripId);
        setTrip({ ...trip, is_published: true });
      }
    } catch (err) {
      alert('Error changing publish status');
    }
  };

  const openEditTrip = () => {
    setEditTripForm({
      name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      budget_limit: trip.budget_limit || '',
      description: trip.description || '',
      interests: trip.interests || '',
      budget_tier: trip.budget_tier || '',
    });
    setShowEditTripModal(true);
  };

  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    try {
      await tripsApi.updateTrip(trip.id, {
        ...editTripForm,
        budget_limit: editTripForm.budget_limit ? parseFloat(editTripForm.budget_limit) : null,
        interests: editTripForm.interests || null,
        budget_tier: editTripForm.budget_tier || null,
      });
      setShowEditTripModal(false);
      refreshTrip();
    } catch (err) {
      alert('Error updating trip. Check dates.');
    }
  };

  // Toggle interest selection in edit form
  const toggleInterest = (interest) => {
    const current = editTripForm.interests
      ? editTripForm.interests.split(',').map(i => i.trim()).filter(Boolean)
      : [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    setEditTripForm({ ...editTripForm, interests: updated.join(',') });
  };

  if (!trip) return <div className="p-10 text-center text-slate-500">Loading trip details...</div>;

  const selectedInterests = trip.interests
    ? trip.interests.split(',').map(i => i.trim()).filter(Boolean)
    : [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6 flex justify-between items-start">
        <div>
          <Link to="/dashboard" className="text-slate-500 hover:text-indigo-600 mb-2 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-3xl font-bold text-slate-800">{trip.name}</h1>
          <p className="text-slate-500">{trip.start_date} to {trip.end_date}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedInterests.map(i => (
              <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{i}</span>
            ))}
            {trip.budget_tier && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">{trip.budget_tier}</span>
            )}
          </div>
          <div className="mt-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-1 inline-block rounded-md">
            Share Link: <a href={`/share/${trip.share_id}`} target="_blank" rel="noreferrer" className="underline font-medium">/share/{trip.share_id}</a>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePublishToggle} 
            className={`px-4 py-2 rounded-md font-medium transition ${
              trip.is_published 
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
            {trip.is_published ? 'Published to Community' : 'Publish to Community'}
          </button>
          <button onClick={openEditTrip} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-medium hover:bg-slate-200 border border-slate-200">
            Edit Trip Settings
          </button>
        </div>
      </header>

      {showEditTripModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Trip Settings</h3>
            <form onSubmit={handleUpdateTrip} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Trip Name</label>
                <input type="text" required className="mt-1 w-full border rounded-md p-2" value={editTripForm.name} onChange={e => setEditTripForm({...editTripForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start Date</label>
                  <input type="date" required className="mt-1 w-full border rounded-md p-2" value={editTripForm.start_date} onChange={e => setEditTripForm({...editTripForm, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">End Date</label>
                  <input type="date" required className="mt-1 w-full border rounded-md p-2" value={editTripForm.end_date} onChange={e => setEditTripForm({...editTripForm, end_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Budget Limit (₹)</label>
                <input type="number" className="mt-1 w-full border rounded-md p-2" value={editTripForm.budget_limit} onChange={e => setEditTripForm({...editTripForm, budget_limit: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Budget Tier (for reference estimates)</label>
                <div className="flex gap-2">
                  {TIER_OPTIONS.map(tier => (
                    <button key={tier} type="button"
                      onClick={() => setEditTripForm({...editTripForm, budget_tier: editTripForm.budget_tier === tier ? '' : tier})}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition capitalize ${
                        editTripForm.budget_tier === tier
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Travel Interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map(interest => {
                    const current = editTripForm.interests ? editTripForm.interests.split(',').map(i => i.trim()) : [];
                    const selected = current.includes(interest);
                    return (
                      <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea className="mt-1 w-full border rounded-md p-2" rows="3" value={editTripForm.description} onChange={e => setEditTripForm({...editTripForm, description: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowEditTripModal(false)} className="text-slate-500 px-4 py-2">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'itinerary', 'budget', 'timeline'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium capitalize`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <TripOverviewTab trip={trip} refreshTrip={refreshTrip} />
        )}

        {activeTab === 'itinerary' && (
          <TripItineraryTab trip={trip} refreshTrip={refreshTrip} />
        )}

        {activeTab === 'budget' && (
          <TripBudgetTab trip={trip} budget={budget} refreshTrip={refreshTrip} />
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Timeline</h2>
            <div className="space-y-6">
              {(trip.stops || []).map(stop => (
                <div key={stop.id} className="relative pl-6 border-l-2 border-indigo-200">
                  <div className="absolute w-3 h-3 bg-indigo-600 rounded-full -left-[7px] top-2"></div>
                  <h3 className="font-bold text-lg">{stop.city?.city || 'Unknown City'}{stop.city?.state ? `, ${stop.city.state}` : ''}</h3>
                  <p className="text-slate-500 text-sm mb-3">{stop.start_date} to {stop.end_date}</p>
                  <div className="space-y-3">
                    {(stop.activities || []).map(act => (
                      <div key={act.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="font-medium">{act.custom_place_name || act.activity?.name}</div>
                        <div className="text-sm text-slate-500">{act.activity_date} at {act.start_time || 'Anytime'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(!trip.stops || trip.stops.length === 0) && (
                <p className="text-slate-500">No destinations added yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
