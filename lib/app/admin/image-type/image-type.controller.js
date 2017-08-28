'use strict'

/* exports */
module.exports = {
    list: {
        fields: [
            'imageTypeName',
            'fileType',
            'createTime',
            'actions',
        ],
    },
    read: {
        forms: [
            {
                input: {
                    optionTitle: '${imageProfileName} (${imageProfileData.fileType})',
                    optionValueProperty: 'imageProfileId',
                },
                inputType: 'select',
                model: 'imageProfile',
                query: {
                    order: 'imageProfileName',
                    raw: true,
                },
                type: 'link',
            }
        ],
    },
}