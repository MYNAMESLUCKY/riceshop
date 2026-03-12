import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, UserPlus, LogIn, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isAdminEmail } from '../../lib/authz';
import toast from 'react-hot-toast';

export const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const withTimeout = async (promise, ms = 15000) => {
    let timerId;
    const timeout = new Promise((_, reject) => {
      timerId = setTimeout(() => reject(new Error('Sign in timed out. Please try again.')), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timerId);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { toast.error('Email is required'); return; }
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      );
      if (error) throw error;
      toast.success('Welcome back!');
      navigate(isAdminEmail(data?.user?.email || normalizedEmail) ? '/admin' : '/');
    } catch (err) {
      toast.error(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();
    if (!normalizedEmail) { toast.error('Email is required'); return; }
    if (!normalizedFullName) { toast.error('Full name is required'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: normalizedFullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      // Create the profile record (silently log table missing error if DB isn't set up yet)
      if (data.user) {
        const role = isAdminEmail(data.user.email || normalizedEmail) ? 'admin' : 'user';
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: normalizedFullName,
          role,
        });
        if (profileError) {
          console.warn('Profile sync skipped (DB tables might be missing):', profileError.message);
        }
      }

      toast.success('Account created! Check your email to confirm, then sign in.', { duration: 6000 });
      setMode('signin');
    } catch (err) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    flex: 1, padding: '0.8rem 1rem', background: 'none', border: 'none',
    color: 'white', outline: 'none', fontSize: '1rem',
  };
  const wrapStyle = {
    display: 'flex', alignItems: 'center',
    background: 'var(--bg-color)', border: '1px solid var(--border)',
    borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
            <MapPin color="#f59e0b" size={32} />
            Golden<span>Grain</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Card */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(30,30,30,0.8) 0%, rgba(15,15,15,0.9) 100%)', 
          padding: '2.5rem', 
          borderRadius: '24px', 
          border: '1px solid var(--border)', 
          boxShadow: 'var(--shadow-3d), inset 0 1px 0 rgba(255,255,255,0.05)' 
        }}>

          {/* Tab Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: '12px', padding: '4px', marginBottom: '2rem' }}>
            {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([key, label]) => (
              <button key={key} onClick={() => setMode(key)} style={{
                flex: 1, padding: '0.6rem', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                background: mode === key ? 'var(--primary)' : 'transparent',
                color: mode === key ? '#000' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
              }}>
                {key === 'signin' ? <LogIn size={16} /> : <UserPlus size={16} />}
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Full Name - signup only */}
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name</label>
                <div style={wrapStyle}>
                  <div style={{ padding: '0 1rem', color: 'var(--text-secondary)', display: 'flex' }}>
                    <UserPlus size={18} color="var(--primary)" />
                  </div>
                  <input type="text" required placeholder="Rahul Sharma" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email Address</label>
              <div style={wrapStyle}>
                <div style={{ padding: '0 1rem', color: 'var(--text-secondary)', display: 'flex' }}>
                  <Mail size={18} color="var(--primary)" />
                </div>
                <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Password</label>
              <div style={wrapStyle}>
                <div style={{ padding: '0 1rem', display: 'flex', color: 'var(--text-secondary)' }}>
                  <Lock size={18} color="var(--primary)" />
                </div>
                <input type={showPass ? 'text' : 'password'} required placeholder="••••••••" minLength={6} value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ padding: '0 1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'signup' && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Minimum 6 characters</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.9rem', fontSize: '1rem', opacity: loading ? 0.6 : 1, marginTop: '0.5rem', width: '100%' }}>
              {loading
                ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
                : mode === 'signin'
                  ? <><LogIn size={18} /> Sign In</>
                  : <><UserPlus size={18} /> Create Account <ArrowRight size={18} /></>
              }
            </button>
          </form>

          {mode === 'signup' && (
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              After sign up, check your email to confirm your account before signing in.
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          📱 Phone OTP login coming soon
        </p>
      </div>
    </div>
  );
};
