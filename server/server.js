import express from 'express'
import cors from 'cors'
import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

app.use(cors())
app.use(express.json())

const verificationCodes = new Map()
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const code = generateCode()
    verificationCodes.set(email, {
      code,
      createdAt: Date.now(),
      attempts: 0,
    })

    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Authenticator - Secure Login Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authenticator Login Code</title>
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                background: #f8fafc; 
                margin: 0; 
                padding: 20px; 
                line-height: 1.6;
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 16px; 
                padding: 40px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
                border: 1px solid #e2e8f0;
              }
              .header { text-align: center; margin-bottom: 40px; }
              .logo { font-size: 56px; margin-bottom: 16px; }
              h1 { 
                color: #1e293b; 
                margin: 0 0 8px 0; 
                font-size: 28px; 
                font-weight: 700; 
              }
              .subtitle { 
                color: #64748b; 
                font-size: 16px; 
                margin: 0 0 8px 0; 
                font-weight: 400; 
              }
              .greeting { 
                color: #475569; 
                font-size: 15px; 
                margin: 24px 0 32px 0; 
                text-align: left; 
              }
              .otp-section { 
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-radius: 16px;
                padding: 40px 32px;
                text-align: center;
                margin: 32px 0;
                position: relative;
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
              }
              .otp-code {
                color: white;
                font-size: 48px;
                font-weight: 800;
                letter-spacing: 16px;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
                margin: 0 0 16px 0;
                user-select: all;
                -webkit-user-select: all;
                -moz-user-select: all;
                -ms-user-select: all;
                cursor: pointer;
                padding: 16px;
                border-radius: 12px;
                background: rgba(255,255,255,0.1);
                border: 2px dashed rgba(255,255,255,0.3);
                transition: all 0.3s ease;
              }
              .otp-code:hover {
                background: rgba(255,255,255,0.15);
                border-color: rgba(255,255,255,0.5);
                transform: scale(1.02);
              }
              .copy-instruction {
                color: rgba(255,255,255,0.9);
                font-size: 14px;
                margin: 12px 0 0 0;
                font-weight: 500;
              }
              .copy-hint {
                color: rgba(255,255,255,0.7);
                font-size: 12px;
                margin: 8px 0 0 0;
                font-style: italic;
              }
              .otp-label {
                color: rgba(255,255,255,0.8);
                font-size: 13px;
                margin-top: 20px;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
              }
              .info-box { 
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); 
                border: 1px solid #93c5fd;
                border-radius: 12px;
                padding: 20px; 
                margin: 32px 0; 
                font-size: 15px; 
                color: #1e40af;
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .info-icon {
                font-size: 20px;
                flex-shrink: 0;
              }
              .security-note {
                background: #fef3c7;
                border: 1px solid #fbbf24;
                border-radius: 12px;
                padding: 20px;
                margin: 24px 0;
                color: #92400e;
                font-size: 14px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
              }
              .security-icon {
                color: #f59e0b;
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 2px;
              }
              .company-info {
                text-align: center;
                padding: 32px 0 16px 0;
                border-top: 1px solid #e2e8f0;
                margin-top: 40px;
              }
              .company-name {
                color: #1e293b;
                font-size: 18px;
                font-weight: 600;
                margin: 0 0 8px 0;
              }
              .company-tagline {
                color: #64748b;
                font-size: 14px;
                margin: 0;
                font-style: italic;
              }
              .footer { 
                color: #94a3b8; 
                font-size: 12px; 
                text-align: center; 
                margin-top: 20px;
                line-height: 1.5;
              }
              .plain-code {
                background: #f1f5f9;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px;
                margin: 16px 0;
                text-align: center;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 4px;
                color: #1e293b;
                user-select: all;
                -webkit-user-select: all;
                -moz-user-select: all;
                -ms-user-select: all;
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🔐</div>
                <h1>Secure Login Verification</h1>
                <p class="subtitle">Your authentication code is ready</p>
              </div>

              <div class="greeting">
                Dear User,<br>
                We received a login request for your Authenticator account. Please use the verification code below to complete your login process.
              </div>

              <div class="otp-section">
                <div class="otp-code" title="Click to select code for copying">${code}</div>
                <p class="copy-instruction">📋 Click the code above to select it</p>
                <p class="copy-hint">Then use Ctrl+C (Cmd+C on Mac) to copy</p>
                <p class="otp-label">One-Time Verification Code</p>
              </div>

              <div class="plain-code" title="Alternative copy option">
                ${code}
              </div>

              <div class="info-box">
                <span class="info-icon">⏱️</span>
                <div>
                  <strong>Time Sensitive:</strong> This verification code will expire in <strong>10 minutes</strong> for your security.
                </div>
              </div>

              <div class="security-note">
                <span class="security-icon">🛡️</span>
                <div>
                  <strong>Security Notice:</strong> If you did not request this login code, please ignore this email and consider changing your account password. Never share this code with anyone.
                </div>
              </div>

              <div class="company-info">
                <div class="company-name">🔐 Authenticator</div>
                <p class="company-tagline">Your trusted partner for secure two-factor authentication</p>
              </div>

              <div class="footer">
                This email was sent to ${email}<br>
                © 2026 Authenticator. All rights reserved.<br>
                <em>Keeping your digital identity secure, one code at a time.</em>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    await sgMail.send(mailOptions)

    res.json({ 
      success: true, 
      message: 'Login code sent to your email'
    })
  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ error: 'Failed to send login code' })
  }
})

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' })
    }

    const verification = verificationCodes.get(email)

    if (!verification) {
      return res.status(400).json({ error: 'No login request found. Please request a new code.' })
    }

    // Check if code expired (10 minutes)
    if (Date.now() - verification.createdAt > 10 * 60 * 1000) {
      verificationCodes.delete(email)
      return res.status(400).json({ error: 'Code expired. Please request a new one.' })
    }

    // Check max attempts
    if (verification.attempts >= 5) {
      verificationCodes.delete(email)
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' })
    }

    if (verification.code !== code) {
      verification.attempts++
      return res.status(400).json({ error: 'Invalid code. Please try again.' })
    }

    // Code is valid - check if user exists or create new
    let { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase fetch error:', fetchError)
    }

    if (!user) {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ email, name: email.split('@')[0] }])
        .select()
        .single()

      if (insertError) {
        console.error('Supabase insert error:', insertError)
        return res.status(500).json({ error: 'Failed to create account' })
      }
      user = newUser
    } else {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)
    }
    verificationCodes.delete(email)

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      message: 'Login successful!'
    })
  } catch (error) {
    console.error('Error verifying code:', error)
    res.status(500).json({ error: 'Failed to verify code' })
  }
})

// Get user's TOTP codes
app.get('/api/codes/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const { data: codes, error } = await supabase
      .from('totp_codes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to fetch codes' })
    }

    res.json(codes || [])
  } catch (error) {
    console.error('Error fetching codes:', error)
    res.status(500).json({ error: 'Failed to fetch codes' })
  }
})

// Add new TOTP code
app.post('/api/codes', async (req, res) => {
  try {
    const { userId, serviceName, accountName, secretKey } = req.body

    if (!userId || !serviceName || !accountName || !secretKey) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const { data: code, error } = await supabase
      .from('totp_codes')
      .insert([{
        user_id: userId,
        service_name: serviceName,
        account_name: accountName,
        secret_key: secretKey
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to add code' })
    }

    res.json({ success: true, code })
  } catch (error) {
    console.error('Error adding code:', error)
    res.status(500).json({ error: 'Failed to add code' })
  }
})

// Delete TOTP code
app.delete('/api/codes/:codeId', async (req, res) => {
  try {
    const { codeId } = req.params

    const { error } = await supabase
      .from('totp_codes')
      .delete()
      .eq('id', codeId)

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to delete code' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting code:', error)
    res.status(500).json({ error: 'Failed to delete code' })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
