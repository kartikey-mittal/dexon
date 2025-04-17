import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle2, Lock, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            setUser({
              id: data.user.id,
              email: data.user.email!,
              role: profile.role,
              name: profile.name,
            });
            navigate(`/${profile.role}`);
          }
        }
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                name,
                role,
                email: data.user.email,
              },
            ]);

          if (profileError) throw profileError;

          setUser({
            id: data.user.id,
            email: data.user.email!,
            role,
            name,
          });
          navigate(`/${role}`);
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">
          {isLogin ? 'Welcome Back! 👋' : 'Create Account 🚀'}
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <div className="relative">
                  <UserCircle2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    className={`p-3 rounded-lg border ${
                      role === 'parent'
                        ? 'bg-purple-100 border-purple-500 text-purple-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('child')}
                    className={`p-3 rounded-lg border ${
                      role === 'child'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    Child
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-600 hover:text-purple-700"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;