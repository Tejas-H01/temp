import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api';

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const purpose = searchParams.get('purpose');
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await authApi.verifyOtp(email, purpose, otp);
      if (purpose === 'REGISTRATION') {
        alert("Verification successful! You can now login.");
        navigate('/login');
      } else if (purpose === 'LOGIN') {
        // If they had 2FA login
        localStorage.setItem('access_token', res.data.access_token);
        navigate('/dashboard');
      } else if (purpose === 'PASSWORD_RESET') {
        navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
      }
    } catch (err) {
      alert("Invalid or expired OTP. Please try again.");
    }
  };

  const handleResend = async () => {
    try {
      await authApi.resendOtp(email, purpose);
      alert("A new OTP has been sent to your email.");
    } catch (err) {
      alert("Failed to resend OTP. Please wait 45 seconds and try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white shadow-lg rounded-xl w-96 border border-slate-200">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Verify OTP</h2>
        <p className="text-sm text-center text-slate-500 mb-6">We've sent a 6-digit code to {email}</p>
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input type="text" required maxLength={6} placeholder="Enter OTP" className="text-center text-2xl tracking-widest mt-1 block w-full rounded-md border-slate-300 shadow-sm p-3 border" 
              value={otp} onChange={e => setOtp(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 font-semibold transition">
            Verify Code
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={handleResend} className="text-sm text-indigo-600 hover:underline">Resend OTP</button>
        </div>
      </div>
    </div>
  );
}
