import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/drive',
      name: 'drive',
      component: () => import('../views/DriveView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/drive/folder/:id',
      name: 'drive-folder',
      component: () => import('../views/DriveView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/drive/starred',
      name: 'drive-starred',
      component: () => import('../views/DriveView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/drive/trash',
      name: 'drive-trash',
      component: () => import('../views/DriveView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/drive/search',
      name: 'drive-search',
      component: () => import('../views/DriveView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      redirect: '/drive',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/drive',
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  // Wait for bootstrap to complete
  if (auth.loading) {
    const unwatch = auth.$subscribe(() => {
      if (!auth.loading) {
        unwatch();
        proceed();
      }
    });
    return;
  }

  proceed();

  function proceed() {
    if (to.meta.requiresAuth && !auth.user) {
      next({ path: '/login', query: { redirect: to.fullPath } });
    } else if (to.meta.guest && auth.user) {
      next('/drive');
    } else {
      next();
    }
  }
});

export default router;
