// Create a schema.  A schema maps to a collection and 'defines the shape of the documents within that collection.'
// Create a model of the record to work with using the collection name and schema.
var mongoose = require('mongoose'),

    ImageSchema = new mongoose.Schema({
      sort_id: String,
      dom_id: Number,
      filename: String,
      owner: String,
      url: String,
      posleft: String,
      postop: String,
      width: String,
      height: String,
      zindex: Number,
      opacity: String,
      transform: String,
      filter: String,
      scale: String,
      angle: String,
      rotateX: String,
      rotateY: String,
      rotateZ: String,
      igram_link: String,
      created: Date
    });

module.exports = mongoose.model('images', ImageSchema);
