'use strict'

/* npm modules */
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
    // map of image type by id
    this.imageTypesById = {}
    // build image types
    _.each(args.imageTypes, imageType => {
        this.imageTypesById[imageType.imageTypeId] = imageType.imageTypeData
        // create map of profiles for image type
        this.imageTypesById[imageType.imageTypeId].imageProfiles = {}
    })
    // map of image profiles by name
    this.imageProfilesByName = {}
    // map of image profiles by id
    this.imageProfilesById = {}
    // build image profiles
    _.each(args.imageProfiles, imageProfile => {
        var imageProfileName = imageProfile.imageProfileData.imageProfileName
        // create entry for profile name if it does not exist
        if (!defined(this.imageProfilesByName[imageProfileName])) {
            this.imageProfilesByName[imageProfileName] = []
        }
        // add profile to map by name
        this.imageProfilesByName[imageProfileName].push(imageProfile.imageProfileData)
        // add profile to map by id
        this.imageProfilesById[imageProfile.imageProfileId] = imageProfile.imageProfileData
    })
    // mark profiles that have webp versions
    _.each(this.imageProfilesByName, imageProfiles => {
        // must have more than one profile with same name
        if (imageProfiles.length < 2) {
            return
        }
        // set to true if there is webp profile
        var hasWebp = false
        // check for webp file type
        _.each(imageProfiles, imageProfile => {
            if (imageProfile.fileType === 'webp') {
                hasWebp = true
            }
        })
        // set has webp flag
        if (hasWebp) {
            _.each(imageProfiles, imageProfile => {
                if (imageProfile.fileType !== 'webp') {
                    imageProfile.hasWebp = true
                }
            })
        }
    })
    // link image types to image profiles
    _.each(args.imageTypeImageProfiles, imageTypeImageProfile => {
        // require both image type and image profile to be defined
        if (!defined(this.imageTypesById[imageTypeImageProfile.imageTypeId]) || !defined(this.imageProfilesById[imageTypeImageProfile.imageProfileId])) {
            return
        }
        // add profile link to image type
        this.imageTypesById[imageTypeImageProfile.imageTypeId].imageProfiles[imageTypeImageProfile.imageProfileId] = this.imageProfilesById[imageTypeImageProfile.imageProfileId]
    })
    // get config
    this.config = ImmutableAppImage.global()
}

/* public methods */
ImageTypes.prototype = {
    getArea: getArea,
    getPictureData: getPictureData,
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
 * @function getPictureData
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
function getPictureData (args) {
    var image = args.image
    // get image type by id
    var imageType = this.imageTypesById[image.imageTypeId]
    // picture data
    var picture = _.pick(image.imageData, ['description', 'imageName', 'lat', 'lng'])
    picture.imageId = image.imageId
    // add image type data
    picture.imageTypeName = defined(imageType) ? imageType.imageTypeName : ''
    // get closest matching profile name or none
    var profile = this.getProfile(args)
    // get src for original image
    picture.origSrc = this.getSrc(image.imageData.path, image.imageData.fileName, image.imageData.fileType, image.imageId)
    // get src for selected profile
    picture.src = this.getSrc(image.imageData.path, image.imageData.fileName, profile.fileType, image.imageId, profile.imageProfileName)
    // if profile has webp version then create srcset for picture tag
    if (profile.hasWebp) {
        picture.source = [
            {
                srcset: this.getSrc(image.imageData.path, image.imageData.fileName, 'webp', image.imageId, profile.imageProfileName),
                type: 'image/webp',
            },
            {
                srcset: picture.src,
                type: picture.fileType === 'jpg' ? 'image/jpeg' : 'image/png',
            },
        ]
    }
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
    // get image type by id
    var imageType = this.imageTypesById[image.imageTypeId]
    // if there is no image type then cannot have profile
    if (!imageType) {
        return args.image.imageData
    }
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
        var delta = this.getArea(imageProfile) - targetArea
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