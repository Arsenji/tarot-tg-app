#!/usr/bin/env node

/**
 * Скрипт для тестирования защиты от NoSQL инъекций
 * Запуск: node test-security.js
 */

const baseUrl = 'http://localhost:3001/api';

// Тестовые данные для проверки защиты
const testCases = [
  {
    name: 'NoSQL Injection - $where',
    endpoint: '/tarot/single-card',
    data: { '$where': '1==1' },
    expectedStatus: 400
  },
  {
    name: 'NoSQL Injection - $ne',
    endpoint: '/tarot/single-card',
    data: { 'category': { '$ne': null } },
    expectedStatus: 400
  },
  {
    name: 'XSS Attempt',
    endpoint: '/auth/telegram',
    data: { 'initData': '<script>alert("xss")</script>' },
    expectedStatus: 400
  },
  {
    name: 'JavaScript Injection',
    endpoint: '/auth/telegram',
    data: { 'initData': 'javascript:alert("injection")' },
    expectedStatus: 400
  },
  {
    name: 'Valid Request',
    endpoint: '/auth/telegram',
    data: { 'initData': 'user=%7B%22id%22%3A123456789%7D&hash=test_hash' },
    expectedStatus: 200
  }
];

async function testSecurity() {
  console.log('🛡️  Testing NoSQL Injection Protection...\n');

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      
      const response = await fetch(`${baseUrl}${testCase.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // Для тестов
        },
        body: JSON.stringify(testCase.data)
      });

      const status = response.status;
      const isProtected = status === testCase.expectedStatus;
      
      console.log(`  Status: ${status} ${isProtected ? '✅' : '❌'}`);
      console.log(`  Expected: ${testCase.expectedStatus}`);
      
      if (!isProtected) {
        console.log(`  ⚠️  WARNING: ${testCase.name} may not be properly protected!`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('🔍 Testing Rate Limiting...\n');
  
  // Тест rate limiting
  try {
    const promises = Array(15).fill().map(() => 
      fetch(`${baseUrl}/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: 'test' })
      })
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    
    console.log(`Rate Limiting: ${rateLimited ? '✅ Active' : '❌ Not Working'}`);
    
  } catch (error) {
    console.log(`Rate Limiting Test Error: ${error.message}`);
  }

  console.log('\n🛡️  Security testing completed!');
}

// Запуск тестов
testSecurity().catch(console.error);
