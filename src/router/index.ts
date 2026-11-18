import { createRouter, createWebHistory } from 'vue-router'

const initRouter = () =>
  createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        name: 'home',
        component: () => import('../views/HomeView.vue'),
      },
      {
        path: '/profile',
        name: 'profile',
        component: () => import('../views/ProfileView.vue'),
      },
      {
        path: '/collections',
        name: 'collections',
        component: () => import('../views/BooksView.vue'),
      },
      {
        path: '/search',
        name: 'search',
        component: () => import('../views/SearchView.vue'),
      },
    ],
  })

export default initRouter
