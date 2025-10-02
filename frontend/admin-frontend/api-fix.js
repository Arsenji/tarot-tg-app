// Admin Panel API URL Fix
console.log('🔧 Admin Panel API Fix loaded');

// Проверяем и исправляем API URL
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // Исправляем дублированное /api
    if (typeof url === 'string' && url.includes('/api/api/')) {
      url = url.replace('/api/api/', '/api/');
      console.log('🔧 Fixed API URL:', url);
    }
    return originalFetch(url, options);
  };
}

console.log('✅ API URL fix applied');
