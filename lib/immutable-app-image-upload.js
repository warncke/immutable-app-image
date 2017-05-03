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
    // get config
    this.config = ImmutableAppImage.global()
}

/* public methods */
ImmutableAppImageUpload.prototype = {
    getFileName: getFileName,
    getImageName: getImageName,
    getPath: getPath,
    getSaveAs: getSaveAs,
    process: process,
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
    var name = this.meta.imageName || this.meta.fileName
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
 * @function getSaveAs
 *
 * complete path and name to save image as
 *
 * @returns {string}
 */
function getSaveAs (path, fileName, fileType, imageId, profileName) {
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
    var path = this.getPath()
    // get file name
    var fileName = this.getFileName()
    // get file type
    var fileType = this.imageType.data.fileType
    // get image name
    var imageName = this.getImageName()
    // get sharp image instance to get meta data and modify
    this.sharp = sharp(this.buffer)
    // get image metadata
    this.sharpMetaData = await this.sharp.metadata()
    // create image record
    this.imageRecordPromise = this.ai.model.image.create({
        fileName: fileName,
        fileType: fileType,
        imageName: imageName,
        imageTypeId: this.imageType.id,
        path: path,
    })
    // process primary image first
    await this.processPrimaryImage()
    // process profile variants
    await this.processProfileImages()
    // return image record promise
    return this.imageRecordPromise
    // get full path/name for saving
    var saveAs = this.getSaveAs(path, fileName, fileType, imageRecord.id)
    // save file
    // await this.config.fs.writeFile(saveAs, this.buffer)
    console.log(imageRecord.data)
    return imageRecord
}

/**
 * @function processPrimaryImage
 *
 * process and save primary image
 */
async function processPrimaryImage () {
    console.log(this.imageType)
    console.log(this.sharpMetaData)
}

/**
 * @function processProfileImages
 *
 * process and save any image profile variants
 */
async function processProfileImages () {
    
}