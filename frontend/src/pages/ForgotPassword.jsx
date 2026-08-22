import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleForgot = async (e) => {
    e.preventDefault();
    try {
      await authApi.forgotPassword(email);
      navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=PASSWORD_RESET`);
    } catch (err) {
      alert("If the email exists, a reset code has been sent.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white shadow-lg rounded-xl w-96 border border-slate-200">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-4">Forgot Password</h2>
        <p className="text-sm text-center text-slate-500 mb-6">Enter your email address and we'll send you an OTP to reset your password.</p>
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <input type="email" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 font-semibold transition">
            Send Reset Code
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600">
          Remembered your password? <Link to="/login" className="text-indigo-600 hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
}
