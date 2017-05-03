(function () {

'use strict'

window.ImmutableAppImage = ImmutableAppImage

// ImmutableAppImage properties to set from args
var properties = [
    'imageElmId',
    'imageElmClass',
    'imageType',
    'imageTypes',
]

/**
 * @function ImmutableAppImage
 *
 * instantiate new ImmutableAppImage instance
 *
 * @param {object} args
 *
 * @returns {ImmutableAppImage}
 */
function ImmutableAppImage (args) {
    var self = this
    // set arguments
    _.each(properties, function (property) {
        self[property] = args[property]
    })
    // set to true when uploading
    this.uploadInProgress = false
    // percentage of upload complete
    this.uploadPercentComplete = 0
    // initialize
    this.init()
}

/* public methods */
ImmutableAppImage.prototype = {
    alertImageType: alertImageType,
    clearFile: clearFile,
    getCropperOptions: getCropperOptions,
    init: init,
    initCropper: initCropper,
    selectImage: selectImage,
    selectImageType: selectImageType,
    prepareUpload: prepareUpload,
    upload: upload,
    uploadError: uploadError,
    uploadFinish: uploadFinish,
    uploadProgress: uploadProgress,
    uploadStart: uploadStart,
    uploadSuccess: uploadSuccess,
}

/**
 * @function alertImageType
 *
 * alert to select image type if not selected
 */
function alertImageType () {
    if (!this.imageType) {
        alert('Please select image type')
    }
}

/**
 * @function clearFile
 *
 * clear file input
 */
function clearFile () {
    // hide image upload
    this.$wrapper.find('.image-upload').hide()
    // clear image name
    this.$wrapper.find('.image-name-input').val('')
    // clear file input and show
    this.$wrapper.find('.select-image').val('').show()
}

/**
 * @function getCropperOptions
 *
 * get cropper options for image type
 *
 * @returns {object}
 */
function getCropperOptions () {
    var cropperOptions = {}
    // if image type is not set then no options
    if (!this.imageType) {
        return cropperOptions
    }
    // set aspect ratio
    if (this.imageType.data.aspectRatio) {
        cropperOptions.aspectRatio = this.imageType.data.aspectRatio
    }

    return cropperOptions
}

/**
 * @function init
 *
 * initialize ImmutableAppImage
 */
function init () {
    var self = this
    // get wrapper
    this.$wrapper = $('#'+this.imageElmId+'-wrapper')
    // require wrapper
    if (!this.$wrapper) {
        console.log('wrapper element '+this.imageElmId+' not found')
        return
    }
    // if image type is set validate and set image type object
    if (this.imageType) {
        // set image type
        this.imageType = _.find(this.imageTypes, function (imageType) {
            if (imageType.id === self.imageType || imageType.data.imageTypeName === self.imageType) {
                return true
            }
        })
        // if image type is not found show error
        if (!this.imageType) {
            this.$wrapper.find('.select-image').prop('disabled', true)
            alert('Error setting image type - cannot upload image')
            return
        }
    }
    // add change handler for image input
    this.$wrapper.find('.select-image').on('change', function (ev) {
        self.selectImage(ev, $(this))
    })
    // add change handler for imate type select
    this.$wrapper.find('.select-image-type').on('change', function (ev) {
        self.selectImageType(ev, $(this))
    })
    // add click handler for move button
    this.$wrapper.find('.drag-mode-move').on('click', function (ev) {
        self.cropper.setDragMode('move')
    })
    // add click handler for crop button
    this.$wrapper.find('.drag-mode-crop').on('click', function (ev) {
        self.cropper.setDragMode('crop')
    })
    // add click handler for zoom in button
    this.$wrapper.find('.zoom-in').on('click', function (ev) {
        self.cropper.zoom(0.1)
    })
    // add click handler for zoom out button
    this.$wrapper.find('.zoom-out').on('click', function (ev) {
        self.cropper.zoom(-0.1)
    })
    // add click handler for move left button
    this.$wrapper.find('.move-left').on('click', function (ev) {
        self.cropper.move(-10, 0)
    })
    // add click handler for move right button
    this.$wrapper.find('.move-right').on('click', function (ev) {
        self.cropper.move(10, 0)
    })
    // add click handler for move up button
    this.$wrapper.find('.move-up').on('click', function (ev) {
        self.cropper.move(0, -10)
    })
    // add click handler for move down button
    this.$wrapper.find('.move-down').on('click', function (ev) {
        self.cropper.move(0, 10)
    })
    // add rotate handler
    this.$wrapper.find('.rotate').on('change', function (ev) {
        // rotate image
        self.cropper.rotate($(this).val())
        // clear value
        $(this).val('')
    })
    // add click handler for horizontal flip button
    this.$wrapper.find('.flip-h').on('click', function (ev) {
        // get image data
        var imageData = self.cropper.getData()
        // set scale as inverse of current value
        self.cropper.scaleX(-imageData.scaleX)
    })
    // add click handler for vertical flip button
    this.$wrapper.find('.flip-v').on('click', function (ev) {
        // get image data
        var imageData = self.cropper.getData()
        // set scale as inverse of current value
        self.cropper.scaleY(-imageData.scaleY)
    })
    // add click handler for reset button
    this.$wrapper.find('.reset').on('click', function (ev) {
        self.cropper.reset()
    })
    // add click handler for upload button
    this.$wrapper.find('.upload').on('click', function (ev) {
        self.prepareUpload()
    })
    // add click handler for clear file button
    this.$wrapper.find('.clear-file').on('click', function (ev) {
        self.clearFile()
    })
    // initialize cropper
    this.initCropper()
}

/**
 * @initCropper
 *
 * initalize cropper instance - destroy existing
 */
function initCropper () {
    // destroy existing cropper
    if (this.cropper) {
        this.cropper.destroy()
    }
    // create new cropper instance
    this.cropper = new Cropper(this.$wrapper.find('.image').get(0), this.getCropperOptions())
    // set image data
    if (this.reader && this.reader.result) {
        this.cropper.replace(this.reader.result)
    }
}

/**
 * @function selectImage
 *
 * @param {object} ev
 * @param {object} elm
 *
 */
function selectImage (ev, elm) {
    var self = this
    // show cropper container
    self.$wrapper.find('.cropper').show()
    // hide file input
    self.$wrapper.find('.select-image').hide()
    // show image name input
    self.$wrapper.find('.image-upload').show()
    // get file from input
    this.file = elm[0].files[0]
    // create new file reader
    this.reader = new FileReader();
    // create load handler
    this.reader.addEventListener('load', function () {
        // set data url as src for image
        self.cropper.replace(this.result)
        // alert to select image type if not selected
        self.alertImageType()
    }, false)
    // load file
    this.reader.readAsDataURL(this.file);

}

/**
 * @function selectImageType
 *
 * @param {object} ev
 * @param {object} elm
 *
 */
function selectImageType (ev, elm) {
    var self = this
    // get image type
    this.imageType = _.find(this.imageTypes, function (imageType) {
        return imageType.id === elm.val()
    })
    // initialize cropper
    this.initCropper()
}

/**
 * @function prepareUpload
 */
function prepareUpload () {
    var self = this
    // do not continue if another upload already in progress
    if (this.uploadInProgress) {
        return
    }
    // require image type to be defined
    if (!this.imageType) {
        this.alertImageType()
        return
    }
    // get image type configuration data
    var imageType = this.imageType.data
    // get image data
    var cropData = this.cropper.getData()
    // require image data
    if (!cropData) {
        alert('No image loaded')
        return
    }
    // if image type has fixed width/height then check that cropped image
    // is at least this size
    if ((imageType.width && cropData.width < imageType.width) || (imageType.height && cropData.height < imageType.height))  {
        var msg = 'Image less than '+imageType.width+' (width) X '+imageType.height
            +' (height) - for best quality use a higher resolution image'
        if (!confirm(msg)) {
            return
        }
    }
    // determine based on image type and image whether or not to encode
    // data on client before uploading - default to true
    var encodeClient = true
    // if configured to never encode on client then set to false
    if (imageType.encodeClient === 'never') {
        encodeClient = false
    }
    // if configured for "best" then only encode on client if size is too large
    else if (imageType.encodeClient === 'best') {
        encodeClient = false
        // get image data
        var imageData = this.cropper.getImageData()
        // check max size in KB
        if (imageType.maxClientSize && this.file.size / 1024 > imageType.maxClientSize) {
            encodeClient = true
        }
        // check max height
        else if (imageType.maxClientHeight && imageData.naturalHeight > imageType.maxClientHeight) {
            encodeClient = true
        }
        // check max width
        else if (imageType.maxClientWidth && imageData.naturalWidth > imageType.maxClientWidth) {
            encodeClient = true
        }
    }
    // create form
    var form = new FormData()
    // meta data for image
    var meta = {
        fileName: this.file.name,
        fileModified: this.file.lastModifiedDate,
        fileMimeType: this.file.type,
        imageName: this.$wrapper.find('.image-name-input').val(),
        imageTypeId: this.imageType.id,
    }
    // image data blob
    var imageBlob
    // encode image on client before sending
    if (encodeClient) {
        // quality for encoding
        var quality
        // use configured quality - scale 0 - 100
        if (imageType.quality >= 0) {
            quality = imageType.quality / 100
        }
        // mime type for encoding
        var mimeType
        // use webp
        if (imageType.fileType === 'webp') {
            mimeType = 'image/webp'
        }
        // use png
        else if (imageType.fileType === 'png') {
            mimeType = 'image/png'
            // clear quality for png
            quality = undefined
        }
        // use jpg by default
        else {
            mimeType = 'image/jpeg'
        }
        // encode image
        this.cropper.getCroppedCanvas().toBlob(function (blob) {
            // add blob to form
            form.append('image', blob, self.file.name)
            // add meta data to form
            form.append('meta', JSON.stringify(meta))
            // upload
            self.upload(form)
        }, mimeType, quality)
    }
    // send original and encode on server
    else {
        // add blob to form
        form.append('image', this.file, this.file.name)
        // add crop data so image can be cropped on server
        meta.cropData = cropData
        // add meta data to form
        form.append('meta', JSON.stringify(meta))
        // upload
        this.upload(form)
    }
}

/**
 * @function upload
 *
 * @param {FormData} form
 */
function upload (form) {
    var self = this
    this.uploadStart()
    // do upload
    $.ajax({
        contentType: false,
        data: form,
        error: function (xhr, status, error) {
            self.uploadError(xhr, status, error)
        },
        method: 'POST',
        processData: false,
        success: function (data, status, xhr) {
            self.uploadSuccess(xhr, status, data)
        },
        xhr: function () {
            // create new XHR
            var xhr = new XMLHttpRequest();
            // add progres event handler
            xhr.upload.addEventListener('progress', function (ev) {
                self.uploadProgress(ev)
            })
            // return XHR for request
            return xhr
        },
    })
}

/**
 * @function uploadError
 *
 * @param {jqXHR} xhr
 * @param {string} status
 * @param {string} error
 */
function uploadError (xhr, status, error) {
    this.uploadFinish()
    alert('Upload failed')
    console.log(status, error)
    // show image upload form to allow retry
    this.$wrapper.find('.image-upload').show()
}

/**
 * @function uploadFinish
 */
function uploadFinish () {
    // upload complete
    this.uploadInProgress = false
    // get button
    var button = this.$wrapper.find('.upload')
    // enable button
    button.prop('disabled', false)
    // clear loading icon
    button.find('span').removeClass('fa-spinner').removeClass('fa-spin').addClass('fa-upload')
    // show progress bar
    this.$wrapper.find('.progress').hide()
}

/**
 * @function uploadProgress
 *
 * @param {object} ev
 */
function uploadProgress (ev) {
    // get progress bar
    var progress = this.$wrapper.find('.progress')
    // if complete then clear values
    if (ev.total === ev.loaded) {
        progress.removeAttr('value')
        progress.removeAttr('max')
    }
    // set progress value
    else {
        progress.attr('value', ev.loaded)
        progress.attr('max', ev.total)
    }
}

/**
 * @function uploadStart
 */
function uploadStart () {
    // set flag that upload is in progress
    this.uploadInProgress = true
    // get button
    var button = this.$wrapper.find('.upload')
    // disable button
    button.prop('disabled', true)
    // set loading icon
    button.find('span').removeClass('fa-upload').addClass('fa-spinner').addClass('fa-spin')
    // hide input
    this.$wrapper.find('.image-upload').hide()
    // clear image name
    this.$wrapper.find('.image-name-input').val('')
    // get progress bar
    var progress = this.$wrapper.find('.progress')
    // initialize to no progress
    progress.attr('value', 0)
    progress.attr('max', 100)
    // show progress bar
    progress.show()
}

/**
 * @function uploadSuccess
 *
 * @param {jqXHR} xhr
 * @param {string} status
 * @param {any} data
 */
function uploadSuccess (xhr, status, data) {
    this.uploadFinish()
    // clear file input
    this.$wrapper.find('.select-image').val('')
    // hide cropper
    this.$wrapper.find('.cropper').hide()
    // show image select
    this.$wrapper.find('.select-image').show()
}

})()