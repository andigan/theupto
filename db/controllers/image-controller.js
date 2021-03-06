var config = require('../../config/config.js'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    imageCheck = require('../../scripts/image-check'),
    twoDSort = require('../../scripts/two-d-sort'),
    s3 = require('../../mods/aws')();

function dbReseedImages(sortedDateFilenames, callback) {
  let ImageDocuments = mongoose.model('images'),
      src;

  // assign src based on UrlToDB setting
  switch (config.UrlToDB) {
    case 's3':
      src = config.storageOpt.s3.loc;
      break;
    case 'local':
      src = config.storageOpt.local.loc;
      break;
    case 'cloudinary':
      src = config.storageOpt.cloudinary.loc;
      break;
    default:
      break;
  }

  // clear out the database
  ImageDocuments.remove({}, function (err) {
    if (err) return console.error(err);

    console.log('\nCollection removed.\nFiles added to database: ');

    sortedDateFilenames.forEach(function (dateFilename, i) {
      console.log(dateFilename[1]);
      // create a new document using the ImageDocuments model, then save it to the database
      new ImageDocuments(

        { sort_id   : dateFilename[0] + dateFilename[1],
          dom_id    : i,
          filename  : dateFilename[1],
          url       : src + dateFilename[1],
          created   : dateFilename[0],
          owner     : dateFilename[1].split('-')[0],
          posleft   : '10%',
          postop    : '10%',
          zindex    : i,
          width     : '20%',
          height    : '20%',
          transform : 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
          opacity   : '1',
          filter    : 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)',
          scale     : '1',
          angle     : '0',
          rotateX   : '0deg',
          rotateY   : '0deg',
          rotateZ   : '0deg'
        })
      // .save is a mongoose method for model prototypes .save(function (err, tempfile) { });
      .save(function (err) { if (err) return console.error(err); });
    });

    console.log('\nCollection replaced.\n\n');
    callback();
  });
}

module.exports = {

  fetchPageLoad(renderPage) {
    let ImageDocuments = mongoose.model('images');

    // Retrieve an array of image documents from the database
    // sort the results by sort_id, ascending order, for consistency in the DOM
    // resets DOM IDs
    ImageDocuments.find({}).sort({sort_id: 'asc'}).exec(function (err, databaseResult) {
      if (err) return console.error(err);
      console.log('\nImage data retrieved from database to pass to index.handlebars...\n');
      renderPage(databaseResult);
    });
  },

  dragStopUpdate(dropData) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.update(
      { filename : dropData.filename },
      { $set: {   posleft  : dropData.left,
                  postop   : dropData.top } },
      { upsert: true },
      function (err) { if (err) return console.error(err); } );

    // for each element, update zIndex
    dropData.imageEls.forEach(function (imageEl) {

      ImageDocuments.update(
        { dom_id : imageEl.domId },
        { $set: { zindex : imageEl.zIndex } },
        { upsert: true },
        function (err) { if (err) return console.error(err); } );
    });
  },

  saveResize(data) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.update(
      { filename : data.filename },
      { $set: { transform : data.transform,
                posleft   : data.imageLeft,
                postop    : data.imageTop,
                width     : data.imageWidth,
                height    : data.imageHeight } },
      { upsert: true },
      function (err) { if (err) return console.error(err); } );
  },

  saveOpacity(data) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.update(
      { filename : data.filename },
      { $set: { opacity : data.imageOpacity } },
      { upsert: true },
      function (err) { if (err) return console.error(err); } );
  },

  saveFilter(data) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.update(
      { filename : data.filename },
      { $set: { filter : data.filter } },
      { upsert: true },
      function (err) { if (err) return console.error(err); } );
  },

  saveTransform(data) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.update(
      { filename : data.filename },
      { $set: { transform : data.transform } },
      { upsert: true },
      function (err) { if (err) return console.error(err); } );
  },

  saveAttributes(data) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.update(
      { filename : data.filename },
      { $set: { scale   : data.scale,
                angle   : data.angle,
                rotateX : data.rotateX,
                rotateY : data.rotateY,
                rotateZ : data.rotateZ  } },
      { upsert: true },
      function (err) { if (err) return console.error(err); } );
  },

  resetImageAll(data) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.update(
      { filename : data.filename },
      { $set: { posleft   : '10%',
                postop    : '10%',
                width     : '20%',
                height    : '20%',
                transform : 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
                opacity   : '1',
                filter    : 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)',
                scale     : '1',
                angle     : '0',
                rotateX   : '0deg',
                rotateY   : '0deg',
                rotateZ   : '0deg' } },
      { upsert: true },
      function (err) { if (err) return console.error(err); } );
  },

  removeImage(filename) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.find({ filename: filename }).remove().exec();
  },

  addUploadToDB: function (newFilename, sessionID, io) {
    let created = new Date().toISOString(),
        ImageDocuments = mongoose.model('images');

    // find the highest ID
    ImageDocuments.find().sort({'dom_id':-1}).limit(1).select('dom_id').exec(function (err, highestIdRecord) {
      if (err) return console.error(err);

      // find the highest z-index
      ImageDocuments.find().sort({'zindex':-1}).limit(1).select('zindex').exec(function (err, highestzIndexRecord) {
        let newImage = {};

        if (err) return console.error(err);

        newImage.filename = newFilename;
        newImage.owner = sessionID;

        // assign src based on which UrlToDB is set
        switch (config.UrlToDB) {
          case 's3':
            newImage.src = config.storageOpt.s3.loc + newFilename;
            break;
          case 'local':
            newImage.src = config.storageOpt.local.loc + newFilename;
            break;
          case 'cloudinary':
            newImage.src = config.storageOpt.cloudinary.loc + newFilename;
            break;
          default:
            break;
        }

        // if database is empty...
        if (highestIdRecord.length < 1) {
          newImage.domId = 0;
          newImage.zIndex = 0;
        } else {
          newImage.domId = highestIdRecord[0].dom_id + 1;
          newImage.zIndex = highestzIndexRecord[0].zindex + 1;
        };

        newImage.left = '10%';
        newImage.top = '10%';
        newImage.width = '20%';
        newImage.height = '20%';

        ImageDocuments.update(
          {           filename   : newFilename },
          { $set: {   sort_id    : created + newFilename,
                      dom_id     : newImage.domId,
                      zindex     : newImage.zIndex,
                      owner      : sessionID,
                      created    : created,
                      url        : newImage.src,
                      posleft    : newImage.left,
                      postop     : newImage.top,
                      width      : newImage.width,
                      height     : newImage.height,
                      transform  : 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
                      filter     : 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)',
                      opacity    : '1',
                      scale      : '1',
                      angle      : '0',
                      rotateX    : '0deg',
                      rotateY    : '0deg',
                      rotateZ    : '0deg' }
          },
          { upsert: true },
          // update completion callback
          function (err) {
            if (err) {
              return console.error(err);
            } else {
              console.log(newFilename + ' added to database.');

              // add image to all connected pages
              io.emit('se:_addUploadToPage', newImage);
            }
          });
      });
    });
  },

  resetDBImages: function (callback) {
    let ImageDocuments = mongoose.model('images');

    ImageDocuments.find({}).sort({sort_id: 'asc'}).exec(function (err, databaseResult) {
      if (err) return console.error(err);

      databaseResult.forEach(function (result, i) {

        ImageDocuments.update(
          {           sort_id    : result.sort_id },
          { $set: {   dom_id     : i,
                      zindex     : i,
                      posleft   : '10%',
                      postop    : '10%',
                      width     : '20%',
                      height    : '20%',
                      transform : 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
                      opacity   : '1',
                      filter    : 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)',
                      scale     : '1',
                      angle     : '0',
                      rotateX   : '0deg',
                      rotateY   : '0deg',
                      rotateZ   : '0deg' }
          },
          { upsert: true },
          // update completion callback
          function (err) {
            if (err) {
              return console.error(err);
            } else {
              // console.log(result.filename + ' added to database.');
              // after last record...
              if (databaseResult.length === (i + 1)) {
                console.log('***** reloading page *****');
                callback();
              };
            }
          }
        );
      });
    });
  },

  reseedFromLocal: function (callback) {

    // fs method to read a directory's filenames
    fs.readdir(config.staticImageDir, function (err, dirFilenames) {
      let sorted;

      if (err) return console.error(err);

      sorted = dirFilenames.filter(function (filename) {
        return imageCheck(filename);
      }).map(function (filename) {
        // create sorted, a two-dimensional array used for sorting images by date
        // sorted[0] = [ modification date, filename ]
        // e.g.
        //   [[2016-03-10T14:01:17.000Z, E1RsRVVRg.jpg],
        //   [2016-03-17T17:03:13.000Z, b47GTxyzP.jpg] ]

        // fsstatSync: node method to get data about a file
        // .mtime: a method to retrieve a 'modification date' object from the fsstatsync result
        // .toISOString: a date prototype method that converts the date object to a string
        return [fs.statSync( config.staticImageDir + '/' + filename ).mtime.toISOString(), filename ];
      }).sort(twoDSort);

      dbReseedImages(sorted, callback);
    });
  },

  reseedFromS3: function (callback) {

    // Note: limit of 1000 keys
    s3.listObjectsV2( { Bucket: config.bucket }, function (err, data) {
      let imagesDate;

      if (err) {
        console.log(err, err.stack);
      } else {
        imagesDate  = data.Contents.map(function (image) {
          return [image.LastModified.toISOString(), image.Key];
        });

        imagesDate.sort(twoDSort);

        dbReseedImages(imagesDate, callback);
      };
    });
  }

};
