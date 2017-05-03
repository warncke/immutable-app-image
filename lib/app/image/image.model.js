'use strict'

/**
 * @ImmutableCoreModel image
 *
 */
module.exports = {
    actions: {
        delete: false,
    },
    columns: {
    },
    name: 'image',
    properties: {
        fileName: {
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
        imageName: {
            type: 'string',
        },
        imageTypeId: {
            type: 'string',
        },
        path: {
            type: 'string',
        },
    },
    required: [
        'fileName',
        'fileType',
        'imageName',
        'imageTypeId',
    ],
}