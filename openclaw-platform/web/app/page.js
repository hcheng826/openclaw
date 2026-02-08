'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // login, register, dashboard, create
  
  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);
  
  const fetchUser = async (token) => {
    try {
      const res = await fetch('/platform/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setView('dashboard');
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>🦞 OpenClaw Platform</h1>
        <p>Deploy your AI assistant in under 1 minute</p>
        {user && (
          <div style={styles.userBar}>
            <span>Logged in as: {user.email}</span>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                setUser(null);
                setView('login');
              }}
              style={styles.logoutButton}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main style={styles.main}>
        {!user && view === 'login' && (
          <LoginForm onLogin={setUser} onSwitch={() => setView('register')} setView={setView} />
        )}
        
        {!user && view === 'register' && (
          <RegisterForm onRegister={setUser} onSwitch={() => setView('login')} setView={setView} />
        )}
        
        {user && view === 'dashboard' && (
          <Dashboard user={user} setView={setView} />
        )}
        
        {user && view === 'create' && (
          <CreateInstance user={user} onBack={() => setView('dashboard')} />
        )}
      </main>

      <footer style={styles.footer}>
        <p>Built with ❤️ for the OpenClaw community</p>
      </footer>
    </div>
  );
}

function LoginForm({ onLogin, onSwitch, setView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/platform/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      localStorage.setItem('token', data.token);
      onLogin(data.user);
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
      <p style={styles.switchText}>
        Don't have an account?{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} style={styles.link}>
          Register
        </a>
      </p>
    </div>
  );
}

function RegisterForm({ onRegister, onSwitch, setView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/platform/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      localStorage.setItem('token', data.token);
      onRegister(data.user);
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          minLength={8}
          required
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
      <p style={styles.switchText}>
        Already have an account?{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} style={styles.link}>
          Login
        </a>
      </p>
    </div>
  );
}

function Dashboard({ user, setView }) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/platform/api/instances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch instances');
      
      const data = await res.json();
      setInstances(data.instances);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.centered}><h2>Loading instances...</h2></div>;

  return (
    <div style={styles.dashboard}>
      <div style={styles.dashboardHeader}>
        <h2>Your Instances</h2>
        <button onClick={() => setView('create')} style={styles.button}>
          + Create New Instance
        </button>
      </div>
      
      {error && <p style={styles.error}>{error}</p>}
      
      {instances.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No instances yet. Create your first OpenClaw deployment!</p>
          <button onClick={() => setView('create')} style={styles.button}>
            Deploy Instance
          </button>
        </div>
      ) : (
        <div style={styles.instanceList}>
          {instances.map(inst => (
            <div key={inst.id} style={styles.instanceCard}>
              <h3>Instance {inst.id.slice(0, 8)}</h3>
              <p><strong>Status:</strong> {inst.status}</p>
              <p><strong>Model:</strong> {inst.modelProvider}</p>
              <p><strong>Created:</strong> {new Date(inst.createdAt).toLocaleDateString()}</p>
              <a href={inst.dashboardUrl} target="_blank" rel="noopener" style={styles.link}>
                Open Dashboard →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateInstance({ user, onBack }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [instance, setInstance] = useState(null);
  const [form, setForm] = useState({
    modelProvider: 'kimi-coding',
    apiKey: '',
    telegramToken: '',
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create instance');
      }

      setInstance(data);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Telegram Setup Instructions
  const TelegramInstructions = () => (
    <div style={styles.instructionsBox}>
      <h4>📱 How to set up your Telegram bot:</h4>
      <ol style={styles.instructionsList}>
        <li>Message <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> on Telegram</li>
        <li>Send <code>/newbot</code> and follow the prompts</li>
        <li>Copy the bot token (looks like: <code>123456789:ABCdef...</code>)</li>
        <li>Paste it below</li>
        <li>After deployment, message your bot to activate it</li>
        <li>Approve the pairing in your OpenClaw dashboard</li>
      </ol>
      <p style={styles.note}>
        💡 <strong>Tip:</strong> You can also add the bot to a group chat for group access.
      </p>
    </div>
  );

  if (step === 4 && instance) {
    return (
      <div style={styles.card}>
        <h2>🎉 Instance Created!</h2>
        
        <div style={styles.result}>
          <p><strong>Dashboard URL:</strong></p>
          <a href={instance.dashboardUrl} target="_blank" rel="noopener" style={styles.dashboardLink}>
            {instance.dashboardUrl}
          </a>
          
          <p><strong>Password:</strong> <code>{instance.password}</code></p>
          
          <h3>📱 Telegram Bot Setup</h3>
          <p><strong>Bot:</strong> @{instance.telegramBotUsername}</p>
          
          <div style={styles.telegramSteps}>
            <h4>Next Steps:</h4>
            <ol>
              <li>Find your bot on Telegram: @{instance.telegramBotUsername}</li>
              <li>Send a message like "hello" to the bot</li>
              <li>Open your <a href={instance.dashboardUrl} target="_blank" rel="noopener">dashboard</a></li>
              <li>Go to "Pairing" section in the dashboard</li>
              <li>Approve your Telegram pairing request</li>
              <li>Start chatting with your AI assistant!</li>
            </ol>
          </div>
          
          <div style={styles.noteBox}>
            <strong>⚠️ Important:</strong> Save this password! You won't see it again.
          </div>
        </div>
        
        <div style={styles.buttonGroup}>
          <button onClick={onBack} style={styles.button}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.stepIndicator}>
        <span style={step === 1 ? styles.activeStep : styles.step}>1. Model</span>
        <span> → </span>
        <span style={step === 2 ? styles.activeStep : styles.step}>2. Telegram</span>
        <span> → </span>
        <span style={step === 3 ? styles.activeStep : styles.step}>3. Deploy</span>
      </div>

      {step === 1 && (
        <>
          <h2>Step 1: AI Model</h2>
          <select
            value={form.modelProvider}
            onChange={(e) => setForm({ ...form, modelProvider: e.target.value })}
            style={styles.input}
          >
            <option value="kimi-coding">Kimi K2.5 (Recommended)</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI GPT</option>
          </select>
          <input
            type="password"
            placeholder="Your API Key"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            style={styles.input}
            required
          />
          <p style={styles.hint}>Your API key is encrypted and stored securely.</p>
          <div style={styles.buttonGroup}>
            <button onClick={onBack} style={styles.buttonSecondary}>Back</button>
            <button
              onClick={() => form.apiKey && setStep(2)}
              style={styles.button}
              disabled={!form.apiKey}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Step 2: Telegram Bot</h2>
          <TelegramInstructions />
          <input
            type="text"
            placeholder="Bot Token (e.g., 123456789:ABCdefGHIjkl...)"
            value={form.telegramToken}
            onChange={(e) => setForm({ ...form, telegramToken: e.target.value })}
            style={styles.input}
            required
          />
          <div style={styles.buttonGroup}>
            <button onClick={() => setStep(1)} style={styles.buttonSecondary}>Back</button>
            <button
              onClick={() => form.telegramToken && setStep(3)}
              style={styles.button}
              disabled={!form.telegramToken}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2>Step 3: Deploy</h2>
          <div style={styles.summary}>
            <p><strong>Model:</strong> {form.modelProvider}</p>
            <p><strong>API Key:</strong> {'*'.repeat(form.apiKey.length)}</p>
            <p><strong>Telegram Bot:</strong> {form.telegramToken.split(':')[0]}...</p>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.buttonGroup}>
            <button onClick={() => setStep(2)} style={styles.buttonSecondary}>Back</button>
            <button
              onClick={handleSubmit}
              style={styles.button}
              disabled={loading}
            >
              {loading ? '🚀 Deploying...' : '🚀 Deploy Instance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  centered: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
  },
  header: {
    textAlign: 'center',
    padding: '2rem 1rem',
    color: 'white',
  },
  userBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    fontSize: '14px',
  },
  logoutButton: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid white',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '12px 24px',
    background: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
  },
  error: {
    color: '#e74c3c',
    marginTop: '1rem',
  },
  switchText: {
    textAlign: 'center',
    marginTop: '1rem',
    color: '#666',
  },
  link: {
    color: '#667eea',
  },
  dashboard: {
    width: '100%',
    maxWidth: '800px',
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    color: 'white',
  },
  emptyState: {
    background: 'white',
    borderRadius: '12px',
    padding: '3rem',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  instanceList: {
    display: 'grid',
    gap: '1rem',
  },
  instanceCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    fontSize: '14px',
    color: '#666',
  },
  step: {
    color: '#999',
  },
  activeStep: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  instructionsBox: {
    background: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '14px',
  },
  instructionsList: {
    margin: '0.5rem 0',
    paddingLeft: '1.5rem',
  },
  note: {
    fontSize: '13px',
    color: '#666',
    marginTop: '0.5rem',
  },
  summary: {
    background: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  result: {
    background: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  dashboardLink: {
    display: 'block',
    color: '#667eea',
    wordBreak: 'break-all',
    marginBottom: '1rem',
    fontSize: '14px',
  },
  telegramSteps: {
    background: 'white',
    padding: '1rem',
    borderRadius: '6px',
    marginTop: '1rem',
  },
  noteBox: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '1rem',
    borderRadius: '6px',
    marginTop: '1rem',
  },
  footer: {
    textAlign: 'center',
    padding: '2rem',
    color: 'white',
    opacity: 0.8,
  },
};