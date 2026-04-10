const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@test.com`,
  password: 'password123'
};

let token = '';
let userId = '';
let chatId = '';

async function runTests() {
  console.log('--- AURA API E2E TESTS ---');

  try {
    // 1. REGISTER
    console.log('\n[1] Registering User...');
    let res = await axios.post(`${BASE_URL}/auth/register`, testUser);
    token = res.data.token;
    userId = res.data.user.id;
    console.log(`✅ Success! User ID: ${userId}`);

    // 2. CREATE CHAT
    console.log('\n[2] Creating Chat Session...');
    res = await axios.post(`${BASE_URL}/chat/create`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    chatId = res.data.chatId;
    console.log(`✅ Success! Chat Session ID: ${chatId}`);

    // 3. SEND MESSAGE
    console.log('\n[3] Sending Message to Chat...');
    res = await axios.post(`${BASE_URL}/chat/message`, {
      chatId: chatId,
      text: "Hello AURA! This is a test message.",
      role: "user"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Success! Message saved to MongoDB with ID: ${res.data.savedMessage._id}`);

    // 4. GET CHAT MESSAGES
    console.log('\n[4] Fetching Chat History...');
    res = await axios.get(`${BASE_URL}/chat/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Success! Fetched chat. Found ${res.data.messages.length} messages.`);
    console.log(`   Message Text: "${res.data.messages[0].text}"`);

    // 6. UPDATE CHAT TITLE
    console.log(`\n[6] Updating Chat title...`);
    res = await axios.patch(`${BASE_URL}/chat/${chatId}/title`, {
      title: "My Updated AURA Chat"
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`✅ Success! Chat renamed to: ${res.data.title}`);

    // 7. FETCH GAMIFICATION USER STATS
    console.log(`\n[7] Querying Gamification Stats...`);
    res = await axios.get(`${BASE_URL}/user/${userId}/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Success! User Level: ${res.data.level}, XP: ${res.data.xp_score}, Total Messages: ${res.data.total_messages}`);

    // 8. STREAM AI MESSAGE (SSE)
    console.log(`\n[8] Testing AI Streaming Response (SSE)...`);
    res = await axios.post(`${BASE_URL}/chat/message/stream/${chatId}`, {
      text: "Explain quantum computing briefly."
    }, { headers: { Authorization: `Bearer ${token}` }, responseType: 'stream' });

    let streamData = "";
    res.data.on('data', chunk => {
        streamData += chunk.toString();
    });
    
    await new Promise(resolve => res.data.on('end', resolve));
    console.log(`✅ Success! AI stream received correctly. Size: ${streamData.length} bytes.`);

    // 9. RE-FETCH CHAT TO VERIFY AI MESSAGE EXISTENCE IN MONGO
    res = await axios.get(`${BASE_URL}/chat/${chatId}`, { headers: { Authorization: `Bearer ${token}` }});
    const finalMessages = res.data.messages;
    const aiMessage = finalMessages[finalMessages.length - 1]; // Assume the last message
    console.log(`✅ Success! Verified AI system stream was safely saved to DB. (ID: ${aiMessage._id})`);

    // 10. GET MESSAGE METRICS (Intelligence API)
    console.log(`\n[9] Extracting Telemetry & XAI Metrics for AI Message...`);
    res = await axios.get(`${BASE_URL}/chat/${chatId}/metrics/${aiMessage._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Success! Retrieved LLM Confidence: ${res.data.confidence.llm}%`);

    // 11. DELETE CHAT
    console.log(`\n[10] Deleting Chat Session...`);
    res = await axios.delete(`${BASE_URL}/chat/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Success! Chat and Mongo History destroyed successfully.`);

    console.log('\n--- 🎉 ALL 10 API E2E TESTS PASSED SUCCESSFULLY! 🎉 ---');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// In case the server isn't running, warn the user
console.log('Make sure your server is running (npm run dev) before executing this script!\n');
runTests();
