var fs = require('fs');
var http = require('http');
var LOG = 'd:/001/_daemon.log';

function log(msg) {
  var line = new Date().toISOString() + ' ' + msg;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch(e) {}
}

log('=== daemon starting ===');

// Prevent crashes from killing the daemon
process.on('uncaughtException', function(e) {
  log('UNCAUGHT: ' + (e && e.message));
});
process.on('unhandledRejection', function(e) {
  log('REJECTION: ' + (e && e.message));
});

// Heartbeat: write timestamp every 5 minutes to prove daemon is alive
setInterval(function() {
  log('HEARTBEAT');
}, 300000);

// Single-instance lock via a local server
var LOCK_PORT = 19999;
var server = http.createServer(function(req, res) { res.end('ok'); });
server.on('error', function(e) {
  // Kill the old daemon holding the port, then retry
  log('Port in use, killing old daemon...');
  var cp = require('child_process');
  cp.exec('netstat -ano | findstr :' + LOCK_PORT + ' | findstr LISTENING', function(err, out) {
    var m = out.match(/(\d+)\s*$/m);
    if (m) { cp.exec('taskkill /F /PID ' + m[1]); }
  });
  setTimeout(function() { server.listen(LOCK_PORT); }, 1000);
});
server.listen(LOCK_PORT, function() {
  log('push daemon started (single instance)');
});

// Retry helper: retry fetch up to 3 times on network error
async function fetchRetry(url, opts, retries) {
  retries = retries || 3;
  for (var i = 0; i < retries; i++) {
    try { return await fetch(url, opts); } catch(e) {
      if (i === retries - 1) throw e;
      log('fetch retry ' + (i+1) + ': ' + (e.message||''));
    }
  }
}

// Main push loop
var cycleRunning = false;
setInterval(async function() {
  if (cycleRunning) { log('SKIP: previous cycle still running'); return; }
  cycleRunning = true;
  try {
    var w = require('web-push');
    w.setVapidDetails(
      'https://ji970.github.io/game-respawn/',
      'BEpLgLTBfLpVlTIWRkVQAVEO2XslKwqpo3UKOCUI99m9bTKnFzmCwkJ5bwPlzbvd1KsDkP8HzGzMts5BtnptHPw',
      'EX11Sl4dbvV4nQRG1hD28tp0RkLAWTPy2jczd_cFCHI'
    );
    var SUPABASE_URL = 'https://gwjqhrqmfamjrdhllrqk.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l';
    var r = await fetchRetry(
      SUPABASE_URL + '/rest/v1/push_queue?sent=eq.false&order=notify_at.asc&limit=50',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    var p = await r.json();
    if (!Array.isArray(p)) { log('Supabase non-array: ' + typeof p); cycleRunning = false; return; }

    // Cleanup pushes older than 1 hour
    var hourAgo = new Date(Date.now() - 3600000).toISOString();
    for (var i = 0; i < p.length; i++) {
      if (p[i].notify_at < hourAgo) {
        try {
          await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + p[i].id, {
            method: 'PATCH',
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sent: true })
          });
        } catch(e) {}
      }
    }

    var now = Date.now();
    var due = p.filter(function(x) {
      return x.notify_at >= hourAgo && new Date(x.notify_at).getTime() <= now;
    });

    if (due.length > 0) log('cycle: ' + p.length + ' pending, ' + due.length + ' due');

    for (var j = 0; j < due.length; j++) {
      var x = due[j];
      try {
        var result = await w.sendNotification(
          { endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } },
          JSON.stringify({ title: x.title, body: x.body })
        );
        log('OK ' + x.title + ' (' + result.statusCode + ')');
        await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + x.id, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sent: true })
        });
      } catch(e) {
        var msg = e.statusCode || e.message || '';
        log('FAIL ' + x.title + ': ' + msg);
        if (e.statusCode === 410 || e.statusCode === 404 || /p256dh|auth|65.bytes/.test(msg)) {
          await fetch(SUPABASE_URL + '/rest/v1/push_queue?id=eq.' + x.id, {
            method: 'PATCH',
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sent: true })
          }).catch(function(){});
        }
      }
    }
  } catch(e) {
    log('LOOP ERROR: ' + (e && (e.message || e.code || String(e))));
  }
  cycleRunning = false;
}, 30000);
