const webpush = require('web-push');

webpush.setVapidDetails(
  'https://ji970.github.io/game-respawn/',
  'BEpLgLTBfLpVlTIWRkVQAVEO2XslKwqpo3UKOCUI99m9bTKnFzmCwkJ5bwPlzbvd1KsDkP8HzGzMts5BtnptHPw',
  'EX11Sl4dbvV4nQRG1hD28tp0RkLAWTPy2jczd_cFCHI'
);

const SUPABASE_URL = 'https://gwjqhrqmfamjrdhllrqk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l';

async function main() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/push_queue?sent=eq.false&limit=50', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    let pushes = await res.json();
    if (!Array.isArray(pushes) || pushes.length === 0) { console.log(new Date().toISOString() + ' - none'); return; }

    const now = Date.now();
    const due = pushes.filter(p => new Date(p.notify_at).getTime() <= now);
    console.log(new Date().toISOString() + ' - pending: ' + pushes.length + ', due: ' + due.length);

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
        console.log('Sent: ' + p.title);
      } catch(e) {
        console.error('Fail: ' + p.title + ' - ' + e.message);
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
    console.error('Error: ' + e.message);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
