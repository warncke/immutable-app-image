'use strict'

/* npm modules */
const ImmutableCoreModelView = require('immutable-core-model-view')

/* exports */
module.exports = new ImmutableCoreModelView({
    each: each,
    name: 'imageProfiles',
    post: post,
    type: 'collection',
})

/* private methods */

function each (modelView, record, number, context) {
    console.log(record)
}

function post (modelView, contexts) {
    console.log(contexts)
}