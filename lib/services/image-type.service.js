'use strict'

/* npm modules */
const _ = require('lodash')
const defined = require('if-defined')

/* ImmutableCoreService imageType */
module.exports = {
    initialize: initialize,
    reinitializeInterval: 60,
}

/**
 * @function initalize
 *
 * load image type information
 *
 * @param {object} args
 *
 * @returns {Promise<object>}
 */
async function initialize (args) {
    // load all image profiles
    var imageProfiles = await this.model.imageProfile.query({
        all: true,
        allow: true,
        plain: true,
    })
    // load all image types
    var imageTypes = await this.model.imageType.query({
        all: true,
        allow: true,
        order: 'imageTypeName',
        plain: true,
        where: {imageTypeName: {not: null}},
    })
    // load all imageType-imageProfile links
    var imageTypeImageProfiles = await this.model.imageTypeImageProfile.query({
        all: true,
        allow: true,
        plain: true,
    })
    // map of image type by id
    var imageTypesById = {}
    // map of image profiles by id
    var imageProfilesById = {}
    // map of image profiles by name
    var imageProfilesByName = {}
    // build image types
    _.each(imageTypes, imageType => {
        imageTypesById[imageType.id] = imageType
        // create map of profiles for image type
        imageTypesById[imageType.id].imageProfiles = {}
    })
    // build image profiles
    _.each(imageProfiles, imageProfile => {
        var imageProfileName = imageProfile.data.imageProfileName
        // create entry for profile name if it does not exist
        if (!defined(imageProfilesByName[imageProfileName])) {
            imageProfilesByName[imageProfileName] = []
        }
        // add profile to map by name
        imageProfilesByName[imageProfileName].push(imageProfile.data)
        // add profile to map by id
        imageProfilesById[imageProfile.id] = imageProfile.data
    })
    // mark profiles that have webp versions
    _.each(imageProfilesByName, imageProfiles => {
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
    _.each(imageTypeImageProfiles, imageTypeImageProfile => {
        // require both image type and image profile to be defined
        if (!defined(imageTypesById[imageTypeImageProfile.imageTypeId]) || !defined(imageProfilesById[imageTypeImageProfile.imageProfileId])) {
            return
        }
        // add profile link to image type
        imageTypesById[imageTypeImageProfile.imageTypeId].imageProfiles[imageTypeImageProfile.imageProfileId] = imageProfilesById[imageTypeImageProfile.imageProfileId]
    })

    return {
        imageProfiles: imageProfiles,
        imageProfilesById: imageProfilesById,
        imageProfilesByName: imageProfilesByName,
        imageTypes: imageTypes,
        imageTypesById: imageTypesById,
        imageTypeImageProfiles, imageTypeImageProfiles,
    }
}