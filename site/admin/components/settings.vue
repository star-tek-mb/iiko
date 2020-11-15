<template>
    <div v-if="settings" v-show="map" class="p-4">
        <div class="field">
            <label class="label">Широта</label>
            <div class="control">
                <input
                    class="input is-primary"
                    type="number"
                    v-model="settings.location.latitude"
                />
            </div>
        </div>
        <div class="field">
            <label class="label">Долгота</label>
            <div class="control">
                <input
                    class="input is-primary"
                    type="number"
                    v-model="settings.location.longitude"
                />
            </div>
        </div>
        <div id="map" style="width: 100%; height: 400px"></div>
        <div class="field">
            <label class="label">Первые км, км</label>
            <div class="control">
                <input
                    class="input is-primary"
                    type="number"
                    v-model="settings.first_km"
                />
            </div>
        </div>
        <div class="field">
            <label class="label">Цена за первые км, сум</label>
            <div class="control">
                <input
                    class="input is-primary"
                    type="number"
                    v-model="settings.price_first_km"
                />
            </div>
        </div>
        <div class="field">
            <label class="label">Лимит доставки, км</label>
            <div class="control">
                <input
                    class="input is-primary"
                    type="number"
                    v-model="settings.first_km"
                />
            </div>
        </div>
        <div class="field">
            <label class="label">Цена за км, сум</label>
            <div class="control">
                <input
                    class="input is-primary"
                    type="number"
                    v-model="settings.price_per_km"
                />
            </div>
        </div>
        <div class="field has-text-centered">
            <button @click="saveSettings" class="button is-primary">
                Сохранить
            </button>
        </div>
    </div>
</template>
<script>
import api from '../api';
export default {
    data: function () {
        return {
            settings: null,
            map: null,
            placemark: null
        }
    },
    watch: {
        settings: {
            handler: function (v, old) {
                if (v && v.location && this.placemark) {
                    this.placemark.geometry.setCoordinates([v.location.latitude, v.location.longitude]);
                }
            },
            deep: true
        }
    },
    methods: {
        saveSettings: function () {
            api.post('/settings', this.settings)
                .then(r => {
                    this.$notification.show('Настройки успешно сохранены');
                })
                .catch(e => {
                    this.$notification.show('Не удалось сохранить настройки', 'danger');
                });
        }
    },
    mounted: function () {
        document.body.classList.add('is-loading');
        // load settings
        api.get('/settings')
            .then((r) => {
                this.settings = r.data.settings;
            });

        // load yandex map
        let yandexMapScript = document.createElement('script');
        let apiKey = process.env.YANDEXMAP_TOKEN;
        yandexMapScript.setAttribute('src', `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=en_RU`);
        yandexMapScript.setAttribute('type', 'text/javascript');
        document.head.appendChild(yandexMapScript);
        yandexMapScript.onload = () => {
            ymaps.ready(() => {
                this.map = new ymaps.Map("map", {
                    center: [41.1500, 63.9805],
                    zoom: 5
                });
                this.placemark = new ymaps.Placemark([this.settings.location.latitude, this.settings.location.longitude]);
                this.map.geoObjects.add(this.placemark);
                this.map.events.add('click', (e) => {
                    var coords = e.get('coords');
                    this.$set(this.settings, 'location', {
                        latitude: coords[0].toPrecision(6),
                        longitude: coords[1].toPrecision(6)
                    });
                });
                document.body.classList.remove('is-loading');
            });
        };
    }
}
</script>