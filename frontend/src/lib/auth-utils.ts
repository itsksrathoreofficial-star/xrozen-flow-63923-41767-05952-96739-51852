/**
 * Clear all authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('sb-localhost-auth-token');
  
  // Clear any other auth-related keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('auth') || key.includes('token') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  console.log('🧹 Cleared all authentication data from localStorage');
};

// Auto-clear on page load if there are issues
if (typeof window !== 'undefined') {
  // Check if there's an expired token on page load
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp < currentTime) {
        console.log('🧹 Found expired token, clearing localStorage');
        clearAuthData();
      }
    } catch (error) {
      console.log('🧹 Invalid token found, clearing localStorage');
      clearAuthData();
    }
  }
}
