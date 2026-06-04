// Запуск: mongosh "mongodb://admin:secretpassword@localhost:27017/?authSource=admin" --file queries/part2_queries.js

db = db.getSiblingDB("spotify");

const LIMIT = 20;

// Завдання 1. Треки для вечірки
print("\n=== Task 2.1: Party tracks ===");

const partyTracks = db.tracks.find(
  {
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 }
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    popularity: 1,
    duration_ms: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1
  }
).limit(10).toArray();

printjson(partyTracks);


// Завдання 2. Виконавці, у яких усі треки популярні
print("\n=== Task 2.2: Popular artists ===");

const popularArtists = db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      track_count: { $gte: 3 },
      min_popularity: { $gt: 60 }
    }
  },
  {
    $project: {
      _id: 0,
      artist_name: "$_id",
      track_count: 1,
      min_popularity: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  { $sort: { avg_popularity: -1 } },
  { $limit: LIMIT }
]).toArray();

printjson(popularArtists);


// Завдання 3. Нетипові треки за темпом
print("\n=== Task 2.3: Tempo outliers ===");

const outlierTracks = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      stddev_tempo: { $stdDevPop: "$audio_features.tempo" },
      tracks: {
        $push: {
          track_name: "$track_name",
          artists: "$artists",
          popularity: "$popularity",
          tempo: "$audio_features.tempo"
        }
      }
    }
  },
  {
    $addFields: {
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: [2, "$stddev_tempo"] }]
      }
    }
  },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 2] },
      outlier_threshold: { $round: ["$outlier_threshold", 2] },
      outlier_tracks: {
        $slice: [
          {
            $filter: {
              input: "$tracks",
              as: "track",
              cond: {
                $gt: ["$$track.tempo", "$outlier_threshold"]
              }
            }
          },
          5
        ]
      }
    }
  },
  {
    $match: {
      "outlier_tracks.0": { $exists: true }
    }
  },
  { $sort: { avg_tempo: -1 } },
  { $limit: 10 }
]).toArray();

printjson(outlierTracks);


// Завдання 4. Треки для фонової роботи
print("\n=== Task 2.4: Background work tracks ===");

const backgroundTracks = db.tracks.find(
  {
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    explicit: false
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    track_genre: 1,
    popularity: 1,
    "audio_features.loudness": 1,
    "audio_features.speechiness": 1,
    "audio_features.instrumentalness": 1
  }
).limit(20).toArray();

printjson(backgroundTracks);