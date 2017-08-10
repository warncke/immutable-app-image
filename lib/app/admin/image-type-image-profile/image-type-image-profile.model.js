'use strict'

/**
 * @ImmutableCoreModel imageTypeImageProfile
 *
 */
module.exports = {
    columns: {
        d: false,
        data: false,
        imageProfileId: {
            index: true,
            null: false,
            type: 'id',
        },
        imageTypeId: {
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