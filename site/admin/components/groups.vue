<template>
    <ul>
        <li v-for="group in groupsBy(root)" :key="group.id">
            <a @click="selected(group.id)" :class="group.id == active">
                {{ group.name }}
            </a>
            <Groups
                @group-selected="selected"
                :active="active"
                :groups="groups"
                :root="group"
            ></Groups>
        </li>
    </ul>
</template>
<script>
import _ from 'lodash';

export default {
    name: 'Groups',
    props: ['root', 'groups', 'active'],
    methods: {
        groupsBy: function (group) {
            return _(this.groups).filter({ parentGroup: (group ? group.id : null) }).value();
        },
        selected: function (id) {
            this.active = id;
            this.$emit('group-selected', id);
        }
    }
}
</script>