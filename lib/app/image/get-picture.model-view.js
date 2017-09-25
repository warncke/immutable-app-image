'use strict'

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')
const ImmutableCoreModelView = require('immutable-core-model-view')

/* application modules */
const ImmutableAppImage = require('../../immutable-app-image')

/* exports */
module.exports = new ImmutableCoreModelView({
    each: getPicture,
    immutable: false,
    meta: true,
    name: 'getPicture',
    sequential: false,
    type: 'record',
})

/**
 * @function getPicture
 *
 * load picture data for image record
 *
 * @param {ImmutableCoreModelView} modelView
 * @param {ImmutableCoreModelRecord|object} record
 */
function getPicture (modelView, record) {
    // record must have imageData property
    if (!defined(record.imageData)) {
        return
    }
    // get image types provider
    var imageTypes = ImmutableAppImage.imageTypes()
    // for each picture type defined in args add picture to image
    _.each(modelView.args, (args, name) => {
        // get copy of args to add picture record
        args = _.clone(args)
        // set image to get picture for
        args.image = record
        // add picture to record by name
        record.imageData[name] = imageTypes.getPicture(args)
        // if record is ImmutableCoreModelRecord object then add property
        if (record.ImmutableCoreModelRecord) {
            record.properties.push(name)
        }
    })
}