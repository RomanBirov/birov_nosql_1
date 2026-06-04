// Запуск: mongosh "mongodb://admin:secretpassword@localhost:27017/?authSource=admin" --file queries/part4_indexes.js

db = db.getSiblingDB("spotify");

print("Connected to database:", db.getName());

const INDEX_TASK_1 = "idx_genre_danceability_popularity";
const INDEX_TASK_2 = "idx_background_work";
const INDEX_COVERED = "idx_genre_popularity_covered";

function dropIndexIfExists(indexName) {
  const indexes = db.tracks.getIndexes();

  if (indexes.some(index => index.name === indexName)) {
    db.tracks.dropIndex(indexName);
    print(`Dropped index: ${indexName}`);
  }
}

function getWinningStage(explainResult) {
  let stage = explainResult.queryPlanner.winningPlan.stage;

  if (!stage && explainResult.queryPlanner.winningPlan.inputStage) {
    stage = explainResult.queryPlanner.winningPlan.inputStage.stage;
  }

  if (!stage && explainResult.queryPlanner.winningPlan.queryPlan) {
    stage = explainResult.queryPlanner.winningPlan.queryPlan.stage;
  }

  return stage;
}

function printExplainStats(title, explainResult) {
  print(`\n--- ${title} ---`);

  print("Winning stage:", getWinningStage(explainResult));
  print("Execution time ms:", explainResult.executionStats.executionTimeMillis);
  print("Total docs examined:", explainResult.executionStats.totalDocsExamined);
  print("Total keys examined:", explainResult.executionStats.totalKeysExamined);

  print("Winning plan:");
  printjson(explainResult.queryPlanner.winningPlan);
}


// Task 4.1. Аналіз запиту та індексація

print("\n=== Task 4.1: Query before and after index ===");

dropIndexIfExists(INDEX_TASK_1);

const task1Query = {
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
};

const task1Sort = {
  popularity: -1
};

print("\nQuery:");
printjson(task1Query);

print("\nSort:");
printjson(task1Sort);

const task1BeforeIndex = db.tracks
  .find(task1Query)
  .sort(task1Sort)
  .explain("executionStats");

printExplainStats("Task 4.1 BEFORE index", task1BeforeIndex);

db.tracks.createIndex(
  {
    track_genre: 1,
    "audio_features.danceability": 1,
    popularity: -1
  },
  {
    name: INDEX_TASK_1
  }
);

print(`\nCreated index: ${INDEX_TASK_1}`);

const task1AfterIndex = db.tracks
  .find(task1Query)
  .sort(task1Sort)
  .explain("executionStats");

printExplainStats("Task 4.1 AFTER index", task1AfterIndex);


// Task 4.2. Індекс для фонової роботи

print("\n=== Task 4.2: Index for background work query ===");

dropIndexIfExists(INDEX_TASK_2);

const task2Query = {
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 },
  explicit: false
};

print("\nQuery:");
printjson(task2Query);

const task2BeforeIndex = db.tracks
  .find(task2Query)
  .explain("executionStats");

printExplainStats("Task 4.2 BEFORE index", task2BeforeIndex);

db.tracks.createIndex(
  {
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1,
    explicit: 1
  },
  {
    name: INDEX_TASK_2
  }
);

print(`\nCreated index: ${INDEX_TASK_2}`);

const task2AfterIndex = db.tracks
  .find(task2Query)
  .explain("executionStats");

printExplainStats("Task 4.2 AFTER index", task2AfterIndex);


// Task 4.3. Covered query

print("\n=== Task 4.3: Covered query ===");

dropIndexIfExists(INDEX_COVERED);

db.tracks.createIndex(
  {
    track_genre: 1,
    popularity: 1,
    track_name: 1
  },
  {
    name: INDEX_COVERED
  }
);

print(`\nCreated index: ${INDEX_COVERED}`);

const task3Query = {
  track_genre: "pop",
  popularity: { $gte: 70 }
};

const task3Projection = {
  _id: 0,
  track_genre: 1,
  popularity: 1,
  track_name: 1
};

print("\nCovered query:");
printjson(task3Query);

print("\nProjection:");
printjson(task3Projection);

const task3Explain = db.tracks
  .find(task3Query, task3Projection)
  .explain("executionStats");

printExplainStats("Task 4.3 COVERED query", task3Explain);

print("\nSample covered query results:");
printjson(
  db.tracks
    .find(task3Query, task3Projection)
    .limit(5)
    .toArray()
);


// Current indexes

print("\n=== Current indexes on tracks collection ===");
printjson(db.tracks.getIndexes());