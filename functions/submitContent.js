import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const formData = await request.formData();
    
    // Honeypot check
    const website = formData.get('website');
    if (website) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Rate limiting (simple IP-based)
    const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimitKey = `content_submission:${clientIP}`;
    
    // Check if this IP has submitted recently (allow 1 submission per 5 minutes)
    const lastSubmission = await env.KV.get(rateLimitKey);
    if (lastSubmission) {
      return new Response(JSON.stringify({ 
        error: 'Please wait a few minutes before submitting another piece of content.' 
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Set rate limit (5 minutes)
    await env.KV.put(rateLimitKey, Date.now().toString(), { expirationTtl: 300 });
    
    // Extract form data
    const contentType = formData.get('contentType');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const organization = formData.get('organization');
    const title = formData.get('title');
    const description = formData.get('description');
    const content = formData.get('content');
    const additionalInfo = formData.get('additionalInfo');
    const urgent = formData.get('urgent') === 'on';
    const anonymous = formData.get('anonymous') === 'on';
    const contactBack = formData.get('contactBack') === 'on';
    const agreement = formData.get('agreement') === 'on';
    
    // Validate required fields
    if (!contentType || !name || !email || !title || !description || !content || !agreement) {
      return new Response(JSON.stringify({ 
        error: 'Please fill in all required fields and agree to the terms.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ 
        error: 'Please enter a valid email address.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle file attachments
    const attachments = formData.getAll('attachments');
    const validFiles = [];
    
    for (const file of attachments) {
      if (file && file.size > 0) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          return new Response(JSON.stringify({ 
            error: `File ${file.name} is too large. Maximum size is 10MB.` 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Check file type
        const allowedTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/tiff',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ 
            error: `File type ${file.type} is not allowed.` 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        validFiles.push(file);
      }
    }
    
    // Prepare email content
    const emailContent = `
      <h2>New Content Submission - Community Observer</h2>
      
      <h3>Content Details</h3>
      <p><strong>Content Type:</strong> ${contentType}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Description:</strong> ${description}</p>
      
      <h3>Contact Information</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
      ${organization ? `<p><strong>Organization:</strong> ${organization}</p>` : ''}
      
      <h3>Content</h3>
      <div style="white-space: pre-wrap; background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${content}
      </div>
      
      ${additionalInfo ? `
        <h3>Additional Information</h3>
        <div style="white-space: pre-wrap; background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${additionalInfo}
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
      ${validFiles.map(file => `<p>• ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>`).join('')}
      
      <hr style="margin: 20px 0;">
      <p><em>This submission was received from the Community Observer website content submission form.</em></p>
      <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
    `;
    
    // Send email
    const emailData = {
      from: 'Community Observer <noreply@thecommunityobserver.com>',
      to: ['jimelj@gmail.com'],
      subject: `Content Submission: ${title}`,
      html: emailContent,
    };
    
    // Add attachments if any
    if (validFiles.length > 0) {
      emailData.attachments = await Promise.all(validFiles.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          filename: file.name,
          content: Buffer.from(buffer)
        };
      }));
    }
    
    await resend.emails.send(emailData);
    
    // Send confirmation email to submitter
    const confirmationContent = `
      <h2>Content Submission Received - Community Observer</h2>
      
      <p>Dear ${name},</p>
      
      <p>Thank you for submitting your content to <em>Community Observer</em>. We have received your submission and will review it according to our editorial guidelines.</p>
      
      <h3>Submission Details</h3>
      <p><strong>Content Type:</strong> ${contentType}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>What Happens Next?</h3>
      <ul>
        <li>Our editorial team will review your submission</li>
        <li>We may contact you for additional information or clarification</li>
        <li>If approved, your content will be scheduled for publication</li>
        <li>You will be notified of the publication date</li>
      </ul>
      
      <p><strong>Please note:</strong> Submission does not guarantee publication. All content is subject to editorial review and space availability.</p>
      
      <p>If you have any questions, please contact us at info@thecommunityobserver.com.</p>
      
      <p>Thank you for contributing to your community!</p>
      
      <p>Best regards,<br>
      The Community Observer Editorial Team</p>
    `;
    
    await resend.emails.send({
      from: 'Community Observer <noreply@thecommunityobserver.com>',
      to: [email],
      subject: 'Content Submission Received - Community Observer',
      html: confirmationContent
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Content submitted successfully. You will receive a confirmation email shortly.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Content submission error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'There was an error processing your submission. Please try again or contact us directly.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
