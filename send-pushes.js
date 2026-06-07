const webpush = require('web-push');
const https = require('https');

webpush.setVapidDetails(
  'https://ji970.github.io/game-respawn/',
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function fetch(url, opts) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ json: () => JSON.parse(data), status: res.statusCode }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function main() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/push_queue?sent=eq.false&limit=50', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    const pushes = await res.json();
    if (!Array.isArray(pushes) || pushes.length === 0) return;

    const now = Date.now();
    const due = pushes.filter(p => new Date(p.notify_at).getTime() <= now);

    for (const p of due) {
      try {
        await webpush.sendNotification(
          { endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } },
          JSON.stringify({ title: p.title, body: p.body })
        );
        await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + p.id, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent: true })
        });
      } catch(e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + p.id, {
            method: 'PATCH',
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sent: true })
          });
        }
      }
    }
  } catch(e) {
    console.error(e.message);
  }
}

main();
