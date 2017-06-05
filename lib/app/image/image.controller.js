'use strict'

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')

/* application modules */
const ImageTypes = require('../../image-types')
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
    var [images, imageProfiles, imageTypes, imageTypeImageProfiles] = await Promise.all([
        this.model.image.query({all: true, raw: true}),
        this.model.imageProfile.query({all: true, raw: true}),
        this.model.imageType.query({all: true, raw: true}),
        this.model.imageTypeImageProfile.query({all: true, raw: true}),
    ])
    // build image type data
    var imageTypes = new ImageTypes({
        imageProfiles: imageProfiles,
        imageTypeImageProfiles: imageTypeImageProfiles,
        imageTypes: imageTypes,
    })
    // list of images grouped by image type
    var groupedImages = []
    // group images by image type
    var imagesByType = {}
    // get data to build image/picture tags
    _.each(images, image => {
        // get picture data
        var picture = imageTypes.getPictureData({
            image: image,
            width: 150,
        })
        // create entry for image type if not defined
        if (!defined(imagesByType[picture.imageTypeName])) {
            imagesByType[picture.imageTypeName] = []
        }
        // add picture data to group
        imagesByType[picture.imageTypeName].push(picture)
    })
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