<template>
    <div class="notifications">
        <div
            v-for="item in items"
            :key="item.key"
            class="notification"
            :class="'is-' + item.type"
        >
            <button
                class="delete"
                @click="items.splice(items.indexOf(item), 1)"
            ></button>
            {{ item.message }}
        </div>
    </div>
</template>
<style>
.notifications {
    z-index: 10000;
    position: fixed;
    right: 20px;
    top: 20px;
}
</style>
<script>
export default {
    data: function () {
        return {
            items: []
        };
    },
    methods: {
        show: function (message, type) {
            return new Promise((resolve, reject) => {
                if (!this.$parent) {
                    this.$mount();
                    document.body.appendChild(this.$el);
                }
                let item = {
                    type: type || 'primary',
                    message: message
                };
                this.items.push(item);
                setTimeout(() => this.items.splice(this.items.indexOf(item), 1), 5000);
            });
        }
    }
};
</script>