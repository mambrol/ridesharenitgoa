import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { to, rideFrom, rideTo, posterName, time, date } = await request.json()

    const GMAIL_USER = process.env.GMAIL_USER
    const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD

    if (!GMAIL_USER || !GMAIL_PASS) {
      return NextResponse.json({ error: 'Gmail not configured' }, { status: 500 })
    }

    // Use nodemailer via dynamic import
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"NIT Goa RideShare" <${GMAIL_USER}>`,
      to,
      subject: `🚗 New ride alert: ${rideFrom} → ${rideTo}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#1D9E75;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;margin:0;font-size:20px">🚗 NIT Goa RideShare</h1>
            <p style="color:#E1F5EE;margin:8px 0 0;font-size:14px">New ride on your alert route!</p>
          </div>
          <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:16px">
            <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111">
              ${rideFrom} → ${rideTo}
            </p>
            <p style="margin:0 0 6px;font-size:14px;color:#555">
              👤 Posted by: <strong>${posterName}</strong>
            </p>
            <p style="margin:0 0 6px;font-size:14px;color:#555">
              📅 Date: <strong>${date}</strong>
            </p>
            <p style="margin:0;font-size:14px;color:#555">
              🕐 Time: <strong>${time}</strong>
            </p>
          </div>
          <a href="https://ridesharenitgoa.vercel.app"
             style="display:block;background:#1D9E75;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
            View ride on NIT Goa RideShare →
          </a>
          <p style="text-align:center;font-size:12px;color:#999;margin-top:20px">
            You received this because you set a route alert on NIT Goa RideShare.
          </p>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Email error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
