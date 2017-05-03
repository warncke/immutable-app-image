'use strict'

/**
 * @ImmutableCoreModel imageTypeImageProfile
 *
 */
module.exports = {
    actions: {
        delete: false,
    },
    columns: {
        data: false,
        imageProfileOriginalId: {
            index: true,
            null: false,
            type: 'id',
        },
        imageTypeOriginalId: {
            index: true,
            null: false,
            type: 'id',
        },
        originalId: false,
        parentId: false,
    },
    name: 'imageTypeImageProfile',
    relations: {
        imageProfile: {},
        imageType: {},
    },
}