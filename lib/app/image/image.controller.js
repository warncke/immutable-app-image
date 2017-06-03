'use strict'

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
    var [images, imageProfiles, imageTypes] = await Promise.all([
        this.model.image.query({all: true, raw: true}),
        this.model.imageProfile.query({all: true, raw: true, view: 'imageProfiles'}),
        this.model.imageType.query({all: true, raw: true}),
    ])

    // console.log(images)
    // console.log(imageProfiles)
    // console.log(imageTypes)
    // return images
    return {
        images: images,
    }
}