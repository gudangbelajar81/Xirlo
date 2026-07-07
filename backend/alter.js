const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.run("ALTER TABLE app_license ADD COLUMN app_code TEXT DEFAULT 'APP_KASIR'", (err) => {
  if(err) console.log(err.message);
  else console.log('Column added');
});
