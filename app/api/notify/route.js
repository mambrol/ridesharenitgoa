import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { type } = body

    const GMAIL_USER = process.env.GMAIL_USER
    const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD

    if (!GMAIL_USER || !GMAIL_PASS) {
      return NextResponse.json({ error: 'Gmail not configured' }, { status: 500 })
    }

    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    })

    let subject = ''
    let html = ''

    if (type === 'route_alert') {
      const { to, rideFrom, rideTo, posterName, time, date } = body
      subject = `New ride alert: ${rideFrom} → ${rideTo}`
      html = wrapper(`
        <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111">${rideFrom} → ${rideTo}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#555">👤 Posted by: <strong>${posterName}</strong></p>
        <p style="margin:0 0 6px;font-size:14px;color:#555">📅 Date: <strong>${date}</strong></p>
        <p style="margin:0;font-size:14px;color:#555">🕐 Time: <strong>${time}</strong></p>
      `, 'New ride on your alert route!', 'View ride →')
      await sendMail(transporter, GMAIL_USER, to, subject, html)
    }

    else if (type === 'seat_requested') {
      const { to, requesterName, rideFrom, rideTo, time, date } = body
      subject = `New seat request: ${rideFrom} → ${rideTo}`
      html = wrapper(`
        <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111">${rideFrom} → ${rideTo}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#555">👤 Requested by: <strong>${requesterName}</strong></p>
        <p style="margin:0 0 6px;font-size:14px;color:#555">📅 Date: <strong>${date}</strong></p>
        <p style="margin:0;font-size:14px;color:#555">🕐 Time: <strong>${time}</strong></p>
      `, 'Someone wants a seat on your ride!', 'Review request →')
      await sendMail(transporter, GMAIL_USER, to, subject, html)
    }

    else if (type === 'request_accepted') {
      const { to, driverName, driverEmail, rideFrom, rideTo, time, date } = body
      subject = `✅ Your seat request was accepted!`
      html = wrapper(`
        <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111">${rideFrom} → ${rideTo}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#555">👤 Driver: <strong>${driverName}</strong></p>
        <p style="margin:0 0 6px;font-size:14px;color:#555">✉️ Driver email: <strong>${driverEmail}</strong></p>
        <p style="margin:0 0 6px;font-size:14px;color:#555">📅 Date: <strong>${date}</strong></p>
        <p style="margin:0;font-size:14px;color:#555">🕐 Time: <strong>${time}</strong></p>
      `, ' Your seat is confirmed!', 'Open RideShare →')
      await sendMail(transporter, GMAIL_USER, to, subject, html)
    }

    else if (type === 'request_rejected') {
      const { to, rideFrom, rideTo } = body
      subject = `Your seat request was declined`
      html = wrapper(`
        <p style="margin:0 0 12px;font-size:15px;color:#333">
          Unfortunately your request for the ride <strong>${rideFrom} → ${rideTo}</strong> was declined by the driver.
        </p>
        <p style="margin:0;font-size:14px;color:#666">Don't worry — browse other available rides on the app!</p>
      `, 'Request declined', 'Browse other rides →')
      await sendMail(transporter, GMAIL_USER, to, subject, html)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Email error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function wrapper(bodyHtml, headerSubtitle, buttonText) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#1D9E75;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:20px">NIT Goa RideShare</h1>
        <p style="color:#E1F5EE;margin:8px 0 0;font-size:14px">${headerSubtitle}</p>
      </div>
      <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:16px">
        ${bodyHtml}
      </div>
      <a href="https://ridesharenitgoa.vercel.app"
         style="display:block;background:#1D9E75;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
        ${buttonText}
      </a>
      <p style="text-align:center;font-size:12px;color:#999;margin-top:20px">
        NIT Goa RideShare — campus ride pooling
      </p>
    </div>
  `
}

async function sendMail(transporter, from, to, subject, html) {
  await transporter.sendMail({
    from: `"NIT Goa RideShare" <${from}>`,
    to,
    subject,
    html,
  })
}
