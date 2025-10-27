// Admin Panel Router Fix
if (typeof window !== 'undefined') {
  // Перехватываем загрузку React и добавляем HashRouter
  console.log('🔧 Router fix loaded');

  // Ожидаем загрузки React Router
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'popstate') {
      console.log('🔧 Intercepted popstate event');
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}
