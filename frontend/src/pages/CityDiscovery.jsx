import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recommendationsApi } from '../api';

export default function CityDiscovery() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    recommendationsApi.getCityBundle(cityId)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load city data');
        setLoading(false);
      });
  }, [cityId]);

  if (loading) return <div className="p-10 text-center">Loading city details...</div>;
  if (error || !data) return <div className="p-10 text-center text-red-500">{error || 'City not found'}</div>;

  const { city, places, restaurants, budget_estimates } = data;

  const mustVisitPlaces = places.filter(p => p.must_visit);
  const otherPlaces = places.filter(p => !p.must_visit);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-indigo-600 mb-2 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-4xl font-bold text-slate-800">{city.city}</h1>
          <p className="text-lg text-slate-600">{city.state}</p>
        </div>
        <Link 
          to={`/trips/create?city_id=${city.id}`} 
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-sm"
        >
          Plan a Trip to this City
        </Link>
      </header>

      {/* Budget Reference */}
      {budget_estimates && (
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Reference Budget</h2>
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <p className="text-slate-600 mb-2">Estimated daily cost for a <span className="font-semibold text-slate-800">{budget_estimates.tier}</span> trip.</p>
              <p className="text-3xl font-bold text-indigo-700">₹{budget_estimates.total_per_day.toLocaleString()}<span className="text-base font-normal text-slate-500"> / day</span></p>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                <p className="text-slate-500">Accommodation</p>
                <p className="font-bold">₹{budget_estimates.accommodation_per_day}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                <p className="text-slate-500">Food</p>
                <p className="font-bold">₹{budget_estimates.food_per_day}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                <p className="text-slate-500">Transport</p>
                <p className="font-bold">₹{budget_estimates.local_transport_per_day}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                <p className="text-slate-500">Activities</p>
                <p className="font-bold">₹{budget_estimates.activities_per_day}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Must Visit Places */}
      {mustVisitPlaces.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-yellow-500">★</span> Must-Visit Places
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mustVisitPlaces.map(place => (
              <div key={place.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-800">{place.place_name}</h3>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">Must Visit</span>
                </div>
                <p className="text-xs text-indigo-600 font-medium mb-3">{place.sub_category}</p>
                <p className="text-slate-600 text-sm mb-4 flex-grow">{place.description}</p>
                <div className="text-xs text-slate-500 flex flex-col gap-1 border-t border-slate-100 pt-3">
                  <p><span className="font-semibold text-slate-600">Duration:</span> {place.duration_needed}</p>
                  <p><span className="font-semibold text-slate-600">Ideal for:</span> {place.ideal_for}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Places */}
      {otherPlaces.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Recommended Places</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPlaces.map(place => (
              <div key={place.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                <h3 className="font-bold text-lg text-slate-800 mb-1">{place.place_name}</h3>
                <p className="text-xs text-indigo-600 font-medium mb-3">{place.sub_category}</p>
                <p className="text-slate-600 text-sm mb-4 flex-grow">{place.description}</p>
                <div className="text-xs text-slate-500 flex flex-col gap-1 border-t border-slate-100 pt-3">
                  <p><span className="font-semibold text-slate-600">Duration:</span> {place.duration_needed}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Where to Eat */}
      {restaurants.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-orange-500">🍽️</span> Where to Eat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map(rest => (
              <div key={rest.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                <h3 className="font-bold text-lg text-slate-800 mb-1">{rest.name}</h3>
                <p className="text-xs text-orange-600 font-medium mb-3">{rest.cuisine} • {rest.category}</p>
                <div className="bg-orange-50 p-3 rounded border border-orange-100 mb-3">
                  <p className="text-xs font-bold text-orange-800 mb-1">Must Try:</p>
                  <p className="text-sm text-slate-700">{rest.must_try_dish}</p>
                </div>
                {rest.notes && <p className="text-xs text-slate-500 italic mt-auto pt-2">{rest.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {places.length === 0 && restaurants.length === 0 && (
        <div className="text-center p-10 bg-white rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500">No recommendations found for this city.</p>
        </div>
      )}
    </div>
  );
}
