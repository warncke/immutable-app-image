# immutable-app-image

Immutable App Image is an
[immutable-app](https://www.npmjs.com/package/immutable-app) module that
provides image upload, editing and storage functionality.

Immutable App Image uses [Cropper.js](https://github.com/fengyuanchen/cropperjs)
to crop images on the client side prior to uploading and
[sharp](https://www.npmjs.com/package/sharp) to process images on the backend.

Images are stored via an [mz/fs](https://www.npmjs.com/package/mz) compatible
file system which can be the local file system or a remote virtual file system
such as [gcsfs](https://www.npmjs.com/package/gcsfs).

## Image Schema

### Image

Property name   | Description                                                  |
----------------|--------------------------------------------------------------|
fileName        | string param case file name will have id and type appended   |
fileType        | string encoding type (jpg|png|webp)                          |
imageName       | string user provided name for description                    |
imageTypeId     | id for Image Type                                            |
meta            | object user provided meta data for image                     |
path            | string location of image in file system                      |

The Image model stores basic information about the *original* image uploaded by
the user.

The `fileName` of the image is constructed from the param-case name, the Image id
and the fileType.

For example: if the user provided name is "My Vacation" the fileName might be:
"my-vacation-8449328a1eedfd27b1214d7d4fb16315.jpg".

The `path` of the image is relative to the base of the file system and does not
include the `fileName`.

The `meta` data for an image can include anything. In the `meta` data `lat` and
'lng' should be used as the properties for geo location, `title` should be used
for a single line description of the image, `description` should be used for a
longer multi-line description of the image, and `createTime` should be used to
store the datetime when the image was originally taken.

### Image Type

Property name   | Description                                                  |
----------------|--------------------------------------------------------------|
cropClient      | string crop image on client (always|best|never)              |
fileType        | string encoding type (jpg|png|webp)                          |
height          | integer image height                                         |
imageTypeName   | string image type name                                       |
maxClientHeight | integer maximum image height to upload from client           |
maxClientWidth  | integer maximum image width to upload from client            |
maxHeight       | integer maximum image height                                 |
maxWidth        | integer maximum image width                                  |
quality         | integer 0-100 quality for jpg and webp image encoding        |
width           | integer image width                                          |

Image Types are used for categorizing images and defined how images are uploaded
and stored.

The `clientCrop` parameter determines whether or not cropping and encoding will
be done by the client.

By default `clientCrop` is set to `best` which means that the image will only be
cropped by the client if it exceeds the `maxClientHeight` or `maxClientWidth`
values.

Cropping on the client will reduce upload times for large images but that may
come at the price of reduced image quality.

The `fileType` determines how the file will be stored on the server.

If `maxHeight` and/or `maxWidth` properties are set they will limit the size of
the image but aspect ratio will be maintained and the image will not be upscaled
if it is less than the maxHeight/maxWidth.

If `height` and/or `width` are set the image will the scaled to exactly these
values. Image may be upscaled and aspect ratio may not be maintained.

### Image Profile

Property name   | Description                                                  |
----------------|--------------------------------------------------------------|
fileType        | string encoding type (jpg|png|webp)                          |
height          | integer image height                                         |
imageProfileName| string image profile name                                    |
maxHeight       | integer maximum image height                                 |
maxWidth        | integer maximum image width                                  |
pregenerate     | boolean generate images for for profile in advance           |
quality         | integer 0-100 quality for jpg and webp image encoding        |
width           | integer image width                                          |

Image Profiles define different versions of an image that will be made available
for download.

One or more Image Profiles can be linked to an Image Type.

The `name` for a profile must be in param case: i.e. lower case, dashes, and no
spaces.

If the `pregenerate` property is set then when an image is uploaded a version
of for the Image Profile will be created.

Pre-generated images are stored with the profile name afer the id and before the
fileType like: "my-vacation-8449328a1eedfd27b1214d7d4fb16315-thumbnail.jpg".

To support webp multiple profiles with the same name should be created. One of
these profiles should be either jpg or png and the either should be webp.