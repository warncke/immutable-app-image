'use strict'

/**
 * @ImmutableCoreModel imageType
 *
 */
module.exports = {
    actions: {
        delete: false,
    },
    columns: {
    },
    name: 'imageType',
    properties: {
        aspectRatio: {
            type: 'number',
        },
        clientQuality: {
            type: 'integer',
        },
        encodeClient: {
            enum: [
                'always',
                'best',
                'never',
            ],
            type: 'string',
        },
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
        imageTypeName: {
            type: 'string',
        },
        maxClientHeight: {
            type: 'integer',
        },
        maxClientSize: {
            type: 'integer',
        },
        maxClientWidth: {
            type: 'integer',
        },
        maxHeight: {
            type: 'integer',
        },
        maxWidth: {
            type: 'integer',
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
        'imageTypeName',
    ],
}