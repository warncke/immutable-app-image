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
                    optionTitleProperty: 'imageProfileName',
                    optionValueProperty: 'imageProfileId',
                },
                inputType: 'select',
                model: 'imageProfile',
                query: {
                    raw: true,
                },
                type: 'link',
            }
        ],
    },
}