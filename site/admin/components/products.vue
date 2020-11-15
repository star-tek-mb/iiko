<template>
    <div class="sideview columns is-gapless">
        <div class="left column is-4">
            <div class="notification is-link m-0 has-text-weight-bold">
                Категории
            </div>
            <div class="menu">
                <Groups
                    class="menu-list"
                    @group-selected="selected"
                    :selected="group"
                    :groups="dbGroups"
                    :root="null"
                ></Groups>
            </div>
        </div>
        <div class="right column is-8">
            <div class="notification is-link m-0 has-text-weight-bold">
                Продукты
                <button
                    class="button refresh is-pulled-right is-primary"
                    :class="refreshing ? 'is-loading' : ''"
                    @click="refresh"
                >
                    Обновить
                </button>
            </div>
            <div class="menu">
                <ul
                    v-for="product in dbProducts"
                    :key="product.id"
                    class="menu-list"
                >
                    <li>
                        <a>{{ product.name }}</a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
<style>
.refresh {
    margin-top: -0.5em;
}
.sideview {
    max-height: calc(100vh - 120px);
}
.left .menu,
.right .menu {
    height: 100%;
    overflow-y: auto;
}
.left .notification,
.right .notification {
    border-radius: 0;
}
@media screen and (max-width: 768px) {
    .left .menu,
    .right .menu {
        height: 300px;
    }
}
</style>
<script>
import _ from 'lodash';
import api from '../api';
import Groups from './groups.vue';

export default {
    data: function () {
        return {
            dbGroups: [],
            dbProducts: [],
            group: null,
            refreshing: false
        };
    },
    components: {
        Groups
    },
    methods: {
        selected: function (id) {
            api.get('/products/' + id)
                .then(r => {
                    this.group = r.group.id;
                    this.dbProducts = r.data.products;
                }).catch(e => {
                    this.$notification.show('Не удалось получить продукты', 'danger');
                });
        },
        refresh: function () {
            this.refreshing = true;
            api.get('/products/refresh')
                .then(r => {
                    this.$router.replace();
                    this.$notification.show('Номенклатура обновлена');
                    this.refreshing = false;
                }).catch(e => {
                    this.$notification.show('Не удалось получить продукты', 'danger');
                    this.refreshing = false;
                });
        }
    },
    mounted: function () {
        api.get('/groups')
            .then(r => {
                this.dbGroups = r.data;
            }).catch(e => {
                this.$notification.show('Не удалось получить продукты', 'danger');
            });
    }
}
</script>