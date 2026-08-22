import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tripsApi, masterApi } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTrips, setShowAllTrips] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    tripsApi.getDashboard().then(res => setData(res)).catch(() => navigate('/login'));
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      masterApi.getCities(searchQuery).then(res => {
        setCities(res.slice(0, 9));
      }).catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!data) return <div className="p-10 text-center">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">GlobeTrotter Dashboard</h1>
        <div className="flex gap-4 items-center">
          <Link to="/community" className="text-slate-600 font-medium hover:text-indigo-600">
            Community
          </Link>
          <Link to="/profile" className="text-slate-600 font-medium hover:text-indigo-600">
            Profile Settings
          </Link>
          <Link to="/trips/create" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
            Plan New Trip
          </Link>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Upcoming Trips</h2>
        {data.upcoming_trips.length === 0 ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-slate-500 text-center">
            No upcoming trips. Time to plan one!
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(showAllTrips ? data.upcoming_trips : data.upcoming_trips.slice(0, 3)).map(trip => (
                <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
                  {trip.cover_image && <img src={trip.cover_image} alt="Cover" className="w-full h-40 object-cover" />}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{trip.name}</h3>
                    <p className="text-sm text-slate-500">{trip.start_date} to {trip.end_date}</p>
                    <Link to={`/trips/${trip.id}`} className="mt-4 block text-indigo-600 font-medium hover:underline">View Trip &rarr;</Link>
                  </div>
                </div>
              ))}
            </div>
            {data.upcoming_trips.length > 3 && (
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setShowAllTrips(!showAllTrips)}
                  className="bg-white border border-slate-300 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  {showAllTrips ? 'Show Less' : 'View All Trips \u2192'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-xl font-semibold text-slate-700">Explore Destinations</h2>
          <input
            type="text"
            placeholder="Search destinations..."
            className="border border-slate-300 rounded-md px-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:border-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {cities.length === 0 ? (
          <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500">
            No destinations found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cities.map(city => (
              <Link to={`/cities/${city.id}`} key={city.id} className="block group">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group-hover:shadow-md transition">
                  <div className="h-36 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 flex items-end p-4">
                    <div className="text-white">
                      <h3 className="font-bold text-xl">{city.city}</h3>
                      <p className="text-sm text-white/80">{city.state}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
