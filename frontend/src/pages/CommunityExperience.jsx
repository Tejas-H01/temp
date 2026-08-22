import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { communityApi } from '../api';

export default function CommunityExperience() {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    communityApi.getExperience(experienceId)
      .then(res => setExp(res))
      .catch(err => setError(err.message || 'Experience not found'))
      .finally(() => setLoading(false));
  }, [experienceId]);

  const handleLikeToggle = async () => {
    try {
      if (exp.is_liked_by_me) {
        await communityApi.unlikeExperience(exp.id);
        setExp({ ...exp, is_liked_by_me: false, like_count: exp.like_count - 1 });
      } else {
        await communityApi.likeExperience(exp.id);
        setExp({ ...exp, is_liked_by_me: true, like_count: exp.like_count + 1 });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleUseTrip = async () => {
    try {
      const res = await communityApi.copyExperience(exp.id);
      navigate(`/trips/${res.new_trip_id}`);
    } catch (err) {
      alert('Error copying trip.');
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading experience details...</div>;
  if (error || !exp) return <div className="p-10 text-center text-red-500">{error || 'Experience not found'}</div>;

  const trip = exp.trip;
  const duration = trip ? (new Date(trip.end_date) - new Date(trip.start_date)) / 86400000 + 1 : 0;
  const uniqueCities = trip ? [...new Set(trip.stops.map(s => s.city?.city).filter(Boolean))] : [];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 mb-16">
      <Link to="/community" className="text-sm text-slate-500 hover:text-indigo-600 inline-block">&larr; Back to Community</Link>
      
      {/* Header section */}
      <header className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        {trip.cover_image && (
          <div className="h-64 w-full bg-slate-200 relative">
            <img src={trip.cover_image} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
        )}
        
        <div className={`p-8 ${trip.cover_image ? '-mt-24 relative z-10 text-white' : 'text-slate-800'}`}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{trip.name}</h1>
              <p className={`text-lg opacity-90 ${!trip.cover_image && 'text-slate-600'}`}>
                Created by{' '}
                <Link to={`/profile/${exp.publisher_username}`} className="font-semibold hover:underline">
                  {exp.publisher_name}
                </Link>
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleLikeToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold shadow-sm transition ${
                  exp.is_liked_by_me 
                    ? 'bg-pink-100 text-pink-600 border border-pink-200 hover:bg-pink-200' 
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl">{exp.is_liked_by_me ? '♥' : '♡'}</span> {exp.like_count}
              </button>
              
              <button 
                onClick={handleUseTrip}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700 transition"
              >
                Use This Trip
              </button>
            </div>
          </div>
          
          <div className={`mt-8 flex flex-wrap gap-4 ${trip.cover_image ? 'text-slate-800' : ''}`}>
            <div className={`bg-white/90 backdrop-blur px-4 py-2 rounded-lg border ${trip.cover_image ? 'border-transparent shadow-sm' : 'border-slate-200'} flex flex-col`}>
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Duration</span>
              <span className="font-semibold">{duration} days</span>
            </div>
            <div className={`bg-white/90 backdrop-blur px-4 py-2 rounded-lg border ${trip.cover_image ? 'border-transparent shadow-sm' : 'border-slate-200'} flex flex-col`}>
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Destinations</span>
              <span className="font-semibold">{uniqueCities.join(', ') || 'N/A'}</span>
            </div>
            {trip.budget_tier && (
              <div className={`bg-white/90 backdrop-blur px-4 py-2 rounded-lg border ${trip.cover_image ? 'border-transparent shadow-sm' : 'border-slate-200'} flex flex-col`}>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Budget</span>
                <span className="font-semibold capitalize">{trip.budget_tier}</span>
              </div>
            )}
            {trip.interests && (
              <div className={`bg-white/90 backdrop-blur px-4 py-2 rounded-lg border ${trip.cover_image ? 'border-transparent shadow-sm' : 'border-slate-200'} flex flex-col`}>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Interests</span>
                <span className="font-semibold">{trip.interests}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Description */}
      {trip.description && (
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">About this experience</h2>
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{trip.description}</p>
        </section>
      )}

      {/* Itinerary */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">Itinerary</h2>
        
        {trip.stops && trip.stops.length > 0 ? (
          <div className="space-y-12">
            {trip.stops.map((stop, index) => (
              <div key={stop.id} className="relative">
                {/* Timeline connector */}
                {index < trip.stops.length - 1 && (
                  <div className="absolute left-4 top-10 bottom-[-48px] w-0.5 bg-indigo-100"></div>
                )}
                
                <div className="flex gap-6 relative z-10">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow ring-4 ring-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                      {stop.city?.city || 'Unknown'}, {stop.city?.state || ''}
                    </h3>
                    <p className="text-sm text-indigo-600 font-medium mb-6">
                      {new Date(stop.start_date).toLocaleDateString()} - {new Date(stop.end_date).toLocaleDateString()}
                    </p>
                    
                    {stop.activities && stop.activities.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stop.activities.map(act => (
                          <div key={act.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800">
                                {act.custom_place_name || act.activity?.name}
                              </h4>
                              {act.start_time && (
                                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium">
                                  {act.start_time.substring(0,5)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium mb-2">
                              {new Date(act.activity_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-sm text-slate-600">
                              {act.notes || act.activity?.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-sm">No specific activities planned for this stop.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 italic text-center py-8 bg-slate-50 rounded-xl">This trip has no destinations added yet.</p>
        )}
      </section>
      
      <div className="text-center pt-8">
        <button 
          onClick={handleUseTrip}
          className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-sm hover:bg-indigo-700 transition"
        >
          Use This Trip as a Starting Point
        </button>
        <p className="text-sm text-slate-500 mt-4">
          This will create a private copy in your workspace that you can edit.
        </p>
      </div>
    </div>
  );
}
