'use strict'

/* npm modules */
const ImmutableAI = require('immutable-ai')
const ImmutableCore = require('immutable-core')
const ImmutableCoreModel = require('immutable-core-model')
const ImmutableCoreService = require('immutable-core-service')
const Promise = require('bluebird')
const _ = require('lodash')
const chai = require('chai')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const sinon = require('sinon')

/* app modules */
const ImmutableAppImage = require('../lib/immutable-app-image')
const ImmutableAppImageUpload = require('../lib/immutable-app-image-upload')
const imageTypeServiceSpec = require('../lib/services/image-type.service')

/* chai config */
const assert = chai.assert

const dbHost = process.env.DB_HOST || 'localhost'
const dbName = process.env.DB_NAME || 'test'
const dbPass = process.env.DB_PASS || ''
const dbUser = process.env.DB_USER || 'root'

const connectionParams = {
    database: dbName,
    host: dbHost,
    password: dbPass,
    user: dbUser,
}

describe('immutable-app-image-upload', function () {

     var mysql

     // load test image
     var testImage = fs.readFileSync(path.resolve(__dirname, 'test-image.png'))

     // variables to populate in before
     var ai, fsMock, imageModel, imageProfileModel, imageTypeImageProfileModel,
        imageTypeModel, sandbox

    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    before(async function () {
        // get mysql connection
        mysql = await ImmutableCoreModel.createMysqlConnection(connectionParams)
    })

    beforeEach(async function () {
        sandbox = sinon.createSandbox()
        // reset global data
        ImmutableCore.reset()
        ImmutableCoreModel.reset()
        ImmutableCoreService.reset()
        ImmutableAppImage.reset()
        // set immutable core and model for immutable ai
        ImmutableAI.immutableCore(ImmutableCore)
        ImmutableAI.immutableCoreModel(ImmutableCoreModel)
        // load image model spec
        var imageModelSpec = require('../lib/app/image/image.model.js')
        // remove default thumbnail view
        delete imageModelSpec.views.default
        // insantiate models
        imageModel = new ImmutableCoreModel(imageModelSpec)
        imageProfileModel = new ImmutableCoreModel( require('../lib/app/admin/image-profile/image-profile.model.js') )
        imageTypeModel = new ImmutableCoreModel( require('../lib/app/admin/image-type/image-type.model.js') )
        imageTypeImageProfileModel = new ImmutableCoreModel( require('../lib/app/admin/image-type-image-profile/image-type-image-profile.model.js') )
        // set database for models
        imageModel.mysql(mysql)
        imageProfileModel.mysql(mysql)
        imageTypeModel.mysql(mysql)
        imageTypeImageProfileModel.mysql(mysql)
        // sync models
        await imageModel.sync()
        await imageProfileModel.sync()
        await imageTypeModel.sync()
        await imageTypeImageProfileModel.sync()
        // set name for service
        imageTypeServiceSpec.name = 'imageType'
        // initialize image type service
        var imageTypeService = new ImmutableCoreService(imageTypeServiceSpec)
        // create new immutable ai instance
        ai = ImmutableAI({
            session: session,
        })
        // create fs stub
        fsMock = {
            writeFile: sandbox.stub().resolves(),
        }
        // configure ImmutableAppImage with fs
        ImmutableAppImage.config({
            fs: fsMock,
            pathProperty: 'accountId',
        })
    })

    afterEach(function () {
        sandbox.restore()
    })

    after(async function () {
        await mysql.close()
    })

    it('should save image when it matches image type', async function () {
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            height: 20,
            width: 20,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
        // validate image data
        assert.deepEqual(image.data, {
            fileName: 'new-image',
            fileType: 'png',
            imageName: 'New Image',
            imageTypeId: imageType.id,
            path: session.accountId,
        })

        // build expected file name
        var expectedFileName = image.data.path+'/'+image.data.fileName+'-'+image.id+'.'+image.data.fileType
        // check that writeFile called with original buffer
        sinon.assert.calledOnce(fsMock.writeFile)
        sinon.assert.calledWithMatch(fsMock.writeFile, expectedFileName, await immutableAppImageUpload.sharp.png({
            compressionLevel: 9,
            force: true,
        }).toBuffer())
    })

    it('should set fileName and imageName based on meta fileName', async function () {
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            height: 20,
            width: 20,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            meta: {
                fileName: 'foo-bar.png',
            },
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
        // validate image data
        assert.deepEqual(image.data, {
            fileName: 'foo-bar',
            fileType: 'png',
            imageName: 'Foo Bar',
            imageTypeId: imageType.id,
            path: session.accountId,
        })
    })

    it('should set fileName and imageName based on meta imageName', async function () {
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            height: 20,
            width: 20,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            meta: {
                fileName: 'foo-bar.png',
                imageName: 'Bam Baz'
            },
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
        // validate image data
        assert.deepEqual(image.data, {
            fileName: 'bam-baz',
            fileType: 'png',
            imageName: 'Bam Baz',
            imageTypeId: imageType.id,
            path: session.accountId,
        })
    })

    it('should output image as jpeg', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // check file name extension
            assert.ok(file.match(/\.jpg$/))
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'jpeg')
            assert.strictEqual(meta.height, 20)
            assert.strictEqual(meta.width, 20)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'jpg',
            imageTypeName: 'test',
            height: 20,
            width: 20,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should output image as webp', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // check file name extension
            assert.ok(file.match(/\.webp$/))
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'webp')
            assert.strictEqual(meta.height, 20)
            assert.strictEqual(meta.width, 20)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'webp',
            imageTypeName: 'test',
            height: 20,
            width: 20,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to specific size as png', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 40)
            assert.strictEqual(meta.width, 40)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            height: 40,
            width: 40,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to specific size as jpg', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'jpeg')
            assert.strictEqual(meta.height, 40)
            assert.strictEqual(meta.width, 40)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'jpg',
            imageTypeName: 'test',
            height: 40,
            width: 40,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to specific size as webp', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'webp')
            assert.strictEqual(meta.height, 40)
            assert.strictEqual(meta.width, 40)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'webp',
            imageTypeName: 'test',
            height: 40,
            width: 40,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to specific height maintaining aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 40)
            assert.strictEqual(meta.width, 40)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            height: 40,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to specific height and aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 40, 'heigth')
            assert.strictEqual(meta.width, 53, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            aspectRatio: 1.3333333,
            fileType: 'png',
            imageTypeName: 'test',
            height: 40,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to specific width maintaining aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 40)
            assert.strictEqual(meta.width, 40)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            width: 40,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to specific width and aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 30, 'heigth')
            assert.strictEqual(meta.width, 40, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            aspectRatio: 1.3333333,
            fileType: 'png',
            imageTypeName: 'test',
            width: 40,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to max width maintaining aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 10)
            assert.strictEqual(meta.width, 10)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            maxWidth: 10,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to max width and aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 8, 'heigth')
            assert.strictEqual(meta.width, 10, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            aspectRatio: 1.3333333,
            fileType: 'png',
            imageTypeName: 'test',
            maxWidth: 10,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to max height maintaining aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 10)
            assert.strictEqual(meta.width, 10)
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
            maxHeight: 10,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should scale image to max height and aspect ratio', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 8, 'heigth')
            assert.strictEqual(meta.width, 10, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            aspectRatio: 1.3333333,
            fileType: 'png',
            imageTypeName: 'test',
            maxWidth: 10,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should crop image with x,y offset', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 15, 'heigth')
            assert.strictEqual(meta.width, 15, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            meta: { cropData: {x: 5, y: 5} },
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should crop image with x offset', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 20, 'heigth')
            assert.strictEqual(meta.width, 15, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            meta: { cropData: {x: 5} },
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should crop image with y offset', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 15, 'heigth')
            assert.strictEqual(meta.width, 20, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            meta: { cropData: {y: 5} },
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should crop image with height and width', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 10, 'heigth')
            assert.strictEqual(meta.width, 10, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            meta: { cropData: {height: 10, width: 10} },
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should crop image with height', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 10, 'heigth')
            assert.strictEqual(meta.width, 20, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            meta: { cropData: {height: 10} },
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should crop image with width', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 20, 'heigth')
            assert.strictEqual(meta.width, 10, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            meta: { cropData: {width: 10} },
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should crop image with x,y offset, height and width', async function () {
        // validate output
        fsMock.writeFile = async (file, buffer) => {
            // load buffer to get meta data
            var meta = await sharp(buffer).metadata()
            // check type and dimensions
            assert.strictEqual(meta.format, 'png')
            assert.strictEqual(meta.height, 10, 'heigth')
            assert.strictEqual(meta.width, 10, 'width')
        }
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'png',
            imageTypeName: 'test',
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            meta: { cropData: {x: 5, y: 5, height: 10, width: 10} },
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
    })

    it('should create variants with pregenerate=true', async function () {
        // keep track of calls
        var call = 0;
        // list of variants
        var variants = []
        // validate output
        fsMock.writeFile = async function (file, buffer) {
            if (call === 0) {
                call++
                // check file name extension
                assert.ok(file.match(/\.jpg$/))
                // load buffer to get meta data
                var meta = await sharp(buffer).metadata()
                // check type and dimensions
                assert.strictEqual(meta.format, 'jpeg')
                assert.strictEqual(meta.height, 20)
                assert.strictEqual(meta.width, 20)
            }
            else {
                call++
                // load buffer to get meta data
                var meta = await sharp(buffer).metadata()
                // check dimensions
                assert.strictEqual(meta.height, 10)
                assert.strictEqual(meta.width, 10)
                // add format to list of variants
                variants.push(meta.format)
            }
        }
        // create first image profile
        var imageProfile1 = await ai.model.imageProfile.create({
            fileType: 'webp',
            imageProfileName: 'small-webp',
            maxHeight: 10,
            maxWidth: 10,
            pregenerate: true,
        })
        // create second image profile
        var imageProfile2 = await ai.model.imageProfile.create({
            fileType: 'jpg',
            imageProfileName: 'small-jpg',
            maxHeight: 10,
            maxWidth: 10,
            pregenerate: true,
        })
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'jpg',
            imageTypeName: 'test',
            height: 20,
            width: 20,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageProfiles: [imageProfile1.data, imageProfile2.data],
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
        // check call count
        assert.strictEqual(call, 3, 'writeFile')
        // check variants created
        assert.deepEqual(variants.sort(), ['jpeg', 'webp'])
    })

    it('should not create variants with pregenerate=false', async function () {
        // create first image profile
        var imageProfile1 = await ai.model.imageProfile.create({
            fileType: 'webp',
            imageProfileName: 'small-webp',
            maxHeight: 10,
            maxWidth: 10,
            pregenerate: false,
        })
        // create second image profile
        var imageProfile2 = await ai.model.imageProfile.create({
            fileType: 'jpg',
            imageProfileName: 'small-jpg',
            maxHeight: 10,
            maxWidth: 10,
            pregenerate: false,
        })
        // create image type matching test image
        var imageType = await ai.model.imageType.create({
            fileType: 'jpg',
            imageTypeName: 'test',
            height: 20,
            width: 20,
        })
        // create upload instance
        var immutableAppImageUpload = new ImmutableAppImageUpload({
            ai: ai,
            buffer: testImage,
            imageProfiles: [imageProfile1.data, imageProfile2.data],
            imageType: imageType,
            session: session,
        })
        // process image
        var image = await immutableAppImageUpload.process()
        // check call count
        sinon.assert.calledOnce(fsMock.writeFile)
    })

})