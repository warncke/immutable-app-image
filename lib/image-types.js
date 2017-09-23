'use strict'

/* npm modules */
const ImmutableCoreService = require('immutable-core-service')
const _ = require('lodash')
const defined = require('if-defined')

/* application modules */
const ImmutableAppImage = require('./immutable-app-image')

/* exports */
module.exports = ImageTypes

/**
 * @function ImageTypes
 *
 * class for getting information about image types built from model data.
 *
 * @param {object} args
 *
 * @returns {ImageTypes}
 */
function ImageTypes (args) {
    // store config
    this.config = args.config
}

/* public methods */
ImageTypes.prototype = {
    getArea: getArea,
    getImageTypes: getImageTypes,
    getImageTypeById: getImageTypeById,
    getPicture: getPicture,
    getProfile: getProfile,
    getSrc: getSrc,
}

/**
 * @function getArea
 *
 * calculate an area or estimated area based on width, height, maxWidth,
 * maxHeight and aspectRatio properties.
 *
 * @param {object} args
 * @param {number} args.aspectRatio
 * @param {number} args.height
 * @param {number} args.width
 * @param {number} args.maxHeight
 * @param {number} args.maxWidth
 */
function getArea (args) {
    var aspectRatio = args.aspectRatio
    var height = args.height || args.maxHeight
    var width = args.width || args.maxWidth
    // if height is not defined either calculate from aspect ratio or set to 1
    if (!defined(height)) {
        height = aspectRatio && width ? width / aspectRatio : 1
    }
    // if width is not defined either calculate from aspect ratio or set to 1
    if (!defined(width)) {
        width = aspectRatio && hieght ? height * aspectRatio : 1
    }
    // calculate area
    return height * width
}

/**
 * @function getImageTypeById
 *
 * get specific image type record by id
 *
 * @param {string} imageTypeId
 *
 * @returns {array}
 */
function getImageTypeById (imageTypeId) {
    // get service data
    var data = ImmutableCoreService.getService('imageType').getData()
    // return image types array
    return data.imageTypesById[imageTypeId]
}

/**
 * @function getImageTypes
 *
 * get list of raw imageType records
 *
 * @returns {array}
 */
function getImageTypes () {
    // get service data
    var data = ImmutableCoreService.getService('imageType').getData()
    // return image types array
    return data.imageTypes
}

/**
 * @function getPicture
 *
 * get data for populating a picture/img element from image. optional height and
 * width will be used to find the image profile that most closely matches the
 * desired dimensions.
 *
 * @param {object} args
 * @param {number} args.height
 * @param {object} args.image
 * @param {number} args.width
 *
 * @returns {object}
 */
function getPicture (args) {
    var image = args.image
    // get service data
    var data = ImmutableCoreService.getService('imageType').getData()
    // get image id
    var imageId = defined(image.id) ? image.id : image.imageId
    // get iamge original Id
    var imageOriginalId = defined(image.originalId) ? image.originalId : image.imageOriginalId
    // get image data
    var imageData = defined(image.data) ? image.data : image.imageData
    // get image type id
    var imageTypeId = defined(image.data) ? image.data.imageTypeId : image.imageTypeId
    // get image type by id
    var imageType = data.imageTypesById[imageTypeId]
    // require image type
    if (!defined(imageType)) {
        throw new Error(`no image type for ${imageTypeId}`)
    }
    // get only image type data
    imageType = imageType.data
    // picture data
    var picture = _.pick(imageData, ['description', 'imageName', 'latitude', 'longitude'])
    // set image ids
    picture.imageId = imageId
    picture.imageOriginalId = imageOriginalId
    // add image type data
    picture.imageTypeName = defined(imageType) ? imageType.imageTypeName : ''
    // get closest matching profile name or none
    var profile = this.getProfile(args)
    // get src for original image
    picture.origSrc = this.getSrc(imageData.path, imageData.fileName, imageData.fileType, imageId)
    // get src for selected profile
    picture.src = this.getSrc(imageData.path, imageData.fileName, profile.fileType, imageId, profile.imageProfileName)
    // if profile has webp version then create srcset for picture tag
    if (profile.hasWebp) {
        picture.source = [
            {
                fileType: 'webp',
                srcset: this.getSrc(imageData.path, imageData.fileName, 'webp', imageOriginalId, profile.imageProfileName),
                type: 'image/webp',
            },
            {
                fileType: profile.fileType,
                srcset: this.getSrc(imageData.path, imageData.fileName, profile.fileType, imageOriginalId, profile.imageProfileName),
                type: profile.fileType === 'jpg' ? 'image/jpeg' : 'image/png',
            },
        ]
    }
    // map source by file type
    picture.sourceByType = _.keyBy(picture.source, 'fileType')

    return picture
}

/**
 * @function getProfile
 *
 * get name of profile that most closely matches dimensions or none
 *
 * @param {object} args
 * @param {number} args.height
 * @param {object} args.image
 * @param {number} args.width
 *
 * @returns {object}
 */
function getProfile (args) {
    var height = args.height
    var image = args.image
    var width = args.width
    // get service data
    var data = ImmutableCoreService.getService('imageType').getData()
    // get image id
    var imageId = defined(image.id) ? image.id : image.imageId
    // get image data
    var imageData = defined(image.data) ? image.data : imageData
    // get image type id
    var imageTypeId = defined(image.data) ? image.data.imageTypeId : image.imageTypeId
    // get image type by id
    var imageType = data.imageTypesById[imageTypeId]
    // if there is no image type then cannot have profile
    if (!defined(imageType)) {
        return imageData
    }
    // get only image type data
    imageType = imageType.data
    // if there are no profiles for image type the cannot select one
    if (!_.keys(imageType.imageProfiles).length) {
        return imageType
    }
    // if neither width nor height are defined then return first profile
    if (!defined(height) && !defined(width)) {
        return _.values(imageType.imageProfiles)[0]
    }
    // calculate target area from args
    var targetArea = this.getArea(args)
    // default to no profile
    var profile
    // get the delta between the target and the main image
    var profileDelta = this.getArea(imageType) - targetArea
    // check each profile to see if it is closer to target
    _.each(imageType.imageProfiles, imageProfile => {
        // only use jpg and png for primary image
        if (imageProfile.fileType === 'webp') {
            return
        }
        // get delta for profile
        var delta = Math.abs(this.getArea(imageProfile) - targetArea)
        // if delta is less than previously selected use this profile
        if (delta < profileDelta) {
            profileDelta = delta
            profile = imageProfile
        }
    })
    // return name of profile with smallest area delta
    return profile
}

/**
 * @function getSrc
 *
 * get src for image
 *
 * @param
 */
 function getSrc (path, fileName, fileType, imageId, profileName) {
    var src
    // set path if defined
    if (defined(path)) {
        src = path + '/' + fileName + '-' + imageId
    }
    else {
        src = fileName + '-' + imageId
    }
    // add profile name to image if defined
    if (typeof profileName === 'string' && profileName.length) {
        src = src + '-' + profileName
    }
    // add extension
    src = src + '.' + fileType

    // add host
    if (this.config.host.length) {
        src = this.config.host + '/' + src
    }

    return src
}