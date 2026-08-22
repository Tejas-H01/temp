import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api';

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirm_password: '' });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      return alert("Passwords do not match!");
    }
    try {
      const res = await authApi.register(formData.username, formData.email, formData.password, formData.confirm_password);
      
      // If the backend returns a success but says the email exists and hasn't been verified
      if (res.success && res.message && res.message.includes("already exists but hasn't been verified")) {
          alert(res.message);
      }
      
      // Navigate to OTP verification passing the email
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&purpose=REGISTRATION`);
    } catch (err) {
      let errorMsg = err.response?.data?.message || err.message || "Registration failed. Please try again.";
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const details = Object.entries(errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('\n');
        errorMsg = `${errorMsg}\n\nDetails:\n${details}`;
      }
      alert(errorMsg);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white shadow-lg rounded-xl w-96 border border-slate-200">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Create Account</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input type="text" required autoComplete="off" id="reg_username_field" name="reg_username_field" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            <p className="text-[10px] text-slate-500 mt-1">Must be 3-30 characters, using only letters, numbers, and underscores.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" required autoComplete="off" id="reg_email_field" name="reg_email_field" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" required autoComplete="new-password" id="reg_password_field" name="reg_password_field" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <p className="text-[10px] text-slate-500 mt-1">Must be at least 8 characters, containing uppercase, lowercase, number, and special character.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
            <input type="password" required autoComplete="new-password" id="reg_confirm_password_field" name="reg_confirm_password_field" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border" 
              value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 font-semibold transition">
            Register
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Login here</Link>
        </div>
      </div>
    </div>
  );
}
