'use strict'

/* native modules */
const assert = require('assert')

/* npm modules */
const _ = require('lodash')
const changeCase = require('change-case')
const defined = require('if-defined')
const sharp = require('sharp')

/* application modules */
const ImmutableAppImage = require('./immutable-app-image')

/* exports */
module.exports = ImmutableAppImageUpload

/* constants */

// proerties for new instance
const properties = [
    'ai',
    'buffer',
    'imageProfiles',
    'imageType',
    'meta',
    'session',
]

/**
 * @function ImmutableAppImageUpload
 *
 * instantiate new upload instance
 *
 * @param {object} args
 *
 * @returns {ImmutableAppImageUpload}
 */
function ImmutableAppImageUpload (args) {
    // initialize instance with properties from args
    _.merge(this, _.pick(args, properties))
    // default values
    if (!defined(this.meta)) {
        this.meta = {}
    }
    if (!defined(this.imageProfiles)) {
        this.imageProfiles = []
    }
    // require properties
    _.each(properties, property => {
        assert(defined(this[property]), `${property} required`)
    })
    // flag set to true if original image was modified
    this.modified = false
    // processing promises to wait for
    this.processPromises = []
    // get config
    this.config = ImmutableAppImage.global()
}

/* public methods */
ImmutableAppImageUpload.prototype = {
    getFileName: getFileName,
    getImageName: getImageName,
    getPath: getPath,
    getSaveAsFileName: getSaveAsFileName,
    process: process,
    processImage: processImage,
    processPrimaryImage: processPrimaryImage,
    processProfileImages: processProfileImages,
}

/**
 * @function getFileName
 *
 * bulid file name for image
 *
 * @returns {string}
 */
function getFileName () {
    // get name
    var name = this.meta.imageName || this.meta.fileName || 'New Image'
    // remove extension if any
    name = name.replace(/\.\w{3,4}$/, '')
    // get param case version of name
    return changeCase.paramCase(name)
}

/**
 * @function getImageName
 *
 * bulid name for image
 *
 * @returns {string}
 */
function getImageName () {
    // if image name is was set by client use it
    if (typeof this.meta.imageName === 'string' && this.meta.imageName.length) {
        return this.meta.imageName
    }
    // base name on file name
    return changeCase.titleCase(this.getFileName())
}

/**
 * @function getPath
 *
 * bulid path for image
 *
 * @returns {string}
 */
function getPath () {
    // custom path derived from session value (e.g. accountId)
    var path
    // if path property is string then get value from session
    if (typeof this.config.pathProperty === 'string') {
        path = this.session[this.config.pathProperty]
    }
    // if path property is array then try values until one is found
    else if (Array.isArray(this.config.pathProperty)) {
        // get number of path properties
        var len = this.config.pathProperty.length
        // get first value that is set
        for (var i=0; i < len; i++) {
            var pathProperty = this.config.pathProperty[i]
            // if path property exists on session use it
            if (defined(this.session[pathProperty])) {
                path = this.session[pathProperty]
                // use first value only
                break
            }
        }
    }
    // if there is no path property then return base
    else {
        return this.config.base
    }

    // require path value
    assert(defined(path), `path value missing from session ${this.config.pathProperty}`)
    // if base has value then append path with slash otherwise return path only
    return this.config.base.length
        ? this.config.base+'/'+path
        : path
}

/**
 * @function getSaveAsFileName
 *
 * complete path and name to save image as
 *
 * @returns {string}
 */
function getSaveAsFileName (path, fileName, fileType, imageId, profileName) {
    var saveAs
    // set path if defined
    if (defined(path)) {
        saveAs = path + '/' + fileName + '-' + imageId
    }
    else {
        saveAs = fileName + '-' + imageId
    }
    // add profile name to image if defined
    if (defined(profileName)) {
        saveAs = saveAs + '-' + profileName
    }
    // add extension
    saveAs = saveAs + '.' + fileType

    return saveAs
}

/**
 * @function process
 *
 * create image record, process and save primary image and any variants
 */
async function process () {
    // get image path
    this.path = this.getPath()
    // get file name
    this.fileName = this.getFileName()
    // get file type
    this.fileType = this.imageType.data.fileType
    // get image name
    this.imageName = this.getImageName()
    // get sharp image instance to get meta data and modify
    this.sharp = sharp(this.buffer)
    // get image metadata
    this.sharpMetaData = await this.sharp.metadata()
    // create image record
    this.imageRecordPromise = this.ai.model.image.create({
        fileName: this.fileName,
        fileType: this.fileType,
        imageName: this.imageName,
        imageTypeId: this.imageType.id,
        path: this.path,
    })
    // process primary image first
    await this.processPrimaryImage()
    // process profile variants
    await this.processProfileImages()
    // wait for all processing to complete
    return Promise.all(this.processPromises).then(() => {
        // resolve with image record
        return this.imageRecordPromise
    })
    // reload image to apply views
    .then(image => this.ai.model.image.select.by.id(image.id))
}

/**
 * @function processImage
 *
 * resize and encode image
 *
 * @param {object} origMeta
 * @param {object} targetMeta
 *
 * @returns {Buffer}
 */
async function processImage (origMeta, targetMeta) {
    // file type to encode image with
    var fileType
    // options to encode image with
    var encodeOptions = {}
    // set file type and options based on target type
    if (targetMeta.fileType === 'png') {
        fileType = 'png'
        encodeOptions = {
            compressionLevel: 9,
            force: true,
        }
    }
    else if (targetMeta.fileType === 'webp') {
        fileType = 'webp'
        encodeOptions = {
            force: true,
            quality: targetMeta.quality,
        }
    }
    else {
        fileType = 'jpeg'
        encodeOptions = {
            force: true,
            progressive: true,
            quality: targetMeta.quality,
        }
    }
    // dimensions to encode image with
    var height, width
    // target image has a fixed height and width - output must match exactly
    if (targetMeta.height && targetMeta.width) {
        height = targetMeta.height
        width = targetMeta.width
    }
    // if only a target height is specified scale to height with aspect ratio
    else if (targetMeta.height) {
        height = targetMeta.height
        // use target aspect ratio if set or default to image aspect ratio
        var aspectRatio = defined(targetMeta.aspectRatio)
            ? targetMeta.aspectRatio
            : origMeta.width / origMeta.height
        // calculate width from height and aspect ratio
        width = Math.round(height * aspectRatio)
    }
    // if only target width is specified scale to width with aspect ratio
    else if (targetMeta.width) {
        width = targetMeta.width
        // use target aspect ratio if set or default to image aspect ratio
        var aspectRatio = defined(targetMeta.aspectRatio)
            ? targetMeta.aspectRatio
            : origMeta.width / origMeta.height
        // calculate hieght from width and aspect ratio
        height = Math.round(width / aspectRatio)
    }
    // if max width or max height specified then scale image
    else if (targetMeta.maxHeight || targetMeta.maxWidth) {
        // start with original dimensions
        height = origMeta.height
        width = origMeta.width
        // get aspect ratio
        var aspectRatio = defined(targetMeta.aspectRatio)
            ? targetMeta.aspectRatio
            : origMeta.width / origMeta.height
        // if max height is specified constrain to max height
        if (targetMeta.maxHeight && height > targetMeta.maxHeight) {
            height = targetMeta.maxHeight
            width = Math.round(height * aspectRatio)
        }
        // if max width is specified constrain to max width
        if (targetMeta.maxWidth && width > targetMeta.maxWidth) {
            width = targetMeta.maxWidth
            height = Math.round(width / aspectRatio)
        }
    }

    // if target matches orig and image has not been modified the return orig
    if (origMeta.height === height && origMeta.width === width && origMeta.format === fileType && !this.modified) {
        return this.sharp[fileType](encodeOptions).toBuffer()
    }
    // otherwise do new encode
    else {
        // clone sharp instance
        var sharp = this.sharp.clone()
        // resize, convert, and output image
        return sharp.resize(width, height)[fileType](encodeOptions).toBuffer()
    }
}

/**
 * @function processPrimaryImage
 *
 * process and save primary image
 */
async function processPrimaryImage () {
    // modify image if cropper meta data is set
    if (defined(this.meta.cropData)) {
        // get the number of pixels to crop from left
        var left = Math.round(this.meta.cropData.x || 0)
        // get number of pixels to crop from top
        var top = Math.round(this.meta.cropData.y || 0)
        // get the height of cropped image
        var height = Math.round(this.meta.cropData.height || this.sharpMetaData.height - top)
        // get the width of cropped image
        var width = Math.round(this.meta.cropData.width || this.sharpMetaData.width - left)
        // if there is negative x left offset image must be extended
        if (left < 0) {
            // get absolute value of negative offset rounded up
            var extend = Math.ceil(Math.abs(left))
            // extend image
            this.sharp.extend({top: 0, bottom: 0, left: extend, right: 0, background: 'white'})
            // add extend value to width
            this.sharpMetaData.width += extend
            // new offset is 0
            left = 0
        }
        // if there is a negative y offset image must be extended
        if (top < 0) {
            // get absolute value of negative offset rounded up
            var extend = Math.ceil(Math.abs(top))
            // extend image
            this.sharp.extend({top: extend, bottom: 0, left: 0, right: 0, background: 'white'})
            // add extend value to width
            this.sharpMetaData.height += extend
            // new offset is 0
            top = 0
        }
        // if crop height is greater than image size extend
        if (height + top > this.sharpMetaData.height) {
            // get amount to extend image by
            var extendHeight = height + top - this.sharpMetaData.height
            // extend image
            this.sharp.extend({top: 0, bottom: extendHeight, left: 0, right: 0, background: 'white'})
            // subtract extension from height
            height -= extendHeight
        }
        // if crop width is greater than image size extend
        if (width + left > this.sharpMetaData.width) {
            // get amount to extend image by
            var extendWidth = width + left - this.sharpMetaData.width
            // extend image
            this.sharp.extend({top: 0, bottom: 0, left: 0, right: extendWidth, background: 'white'})
            // subtract extension from width
            width -= extendWidth
        }
        // only do crop if smaller than original
        if (height < this.sharpMetaData.height || width < this.sharpMetaData.width) {
            // do crop
            this.sharp.extract({
                height: height,
                left: left,
                top: top,
                width: width,
            })
            // update meta data with new width/height values
            this.sharpMetaData.height = height
            this.sharpMetaData.width = width
            // add extend values if any
            if (extendHeight) {
                this.sharpMetaData.height += extendHeight
            }
            if (extendWidth) {
                this.sharpMetaData.width += extendWidth
            }
        }
    }
    // get promise to be resolved when image is done processing
    var processedImage = await this.processImage(this.sharpMetaData, this.imageType.data)
    // wait for image record to be created
    var imageRecord = await this.imageRecordPromise
    // get file name for saving
    var saveAsFileName = this.getSaveAsFileName(this.path, this.fileName, this.fileType, imageRecord.id)
    // save image
    await this.config.fs.writeFile(saveAsFileName, processedImage)
}

/**
 * @function processProfileImages
 *
 * process and save any image profile variants
 */
async function processProfileImages () {
    return Promise.each(this.imageProfiles, imageProfile => {
        // do not create image unless pregenerate is true
        if (!imageProfile.pregenerate) {
            return
        }
        // get promise to be resolved when image is done processing
        var processPromise = this.processImage(this.sharpMetaData, imageProfile)
        // save processed image
        .then(async processedImage => {
            // wait for image record to be created
            var imageRecord = await this.imageRecordPromise
            // get file name for saving
            var saveAsFileName = this.getSaveAsFileName(this.path, this.fileName, imageProfile.fileType, imageRecord.id, imageProfile.imageProfileName)
            // save image
            await this.config.fs.writeFile(saveAsFileName, processedImage)
        })
        // add promise to list
        this.processPromises.push(processPromise)
    })
}