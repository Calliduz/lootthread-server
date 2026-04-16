import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import Artist from './models/Artist';
import Collection from './models/Collection';
import Product from './models/Product';
import CMSContent from './models/CMSContent';

dotenv.config();

const seedDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lootthread';
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(uri);

    // 1. Clear existing data
    console.log('Purging existing data...');
    await User.deleteMany({});
    await Artist.deleteMany({});
    await Collection.deleteMany({});
    await Product.deleteMany({});
    await CMSContent.deleteMany({});

    // 2. Seed Users
    console.log('Seeding Users...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@lootthread.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
      isVerified: true,
    });

    const customerUser = await User.create({
      name: 'Customer User',
      email: 'customer@lootthread.com',
      password: 'password123',
      role: 'customer',
      isActive: true,
      isVerified: true,
    });
    console.log(`Created Users: Admin (${adminUser._id}), Customer (${customerUser._id})`);

    // 3. Seed Artists
    console.log('Seeding Artists...');
    const artist1 = await Artist.create({
      name: 'Calliduz',
      bio: 'The glitch architect. Sculpting high-performance digital gear for the elite tier.',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Calliduz',
      isActive: true,
      salesCount: '12K+',
      rating: 4.9,
    });
    
    const artist2 = await Artist.create({
      name: 'NeonWeave',
      bio: 'Cyberpunk inspired aesthetics for the modern gamer.',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NeonWeave',
      isActive: true,
      salesCount: '5K+',
      rating: 4.7,
    });
    console.log(`Created Artists: ${artist1.name}, ${artist2.name}`);

    // 4. Seed Collections
    console.log('Seeding Collections...');
    const col1 = await Collection.create({
      name: 'Summer Drop 2026',
      description: 'The hottest digital apparel and gear for summer.',
      releaseDate: new Date(),
      isActive: true,
    });

    const col2 = await Collection.create({
      name: 'Neon Genesis',
      description: 'Exclusive cyberpunk-themed attachments and skins.',
      releaseDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Next week
      isActive: true,
    });
    console.log(`Created Collections: ${col1.name}, ${col2.name}`);

    // 5. Seed Products
    console.log('Seeding Products...');
    const productsToCreate = [
      {
        name: 'Carbon Fiber Cooling Grip',
        title: 'Carbon Grip X1',
        description: 'Advanced thermal dissipation for elite mobile gaming. Ergonomic lattice structure for maximum airflow.',
        price: 49.99,
        type: 'attachment',
        stockQuantity: 150,
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
        artistId: artist1._id,
        collectionId: col1._id,
      },
      {
        name: 'Viper Genesis Skin',
        title: 'Viper Genesis',
        description: 'HoK-inspired limited edition skin for the Viper V3 Pro. Iridescent emerald finish with animated tactical pulse.',
        price: 29.99,
        type: 'skin',
        stockQuantity: 500,
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800',
        artistId: artist1._id,
        collectionId: col2._id,
      },
      {
        name: 'Neon Circuit Cap',
        title: 'Circuit Cap',
        description: 'Cyberpunk inspired apparel. Glows in the dark.',
        price: 34.99,
        type: 'apparel',
        stockQuantity: 300,
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800',
        artistId: artist2._id,
        collectionId: col2._id,
      },
      {
        name: 'Zero-Friction Tactical Sleeve',
        title: 'Tactical Sleeve',
        description: 'Compression sleeve for zero-friction mouse movement. Micro-weave fabric optimized for high-DPI sensors.',
        price: 19.99,
        type: 'individual',
        stockQuantity: 1000,
        imageUrl: 'https://images.unsplash.com/photo-1629429464245-4bb684570196?auto=format&fit=crop&q=80&w=800',
        artistId: artist2._id,
      }
    ];
    // insertMany validates data across all arrays elements
    const products = await Product.insertMany(productsToCreate as any);
    console.log(`${products.length} products successfully deployed.`);

    // 6. Seed CMS
    console.log('Seeding CMS Content...');
    await CMSContent.create({
      key: 'marquee_banner',
      type: 'json',
      value: { 
        text: 'Welcome to LootThread! New drop this Friday.', 
        link: '/collections' 
      },
      isActive: true,
    });
    console.log('CMS Content created.');

    console.log('Seeding Mission Complete! 🚀');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Failed ❌:', error);
    process.exit(1);
  }
};

seedDB();
