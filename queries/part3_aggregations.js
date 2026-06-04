// Запуск: mongosh "mongodb://admin:secretpassword@localhost:27017/?authSource=admin" --file queries/part3_aggregations.js

db = db.getSiblingDB("spotify");

print("Connected to database:", db.getName());


// Завдання 3.1. Топ-10 виконавців за середньою популярністю
print("\n=== Task 3.1: Top artists by average popularity ===");

const topArtists = db.tracks.aggregate([
  {
    $match: {
      popularity: { $gt: 65 }
    }
  },
  {
    $unwind: "$artists"
  },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      track_count: { $gte: 5 }
    }
  },
  {
    $project: {
      _id: 0,
      artist_name: "$_id",
      track_count: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  {
    $sort: {
      avg_popularity: -1
    }
  },
  {
    $limit: 10
  }
]).toArray();

printjson(topArtists);


// Завдання 3.2. Розподіл треків за настроєм
print("\n=== Task 3.2: Track mood distribution ===");

const moodDistribution = db.tracks.aggregate([
  {
    $project: {
      mood: {
        $switch: {
          branches: [
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy", 0.5] }
                ]
              },
              then: "happy"
            },
            {
              case: {
                $and: [
                  { $lt: ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy", 0.5] }
                ]
              },
              then: "angry"
            },
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $lt: ["$audio_features.energy", 0.5] }
                ]
              },
              then: "calm"
            }
          ],
          default: "sad"
        }
      }
    }
  },
  {
    $group: {
      _id: "$mood",
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      mood: "$_id",
      count: 1
    }
  },
  {
    $sort: {
      count: -1
    }
  }
]).toArray();

printjson(moodDistribution);


// Завдання 3.3. Найбільш танцювальний жанр
print("\n=== Task 3.3: Most danceable genre ===");

const mostDanceableGenre = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_danceability: { $avg: "$audio_features.danceability" },
      avg_energy: { $avg: "$audio_features.energy" },
      avg_valence: { $avg: "$audio_features.valence" },
      track_count: { $sum: 1 }
    }
  },
  {
    $match: {
      track_count: { $gte: 100 }
    }
  },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_danceability: { $round: ["$avg_danceability", 3] },
      avg_energy: { $round: ["$avg_energy", 3] },
      avg_valence: { $round: ["$avg_valence", 3] },
      track_count: 1
    }
  },
  {
    $sort: {
      avg_danceability: -1
    }
  },
  {
    $limit: 10
  }
]).toArray();

printjson(mostDanceableGenre);