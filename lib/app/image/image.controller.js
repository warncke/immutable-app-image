'use strict'

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')

/* application modules */
const ImmutableAppImage = require('../../immutable-app-image')

/* exports */
module.exports = {
    paths: {
        '/': {
            get: {
                method: getImages,
                role: 'authenticated',
                template: 'index',
            },
        },
    },
}

/**
 * @function getImages
 *
 * @param {object} args
 *
 * @returns {Promise}
 */
async function getImages (args) {
    // load all images for user
    var images = await this.model.image.query({all: true})
    // get image types instance
    var imageTypes = ImmutableAppImage.imageTypes()
    // list of images grouped by image type
    var groupedImages = []
    // group images by image type
    var imagesByType = _.groupBy(images, 'data.thumb.imageTypeName')
    // get image type names sorted by alpha
    var imageTypeNames = _.keys(imagesByType).sort()
    // add each group to images
    _.each(imageTypeNames, imageTypeName => {
        groupedImages.push({
            title: `${imageTypeName} Images`,
            images: imagesByType[imageTypeName],
        })
    })
    // view data
    var view = {
        images: groupedImages,
    }
    // add default view variables
    ImmutableAppImage.apply(view)

    return view
}