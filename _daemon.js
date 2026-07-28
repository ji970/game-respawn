// Daemon startup — kill existing daemon first to prevent duplicates
var http = require('http');

// Prevent crashes from killing the daemon
process.on('uncaughtException', function(e) { console.error('Uncaught:', e.message); });
process.on('unhandledRejection', function(e) { console.error('Rejection:', e && e.message); });

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
      'BAmk_9L3ZXnD5yyGEx1QlCobC_clU4e2VX9HatJ3NNC_7gWDzuXjyF4wMsn9DxI8_3nLrLF9n9vYQdMc9Wc5zs4',
      'jJsNL_LQG4FCMS7eBW0vRceqB8CeJMSePSWLfZiV7Eg'
    );
    var SUPABASE_URL = 'https://gwjqhrqmfamjrdhllrqk.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l';
    var r = await fetch(
      SUPABASE_URL + '/rest/v1/push_queue?sent=eq.false&order=notify_at.asc&limit=50',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    var p = await r.json();
    if (!Array.isArray(p)) { console.error('Supabase returned non-array:', typeof p); return; }

    // Cleanup pushes older than 1 hour as expired
    var hourAgo = new Date(Date.now() - 3600000).toISOString();
    for (var i = 0; i < p.length; i++) {
      if (p[i].notify_at < hourAgo) {
        await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + p[i].id, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent: true })
        });
      }
    }

    var due = p.filter(function(x) {
      return !x.notify_at || x.notify_at >= hourAgo && new Date(x.notify_at).getTime() <= Date.now();
    });
    console.log(new Date().toISOString() + ' pending=' + p.length + ' due=' + due.length);

    for (var j = 0; j < due.length; j++) {
      var x = due[j];
      try {
        var result = await w.sendNotification(
          { endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } },
          JSON.stringify({ title: x.title, body: x.body })
        );
        console.log(new Date().toISOString() + ' OK ' + x.title + ' (' + result.statusCode + ')');
        await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + x.id, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent: true })
        });
      } catch(e) {
        console.error(new Date().toISOString() + ' FAIL ' + x.title + ': ' + (e.statusCode || e.message));
      }
    }
  } catch(e) {
    console.error(new Date().toISOString() + ' LOOP ERROR: ' + (e && e.message));
  }
}, 30000);
