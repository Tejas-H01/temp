import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tripsApi } from '../api';

export default function PublicTrip() {
  const { shareId } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    tripsApi.getPublicTrip(shareId)
      .then(res => setTrip(res))
      .catch(() => setError(true));
  }, [shareId]);

  if (error) return <div className="p-10 text-center text-red-600">Trip not found or is no longer public.</div>;
  if (!trip) return <div className="p-10 text-center">Loading public trip...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 bg-white shadow-lg rounded-xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-slate-800">{trip.name}</h1>
        <p className="text-lg text-slate-500 mt-2">{trip.start_date} to {trip.end_date}</p>
      </div>
      <div className="prose max-w-none text-slate-700 text-center">
        {trip.description}
      </div>
      <div className="mt-10 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Itinerary Preview</h2>
        <div className="text-center text-slate-500 italic">
          (Shared itinerary content will be displayed here)
        </div>
      </div>
      <div className="mt-12 text-center">
        <Link to="/login" className="text-indigo-600 hover:underline font-medium">Create your own trip with GlobeTrotter</Link>
      </div>
    </div>
  );
}
