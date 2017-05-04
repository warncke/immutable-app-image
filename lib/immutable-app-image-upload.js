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
    // if base is defined use it for path
    var path = defined(this.config.base) ? this.config.base : ''
    // if path property is set then get value from session
    if (defined(this.config.pathProperty)) {
        var pathValue = this.session[this.config.pathProperty]
        // require path value
        assert(defined(pathValue), `path value missing from session ${this.config.pathProperty}`)
        // add trailing slash if needed
        if (path.length > 0 && !path.match(/\/$/)) {
            path = path + '/'
        }
        // add path value from session to path
        path = path + pathValue
    }

    return path
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
        return this.buffer
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

    }
    // get promise to be resolved when image is done processing
    var processPromise = this.processImage(this.sharpMetaData, this.imageType.data)
    // save processed image
    .then(async processedImage => {
        // wait for image record to be created
        var imageRecord = await this.imageRecordPromise
        // get file name for saving
        var saveAsFileName = this.getSaveAsFileName(this.path, this.fileName, this.fileType, imageRecord.id)
        // save image
        await this.config.fs.writeFile(saveAsFileName, processedImage)
    })
    // add promise to list
    this.processPromises.push(processPromise)
}

/**
 * @function processProfileImages
 *
 * process and save any image profile variants
 */
async function processProfileImages () {
    
}