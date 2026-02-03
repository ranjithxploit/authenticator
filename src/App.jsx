import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode')
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <div className="app-icon" aria-hidden="true">
            🔐
          </div>
          <div>
            <p className="app-title">Authenticator</p>
            <p className="app-subtitle">Secure one-time codes at a glance</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={() => setIsDark(!isDark)}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            type="button"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="ghost-button" type="button">
            Add account
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="hero">
          <div>
            <p className="hero-label">Active code</p>
            <div className="code-card">
              <div>
                <p className="code-service">Work Email</p>
                <p className="code-value" aria-label="One-time passcode">
                  428 115
                </p>
              </div>
              <div className="code-meta">
                <div className="code-timer">
                  <span>Expires in</span>
                  <strong>19s</strong>
                </div>
                <div className="code-progress" aria-hidden="true">
                  <span style={{ width: '64%' }} />
                </div>
              </div>
              <button className="primary-button" type="button">
                Copy code
              </button>
            </div>
          </div>
          <div className="hero-panel">
            <h2>Stay signed in</h2>
            <p>
              Manage all your one-time codes in a clean, distraction-free
              interface. Works offline once installed.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button">
                Enable offline mode
              </button>
              <button className="ghost-button" type="button">
                Learn more
              </button>
            </div>
          </div>
        </section>

        <section className="account-list">
          <div className="section-header">
            <h3>Accounts</h3>
            <button className="text-button" type="button">
              Manage
            </button>
          </div>
          <div className="account-grid">
            <article className="account-card">
              <div className="account-icon">📧</div>
              <div>
                <p className="account-name">Personal Email</p>
                <p className="account-meta">Gmail • Updated 4s ago</p>
              </div>
              <p className="account-code">965 204</p>
            </article>
            <article className="account-card">
              <div className="account-icon">🐙</div>
              <div>
                <p className="account-name">Git Hosting</p>
                <p className="account-meta">GitHub • Updated 12s ago</p>
              </div>
              <p className="account-code">388 701</p>
            </article>
            <article className="account-card">
              <div className="account-icon">☁️</div>
              <div>
                <p className="account-name">Cloud Console</p>
                <p className="account-meta">Azure • Updated 7s ago</p>
              </div>
              <p className="account-code">704 552</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
