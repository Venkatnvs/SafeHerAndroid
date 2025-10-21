const admin = require('firebase-admin');
const serviceAccount = require('./women-safety-app-d3e9b-firebase-adminsdk-fbsvc-719d109d78.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://women-safety-app-d3e9b-default-rtdb.firebaseio.com',
});

const db = admin.firestore();

// Verified YouTube self-defense videos for women (October 2025)
const selfDefenseVideos = [
  {
    title: 'Self Defence for Women – The Most Effective Techniques',
    subtitle: 'Beginner-friendly step-by-step tutorial',
    description:
      'Basic stance, balance, escapes, and strikes for practical self-defense in real-life scenarios.',
    youtubeId: 'WCn4GBcs84s',
    color: '#FF9800',
    duration: '13 min',
    level: 'Beginner',
    techniques: [
      'Stance and balance',
      'Palm and elbow strikes',
      'Feet and knee kicks',
      'Escaping holds',
      'Defending from grabs',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: '5 Self-Defense Moves Every Woman Should Know',
    subtitle: 'Quick and effective moves',
    description:
      'Learn five essential moves to defend against the most common types of attack.',
    youtubeId: 'KVpxP3ZZtAc',
    color: '#2196F3',
    duration: '8 min',
    level: 'Beginner',
    techniques: [
      'Wrist grab escape',
      'Groin strikes',
      'Elbow block',
      'Throat attacks',
      'Fast getaway',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: "Women's Self-Defense Techniques That Work",
    subtitle: 'Jeet Kune Do & Krav Maga moves',
    description:
      'Practical and simple techniques every woman can practice and apply for self-protection.',
    youtubeId: 'Wd82ErPyroE',
    color: '#4CAF50',
    duration: '7 min',
    level: 'Beginner',
    techniques: [
      'Awareness tips',
      'Wrist escapes',
      'Choke escapes',
      'Vulnerable target strikes',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Self Defense Moves That Will Save Your Life in 2025!',
    subtitle: 'Modern tactics and mindset',
    description:
      'Train body and mind for readiness, with effective strategies to avoid harm.',
    youtubeId: 'VAaPZM3I7tI',
    color: '#795548',
    duration: '10 min',
    level: 'Beginner',
    techniques: [
      'Preparation mindset',
      'Personal boundaries',
      'Reacting quickly',
      'Pre-planned escapes',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Self-Defense Training with Marcus Kowal',
    subtitle: 'Personal empowerment and Krav Maga basics',
    description:
      'A Krav Maga instructor teaches simple, effective moves for self-defense and empowerment.',
    youtubeId: '__re6LG7cYo',
    color: '#FF9800',
    duration: '12 min',
    level: 'Beginner',
    techniques: [
      'Krav Maga basics',
      'Blocking punches',
      'Low kicks',
      'Escaping bear hugs',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: "Women's Brazilian Jiu-Jitsu Self Defense Playlist",
    subtitle: 'Ground escapes for real scenarios',
    description:
      'Multiple videos featuring ground escapes, hair grab self-defense, and wall choke defence.',
    youtubeId: 'PL8brMCMqha41e7CNRBeGEfjgPjJq0m34V', // Playlist ID
    color: '#607D8B',
    duration: 'Varies',
    level: 'Intermediate',
    techniques: [
      'Ground escapes',
      'Choke defense',
      'Hair grab defense',
      'Wall defense',
      'Submission basics',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: "The Reality of Women's Self Defense",
    subtitle: 'Real talk and moves',
    description:
      'Common misconceptions and the truths of self-protection, confidence, and practical skills.',
    youtubeId: 'SZ816eIMd0w',
    color: '#E91E63',
    duration: '15 min',
    level: 'Beginner',
    techniques: [
      'Practical awareness',
      'Vulnerable spot strikes',
      'Defensive posture',
      'De-escalation tactics',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Essential Self-Defense Techniques For Women',
    subtitle: 'Crucial basics and empowerment',
    description:
      'Learn quick moves and foundational skills to protect yourself in various situations.',
    youtubeId: 'BUg0zlNcxFY',
    color: '#FF5722',
    duration: '9 min',
    level: 'Beginner',
    techniques: [
      'Key strikes',
      'Bag defense',
      'Face palm hits',
      'Environment improvisation',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Self Defence for Women: How to Defend Yourself on the Ground',
    subtitle: 'Beginners guide to ground self-defense',
    description:
      'Learn the basics of protecting yourself and escaping when you get knocked to the ground.',
    youtubeId: 'OYGCV74sofE',
    color: '#4CAF50',
    duration: '8 min',
    level: 'Beginner',
    techniques: [
      'Ground escape',
      'Hip escape',
      'Sweeps',
      'Getting back to feet',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Defense Against Grabs and Holds',
    subtitle: 'Escape techniques for common attacks',
    description:
      'Step-by-step instructions to break free from wrist, choke, and bear hug holds.',
    youtubeId: 'K4v-hv6qN88',
    color: '#4CAF50',
    duration: '11 min',
    level: 'Beginner',
    techniques: [
      'Wrist grab escape',
      'Choke hold defense',
      'Bear hug escape',
      'Breaking contact fast',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Women Safety | Girls Safety Tips | Life Saving Hacks',
    subtitle: 'Comprehensive safety for daily life',
    description:
      '15 life-saving hacks including how to stay safe in public, say no, escape tricks, and emergency contacts.',
    youtubeId: 'jp3dptdzgNw',
    color: '#FF9800',
    duration: '30 min',
    level: 'Beginner',
    techniques: [
      'Public space rules',
      'Lift/car safety',
      'Body language reading',
      'Instinct awareness',
      'Emergency contacts',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'How to Protect Yourself | Safety Tips for Women | Safety Tools',
    subtitle: 'Essential everyday safety tools',
    description:
      'How to use common safety gadgets and mental strategies to prevent danger.',
    youtubeId: 'pql9gYcp1cU',
    color: '#2196F3',
    duration: '15 min',
    level: 'Beginner',
    techniques: [
      'Pepper spray use',
      'Alarm gadgets',
      'Situational awareness',
      'Trusting your intuition',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'How to Get Out of A Dangerous Situation (For Women)',
    subtitle: 'Escape strategies and psychology',
    description:
      'Escape techniques, breathing under stress, and strategies to avoid freezing in danger.',
    youtubeId: 'EBoYxD_k_Y8',
    color: '#4CAF50',
    duration: '13 min',
    level: 'Beginner',
    techniques: [
      'Fight, flight, freeze',
      'Assess situation',
      'Emergency phone tricks',
      'Quick thinking',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Safety for Girls on Trains: We Need to Talk About This',
    subtitle: 'Public train and travel safety',
    description:
      'Train travel safety tips, safe spaces, bystander help, and emergency resources.',
    youtubeId: 'gKRVyu0ybNc',
    color: '#607D8B',
    duration: '26 min',
    level: 'Intermediate',
    techniques: [
      'Travel tips',
      'Night safety',
      'Emergency resources',
      'Calling for help',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: "Women's Safety on Public Transport in India: Survey Results",
    subtitle: 'India-specific public transport advice',
    description:
      'Covers real survey statistics, concerns, and tips for using public transport safely.',
    youtubeId: 'QcKnthPouJ0',
    color: '#2196F3',
    duration: '12 min',
    level: 'Beginner',
    techniques: [
      'Bus and train safety',
      'Ride-hailing comparison',
      'Location sharing',
      'Day vs night tips',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Personal Safety Tips for Travelling Public Transport',
    subtitle: 'Urban travel safety',
    description:
      'Urban and public transportation safety tips for women and solo travelers.',
    youtubeId: '3c2IRKJ74HQ',
    color: '#F44336',
    duration: '18 min',
    level: 'Beginner',
    techniques: [
      'Solo travel',
      'Safe waiting zones',
      'Alertness in transport',
      'Calling for help',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: "Transport Development and Women's Safety in India",
    subtitle: 'Role of infrastructure',
    description:
      'How metro stations and transport development reduce street harassment for women in urban India.',
    youtubeId: 'q0JgMOpfaLk',
    color: '#E91E63',
    duration: '14 min',
    level: 'Beginner',
    techniques: [
      'Metro safety impact',
      'Street harassment reduction',
      'Safe travel tips',
      'Reporting abuse',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
  {
    title: 'Safety on the Bus',
    subtitle: 'Bus travel and solo commutes',
    description:
      'How to stay safe as a solo female bus traveler, choosing safe seats and reporting problems.',
    youtubeId: 'tTW_o5e7pqc',
    color: '#FF5722',
    duration: '10 min',
    level: 'Beginner',
    techniques: [
      'Seat selection',
      'Bag placement',
      'Reporting to authorities',
      'Emergency exits',
    ],
    createdAt: new Date(),
    createdBy: 'admin',
  },
];

// Function to populate Firestore database
async function populateSelfDefenseVideos() {
  try {
    console.log('Starting to populate self-defense videos...');

    // Clear existing videos (optional)
    const existingVideos = await db.collection('selfDefenseTopics').get();
    const batch = db.batch();

    existingVideos.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('Cleared existing videos');

    // Add new curated videos
    for (const video of selfDefenseVideos) {
      await db.collection('selfDefenseTopics').add(video);
      console.log(`Added: ${video.title}`);
    }

    console.log('Successfully populated self-defense videos!');
    console.log(`Added ${selfDefenseVideos.length} videos to Firebase`);
  } catch (error) {
    console.error('Error populating videos:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
populateSelfDefenseVideos();
