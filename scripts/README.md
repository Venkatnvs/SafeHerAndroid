# Self-Defense Videos Population Script

This script populates the Firebase Firestore database with real self-defense videos for the SafeHer app.

## Prerequisites

1. Firebase Admin SDK service account key file
2. Node.js installed
3. Firebase project configured

## Setup

1. Place your Firebase service account key file in the scripts directory
2. Update the service account path in the script if needed
3. Install dependencies:
   ```bash
   cd SafeHerAndroid/scripts
   npm install firebase-admin
   ```

## Usage

Run the script to populate Firebase with self-defense videos:

```bash
node populateSelfDefenseVideos.js
```

## What it does

- Clears existing self-defense topics (optional)
- Adds 10 real self-defense videos with actual YouTube IDs
- Each video includes:
  - Title and subtitle
  - Description
  - YouTube video ID
  - Techniques covered
  - Difficulty level
  - Duration
  - Icon and color

## Videos Included

1. Basic Self-Defense Techniques for Women
2. Situational Awareness Training
3. Escape Techniques from Holds
4. Verbal Self-Defense Strategies
5. Weapon Defense Basics
6. Ground Fighting for Self-Defense
7. Street Self-Defense for Women
8. Mental Preparation for Self-Defense
9. Self-Defense with Everyday Objects
10. Advanced Self-Defense Combinations

## Notes

- All videos are real self-defense tutorials from YouTube
- Videos are categorized by difficulty level (Beginner, Intermediate, Advanced)
- Each video includes practical techniques and descriptions
- The script can be run multiple times safely
