'use client';

import { useState, useEffect } from 'react';

// Simple card component
function Card({ children }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '2rem',
      maxWidth: '400px',
      width: '100%',
      margin: '0 auto',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
    }}>
      {children}
    </div>
  );
}

// Button component
function Button({ children, onClick, disabled, secondary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px',
        background: secondary ? '#e0e0e0' : '#667eea',
        color: secondary ? '#333' : 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1
      }}
    >
      {children}
    </button>
  );
}

// Input component  
function Input({ type, placeholder, value, onChange, required }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      style={{
        width: '100%',
        padding: '12px',
        marginBottom: '1rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '16px',
        boxSizing: 'border-box'
      }}
    />
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [checking, setChecking] = useState(true);
  
  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await fetch('/platform/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setView('dashboard');
          }
        }
      } catch (err) {
        console.log('Auth check failed:', err);
      }
      setChecking(false);
    };
    checkAuth();
  }, []);

  // Safety: if user is logged in but view is not dashboard or create, reset to dashboard
  useEffect(() => {
    if (user && view !== 'dashboard' && view !== 'create') {
      setView('dashboard');
    }
  }, [user, view]);

  const handleLogin = async (email, password) => {
    const res = await fetch('/platform/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setView('dashboard');
    }
    return data;
  };

  const handleRegister = async (email, password) => {
    const res = await fetch('/platform/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setView('dashboard');
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <header style={{ textAlign: 'center', padding: '2rem 1rem', color: 'white' }}>
        <h1>🦞 OpenClaw Platform</h1>
        <p>Deploy your AI assistant in under 1 minute</p>
        {user && (
          <div style={{ marginTop: '1rem' }}>
            <span>{user.email} | </span>
            <button onClick={logout} style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Logout
            </button>
          </div>
        )}
      </header>

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        padding: '2rem 1rem' 
      }}>
        {checking ? (
          <Card>
            <h2>Welcome</h2>
            <p>Checking session...</p>
          </Card>
        ) : user ? (
          view === 'dashboard' ? (
            <Dashboard user={user} onCreate={() => setView('create')} />
          ) : (
            <CreateInstance 
              onBack={() => setView('dashboard')} 
              onCreated={() => setView('dashboard')}
            />
          )
        ) : view === 'login' ? (
          <LoginForm 
            onLogin={handleLogin} 
            onSwitch={() => setView('register')} 
          />
        ) : (
          <RegisterForm 
            onRegister={handleRegister} 
            onSwitch={() => setView('login')} 
          />
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', color: 'white', opacity: 0.8 }}>
        <p>Built with ❤️ for the OpenClaw community</p>
      </footer>
    </div>
  );
}

function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = await onLogin(email, password);
    if (!data.user) setError(data.error || 'Login failed');
    setLoading(false);
  };

  return (
    <Card>
      <h2 style={{ marginBottom: '1.5rem' }}>Login</h2>
      <form onSubmit={handleSubmit}>
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p style={{ color: '#e74c3c', marginBottom: '1rem' }}>{error}</p>}
        <Button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem', color: '#666' }}>
        Don't have an account?{' '}
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}>
          Register
        </button>
      </p>
    </Card>
  );
}

function RegisterForm({ onRegister, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = await onRegister(email, password);
    if (!data.user) setError(data.error || 'Registration failed');
    setLoading(false);
  };

  return (
    <Card>
      <h2 style={{ marginBottom: '1.5rem' }}>Register</h2>
      <form onSubmit={handleSubmit}>
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
        {error && <p style={{ color: '#e74c3c', marginBottom: '1rem' }}>{error}</p>}
        <Button disabled={loading}>{loading ? 'Creating account...' : 'Register'}</Button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem', color: '#666' }}>
        Already have an account?{' '}
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}>
          Login
        </button>
      </p>
    </Card>
  );
}

function Dashboard({ user, onCreate }) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/platform/api/instances', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setInstances(data.instances || []);
      } catch (err) {
        console.error('Failed to fetch instances:', err);
      }
      setLoading(false);
    };
    fetchInstances();
  }, []);

  if (loading) {
    return (
      <Card>
        <p>Loading instances...</p>
      </Card>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', color: 'white' }}>
        <h2>Your Instances</h2>
        <Button onClick={onCreate}>+ Create New Instance</Button>
      </div>
      
      {instances.length === 0 ? (
        <Card>
          <p>No instances yet. Create your first OpenClaw deployment!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {instances.map(inst => (
            <Card key={inst.id}>
              <h3>Instance {inst.id?.slice(0, 8)}</h3>
              <p>Status: {inst.status}</p>
              <p>Model: {inst.modelProvider}</p>
              <a href={inst.dashboardUrl} target="_blank" rel="noopener" style={{ color: '#667eea' }}>
                Open Dashboard →
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateInstance({ onBack, onCreated }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [instance, setInstance] = useState(null);
  const [form, setForm] = useState({
    modelProvider: 'kimi-coding',
    apiKey: '',
    telegramToken: '',
    telegramBotUsername: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/platform/api/instances', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create instance');

      setInstance(data);
      setStep(4);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 4 && instance) {
    return (
      <Card>
        <h2>🎉 Instance Created!</h2>
        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'left' }}>
          <p><strong>Dashboard:</strong> <a href={instance.dashboardUrl} target="_blank" rel="noopener" style={{ color: '#667eea' }}>{instance.dashboardUrl}</a></p>
          <p><strong>Password:</strong> {instance.password}</p>
          <p><strong>Bot:</strong> @{instance.telegramBotUsername}</p>
        </div>
        
        <div style={{ background: '#e8f5e9', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'left' }}>
          <h3>📱 Pair Your Telegram Bot</h3>
          <p>To complete setup, you need to pair your bot:</p>
          <ol style={{ paddingLeft: '1.2rem', lineHeight: '1.8' }}>
            <li>Open Telegram and search for <strong>@{instance.telegramBotUsername}</strong></li>
            <li>Send <code>/start</code> or any message to your bot</li>
            <li>The bot will reply with a <strong>verification code</strong></li>
            <li>Go to your <a href={instance.dashboardUrl} target="_blank" rel="noopener" style={{ color: '#667eea' }}>dashboard</a> and enter the code</li>
          </ol>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            💡 The bot needs this pairing step to know which chat to send messages to.
          </p>
        </div>
        
        <Button onClick={onBack}>Back to Dashboard</Button>
      </Card>
    );
  }

  return (
    <Card>
      <h2>Create Instance - Step {step}/3</h2>

      {step === 1 && (
        <>
          <select
            value={form.modelProvider}
            onChange={(e) => setForm({ ...form, modelProvider: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '1rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          >
            <option value="kimi-coding">Kimi K2.5</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI GPT</option>
          </select>
          <Input 
            type="password" 
            placeholder="API Key" 
            value={form.apiKey} 
            onChange={e => setForm({...form, apiKey: e.target.value})} 
            required 
          />
          <Button onClick={() => form.apiKey && setStep(2)}>Continue</Button>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <p><strong>Step-by-step to create your Telegram bot:</strong></p>
            <ol style={{ paddingLeft: '1.2rem', lineHeight: '1.8' }}>
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send <code>/newbot</code> to BotFather</li>
              <li>Choose a name for your bot (e.g., "My Claw Assistant")</li>
              <li>Choose a unique username ending in <strong>bot</strong> (e.g., myclaw_bot)</li>
              <li>BotFather will send you a token like:<br/>
                <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>123456789:ABCdefGHIjklMNOpqrSTUvwxyz</code>
              </li>
              <li><strong>Copy that token and paste it below</strong></li>
            </ol>
          </div>
          <Input 
            type="text" 
            placeholder="Bot Token (e.g., 123456789:ABCdef...)" 
            value={form.telegramToken} 
            onChange={e => setForm({...form, telegramToken: e.target.value})} 
            required 
          />
          <Input 
            type="text" 
            placeholder="Bot Username (e.g., myclaw_bot)" 
            value={form.telegramBotUsername} 
            onChange={e => setForm({...form, telegramBotUsername: e.target.value})} 
            required 
          />
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            ℹ️ This is the username you chose (ends with 'bot'). BotFather shows it after "You can now use..."
          </p>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button onClick={() => setStep(1)} secondary>Back</Button>
            <Button onClick={() => form.telegramToken && form.telegramBotUsername && setStep(3)}>Continue</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          {error && <p style={{ color: '#e74c3c', marginBottom: '1rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button onClick={() => setStep(2)} secondary>Back</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '🚀 Deploying...' : '🚀 Deploy Instance'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}