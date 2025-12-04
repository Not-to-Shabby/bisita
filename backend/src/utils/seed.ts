import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attraction from '../models/Attraction.js';
import Business from '../models/Business.js';
import User from '../models/User.js';

dotenv.config();

// ======================
// SEED DATA
// ======================

const attractions = [
  {
    legacyId: '1',
    name: 'Maria Cristina Falls',
    slug: 'maria-cristina-falls',
    description: "Known as the 'Twin Falls' due to the rock at the brink that separates the flow, it powers the Agus VI Hydroelectric Plant. It stands 320 feet tall and is the primary landmark of Iligan City.",
    location: {
      address: 'Agus River, Brgy. Maria Cristina',
      barangay: 'Maria Cristina',
      coordinates: { lat: 8.1836, lng: 124.1919 },
    },
    category: 'waterfall' as const,
    tags: ['waterfall', 'landmark', 'hydroelectric', 'nature'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1546587348-d12660c30c50?auto=format&fit=crop&w=900&q=80',
        isPrimary: true,
      },
    ],
    visitorInfo: {
      entranceFee: '₱50.00',
      shuttleFee: '₱10.00',
      operatingHours: '8:00 AM – 4:00 PM',
      tips: 'Best viewed on weekends when the plant releases full water capacity.',
    },
    transport: {
      vehicle: 'Jeepney',
      route: 'Code 1C (Buru-un)',
      note: 'Ride a Buru-un jeep from city proper. Drop off at the crossing to Maria Cristina Falls (Agus Bridge). Take a short walk or habal-habal to the gate.',
      duration: '30-45 mins',
      fares: { regular: '₱35.00', discounted: '₱28.00' },
      segments: ['Jeepney', 'Walk'] as ('Jeepney' | 'Walk')[],
    },
    stats: { rating: 4.8, reviewCount: 124, viewCount: 0 },
    status: 'active' as const,
    isFeatured: true,
  },
  {
    legacyId: '2',
    name: 'Paseo de Santiago',
    slug: 'paseo-de-santiago',
    description: "A popular seaside park known for the giant 'Iligan City' letters and the best sunset views in the city. It's a favorite hangout for locals to enjoy barbecue (sinugba) and live bands by the bay.",
    location: {
      address: 'Barangay Santiago',
      barangay: 'Santiago',
      coordinates: { lat: 8.2416, lng: 124.2394 },
    },
    category: 'park' as const,
    tags: ['park', 'sunset', 'seaside', 'food'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
        isPrimary: true,
      },
    ],
    visitorInfo: {
      entranceFee: '₱20.00',
      operatingHours: '3:00 PM – 11:00 PM',
      tips: 'Come around 5:30 PM to catch the sunset behind the Iligan Bay.',
    },
    transport: {
      vehicle: 'Jeepney',
      route: 'Code 1A (Santiago)',
      note: 'Ride a Santiago line jeepney from the city market. It stops directly near the entrance.',
      duration: '15 mins',
      fares: { regular: '₱13.00', discounted: '₱11.00' },
      segments: ['Jeepney'] as ('Jeepney')[],
    },
    stats: { rating: 4.5, reviewCount: 89, viewCount: 0 },
    status: 'active' as const,
    isFeatured: true,
  },
  {
    legacyId: '3',
    name: 'Tinago Falls',
    slug: 'tinago-falls',
    description: "True to its name 'Tinago' (Hidden), this waterfall requires descending about 500 winding steps. The effort is rewarded by a stunning blue-green lagoon perfect for swimming and bamboo rafting under the curtain of water.",
    location: {
      address: 'Deep Ravine, Brgy. Ditucalan',
      barangay: 'Ditucalan',
      coordinates: { lat: 8.1594, lng: 124.1739 },
    },
    category: 'waterfall' as const,
    tags: ['waterfall', 'hidden', 'swimming', 'adventure'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=80',
        isPrimary: true,
      },
    ],
    visitorInfo: {
      entranceFee: '₱50.00',
      shuttleFee: '₱25.00 (Habal-habal)',
      operatingHours: '7:00 AM – 5:00 PM',
      tips: 'Rent a life vest (required) and try the bamboo raft to go under the falls.',
    },
    transport: {
      vehicle: 'Jeepney + Habal-habal',
      route: 'Code 1C (Buru-un)',
      note: 'Ride Buru-un jeep to Buru-un Market/Talipapa. Transfer to a Habal-habal (motorcycle) going to Tinago/Linamon resort entrance.',
      duration: '1 hour',
      fares: { regular: '₱35.00', discounted: '₱28.00', habal: 'Negotiated (~₱75/pax)' },
      segments: ['Jeepney', 'Habal-habal'] as ('Jeepney' | 'Habal-habal')[],
    },
    stats: { rating: 4.9, reviewCount: 156, viewCount: 0 },
    status: 'active' as const,
    isFeatured: true,
  },
  {
    legacyId: '4',
    name: 'Mimbalot Falls',
    slug: 'mimbalot-falls',
    description: "Part of Iligan's Tourism Triangle, Mimbalot is the most accessible waterfall. It features natural rock formations and cascading waters suitable for a relaxing dip. The area is surrounded by picnic cottages and resorts.",
    location: {
      address: 'Brgy. Buru-un',
      barangay: 'Buru-un',
      coordinates: { lat: 8.1849, lng: 124.1651 },
    },
    category: 'waterfall' as const,
    tags: ['waterfall', 'picnic', 'family-friendly'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?auto=format&fit=crop&w=900&q=80',
        isPrimary: true,
      },
    ],
    visitorInfo: {
      entranceFee: '₱50.00',
      operatingHours: '8:00 AM – 5:00 PM',
      tips: 'Great for picnics. Try the nearby Iligan Paradise Resort for ziplines.',
    },
    transport: {
      vehicle: 'Jeepney + Walk',
      route: 'Code 1C (Buru-un)',
      note: 'Ride Buru-un jeep. Drop off at Miguel Canoy Memorial School. Walk 10-15 mins or take a habal-habal inside.',
      duration: '40 mins',
      fares: { regular: '₱35.00', discounted: '₱28.00' },
      segments: ['Jeepney', 'Walk'] as ('Jeepney' | 'Walk')[],
    },
    stats: { rating: 4.6, reviewCount: 78, viewCount: 0 },
    status: 'active' as const,
    isFeatured: false,
  },
  {
    legacyId: '6',
    name: 'Macaraeg-Macapagal House',
    slug: 'macaraeg-macapagal-house',
    description: "The ancestral house of two Philippine Presidents: Diosdado Macapagal (9th) and Gloria Macapagal-Arroyo (14th). It showcases memorabilia, antique furniture, and the history of the Macaraeg family in Iligan.",
    location: {
      address: 'Timoga, Buru-un',
      barangay: 'Buru-un',
      coordinates: { lat: 8.1981, lng: 124.1811 },
    },
    category: 'heritage' as const,
    tags: ['heritage', 'history', 'museum', 'presidential'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=900&q=80',
        isPrimary: true,
      },
    ],
    visitorInfo: {
      entranceFee: 'Donation',
      operatingHours: '8:00 AM – 5:00 PM',
      tips: 'Located along the highway, easily accessible by jeepney.',
    },
    transport: {
      vehicle: 'Jeepney',
      route: 'Code 1C (Buru-un)',
      note: 'Located along the highway in Timoga. Ask driver to drop you at Macapagal House.',
      duration: '30 mins',
      fares: { regular: '₱30.00', discounted: '₱24.00' },
      segments: ['Jeepney'] as ('Jeepney')[],
    },
    stats: { rating: 4.4, reviewCount: 45, viewCount: 0 },
    status: 'active' as const,
    isFeatured: false,
  },
  {
    legacyId: '201',
    name: 'Timoga Cold Springs',
    slug: 'timoga-cold-springs',
    description: "A collection of swimming pools fed by icy-cold spring waters flowing from the mountains. Known for its pristine, non-chlorinated water.",
    location: {
      address: 'Timoga, Buru-un',
      barangay: 'Buru-un',
      coordinates: { lat: 8.1965, lng: 124.1802 },
    },
    category: 'spring' as const,
    tags: ['spring', 'swimming', 'cold water', 'nature'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1500930287596-c1ecaa373bb2?auto=format&fit=crop&w=900&q=80',
        isPrimary: true,
      },
    ],
    visitorInfo: {
      entranceFee: '₱100.00',
      operatingHours: '6:00 AM – 6:00 PM',
      tips: 'Bring food, corkage fees may apply but cottages are available.',
    },
    transport: {
      vehicle: 'Jeepney',
      route: 'Code 1C (Buru-un)',
      note: 'Ride Buru-un jeep. Tell driver to drop you at Timoga. Springs are located along the highway.',
      duration: '30 mins',
      fares: { regular: '₱30.00', discounted: '₱24.00' },
      segments: ['Jeepney'] as ('Jeepney')[],
    },
    stats: { rating: 4.7, reviewCount: 112, viewCount: 0 },
    status: 'active' as const,
    isFeatured: true,
  },
];

const businesses = [
  {
    legacyId: '5',
    name: 'Go Hotels Iligan',
    slug: 'go-hotels-iligan',
    type: 'accommodation' as const,
    tagline: 'Affordable comfort at Robinsons Place',
    description: "A modern, budget-friendly hotel located right next to Robinson's Place Iligan. Perfect for business travelers and tourists looking for comfortable and accessible accommodation.",
    location: {
      address: "Robinson's Place, Iligan",
      coordinates: { lat: 8.2187, lng: 124.2406 },
    },
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80'],
    stats: { rating: 4.4, reviewCount: 67 },
    isVerified: true,
    status: 'active' as const,
  },
  {
    legacyId: '101',
    name: "Cheding's Peanuts",
    slug: 'chedings-peanuts',
    type: 'shop' as const,
    tagline: "Iligan's #1 Pasalubong since 1974!",
    description: "The pride of Iligan! Famous for their toasted peanuts which are roasted without oil. A must-buy pasalubong for anyone visiting the city.",
    location: {
      address: 'Quezon Ave.',
      coordinates: { lat: 8.2293, lng: 124.2395 },
    },
    images: ['https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=900&q=80'],
    stats: { rating: 4.9, reviewCount: 234 },
    isVerified: true,
    status: 'active' as const,
  },
  {
    legacyId: '102',
    name: "Tita Fannie's Halang-Halang",
    slug: 'tita-fannies-halang-halang',
    type: 'restaurant' as const,
    tagline: 'The spiciest beef soup in the city!',
    description: "Famous for their Halang-halang (spicy beef soup) and Lechon Manok. A local favorite institution for affordable and delicious comfort food.",
    location: {
      address: 'Zamora St.',
      coordinates: { lat: 8.2280, lng: 124.2452 },
    },
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'],
    stats: { rating: 4.6, reviewCount: 189 },
    isVerified: true,
    status: 'active' as const,
  },
  {
    legacyId: '103',
    name: 'Timoga Lechon House',
    slug: 'timoga-lechon-house',
    type: 'restaurant' as const,
    tagline: 'Crispy skin, juicy meat. Best lechon in Iligan!',
    description: 'Famous for their crispy lechon with perfectly seasoned meat. A must-visit when in the Timoga area.',
    location: {
      address: 'Timoga, Buru-un',
      coordinates: { lat: 8.1970, lng: 124.1805 },
    },
    images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'],
    stats: { rating: 4.7, reviewCount: 156 },
    isVerified: true,
    status: 'active' as const,
  },
];

// ======================
// SEED FUNCTION
// ======================

const seed = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not configured');
    }

    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to preserve)
    console.log('🗑️  Clearing existing data...');
    await Attraction.deleteMany({});
    await Business.deleteMany({});
    // Note: Not deleting Users to preserve admin accounts

    // Create admin user if not exists
    const adminEmail = 'admin@bisita.ph';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      console.log('👤 Creating admin user...');
      admin = await User.create({
        email: adminEmail,
        passwordHash: 'admin123456', // Change this!
        username: 'Admin',
        role: 'admin',
        isEmailVerified: true,
      });
      console.log('✅ Admin user created (email: admin@bisita.ph, password: admin123456)');
    }

    // Seed attractions
    console.log('🏔️  Seeding attractions...');
    await Attraction.insertMany(attractions);
    console.log(`✅ Seeded ${attractions.length} attractions`);

    // Seed businesses (need to assign owner)
    console.log('🏪 Seeding businesses...');
    const businessesWithOwner = businesses.map(b => ({
      ...b,
      ownerId: admin!._id,
      nearAttractionIds: [], // Will be linked later if needed
    }));
    await Business.insertMany(businessesWithOwner);
    console.log(`✅ Seeded ${businesses.length} businesses`);

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌊 Seed completed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
