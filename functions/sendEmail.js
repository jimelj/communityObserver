// Cloudflare Worker function for handling form submissions
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Parse form data
    const formData = await request.formData();
    const formType = formData.get('formType');
    
    // Honeypot spam protection
    const honeypot = formData.get('honeypot');
    if (honeypot) {
      return new Response('Spam detected', { status: 400 });
    }
    
    // Rate limiting check (simple implementation)
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate_limit_${clientIP}`;
    
    // Check if we have a rate limit store (KV namespace)
    if (env.RATE_LIMIT) {
      const lastSubmission = await env.RATE_LIMIT.get(rateLimitKey);
      const now = Date.now();
      
      if (lastSubmission && (now - parseInt(lastSubmission)) < 60000) { // 1 minute cooldown
        return new Response('Rate limit exceeded. Please wait before submitting again.', { 
          status: 429 
        });
      }
    }
    
    let emailData;
    
    // Handle different form types
    switch (formType) {
      case 'Contact':
        emailData = await handleContactForm(formData);
        break;
      case 'Submission':
        emailData = await handleSubmissionForm(formData);
        break;
      default:
        return new Response('Invalid form type', { status: 400 });
    }
    
    // Send email using Cloudflare Email Workers or external service
    const emailSent = await sendEmail(emailData, env);
    
    if (emailSent) {
      // Only write rate-limit marker on successful send
      if (env.RATE_LIMIT) {
        await env.RATE_LIMIT.put(rateLimitKey, Date.now().toString(), { expirationTtl: 3600 });
      }
      // Return success response
      return new Response(JSON.stringify({
        success: true,
        message: 'Your message has been sent successfully. We\'ll get back to you soon!'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } else {
      throw new Error('Failed to send email');
    }
    
  } catch (error) {
    console.error('Form submission error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Sorry, there was an error sending your message. Please try again or contact us directly.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Process contact form data
async function handleContactForm(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const phone = formData.get('phone') || 'Not provided';
  const organization = formData.get('organization') || 'Not provided';
  const message = formData.get('message');
  
  // Validate required fields
  if (!name || !email || !message) {
    throw new Error('Missing required fields');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  return {
    // to: 'info@thecommunityobserver.com', // original recipient (temporarily disabled for testing)
    // to: 'jjoseph@cbaol.com',
    to: 'jimelj@gmail.com',
    subject: `Contact Form Submission from ${name}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Organization:</strong> ${escapeHtml(organization)}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${escapeHtml(message).replace(/\n/g, '<br>')}
      </div>
      <hr>
      <p style="color: #666; font-size: 12px;">
        Submitted from Community Observer website contact form<br>
        Timestamp: ${new Date().toISOString()}
      </p>
    `,
    replyTo: email
  };
}

// Process submission form data
async function handleSubmissionForm(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const phone = formData.get('phone') || 'Not provided';
  const organization = formData.get('organization') || 'Not provided';
  const submissionType = formData.get('submissionType');
  const title = formData.get('title');
  const description = formData.get('description');
  const content = formData.get('content');
  const additionalInfo = formData.get('additionalInfo');
  const urgent = formData.get('urgent') === 'on';
  const anonymous = formData.get('anonymous') === 'on';
  const contactBack = formData.get('contactBack') === 'on';
  
  if (!name || !email || !submissionType || !title || !description || !content) {
    throw new Error('Missing required fields');
  }
  
  // Handle file attachments
  const attachments = formData.getAll('attachments');
  const validFiles = [];
  
  for (const file of attachments) {
    if (file && file.size > 0) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/tiff',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed.`);
      }
      
      validFiles.push(file);
    }
  }
  
  const emailContent = `
    <h2>New Content Submission - Community Observer</h2>
    
    <h3>Content Details</h3>
    <p><strong>Content Type:</strong> ${escapeHtml(submissionType)}</p>
    <p><strong>Title:</strong> ${escapeHtml(title)}</p>
    <p><strong>Description:</strong> ${escapeHtml(description)}</p>
    
    <h3>Contact Information</h3>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${phone !== 'Not provided' ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
    ${organization !== 'Not provided' ? `<p><strong>Organization:</strong> ${escapeHtml(organization)}</p>` : ''}
    
    <h3>Content</h3>
    <div style="white-space: pre-wrap; background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
      ${escapeHtml(content).replace(/\n/g, '<br>')}
    </div>
    
    ${additionalInfo ? `
      <h3>Additional Information</h3>
      <div style="white-space: pre-wrap; background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${escapeHtml(additionalInfo).replace(/\n/g, '<br>')}
      </div>
    ` : ''}
    
    <h3>Publication Preferences</h3>
    <ul>
      <li><strong>Time-sensitive:</strong> ${urgent ? 'Yes' : 'No'}</li>
      <li><strong>Anonymous publication:</strong> ${anonymous ? 'Yes' : 'No'}</li>
      <li><strong>Contact for more info:</strong> ${contactBack ? 'Yes' : 'No'}</li>
    </ul>
    
    <h3>Attachments</h3>
    <p>Number of files attached: ${validFiles.length}</p>
    ${validFiles.map(file => `<p>• ${escapeHtml(file.name)} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>`).join('')}
    
    <hr style="margin: 20px 0;">
    <p><em>This submission was received from the Community Observer website content submission form.</em></p>
    <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
  `;
  
  const emailData = {
    to: 'jimelj@gmail.com',
    subject: `Content Submission: ${title}`,
    html: emailContent,
    replyTo: email
  };
  
  // Add attachments if any
  if (validFiles.length > 0) {
    emailData.attachments = await Promise.all(validFiles.map(async (file) => {
      const buffer = await file.arrayBuffer();
      return {
        filename: file.name,
        content: Buffer.from(buffer).toString('base64')
      };
    }));
  }
  
  return emailData;
}

// Send email using external service (example with Resend API)
async function sendEmail(emailData, env) {
  try {
    // If using Resend API (you would need to set RESEND_API_KEY in environment)
    if (env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Resend requires a verified domain for the From address.
          // Use the Resend onboarding sender for testing to avoid 422 errors.
          from: 'onboarding@resend.dev',
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          reply_to: emailData.replyTo,
          ...(emailData.attachments && { attachments: emailData.attachments })
        })
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('Resend error:', response.status, text);
      }
      return response.ok;
    }
    
    // If using Cloudflare Email Workers (requires setup)
    if (env.EMAIL_WORKER) {
      // Implementation would depend on your email worker setup
      console.log('Email would be sent via Cloudflare Email Worker');
      return true;
    }
    
    // Fallback: Log email data (for development/testing)
    console.log('Email data:', emailData);
    return true;
    
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

