const webpush = require('web-push');

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://ji970.github.io/game-respawn/';
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC  || 'BEpLgLTBfLpVlTIWRkVQAVEO2XslKwqpo3UKOCUI99m9bTKnFzmCwkJ5bwPlzbvd1KsDkP8HzGzMts5BtnptHPw';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'EX11Sl4dbvV4nQRG1hD28tp0RkLAWTPy2jczd_cFCHI';
const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://gwjqhrqmfamjrdhllrqk.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_KEY  || 'sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

async function main() {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/push_queue?sent=eq.false&order=notify_at.asc&limit=50', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    const pushes = await r.json();
    if (!Array.isArray(pushes)) return;

    // Cleanup: mark pushes older than 1 hour as expired
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const expired = pushes.filter(p => p.notify_at < hourAgo);
    if (expired.length) {
      for (const p of expired) {
        await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + p.id, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent: true })
        });
      }
      console.log('Expired: ' + expired.length);
    }

    const due = pushes.filter(p => new Date(p.notify_at).getTime() <= Date.now());
    console.log(`Checked ${pushes.length} pending, ${due.length} due`);

    for (const p of due) {
      try {
        await webpush.sendNotification(
          { endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } },
          JSON.stringify({ title: p.title, body: p.body })
        );
        console.log('Sent: ' + p.title);
        await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + p.id, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent: true })
        });
      } catch(e) {
        console.error('Push failed: ' + (e.statusCode || e.message));
        // 永久失效才标记，临时错误保留重试
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
    console.error('FATAL: ' + e.message);
    process.exit(1);
  }
}

main();
