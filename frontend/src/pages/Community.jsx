import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { communityApi, tripsApi } from '../api';

export default function Community() {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Filters
  const [filters, setFilters] = useState({
    city: '',
    duration: '',
    budget_tier: '',
    interest: '',
    sort_by: 'recommended'
  });

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const activeFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
      const data = await communityApi.getExperiences(activeFilters);
      setExperiences(data);
    } catch (err) {
      console.error('Error fetching community experiences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [filters]);

  const handleLikeToggle = async (exp) => {
    try {
      if (exp.is_liked_by_me) {
        await communityApi.unlikeExperience(exp.id);
        setExperiences(experiences.map(e => e.id === exp.id ? { ...e, is_liked_by_me: false, like_count: e.like_count - 1 } : e));
      } else {
        await communityApi.likeExperience(exp.id);
        setExperiences(experiences.map(e => e.id === exp.id ? { ...e, is_liked_by_me: true, like_count: e.like_count + 1 } : e));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleUseTrip = async (expId) => {
    try {
      const res = await communityApi.copyExperience(expId);
      navigate(`/trips/${res.new_trip_id}`);
    } catch (err) {
      alert('Error copying trip.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 flex gap-6 flex-col md:flex-row">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0 space-y-6">
        <div>
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-indigo-600 mb-4 inline-block">&larr; Back to Dashboard</Link>
          <h2 className="text-2xl font-bold text-slate-800">Community</h2>
          <p className="text-sm text-slate-500 mt-1">Discover and clone public trips.</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search City</label>
            <input 
              type="text" 
              placeholder="e.g. Delhi" 
              className="w-full border rounded-md p-2 text-sm"
              value={filters.city}
              onChange={e => setFilters({...filters, city: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
            <select 
              className="w-full border rounded-md p-2 text-sm"
              value={filters.sort_by}
              onChange={e => setFilters({...filters, sort_by: e.target.value})}
            >
              <option value="recommended">Recommended</option>
              <option value="recent">Most Recent</option>
              <option value="used">Most Used</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
            <select 
              className="w-full border rounded-md p-2 text-sm"
              value={filters.duration}
              onChange={e => setFilters({...filters, duration: e.target.value})}
            >
              <option value="">Any</option>
              <option value="1-3 days">1-3 days</option>
              <option value="4-7 days">4-7 days</option>
              <option value="8+ days">8+ days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
            <select 
              className="w-full border rounded-md p-2 text-sm"
              value={filters.budget_tier}
              onChange={e => setFilters({...filters, budget_tier: e.target.value})}
            >
              <option value="">Any</option>
              <option value="budget">Budget</option>
              <option value="mid-range">Mid-range</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Interest</label>
            <select 
              className="w-full border rounded-md p-2 text-sm"
              value={filters.interest}
              onChange={e => setFilters({...filters, interest: e.target.value})}
            >
              <option value="">Any</option>
              <option value="Heritage">Heritage</option>
              <option value="Nature">Nature</option>
              <option value="Adventure">Adventure</option>
              <option value="Food">Food</option>
              <option value="Religious">Religious</option>
              <option value="Shopping">Shopping</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Feed */}
      <main className="flex-1 min-w-0">
        {loading ? (
          <div className="text-center p-10 text-slate-500">Loading experiences...</div>
        ) : experiences.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500">
            No experiences found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {experiences.map(exp => {
              const trip = exp.trip;
              const duration = trip ? (new Date(trip.end_date) - new Date(trip.start_date)) / 86400000 + 1 : 0;
              const uniqueCities = trip ? [...new Set(trip.stops.map(s => s.city?.city).filter(Boolean))] : [];
              
              return (
                <div key={exp.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  {trip.cover_image && (
                    <img src={trip.cover_image} alt="Cover" className="w-full h-40 object-cover" />
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{trip.name}</h3>
                      <button 
                        onClick={() => handleLikeToggle(exp)}
                        className={`shrink-0 flex items-center gap-1 text-sm font-medium px-2 py-1 rounded ${exp.is_liked_by_me ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                      >
                        {exp.is_liked_by_me ? '♥' : '♡'} {exp.like_count}
                      </button>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-3">
                      By{' '}
                      <Link to={`/profile/${exp.publisher_username}`} className="font-medium text-slate-700 hover:text-indigo-600 hover:underline transition">
                        {exp.publisher_name}
                      </Link>
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{duration} days</span>
                      {trip.budget_tier && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded capitalize">{trip.budget_tier}</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 line-clamp-1 mb-2">
                      <span className="font-semibold text-slate-700">Destinations: </span>
                      {uniqueCities.join(', ') || 'Various'}
                    </p>
                    
                    <p className="text-sm text-slate-600 line-clamp-1 mb-auto">
                      <span className="font-semibold text-slate-700">Interests: </span>
                      {trip.interests || 'Any'}
                    </p>
                    
                    <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div className="text-xs text-slate-500">
                        {exp.copy_count} {exp.copy_count === 1 ? 'use' : 'uses'}
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/community/experiences/${exp.id}`} className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">
                          View
                        </Link>
                        <button 
                          onClick={() => handleUseTrip(exp.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                        >
                          Use This Trip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
