import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usersApi, communityApi } from '../api';

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    usersApi.getPublicProfile(username)
      .then(res => {
        setProfile(res);
      })
      .catch(err => {
        console.error("Error loading public profile:", err);
        setError(err.response?.data?.detail || "Profile not found.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [username]);

  const handleShareProfile = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name || username}'s Travel Profile`,
          text: `Check out ${profile?.full_name || username}'s travel experiences on GlobeTrotter!`,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Error sharing profile:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-8 animate-pulse">
          <div className="h-64 bg-slate-200 rounded-3xl"></div>
          <div className="flex gap-8 px-6">
            <div className="w-32 h-32 rounded-full bg-slate-200 -mt-16 border-4 border-white shadow-lg"></div>
            <div className="flex-1 space-y-4 pt-2">
              <div className="h-6 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6">
            <div className="h-48 bg-slate-200 rounded-xl"></div>
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 bg-white shadow-xl rounded-2xl max-w-md border border-slate-200 space-y-4">
          <div className="text-4xl">🏝️</div>
          <h2 className="text-2xl font-bold text-slate-800">Profile Not Found</h2>
          <p className="text-slate-600">The traveler <span className="font-semibold text-slate-800">@{username}</span> could not be found or has disabled their public profile.</p>
          <Link to="/community" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Navbar area */}
      <div className="max-w-5xl mx-auto pt-6 px-6">
        <Link to="/community" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition flex items-center gap-1">
          &larr; Back to Community
        </Link>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Cover / Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          <div className="p-8 relative pt-0">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-300 border-4 border-white shadow-md shrink-0 flex items-center justify-center text-4xl text-slate-500 font-bold">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(profile.full_name || username)[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-extrabold text-slate-800">{profile.full_name || username}</h1>
                  <p className="text-indigo-600 font-medium text-sm">@{profile.username}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleShareProfile}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition shadow-sm border border-slate-200"
                >
                  {copied ? '✅ Link Copied!' : '📤 Share Profile'}
                </button>
              </div>
            </div>

            {/* Travel Bio */}
            <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
              <div className="max-w-2xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Travel Bio</h3>
                <p className="text-slate-600 italic">
                  {profile.bio || "No travel bio provided yet. Just a quiet wanderer exploring the globe."}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-6 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-150">
                <div className="text-center">
                  <span className="block text-2xl font-black text-slate-800">{profile.experience_count}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Experiences</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Travel Experiences Section */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            ✈️ Travel Portfolio
          </h2>

          {profile.experiences.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-sm">
              <div className="text-4xl mb-4">🎒</div>
              <p className="text-lg font-medium text-slate-700">No public travel experiences yet.</p>
              <p className="text-sm mt-1 text-slate-500">Check back later when @{profile.username} publishes their adventures.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.experiences.map(exp => (
                <div key={exp.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition duration-200 group">
                  {exp.cover_image && (
                    <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                      <img src={exp.cover_image} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-grow space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{exp.title}</h3>
                      <div className="shrink-0 flex items-center gap-1 text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-xs font-semibold">
                        ♥ {exp.like_count}
                      </div>
                    </div>

                    {exp.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 whitespace-pre-wrap">{exp.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs font-semibold pt-1">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                        ⏱️ {exp.duration_days} days
                      </span>
                      {exp.budget_tier && (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg capitalize">
                          💵 {exp.budget_tier}
                        </span>
                      )}
                    </div>

                    {exp.interests && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        <span className="font-bold text-slate-600">Interests:</span> {exp.interests}
                      </p>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                      <div className="text-xs text-slate-400 font-medium">
                        Used {exp.copy_count} {exp.copy_count === 1 ? 'time' : 'times'}
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/community/experiences/${exp.id}`} className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                          View Itinerary
                        </Link>
                        <button
                          onClick={() => handleUseTrip(exp.id)}
                          className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                        >
                          Use This Trip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
