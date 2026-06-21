const { Client } = require('pg');
const ref = 'cecoijnltjkbnwnqqmks';
const pw = 'Mo0oTASEMMo0oTASEM';

async function tryConnect(user, host, port, label) {
  const client = new Client({
    user,
    password: pw,
    host,
    port,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const r = await client.query('SELECT current_database() as db, version() as ver');
    console.log(label + ': CONNECTED -', JSON.stringify(r.rows[0]));
    await client.end();
    return true;
  } catch (e) {
    console.log(label + ': ' + e.message.split('\n')[0].substring(0, 120));
    return false;
  }
}

(async () => {
  // Pooler with postgres.[ref] format (correct database password now)
  await tryConnect('postgres.' + ref, 'aws-0-us-west-1.pooler.supabase.com', 6543, 'pooler-t');
  await tryConnect('postgres.' + ref, 'aws-0-us-west-1.pooler.supabase.com', 5432, 'pooler-s');
  // Pooler with just postgres
  await tryConnect('postgres', 'aws-0-us-west-1.pooler.supabase.com', 6543, 'pooler-p-t');
  await tryConnect('postgres', 'aws-0-us-west-1.pooler.supabase.com', 5432, 'pooler-p-s');
  // Try with IP addresses directly
  await tryConnect('postgres.' + ref, '54.177.55.191', 6543, 'ip54-t');
  await tryConnect('postgres.' + ref, '52.8.172.168', 6543, 'ip52-t');
  await tryConnect('postgres', '54.177.55.191', 6543, 'ipp-t');
  await tryConnect('postgres', '52.8.172.168', 6543, 'ipp2-t');
})();
