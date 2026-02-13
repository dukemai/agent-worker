import PostalMime from 'postal-mime';

export default {
  // 1. THIS HANDLES REAL EMAILS
  async email(message, env, ctx) {
    const rawBody = await new Response(message.raw).arrayBuffer();
    const parser = new PostalMime();
    const email = await parser.parse(rawBody);

    return await processLogic(email.subject, email.text, email.from.address, env);
  },

  // 2. THIS HANDLES HTTP (CURL / BROWSER)
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      const { subject, body, from } = await request.json();
      const result = await processLogic(subject, body, from, env);
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    }
    
    return new Response("Dad Agent is live. Send a POST request to test.");
  }
};

// 3. SHARED LOGIC
async function processLogic(subject, body, from, env) {
  const logMessage = `Agent received: [${subject}] from [${from}]`;
  console.log(logMessage);

  // Eventually, your OpenAI/Supabase logic goes here
  
  return { 
    success: true, 
    message: logMessage,
    body_preview: body ? body.substring(0, 100) : "No body"
  };
}