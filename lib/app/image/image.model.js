'use strict'

const getPictureModelView = require('./get-picture.model-view')

/**
 * @ImmutableCoreModel image
 *
 */
module.exports = {
    columns: {
        imageTypeId: 'id',
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
    views: {
        default: getPictureModelView({
            thumb: {
                width: 150,
            },
        }),
    }
}