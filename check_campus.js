const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

async function checkProducts() {
  try {
    const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
    await mongoose.connect(DB);
    const db = mongoose.connection.db;
    
    const products = await db.collection('products').find({}).limit(3).toArray();
    console.log('Sample products:');
    products.forEach((p, idx) => {
      console.log(`\n=== Product ${idx + 1} ===`);
      console.log('Name:', p.name);
      console.log('campus field:', p.campus);
      console.log('shop field:', p.shop);
    });
    
    // Check how many products have campus field
    const withCampus = await db.collection('products').countDocuments({ campus: { $ne: null } });
    const withoutCampus = await db.collection('products').countDocuments({ campus: { $eq: null } });
    
    console.log(`\n=== Campus field stats ===`);
    console.log('Products WITH campus field:', withCampus);
    console.log('Products WITHOUT campus field:', withoutCampus);
    
    // Check filtering by shop.campus instead
    console.log('\n=== Testing filters ===');
    const testCampusId = '68e5d74b9e9ea2f53162e9ae';
    
    // Get first product and its shop
    const firstProduct = await db.collection('products').findOne({});
    if (firstProduct) {
      const shop = await db.collection('shops').findOne({ _id: firstProduct.shop });
      console.log('\nFirst product:');
      console.log('Product campus:', firstProduct.campus);
      console.log('Product shop ID:', firstProduct.shop);
      console.log('Shop campus:', shop?.campus);
    }
    
    // Count products filtered by product.campus (wrong approach)
    const byProductCampus = await db.collection('products').countDocuments({ 
      campus: new (require('mongoose')).Types.ObjectId(testCampusId)
    });
    console.log(`\nProducts filtered by product.campus (${testCampusId}):`, byProductCampus);
    
    // Count products filtered by shop.campus (correct approach)
    const byShopCampus = await db.collection('products').aggregate([
      {
        $lookup: {
          from: 'shops',
          localField: 'shop',
          foreignField: '_id',
          as: 'shopData'
        }
      },
      {
        $match: {
          'shopData.campus': new (require('mongoose')).Types.ObjectId(testCampusId)
        }
      }
    ]).toArray();
    console.log(`Products filtered by shop.campus (${testCampusId}):`, byShopCampus.length);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkProducts();
