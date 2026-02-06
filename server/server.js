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
      subject: '🔐 Authenticator - Login Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
              .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 48px; margin-bottom: 10px; }
              h2 { color: #1f2937; margin: 0 0 8px 0; font-size: 24px; }
              .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
              .otp-box { 
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                border-radius: 12px;
                padding: 32px;
                text-align: center;
                margin: 32px 0;
              }
              .otp-code {
                color: white;
                font-size: 42px;
                font-weight: bold;
                letter-spacing: 12px;
                font-family: 'Courier New', monospace;
                margin: 0;
              }
              .otp-label {
                color: rgba(255,255,255,0.8);
                font-size: 12px;
                margin-top: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .info { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #1e40af; }
              .footer { color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🔐</div>
                <h2>Login to Authenticator</h2>
                <p class="subtitle">Enter this code to access your account</p>
              </div>

              <div class="otp-box">
                <p class="otp-code">${code}</p>
                <p class="otp-label">One-Time Password</p>
              </div>

              <div class="info">
                ⏱️ This code expires in <strong>10 minutes</strong>
              </div>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>

              <div class="footer">
                Authenticator - Secure 2FA codes at a glance
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
