'use strict'

/* native modules */
const assert = require('assert')

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')
const immutableApp = require('immutable-app')
const mergeArgs = require('merge-args')({
    emptyStringUndefined: false,
})
const requireValidOptionalObject = require('immutable-require-valid-optional-object')

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
module.exports = {
    apply: apply,
    config: config,
    global: getGlobal,
    reset: reset,
}

// create immutable-app module
const app = immutableApp('immutable-app-image')

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
    if (defined(view)) {
        // add default assets for module
        _.merge(view, defaultAssets)
        // add default variables for modul
        _.merge(view, defaultApply)
    }
    // return default variables
    return defaultApply
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
 * @function reset
 *
 * clear global config
 */
function reset () {
    global.__immutable_app_image__ = undefined
}