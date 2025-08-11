// Form handling for Community Observer website
document.addEventListener('DOMContentLoaded', function() {
  // Handle all forms with the class 'ajax-form'
  const forms = document.querySelectorAll('form[action*="sendEmail"]');
  
  forms.forEach(form => {
    form.addEventListener('submit', handleFormSubmission);
  });
});

async function handleFormSubmission(event) {
  event.preventDefault();
  
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  
  // Clear any previous messages
  clearFormMessages(form);
  
  try {
    // Prepare form data BEFORE disabling inputs (disabled inputs are excluded from FormData)
    const formData = new FormData(form);
    
    // Basic client-side validation using direct input values (more robust with autofill)
    const validationResult = validateForm(form, formData);
    if (!validationResult.isValid) {
      throw new Error(validationResult.message);
    }
    
    // Disable form and show loading state only after validation passes
    setFormLoading(form, true);
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    // Submit form
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });
    
    const contentType = response.headers.get('content-type') || '';
    let result = null;
    
    if (contentType.includes('application/json')) {
      try {
        result = await response.json();
      } catch (e) {
        // Fallback to text if JSON parsing fails
        const text = await response.text();
        throw new Error(text || 'Unexpected empty response from server.');
      }
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `Request failed with status ${response.status}`);
      }
      // Non-JSON but OK response; treat as success with generic message
      showFormMessage(form, 'Your message was sent.', 'success');
      form.reset();
      return;
    }
    
    if (response.ok && result && result.success) {
      showFormMessage(form, result.message || 'Your message was sent.', 'success');
      form.reset();
    } else {
      const errMsg = (result && result.message) || `Request failed with status ${response.status}`;
      throw new Error(errMsg);
    }
    
  } catch (error) {
    console.error('Form submission error:', error);
    showFormMessage(form, error.message, 'error');
  } finally {
    // Re-enable form
    setFormLoading(form, false);
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
  }
}

function validateForm(form, formData) {
  const requiredFields = ['name', 'email', 'message'];
  const getValue = (fieldName) => {
    const el = form.querySelector(`[name="${fieldName}"]`);
    if (el && typeof el.value === 'string') return el.value;
    // fallback to FormData if needed
    const v = formData ? formData.get(fieldName) : null;
    return typeof v === 'string' ? v : '';
  };
  
  // Check required fields
  for (const field of requiredFields) {
    const value = getValue(field);
    if (!value || value.trim() === '') {
      return {
        isValid: false,
        message: `Please fill in the ${field} field.`
      };
    }
  }
  
  // Validate email format
  const email = getValue('email');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address.'
    };
  }
  
  // Ensure hidden honeypot is empty (not filled by password managers)
  const honeypot = getValue('honeypot');
  if (honeypot) {
    return {
      isValid: false,
      message: 'Spam detected. Please try again.'
    };
  }
  
  // Check message length
  const message = getValue('message');
  if (message.length < 10) {
    return {
      isValid: false,
      message: 'Please provide a more detailed message (at least 10 characters).'
    };
  }
  
  return { isValid: true };
}

function setFormLoading(form, isLoading) {
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.disabled = isLoading;
  });
  
  if (isLoading) {
    form.classList.add('form-loading');
  } else {
    form.classList.remove('form-loading');
  }
}

function showFormMessage(form, message, type) {
  // Remove any existing messages
  clearFormMessages(form);
  
  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `form-message form-message-${type}`;
  messageDiv.innerHTML = `
    <div class="flex items-center p-4 rounded-lg ${type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
      <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${type === 'success' 
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
          : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
        }
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  // Insert message at the top of the form
  form.insertBefore(messageDiv, form.firstChild);
  
  // Auto-remove success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      clearFormMessages(form);
    }, 5000);
  }
  
  // Scroll to message
  messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearFormMessages(form) {
  const existingMessages = form.querySelectorAll('.form-message');
  existingMessages.forEach(message => message.remove());
}

// Add CSS for form loading state
const style = document.createElement('style');
style.textContent = `
  .form-loading {
    opacity: 0.7;
    pointer-events: none;
  }
  
  .form-message {
    margin-bottom: 1rem;
  }
  
  .form-loading button[type="submit"] {
    position: relative;
  }
  
  .form-loading button[type="submit"]:after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    margin: auto;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

