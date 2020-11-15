<template>
    <div class="wrapper">
        <div class="sidebar has-background-light">
            <aside class="menu">
                <div class="my-3">
                    <img
                        src="https://bulma.io/images/bulma-logo.png"
                        alt="Bulma: Free, open source, and modern CSS framework based on Flexbox"
                    />
                </div>
                <ul class="menu-list" @click="toggleSidebar">
                    <li>
                        <router-link
                            to="dashboard"
                            :class="isCurrent('/dashboard')"
                        >
                            Панель
                        </router-link>
                    </li>
                    <li>
                        <router-link
                            to="products"
                            :class="isCurrent('/products')"
                        >
                            Продукты
                        </router-link>
                    </li>
                    <li>
                        <router-link
                            to="users"
                            :class="isCurrent('/users')"
                        >
                            Пользователи
                        </router-link>
                    </li>
                    <li>
                        <router-link
                            to="settings"
                            :class="isCurrent('/settings')"
                        >
                            Настройки
                        </router-link>
                    </li>
                </ul>
            </aside>
        </div>
        <div class="main">
            <div class="navbar" role="navigation" aria-label="main navigation">
                <div class="navbar-brand">
                    <a class="navbar-item" href="https://bulma.io">
                        <img
                            src="https://bulma.io/images/bulma-logo.png"
                            alt="Bulma: Free, open source, and modern CSS framework based on Flexbox"
                            width="112"
                            height="28"
                        />
                    </a>
                    <a
                        role="button"
                        class="navbar-burger"
                        aria-label="menu"
                        aria-expanded="false"
                        @click="toggleSidebar"
                    >
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                    </a>
                </div>
            </div>
            <div class="router-content">
                <router-view></router-view>
            </div>
        </div>
    </div>
</template>
<style>
html, body, .wrapper {
    width: 100%;
    height: 100%;
}
.sidebar {
    position: fixed;
    z-index: 999;
    top: 0;
    left: 0;
    width: 300px;
    height: 100%;
    padding: 10px;
    transition: margin-left 0.5s;
}
.main {
    width: calc(100% - 300px);
    margin-left: 300px;
    height: 100%;
}
@media screen and (max-width: 768px) {
    .main {
        margin-left: 0px;
        width: 100%;
    }
    .sidebar {
        margin-left: -300px;
    }
    .sidebar.is-active {
        margin-left: 0px;
        display: block;
    }
}
.is-loading {
    position: relative;
    pointer-events: none;
    opacity: 0.5;
}
.is-loading::after {
    animation: spinAround 500ms infinite linear;
    border: 2px solid gray;
    border-radius: 50%;
    border-right-color: transparent;
    border-top-color: transparent;
    content: "";
    display: block;
    position: fixed;
    top: calc(50% - 2.5em);
    left: calc(50% - 2.5em);
    width: 5em;
    height: 5em;
    border-width: 0.25em;
}
</style>
<script>
import router from '../router';
export default {
    methods: {
        toggleSidebar: function () {
            document.querySelector('.sidebar').classList.toggle('is-active');
        },
        isCurrent(route) {
            return router.currentRoute.path == route ? 'is-active' : '';
        }
    },
    mounted() {
        document.querySelector('body').addEventListener('click', (e) => {
            if (e.target != document.querySelector('.sidebar')
                && e.target != document.querySelector('.navbar-burger')
                && document.querySelector('.sidebar').classList.contains('is-active')) {
                document.querySelector('.sidebar').classList.remove('is-active');
            }
        });
    }
}
</script>