'use strict'

/* exports */
module.exports = {
    paths: {
        '/': {
            get: {
                method: getImages,
                role: 'authenticated',
                template: 'index',
            },
        },
    },
}

/**
 * @function getImages
 *
 * @param {object} args
 *
 * @returns {Promise}
 */
function getImages (args) {
    
}