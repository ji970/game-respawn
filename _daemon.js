// Daemon startup — kill existing daemon first to prevent duplicates
var http = require('http');

// Single-instance lock via a local server
var LOCK_PORT = 19999;
var server = http.createServer(function(req, res) { res.end('ok'); });
server.on('error', function() {
  console.log('Another daemon is already running. Exiting.');
  process.exit(0);
});
server.listen(LOCK_PORT, function() {
  console.log('push daemon started (single instance)');
});

setInterval(async function() {
  try {
    var w = require('web-push');
    w.setVapidDetails(
      'https://ji970.github.io/game-respawn/',
      'BEpLgLTBfLpVlTIWRkVQAVEO2XslKwqpo3UKOCUI99m9bTKnFzmCwkJ5bwPlzbvd1KsDkP8HzGzMts5BtnptHPw',
      'EX11Sl4dbvV4nQRG1hD28tp0RkLAWTPy2jczd_cFCHI'
    );
    var r = await fetch(
      'https://gwjqhrqmfamjrdhllrqk.supabase.co/rest/v1/push_queue?sent=eq.false&order=notify_at.asc&limit=50',
      { headers: { apikey: 'sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l', Authorization: 'Bearer sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l' } }
    );
    var p = await r.json();
    if (!Array.isArray(p)) return;
    var due = p.filter(function(x) { return new Date(x.notify_at) <= Date.now(); });
    for (var i = 0; i < due.length; i++) {
      var x = due[i];
      try {
        await w.sendNotification(
          { endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } },
          JSON.stringify({ title: x.title, body: x.body })
        );
        await fetch('https://gwjqhrqmfamjrdhllrqk.supabase.co/rest/v1/push_queue?id=eq.' + x.id, {
          method: 'PATCH',
          headers: { apikey: 'sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l', Authorization: 'Bearer sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l', 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent: true })
        });
      } catch(e) {}
    }
  } catch(e) {}
}, 30000);
