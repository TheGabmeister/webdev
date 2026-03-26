import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as authApi from '../api/auth';
import type { User } from '../types';
import router from '../router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);

  async function bootstrap() {
    try {
      user.value = await authApi.getSession();
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    user.value = await authApi.login(email, password);
  }

  async function register(email: string, password: string) {
    user.value = await authApi.register(email, password);
  }

  async function logout() {
    await authApi.logout();
    user.value = null;
    router.push('/login');
  }

  function clearAuth() {
    user.value = null;
  }

  // Listen for 401 events from the API client
  window.addEventListener('auth:unauthorized', () => {
    if (user.value) {
      clearAuth();
      const currentRoute = router.currentRoute.value.fullPath;
      if (currentRoute !== '/login' && currentRoute !== '/register') {
        router.push(`/login?redirect=${encodeURIComponent(currentRoute)}`);
      }
    }
  });

  return { user, loading, bootstrap, login, register, logout, clearAuth };
});
