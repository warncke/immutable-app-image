'use strict'

/* application modules */
const imageProfiles = require('./image-profiles.model-vew.js')

/**
 * @ImmutableCoreModel imageProfile
 *
 */
module.exports = {
    actions: {
        delete: false,
    },
    columns: {
        imageProfileName: {
            type: 'string',
        },
        originalId: false,
        parentId: false,
    },
    name: 'imageProfile',
    properties: {
        fileType: {
            enum: [
                'jpg',
                'png',
                'webp',
            ],
            type: 'string',
        },
        height: {
            type: 'integer',
        },
        imageProfileName: {
            type: 'string',
        },
        maxHeight: {
            type: 'integer',
        },
        maxWidth: {
            type: 'integer',
        },
        pregenerate: {
            type: 'boolean',
        },
        quality: {
            type: 'integer',
        },
        width: {
            type: 'integer',
        },
    },
    required: [
        'fileType',
        'imageProfileName',
    ],
    views: {
        imageProfiles: imageProfiles(),
    }
}