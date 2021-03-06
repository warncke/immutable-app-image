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
    applyUpload: applyUpload,
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
 * @function applyUpload
 *
 * apply view configuration for image upload modal
 *
 * @param {object} view
 *
 * @returns {object}
 */
function applyUpload (view) {
    // create view if not passed in
    if (!defined(view)) {
        view = {}
    }
    // initialize view data
    if (!defined(view.immutableAppImage)) {
        view.immutableAppImage = {}
    }
    if (!defined(view.include)) {
        view.include = []
    }
    if (!defined(view.css)) {
        view.css = []
    }
    if (!defined(view.js)) {
        view.js = []
    }
    // include view modal
    view.include.push('immutable-app-image-upload-modal')
    // add default assets for module
    _.each(defaultAssets.css, css => {
        view.css.push(_.clone(css))
    })
    _.each(defaultAssets.js, js => {
        view.js.push(_.clone(js))
    })
    // load image types
    view.immutableAppImage.imageTypes = ImmutableAppImage.imageTypes().getImageTypes()
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
 *
 * @returns {ImageTypes}
 */
function getImageTypes (args) {
    // create instance if it does not exist
    if (!defined(getGlobal().imageTypes)) {
        getGlobal().imageTypes = new ImageTypes({
            config: ImmutableAppImage.global(),
        })
    }
    // return image types instance
    return getGlobal().imageTypes
}

/**
 * @function reset
 *
 * clear global config
 */
function reset () {
    global.__immutable_app_image__ = undefined
}