'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'weareme') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Admin Panel</h1>
          <p className="text-center text-gray-600 mb-8">Enter your password to access the admin panel</p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                className="w-full px-4 py-4 text-black font-semibold border border-gray-300 rounded-lg outline-none focus:border-[#FF4747] bg-white pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            
            <button
              type="submit"
              className="w-full bg-[#FF4747] hover:bg-[#e03030] text-white py-4 rounded-lg text-lg font-bold transition-all active:scale-[0.98]"
            >
              Access Admin Panel
            </button>
          </form>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 text-gray-600 hover:text-gray-900 py-2 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return <AdminPanel onBack={() => router.push('/')} />;
}
