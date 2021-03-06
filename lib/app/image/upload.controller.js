'use strict'

/* native modules */
const assert = require('assert')

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')
const multer = require('multer')

/* application modules */
const ImmutableAppImage = require('../../immutable-app-image')
const ImmutableAppImageUpload = require('../../immutable-app-image-upload')

// initalize multer middleware for image upload
const upload = multer({
    limits: {
        // 20 MB max file size
        fileSize: 20*1024*1024,
    },
    storage: multer.memoryStorage(),
})

/* controller specification */
module.exports = {
    paths: {
        '/upload': {
            get: {
                method: getUpload,
                role: 'authenticated',
                template: 'upload',
            },
            post: {
                input: {
                    file: 'file',
                    meta: 'body.meta',
                },
                method: postUpload,
                middleware: [ upload.single('image') ],
                role: 'authenticated',
                template: 'upload',
            },
        }
    }
}

/* controller functions */

/**
 * @function getUpload
 *
 * create image upload page
 */
async function getUpload (args) {
    // view data
    var view = {}
    // load image types
    view.imageTypes = ImmutableAppImage.imageTypes().getImageTypes()
    // add default view variables
    ImmutableAppImage.apply(view)
    // return view data
    return view
}

/**
 * @function postUpload
 *
 * handle image upload
 */
async function postUpload (args) {
    // parse meta data
    var meta = JSON.parse(args.meta)
    // load image type and profiles
    var imageType = ImmutableAppImage.imageTypes().getImageTypeById(meta.imageTypeId)
    // require image type
    assert(defined(imageType), 'image type not found')
    // get list of image profiles for image type
    var imageProfiles = _.values(imageType.imageProfiles)
    // create new upload instance
    var upload = new ImmutableAppImageUpload({
        ai: this,
        buffer: args.file.buffer,
        imageProfiles: imageProfiles,
        imageType: imageType,
        meta: meta,
        session: args.session,
    })
    // process upload
    return upload.process()
}