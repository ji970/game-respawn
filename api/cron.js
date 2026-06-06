const webpush = require('web-push');

webpush.setVapidDetails(
  'https://ji970.github.io/game-respawn/',
  'BEpLgLTBfLpVlTIWRkVQAVEO2XslKwqpo3UKOCUI99m9bTKnFzmCwkJ5bwPlzbvd1KsDkP8HzGzMts5BtnptHPw',
  'EX11Sl4dbvV4nQRG1hD28tp0RkLAWTPy2jczd_cFCHI'
);

const SUPABASE_URL = 'https://gwjqhrqmfamjrdhllrqk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l';

module.exports = async (req, res) => {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/push_queue?sent=eq.false&limit=50', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    let pushes = await r.json();
    if (!Array.isArray(pushes)) { res.status(200).json({ sent: 0 }); return; }

    const now = Date.now();
    pushes = pushes.filter(p => new Date(p.notify_at).getTime() <= now);

    for (const p of pushes) {
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
    res.status(200).json({ sent: pushes.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
