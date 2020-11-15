<template>
    <div class="p-4">
        <div v-show="users" class="table-container">
            <table class="table is-fullwidth">
                <thead>
                    <th>Имя</th>
                    <th>Телефон</th>
                </thead>
                <tbody>
                    <tr v-for="user in users" :key="user.key">
                        <td>{{ user.data.name }}</td>
                        <td>{{ user.data.phone }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
<script>
import api from '../api';
export default {
    data: function () {
        return {
            users: null
        };
    },
    mounted() {
        api.get('/users/telegram')
            .then(r => {
                console.log(r.data.users);
                this.users = r.data.users;
            })
            .catch(e => {
                console.log(e);
                this.$notification.show('Не удалось получить данные', 'danger');
            });
    }
}
</script>