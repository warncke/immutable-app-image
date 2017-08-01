'use strict'

/**
 * @ImmutableCoreModel image
 *
 */
module.exports = {
    columns: {
        imageTypeId: 'id',
        originalId: false,
        parentId: false,
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
    relations: {
        imageType: {},
    },
    required: [
        'fileName',
        'fileType',
        'imageName',
        'imageTypeId',
    ],
}