import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi, savedDestinationsApi, masterApi } from '../api';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [profileForm, setProfileForm] = useState({ full_name: '', language: 'en', avatar_url: '', bio: '' });
  
  const [savedDestinations, setSavedDestinations] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [cityToAdd, setCityToAdd] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await authApi.getMe();
        if (userRes?.data?.user) {
          const u = userRes.data.user;
          setUser(u);
          setProfileForm({
            full_name: u.full_name || '',
            language: u.language || 'en',
            avatar_url: u.avatar_url || '',
            bio: u.bio || ''
          });
        }
        
        const destRes = await savedDestinationsApi.getSavedDestinations();
        setSavedDestinations(destRes || []);
        
        const citiesRes = await masterApi.getCities();
        setAllCities(citiesRes || []);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await authApi.updateMe(profileForm);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Error updating profile.");
    }
  };

  const handleAddDestination = async (e) => {
    e.preventDefault();
    if (!cityToAdd) return;
    try {
      await savedDestinationsApi.saveDestination(cityToAdd);
      const destRes = await savedDestinationsApi.getSavedDestinations();
      setSavedDestinations(destRes || []);
      setCityToAdd('');
    } catch (err) {
      alert("Error saving destination.");
    }
  };

  const handleRemoveDestination = async (cityId) => {
    try {
      await savedDestinationsApi.removeDestination(cityId);
      setSavedDestinations(prev => prev.filter(d => d.city_id !== cityId));
    } catch (err) {
      alert("Error removing destination.");
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
      try {
        await authApi.deleteMe();
        localStorage.removeItem('access_token');
        navigate('/login');
      } catch (err) {
        alert("Failed to delete account.");
      }
    }
  };

  if (loading) return <div className="p-10 text-center">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <Link to="/dashboard" className="text-slate-500 hover:text-indigo-600 mb-2 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-3xl font-bold text-slate-800">Your Profile</h1>
        </div>
        {user && (
          <Link to={`/profile/${user.username}`} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-medium border border-slate-300 transition">
            View Public Travel Profile
          </Link>
        )}
      </header>

      {/* Profile Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex gap-8">
        <div className="w-1/3 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-200 mb-4 flex items-center justify-center text-4xl text-slate-400">
            {profileForm.avatar_url ? (
              <img src={profileForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{(user?.username || 'U')[0].toUpperCase()}</span>
            )}
          </div>
          <p className="font-medium text-slate-800">@{user?.username}</p>
          <p className="text-sm text-slate-500">{user?.role}</p>
        </div>
        
        <div className="w-2/3">
          <h2 className="text-xl font-bold mb-4">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <input type="text" disabled className="mt-1 w-full border rounded-md p-2 bg-slate-50 text-slate-500" value={user?.email || ''} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <input type="text" className="mt-1 w-full border rounded-md p-2" value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Avatar URL</label>
              <input type="url" placeholder="https://example.com/avatar.png" className="mt-1 w-full border rounded-md p-2" value={profileForm.avatar_url} onChange={e => setProfileForm({...profileForm, avatar_url: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Travel Bio</label>
              <textarea maxLength="500" placeholder="Tell us about your traveling style..." className="mt-1 w-full border rounded-md p-2 h-20 resize-none" value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Language Preference</label>
              <select className="mt-1 w-full border rounded-md p-2" value={profileForm.language} onChange={e => setProfileForm({...profileForm, language: e.target.value})}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <div className="pt-2">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700">Save Changes</button>
            </div>
          </form>
        </div>
      </section>

      {/* Saved Destinations Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4">Saved Destinations</h2>
        
        <form onSubmit={handleAddDestination} className="flex gap-2 mb-6">
          <select required className="border rounded-md p-2 flex-grow" value={cityToAdd} onChange={e => setCityToAdd(e.target.value)}>
            <option value="">Select a city to save...</option>
            {allCities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.country}</option>)}
          </select>
          <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-md font-medium">Save Destination</button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedDestinations.map(sd => (
            <div key={sd.id} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
              <div className="h-32 bg-slate-200 relative">
                {sd.city?.image_url ? (
                  <img src={sd.city.image_url} alt={sd.city.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                )}
                <button 
                  onClick={() => handleRemoveDestination(sd.city_id)} 
                  className="absolute top-2 right-2 bg-white text-red-500 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-red-50"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-slate-800">{sd.city?.name}</h3>
                <p className="text-sm text-slate-500">{sd.city?.country}</p>
              </div>
            </div>
          ))}
          {savedDestinations.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              You haven't saved any destinations yet.
            </div>
          )}
        </div>
      </section>

      {/* Account Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
        <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-slate-600 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button onClick={handleDeleteAccount} className="bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-md font-medium border border-red-200">
          Delete Account
        </button>
      </section>
    </div>
  );
}
