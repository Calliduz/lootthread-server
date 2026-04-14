import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Artist from './models/Artist';
import Product from './models/Product';

dotenv.config();

const SEED_DATA = {
  artist: {
    name: 'Calliduz',
    bio: 'The glitch architect. Sculpting high-performance digital gear for the elite tier.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Calliduz',
    password: 'lootthread_dev_2026',
    salesCount: '12K+',
    rating: 4.9,
    totalRevenue: 54200,
    activeSkinsCount: 4
  },
  products: [
    {
      name: 'Carbon Fiber Cooling Grip',
      description: 'Advanced thermal dissipation for elite mobile gaming. Ergonomic lattice structure for maximum airflow.',
      price: 49.99,
      category: 'attachment',
      subCategory: 'Mobile',
      images: ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800'],
      inventory: 150,
      tags: ['thermal', 'mobile', 'elite']
    },
    {
      name: 'Viper Genesis Skin',
      description: 'HoK-inspired limited edition skin for the Viper V3 Pro. Iridescent emerald finish with animated tactical pulse.',
      price: 29.99,
      category: 'skin',
      subCategory: 'Mouse',
      images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800'],
      inventory: 500,
      tags: ['limited', 'hok', 'mouse']
    },
    {
      name: 'HoK Radiant Cloak',
      description: 'Legendary skin for core avatars. Infused with stellar energy for a zero-drag visual impact.',
      price: 99.99,
      category: 'skin',
      subCategory: 'Avatar',
      images: ['https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800'],
      inventory: 50,
      tags: ['legendary', 'avatar', 'radiant']
    },
    {
      name: 'Zero-Friction Tactical Sleeve',
      description: 'Compression sleeve for zero-friction mouse movement. Micro-weave fabric optimized for high-DPI sensors.',
      price: 19.99,
      category: 'attachment',
      subCategory: 'Accessory',
      images: ['https://images.unsplash.com/photo-1629429464245-4bb684570196?auto=format&fit=crop&q=80&w=800'],
      inventory: 1000,
      tags: ['accessory', 'performance', 'smooth']
    }
  ]
};

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lootthread';
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(uri);

    // Clear existing data
    console.log('Purging existing data...');
    await Artist.deleteMany({});
    await Product.deleteMany({});

    // Create Artist
    console.log('Seeding Master Artist...');
    const artistData = { ...SEED_DATA.artist };
    // Password hashing handled by pre-save hook in model
    const artist = await Artist.create(artistData);
    console.log(`Artist [${artist.name}] created with ID: ${artist._id}`);

    // Create Products
    console.log('Seeding Tactical Products...');
    const productsWithArtist = SEED_DATA.products.map(p => ({
      ...p,
      artistId: artist._id
    }));
    const products = await Product.insertMany(productsWithArtist);
    console.log(`${products.length} products successfully deployed.`);

    console.log('Seeding Mission Complete! 🚀');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Failed ❌:', error);
    process.exit(1);
  }
};

seed();
