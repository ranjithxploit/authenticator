import { useState, useEffect } from 'react'
import { MdOutlineDarkMode, MdOutlineContentCopy, MdClear, MdClose, MdAdd, MdLogout, MdDelete } from "react-icons/md"
import { BsFillShieldLockFill } from "react-icons/bs"
import { IoCheckmarkDoneCircleOutline, IoSearch } from "react-icons/io5"
import * as OTPAuth from 'otpauth'
import './App.css'

const API_URL = 'http://localhost:5000/api'

function App() {
  // Theme
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode')
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // Auth state
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('authenticator-user')
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  // UI state
  const [notification, setNotification] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginStep, setLoginStep] = useState('email') // 'email' or 'otp'
  const [loginEmail, setLoginEmail] = useState('')
  const [loginCode, setLoginCode] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [newCode, setNewCode] = useState({ serviceName: '', accountName: '', secretKey: '' })

  const [totpCodes, setTotpCodes] = useState([])
  const [generatedCodes, setGeneratedCodes] = useState({})
  const [timeLeft, setTimeLeft] = useState(30)

  const generateTOTP = (secret) => {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'Authenticator',
        label: 'Code',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret.replace(/\s/g, '').toUpperCase())
      })
      return totp.generate()
    } catch (error) {
      console.error('Error generating TOTP:', error)
      return '------'
    }
  }

  // Update all TOTP codes
  const updateAllCodes = () => {
    const codes = {}
    totpCodes.forEach(code => {
      codes[code.id] = generateTOTP(code.secret_key)
    })
    setGeneratedCodes(codes)
  }

  // Timer for TOTP refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = 30 - (Math.floor(Date.now() / 1000) % 30)
      setTimeLeft(seconds)
      
      if (seconds === 30) {
        updateAllCodes()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [totpCodes])

  // Update codes when totpCodes changes
  useEffect(() => {
    updateAllCodes()
  }, [totpCodes])

  // Fetch user's codes on login
  useEffect(() => {
    if (user) {
      fetchCodes()
    }
  }, [user])

  // Theme effect
  useEffect(() => {
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const fetchCodes = async () => {
    if (!user) return
    try {
      const response = await fetch(`${API_URL}/codes/${user.id}`)
      const data = await response.json()
      setTotpCodes(data)
    } catch (error) {
      console.error('Error fetching codes:', error)
    }
  }

  const showNotification = (message, type) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      showNotification('Code copied!', 'success')
    }).catch(() => {
      showNotification('Failed to copy', 'error')
    })
  }

  // Login handlers
  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!loginEmail.trim()) {
      showNotification('Please enter your email', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification(data.error || 'Failed to send code', 'error')
        setLoading(false)
        return
      }

      setLoginStep('otp')
      showNotification('Login code sent to your email!', 'success')
    } catch (error) {
      showNotification('Error sending code', 'error')
    }
    setLoading(false)
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!loginCode.trim()) {
      showNotification('Please enter the code', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, code: loginCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification(data.error || 'Failed to verify', 'error')
        setLoading(false)
        return
      }

      // Save user to state and localStorage
      setUser(data.user)
      localStorage.setItem('authenticator-user', JSON.stringify(data.user))
      
      // Reset modal
      setShowLoginModal(false)
      setLoginStep('email')
      setLoginEmail('')
      setLoginCode('')
      showNotification('Welcome back!', 'success')
    } catch (error) {
      showNotification('Error verifying code', 'error')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    setUser(null)
    setTotpCodes([])
    setGeneratedCodes({})
    localStorage.removeItem('authenticator-user')
    showNotification('Logged out', 'success')
  }

  // Add code handler
  const handleAddCode = async (e) => {
    e.preventDefault()
    if (!newCode.serviceName.trim() || !newCode.accountName.trim() || !newCode.secretKey.trim()) {
      showNotification('Please fill all fields', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          serviceName: newCode.serviceName,
          accountName: newCode.accountName,
          secretKey: newCode.secretKey.replace(/\s/g, '').toUpperCase()
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification(data.error || 'Failed to add code', 'error')
        setLoading(false)
        return
      }

      // Refresh codes
      await fetchCodes()
      setShowAddModal(false)
      setNewCode({ serviceName: '', accountName: '', secretKey: '' })
      showNotification('Code added!', 'success')
    } catch (error) {
      showNotification('Error adding code', 'error')
    }
    setLoading(false)
  }

  const handleDeleteCode = async (codeId) => {
    if (!confirm('Delete this code?')) return

    try {
      const response = await fetch(`${API_URL}/codes/${codeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCodes()
        showNotification('Code deleted', 'success')
      }
    } catch (error) {
      showNotification('Error deleting code', 'error')
    }
  }

  const filteredCodes = totpCodes.filter((code) =>
    code.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const progressPercent = (timeLeft / 30) * 100

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
            <p className="app-subtitle">
              {user ? `Welcome, ${user.name || user.email}` : 'Secure 2FA codes at a glance'}
            </p>
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
          {user ? (
            <>
              <button 
                className="ghost-button" 
                type="button"
                onClick={() => setShowAddModal(true)}
              >
                <MdAdd style={{ marginRight: '4px' }} /> Add
              </button>
              <button 
                className="ghost-button" 
                type="button"
                onClick={handleLogout}
              >
                <MdLogout />
              </button>
            </>
          ) : (
            <button 
              className="primary-button" 
              type="button"
              onClick={() => setShowLoginModal(true)}
            >
              Login
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {user ? (
          <>
            {/* Timer bar */}
            <div className="timer-bar">
              <div className="timer-progress" style={{ width: `${progressPercent}%` }} />
              <span className="timer-text">{timeLeft}s</span>
            </div>

            <div className="search-container">
              <div className="search-input-wrapper">
                <IoSearch className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search codes"
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
              <h3>Your Codes ({filteredCodes.length})</h3>
            </div>

            <div className="account-grid">
              {filteredCodes.length > 0 ? (
                filteredCodes.map((code) => (
                  <article className="account-card" key={code.id}>
                    <div className="card-header">
                      <div>
                        <p className="account-name">{code.service_name}</p>
                        <p className="account-meta">{code.account_name}</p>
                      </div>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteCode(code.id)}
                        title="Delete"
                      >
                        <MdDelete />
                      </button>
                    </div>
                    <div className="code-row">
                      <p className="account-code">
                        {generatedCodes[code.id] 
                          ? `${generatedCodes[code.id].slice(0, 3)} ${generatedCodes[code.id].slice(3)}`
                          : '--- ---'
                        }
                      </p>
                      <button 
                        className="primary-button small-icon-button" 
                        type="button"
                        onClick={() => copyToClipboard(generatedCodes[code.id] || '')}
                      >
                        <MdOutlineContentCopy />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="no-results">
                  {searchQuery ? (
                    <p>No codes found matching "{searchQuery}"</p>
                  ) : (
                    <div className="empty-state">
                      <BsFillShieldLockFill className="empty-icon" />
                      <p>No codes yet</p>
                      <button 
                        className="primary-button"
                        onClick={() => setShowAddModal(true)}
                      >
                        Add your first code
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="login-prompt">
            <BsFillShieldLockFill className="login-icon" />
            <h2>Welcome to Authenticator</h2>
            <p>Login with your email to access your 2FA codes across all devices</p>
            <button 
              className="primary-button"
              onClick={() => setShowLoginModal(true)}
            >
              Login with Email
            </button>
          </div>
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => {
              setShowLoginModal(false)
              setLoginStep('email')
              setLoginEmail('')
              setLoginCode('')
            }} type="button">
              <MdClose />
            </button>

            {loginStep === 'email' ? (
              <div className="modal-form">
                <h2>Login</h2>
                <p className="modal-subtitle">Enter your email to receive a login code</p>

                <form onSubmit={handleSendOTP}>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="your-email@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="primary-button modal-submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Login Code'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="modal-form">
                <h2>Enter Code</h2>
                <p className="modal-subtitle">We sent a code to {loginEmail}</p>

                <form onSubmit={handleVerifyOTP}>
                  <div className="form-group">
                    <label htmlFor="code">Verification Code</label>
                    <input
                      id="code"
                      type="text"
                      placeholder="000000"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength="6"
                      disabled={loading}
                      className="code-input"
                      autoFocus
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="primary-button modal-submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Login'}
                  </button>

                  <button
                    type="button"
                    className="text-button modal-back-btn"
                    onClick={() => {
                      setLoginStep('email')
                      setLoginCode('')
                    }}
                    disabled={loading}
                  >
                    Use different email
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Code Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => {
              setShowAddModal(false)
              setNewCode({ serviceName: '', accountName: '', secretKey: '' })
            }} type="button">
              <MdClose />
            </button>

            <div className="modal-form">
              <h2>Add New Code</h2>
              <p className="modal-subtitle">Enter the 2FA secret from your service</p>

              <form onSubmit={handleAddCode}>
                <div className="form-group">
                  <label htmlFor="serviceName">Service Name</label>
                  <input
                    id="serviceName"
                    type="text"
                    placeholder="e.g., GitHub, AWS, Google"
                    value={newCode.serviceName}
                    onChange={(e) => setNewCode({ ...newCode, serviceName: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="accountName">Account / Email</label>
                  <input
                    id="accountName"
                    type="text"
                    placeholder="e.g., your-email@example.com"
                    value={newCode.accountName}
                    onChange={(e) => setNewCode({ ...newCode, accountName: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="secretKey">Secret Key</label>
                  <input
                    id="secretKey"
                    type="text"
                    placeholder="JBSWY3DPEHPK3PXP"
                    value={newCode.secretKey}
                    onChange={(e) => setNewCode({ ...newCode, secretKey: e.target.value })}
                    disabled={loading}
                    className="secret-input"
                  />
                  <p className="code-hint">Enter the secret key from your service's 2FA setup</p>
                </div>

                <button 
                  type="submit" 
                  className="primary-button modal-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Code'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
