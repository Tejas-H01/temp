import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '../api';

const INTEREST_OPTIONS = ['Heritage', 'Nature', 'Adventure', 'Food', 'Religious', 'Shopping'];
const TIER_OPTIONS = ['budget', 'mid-range', 'luxury'];

export default function TripCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', start_date: '', end_date: '', description: '', budget_limit: '', budget_tier: '', interests: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await tripsApi.createTrip({
        ...formData,
        budget_limit: formData.budget_limit ? parseFloat(formData.budget_limit) : null,
        budget_tier: formData.budget_tier || null,
        interests: formData.interests || null
      });
      navigate(`/trips/${res.id}`);
    } catch (err) {
      alert("Error creating trip. Check dates.");
    }
  };

  const toggleInterest = (interest) => {
    const current = formData.interests
      ? formData.interests.split(',').map(i => i.trim()).filter(Boolean)
      : [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    setFormData({ ...formData, interests: updated.join(',') });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Plan a New Trip</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Trip Name</label>
            <input type="text" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" required
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Start Date</label>
              <input type="date" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" required
                value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">End Date</label>
              <input type="date" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" required
                value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Budget Limit (optional, ₹)</label>
            <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={formData.budget_limit} onChange={e => setFormData({...formData, budget_limit: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Budget Tier (for reference estimates)</label>
            <div className="flex gap-2">
              {TIER_OPTIONS.map(tier => (
                <button key={tier} type="button"
                  onClick={() => setFormData({...formData, budget_tier: formData.budget_tier === tier ? '' : tier})}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition capitalize ${
                    formData.budget_tier === tier
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
                const current = formData.interests ? formData.interests.split(',').map(i => i.trim()) : [];
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
            <textarea className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" rows="3"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/dashboard')} className="px-4 py-2 text-slate-600 font-medium border border-transparent hover:bg-slate-100 rounded-md">Cancel</button>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700">Create Trip</button>
          </div>
        </form>
      </div>
    </div>
  );
}
