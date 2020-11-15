import 'bulma/css/bulma.css';

import Vue from 'vue';
import VueRouter from 'vue-router';
import router from './router';
import App from './components/app.vue';

// register notifications
import Notification from './components/notification.vue'
Vue.prototype.$notification = new (Vue.extend(Notification))();

Vue.use(VueRouter);
new Vue({
    router,
    render: h => h(App)
}).$mount('#app');