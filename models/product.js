const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  unit: String, // e.g., 'kg', 'piece', 'bunch'
  imageUrl: String,
  category: String // 'vegetable' or 'dairy'
});

module.exports = mongoose.model('Product', productSchema);
