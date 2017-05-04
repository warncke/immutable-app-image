'use strict'

const ImmutableAI = require('immutable-ai')
const ImmutableAppImage = require('../lib/immutable-app-image')
const ImmutableAppImageUpload = require('../lib/immutable-app-image-upload')
const ImmutableCore = require('immutable-core')
const ImmutableCoreModel = require('immutable-core-model')
const ImmutableDatabaseMariaSQL = require('immutable-database-mariasql')
const Promise = require('bluebird')
const _ = require('lodash')
const chai = require('chai')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const sinon = require('sinon')

const assert = chai.assert

const dbHost = process.env.DB_HOST || 'localhost'
const dbName = process.env.DB_NAME || 'test'
const dbPass = process.env.DB_PASS || ''
const dbUser = process.env.DB_USER || 'root'

const connectionParams = {
    charset: 'utf8',
    db: dbName,
    host: dbHost,
    password: dbPass,
    user: dbUser,
}

describe('immutable-app-image-upload', function () {

     var database = new ImmutableDatabaseMariaSQL(connectionParams)

     // load test image
     var testImage = fs.readFileSync(path.resolve(__dirname, 'test-image.png'))

     // variables to populate in before
     var ai, fsMock, imageModel, imageProfileModel, imageTypeModel, sandbox

    // fake session to use for testing
    var session = {
        accountId: '11111111111111111111111111111111',
        roles: ['all', 'authenticated'],
        sessionId: '22222222222222222222222222222222',
    }

    beforeEach(async function () {
        sandbox = sinon.sandbox.create()
        // reset global data
        ImmutableCore.reset()
        ImmutableCoreModel.reset()
        ImmutableAppImage.reset()
        // set immutable core and model for immutable ai
        ImmutableAI.immutableCore(ImmutableCore)
        ImmutableAI.immutableCoreModel(ImmutableCoreModel)
        // insantiate models
        imageModel = new ImmutableCoreModel( require('../lib/app/image/image.model.js') )
        imageProfileModel = new ImmutableCoreModel( require('../lib/app/admin/image-profile/image-profile.model.js') )
        imageTypeModel = new ImmutableCoreModel( require('../lib/app/admin/image-type/image-type.model.js') )
        // set database for models
        imageModel.database(database)
        imageProfileModel.database(database)
        imageTypeModel.database(database)
        // sync models
        await imageProfileModel.sync()
        await imageTypeModel.sync()
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
        })
    })

    afterEach(function () {
        sandbox.restore()
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
        sinon.assert.calledWithMatch(fsMock.writeFile, expectedFileName, testImage)
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

    it('should scale image to specific height and aspect ratio', async function () {
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

    it('should scale image to specific height and aspect ratio', async function () {
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

})