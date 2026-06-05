// Deploy to Deno Deploy (dash.deno.com) - free, no credit card
// Uses setInterval to check every 60 seconds

import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = "BEpLgLTBfLpVlTIWRkVQAVEO2XslKwqpo3UKOCUI99m9bTKnFzmCwkJ5bwPlzbvd1KsDkP8HzGzMts5BtnptHPw";
const VAPID_PRIVATE = "EX11Sl4dbvV4nQRG1hD28tp0RkLAWTPy2jczd_cFCHI";
const SUPABASE_URL = "https://gwjqhrqmfamjrdhllrqk.supabase.co";
const SUPABASE_KEY = "sb_publishable_9yotjhKymQTb-QfAEG0qbw_c4-btV6l";

webpush.setVapidDetails("https://ji970.github.io/game-respawn/", VAPID_PUBLIC, VAPID_PRIVATE);

async function checkAndSend() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_queue?sent=eq.false&limit=50`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return;

    const now = Date.now();
    const due = data.filter((p: any) => new Date(p.notify_at).getTime() <= now);

    for (const p of due) {
      try {
        await webpush.sendNotification(
          { endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } },
          JSON.stringify({ title: p.title, body: p.body })
        );
        await fetch(`${SUPABASE_URL}/rest/v1/push_queue?id=eq.${p.id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sent: true }),
        });
        console.log("Sent:", p.title);
      } catch (e: any) {
        console.error("Fail:", e.message);
        if (e.statusCode === 410 || e.statusCode === 404) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_queue?id=eq.${p.id}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sent: true }),
          });
        }
      }
    }
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

// Run check on every HTTP request (for external cron pings)
Deno.serve(async () => {
  await checkAndSend();
  return new Response("Sent");
});
