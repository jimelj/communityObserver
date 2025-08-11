import type { APIRoute } from 'astro';

export const prerender = false;

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env: any = (locals as any)?.runtime?.env ?? {};

    const formData = await request.formData();
    const formType = formData.get('formType');

    // Honeypot check
    const honeypot = formData.get('honeypot');
    if (honeypot) {
      return json({ success: false, message: 'Spam detected' }, 400);
    }

    // Simple per-IP rate limit if KV binding exists
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate_limit_${clientIP}`;
    const rateStore = env?.RATE_LIMIT;
    if (rateStore) {
      const last = await rateStore.get(rateLimitKey);
      const now = Date.now();
      if (last && now - parseInt(last) < 60_000) {
        return json({ success: false, message: 'Rate limit exceeded. Please wait before submitting again.' }, 429);
      }
      await rateStore.put(rateLimitKey, String(now), { expirationTtl: 3600 });
    }

    let emailData: any;
    if (formType === 'Contact') {
      emailData = await handleContactForm(formData);
    } else if (formType === 'Submission') {
      emailData = await handleSubmissionForm(formData);
    } else {
      return json({ success: false, message: 'Invalid form type' }, 400);
    }

    const ok = await sendEmail(emailData, env);
    if (!ok) throw new Error('Failed to send email');

    return json({ success: true, message: "Your message has been sent successfully. We'll get back to you soon!" });
  } catch (err: any) {
    return json({ success: false, message: err?.message || 'Unexpected error.' }, 500);
  }
};

async function handleContactForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || 'Not provided');
  const organization = String(formData.get('organization') || 'Not provided');
  const message = String(formData.get('message') || '').trim();

  if (!name || !email || !message) throw new Error('Missing required fields');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error('Invalid email format');

  return {
    // to: 'info@thecommunityobserver.com', // original recipient
    to: 'jjoseph@cbaol.com',
    subject: `Contact Form Submission from ${escapeHtml(name)}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Organization:</strong> ${escapeHtml(organization)}</p>
      <p><strong>Message:</strong></p>
      <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:10px 0;">
        ${escapeHtml(message).replace(/\n/g, '<br>')}
      </div>
      <hr>
      <p style="color:#666;font-size:12px;">Submitted from Community Observer website contact form<br/>Timestamp: ${new Date().toISOString()}</p>
    `,
    replyTo: email,
  };
}

async function handleSubmissionForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const submissionType = String(formData.get('submissionType') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  if (!name || !email || !submissionType || !title || !content) throw new Error('Missing required fields');

  return {
    to: 'janice@thecommunityobserver.com',
    subject: `Editorial Submission: ${escapeHtml(title)}`,
    html: `
      <h2>New Editorial Submission</h2>
      <p><strong>Submitter:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Submission Type:</strong> ${escapeHtml(submissionType)}</p>
      <p><strong>Title:</strong> ${escapeHtml(title)}</p>
      <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:10px 0;">
        ${escapeHtml(content).replace(/\n/g, '<br>')}
      </div>
      <hr>
      <p style="color:#666;font-size:12px;">Submitted from Community Observer website submission form<br/>Timestamp: ${new Date().toISOString()}</p>
    `,
    replyTo: email,
  };
}

async function sendEmail(emailData: any, env: any) {
  try {
    if (env?.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@thecommunityobserver.com',
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          reply_to: emailData.replyTo,
        }),
      });
      return r.ok;
    }
    // Fallback for local/dev: treat as sent
    console.log('Email (dev):', emailData);
    return true;
  } catch (e) {
    console.error('Email sending error:', e);
    return false;
  }
}

function escapeHtml(text: string) {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}


