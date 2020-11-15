import VueRouter from 'vue-router';

const router = new VueRouter({
    base: 'admin',
    mode: 'history',
    routes: [
        { path: '/', redirect: '/dashboard' },
        { name: 'login', path: '/login', component: () => import('./components/login.vue') },
        { name: 'dashboard', path: '/dashboard', component: () => import('./components/dashboard.vue') },
        { name: 'settings', path: '/settings', component: () => import('./components/settings.vue') },
        { name: 'users', path: '/users', component: () => import('./components/users.vue') },
        { name: 'products', path: '/products', component: () => import('./components/products.vue') },
        { name: 'product', path: '/products/:id', component: () => import('./components/products.vue') },
    ]
});

router.beforeEach((to, from, next) => {
    if (!to.matched.some((r) => r.name == 'login')) {
        if (!localStorage.getItem('access_token')) {
            next({
                name: 'login',
                params: { nextUrl: to.fullPath }
            });
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;