// Using native fetch instead of Resend SDK for Cloudflare Functions compatibility

export async function onRequest(context) {
  const { request } = context;
  
  // Only handle POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const formData = await request.formData();
    
    // Simple test response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Function is working!',
      receivedData: {
        contentType: formData.get('contentType'),
        name: formData.get('name'),
        email: formData.get('email')
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Function error: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
