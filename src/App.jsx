import { useState, useEffect } from 'react'
import { MdOutlineDarkMode } from "react-icons/md";
import { MdOutlineContentCopy } from "react-icons/md";
import { BsFillShieldLockFill } from "react-icons/bs";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { IoSearch } from "react-icons/io5";
import { MdClear } from "react-icons/md";
import './App.css'

function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode')
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  const [notification, setNotification] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const accounts = [
    { id: 1, name: 'Work Email', service: 'Gmail', time: '4s ago', code: '428115' },
    { id: 2, name: 'Personal Email', service: 'Gmail', time: '4s ago', code: '965204' },
    { id: 3, name: 'Git Hosting', service: 'GitHub', time: '12s ago', code: '388701' },
    { id: 4, name: 'Cloud Console', service: 'Azure', time: '7s ago', code: '704552' },
  ]

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.service.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const showNotification = (message, type) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      showNotification('Code copied to clipboard!', 'success')
    }).catch(() => {
      showNotification('Failed to copy code', 'error')
    })
  }

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
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <IoCheckmarkDoneCircleOutline className="notification-icon" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      <header className="app-header">
        <div className="app-brand">
          <div className="app-icon" aria-hidden="true">
            <BsFillShieldLockFill />
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
            <MdOutlineDarkMode />
          </button>
          <button className="ghost-button" type="button">
            Add account
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="search-container">
          <div className="search-input-wrapper">
            <IoSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search accounts"
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                type="button"
              >
                <MdClear />
              </button>
            )}
          </div>
        </div>
        <div className="section-header">
          <h3>Your Accounts</h3>
          <button className="text-button" type="button">
            Manage
          </button>
        </div>
        <div className="account-grid">
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((account) => (
              <article className="account-card" key={account.id}>
                <div>
                  <p className="account-name">{account.name}</p>
                  <p className="account-meta">{account.service} • Updated {account.time}</p>
                </div>
                <p className="account-code">{account.code.slice(0, 3)} {account.code.slice(3)}</p>
                <button 
                  className="primary-button small-icon-button" 
                  type="button"
                  onClick={() => copyToClipboard(account.code)}
                >
                  <MdOutlineContentCopy />
                </button>
              </article>
            ))
          ) : (
            <div className="no-results">
              <p>No accounts found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
