'use strict'

/* native modules */
const assert = require('assert')

/* npm modules */
const ImmutableCoreModel = require('immutable-core-model')
const _ = require('lodash')
const defined = require('if-defined')
const immutableApp = require('immutable-app')
const mergeArgs = require('merge-args')({
    emptyStringUndefined: false,
})
const requireValidOptionalObject = require('immutable-require-valid-optional-object')

/* application modules */
const ImageTypes = require('./image-types')

/* constants */

const defaultAssets = {
    css: [
        {
            href: 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/0.8.1/cropper.min.css',
        },
        {
            href: '/assets/immutable-app-image.css',
        },
    ],
    js: [
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/0.8.1/cropper.min.js',
        },
        {
            src: '/assets/immutable-app-image.js'
        }
    ],
}

const defaultApply = {
    imageElmClass: 'immutable-app-image',
    imageElmId: 'immutable-app-image',
}

const defaultConfig = {
    // base directory path for saving images
    base: '',
    // file system object to save image to
    fs: undefined,
    // host for service images
    host: '',
    // property to use for path
    pathProperty: undefined,
}

/* exports */
const ImmutableAppImage = module.exports = {
    afterController: afterController,
    apply: apply,
    config: config,
    global: getGlobal,
    imageTypes: getImageTypes,
    reset: reset,
}

// create immutable-app module
const app = immutableApp('immutable-app-image')

/**
 * @function afterController
 *
 * method to use after controllers with image upload forms to add necessary
 * data to view
 *
 * @param {object} args
 *
 * @returns {object}
 */
async function afterController (args) {
    // do not apply for json response
    if (args.args.json) {
        return
    }
    // view data
    var view = {
        immutableAppImage: {},
        include: ['immutable-app-image-upload-modal'],
    }
    // add default assets for module
    _.merge(view, defaultAssets)
    // load image types
    view.immutableAppImage.imageTypes = await this.model.imageType.select.all.allow
        .where.imageTypeName.is.not.null
        .order.by.imageTypeName
    // get model
    var imageModel = ImmutableCoreModel.model('image')
    // require controller
    if (!defined(imageModel) || !defined(imageModel.controller)) {
        throw new Error('image controller not found')
    }
    // set path for upload
    view.immutableAppImage.uploadPath = '/'+imageModel.controller.path+'/upload'
    // return view data
    return view
}

/**
 * @function apply
 *
 * set module args for view
 *
 * @param {object} view
 *
 * @returns {object}
 */
function apply (view) {
    if (!defined(view)) {
        view = {}
    }
    // add default assets for module
    _.merge(view, defaultAssets)
    // add default variables for module
    _.merge(view, defaultApply)
    // return default variables
    return view
}

/**
 * @function config
 *
 * initializes from configuration
 *
 * @param {object} args
 *
 * @throws {Error}
 */
function config (args) {
    // create new config based on default
    var config = getGlobal()
    // merge args over default config
    mergeArgs(config, args)
    // require fs object
    assert(defined(config.fs), 'fs required')
}

/**
 * @function getGlobal
 *
 * return global config - create from default if not defined
 *
 * @returns {object}
 */
function getGlobal () {
    // create global config object from default if not defined
    if (!global.__immutable_app_image__) {
        global.__immutable_app_image__ = _.cloneDeep(defaultConfig)
    }
    // return global config
    return global.__immutable_app_image__
}

/**
 * @function getImageTypes
 *
 * load image type data and resolve with ImageType instance
 *
 * @param {object} args
 * @param {ImmutableAI} args.ai
 *
 * @returns {Promise<ImageTypes>}
 */
function getImageTypes (args) {
    var ai = args.ai
    // load data
    return Promise.all([
        ai.model.imageProfile.query({all: true, allow: true, raw: true}),
        ai.model.imageType.query({all: true, allow: true, raw: true}),
        ai.model.imageTypeImageProfile.query({all: true, allow: true, raw: true}),
    ]).then(data => {
        var [imageProfiles, imageTypes, imageTypeImageProfiles] = data
        // create new ImageTypes instance
        return new ImageTypes({
            config: ImmutableAppImage.global(),
            imageProfiles: imageProfiles,
            imageTypes: imageTypes,
            imageTypeImageProfiles: imageTypeImageProfiles,
        })
    })
}

/**
 * @function reset
 *
 * clear global config
 */
function reset () {
    global.__immutable_app_image__ = undefined
}