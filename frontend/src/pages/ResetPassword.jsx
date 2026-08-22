import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const otp = searchParams.get('otp');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return alert("Passwords do not match");
    }
    try {
      await authApi.resetPassword(email, otp, password, confirmPassword);
      alert("Password has been reset successfully. You can now login.");
      navigate('/login');
    } catch (err) {
      alert("Error resetting password. Your OTP might have expired.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white shadow-lg rounded-xl w-96 border border-slate-200">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Reset Password</h2>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <input type="password" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
            <input type="password" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 font-semibold transition">
            Save New Password
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="text-indigo-600 hover:underline">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
