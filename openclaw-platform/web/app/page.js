'use client';

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    email: '',
    modelProvider: 'kimi-coding',
    apiKey: '',
    telegramToken: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>🦞 OpenClaw Platform</h1>
        <p>Deploy your AI assistant in under 1 minute</p>
      </header>

      <main style={styles.main}>
        {step === 1 && (
          <div style={styles.card}>
            <h2>Step 1: Your Email</h2>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={styles.input}
            />
            <button
              onClick={() => form.email && setStep(2)}
              style={styles.button}
              disabled={!form.email}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={styles.card}>
            <h2>Step 2: AI Model</h2>
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
            />
            <p style={styles.hint}>Your API key is encrypted and never shared.</p>
            <div style={styles.buttonGroup}>
              <button onClick={() => setStep(1)} style={styles.buttonSecondary}>Back</button>
              <button
                onClick={() => form.apiKey && setStep(3)}
                style={styles.button}
                disabled={!form.apiKey}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.card}>
            <h2>Step 3: Telegram Bot</h2>
            <p style={styles.text}>
              Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> and paste the token:
            </p>
            <input
              type="text"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={form.telegramToken}
              onChange={(e) => setForm({ ...form, telegramToken: e.target.value })}
              style={styles.input}
            />
            <div style={styles.buttonGroup}>
              <button onClick={() => setStep(2)} style={styles.buttonSecondary}>Back</button>
              <button
                onClick={handleSubmit}
                style={styles.button}
                disabled={!form.telegramToken || loading}
              >
                {loading ? 'Deploying...' : '🚀 Deploy Instance'}
              </button>
            </div>
            {error && <p style={styles.error}>{error}</p>}
          </div>
        )}

        {step === 4 && instance && (
          <div style={styles.card}>
            <h2>🎉 Your Instance is Ready!</h2>
            
            <div style={styles.result}>
              <p><strong>Dashboard URL:</strong></p>
              <a href={instance.dashboardUrl} target="_blank" rel="noopener" style={styles.link}>
                {instance.dashboardUrl}
              </a>
              
              <p><strong>Password:</strong> {instance.password}</p>
              <p><strong>Telegram Bot:</strong> @{instance.telegramBotUsername}</p>
              
              <div style={styles.instructions}>
                <h3>Next Steps:</h3>
                <ol>
                  <li>Open your dashboard using the link above</li>
                  <li>Enter the password when prompted</li>
                  <li>Message your Telegram bot to activate it</li>
                  <li>Approve the pairing request in the dashboard</li>
                </ol>
              </div>
            </div>
            
            <button onClick={() => window.location.reload()} style={styles.button}>
              Deploy Another
            </button>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>Built with ❤️ for the OpenClaw community</p>
      </footer>
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
  header: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: 'white',
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
  text: {
    color: '#666',
    lineHeight: 1.6,
  },
  hint: {
    fontSize: '14px',
    color: '#888',
    marginTop: '-0.5rem',
    marginBottom: '1rem',
  },
  error: {
    color: '#e74c3c',
    marginTop: '1rem',
  },
  result: {
    background: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  link: {
    color: '#667eea',
    wordBreak: 'break-all',
    display: 'block',
    marginBottom: '1rem',
  },
  instructions: {
    marginTop: '1.5rem',
  },
  footer: {
    textAlign: 'center',
    padding: '2rem',
    color: 'white',
    opacity: 0.8,
  },
};