import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await authApi.login(email, password);
      if (res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        navigate('/dashboard');
      }
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white shadow-lg rounded-xl w-96">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">GlobeTrotter Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input 
              type="email" 
              autoComplete="off"
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={email} onChange={e => setEmail(e.target.value)} required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input 
              type="password" 
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={password} onChange={e => setPassword(e.target.value)} required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 font-semibold">
            Login
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600 flex flex-col space-y-2">
          <Link to="/forgot-password" className="text-indigo-600 hover:underline">Forgot password?</Link>
          <div>
            Don't have an account? <Link to="/register" className="text-indigo-600 hover:underline">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
