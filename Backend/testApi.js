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

    // 5. GET ALL CHATS (SIDEBAR)
    console.log(`\n[5] Fetching Sidebar Chats for User...`);
    res = await axios.get(`${BASE_URL}/chat/list/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Success! Found ${res.data.chats.length} chat sessions.`);

    console.log('\n--- 🎉 ALL API TESTS PASSED! 🎉 ---');

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
