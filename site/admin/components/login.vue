<template>
    <div class="login">
        <div class="form has-background-primary-light">
            <div class="field">
                <label class="label">Имя пользователя</label>
                <div class="control">
                    <input
                        class="input is-primary"
                        type="text"
                        v-model="login"
                    />
                </div>
            </div>
            <div class="field">
                <label class="label">Пароль</label>
                <div class="control">
                    <input
                        class="input"
                        :class="error ? 'is-danger' : 'is-primary'"
                        type="password"
                        v-model="password"
                    />
                </div>
                <p v-if="error" class="help is-danger">{{ error }}</p>
            </div>
            <div class="has-text-centered">
                <button @click="doLogin" class="button is-primary">Вход</button>
            </div>
        </div>
    </div>
</template>
<style>
.login {
    position: fixed;
    top: 0;
    left: 0;
    background: white;
    z-index: 999999;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
.form {
    min-width: 400px;
    padding: 20px;
    border-radius: 20px;
}
</style>
<script>
import router from '../router';
import api from '../api';

export default {
    name: 'Hello',
    data: function () {
        return {
            'login': '',
            'password': '',
            'error': null
        };
    },
    methods: {
        doLogin: function () {
            api.post('/login', { user_name: this.login, user_pass: this.password })
                .then(r => {
                    localStorage.setItem('access_token', r.data.token);
                    router.push(this.$route.params.nextUrl || '/');
                }).catch(e => {
                    localStorage.removeItem('access_token');
                    this.error = 'Неверный логин или пароль';
                });
        }
    },
    mounted: function () {
        api.get('/status', { user_name: this.login, user_pass: this.password })
            .then(r => {
                router.push(this.$route.params.nextUrl || '/');
            }).catch(e => {
                localStorage.removeItem('access_token');
            });
    }
};
</script>