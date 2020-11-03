module.exports = function (opts) {
    const options = {
        property: 'session',
        collection: 'sessions',
        db: null, // mongodb
        getSessionKey: (ctx) => ctx.from && ctx.chat && `${ctx.from.id}:${ctx.chat.id}`,
        ...opts
    }

    return (ctx, next) => {
        const key = options.getSessionKey(ctx);
        if (!key) {
            return next(ctx);
        }
        return Promise.resolve(options.db.collection(options.collection).findOne({ key: key }))
            .then((state) => state ? state.data : {})
            .then((session) => {
                Object.defineProperty(ctx, options.property, {
                    get: function () { return session },
                    set: function (newValue) { session = { ...newValue } }
                });
                return next(ctx)
                    .then(() =>
                        options.db.collection(options.collection).deleteOne({ key: key }))
                    .then(() => {
                        options.db.collection(options.collection).insertOne({ key: key, data: session })
                    });
            });
    }
}
