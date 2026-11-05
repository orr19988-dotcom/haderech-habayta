// Sends the app's notifications from GitHub Actions (free, no server of our own) to one phone.
// Secrets: VAPID_PRIVATE_KEY, PUSH_ENDPOINT, PUSH_P256DH, PUSH_AUTH (set from the owner's computer: tools/push.mjs).
//   node notify.mjs plan   decides what to send: writes .notify.json and the step outputs send=yes and key=...
//   node notify.mjs send   sends .notify.json
// Scheduled runs: the monthly check reminder in the 3 days from each monthly anniversary of meta.verifiedAt
// (GitHub delays and drops scheduled runs); the workflow sends it once per key. Manual runs: the typed message,
// read from the event file so that it never appears in the public log; with no text but an as_of date, a test of
// the monthly path under its own key.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const E = createRequire(import.meta.url)('../../engine.js');
const SUBJECT = 'https://orr19988-dotcom.github.io/haderech-habayta/';
const MONTHLY = { title: 'הבדיקה החודשית', body: 'עבר חודש מאז שהכללים נבדקו. אם עוד לא ביקשת בדיקה, פתח את האפליקציה ושלח בקשה.', url: './#home', urgency: 'normal' };

export function meta() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(new URL('../../content.js', import.meta.url), 'utf8'), sandbox);
  return sandbox.window.CONTENT.meta;
}

// What to send now: { message, key } (key '' = no once-per-month check), or null.
export function plan({ event, today, meta: m, inputs = {} }) {
  const monthly = (day, prefix) => {
    const anniversary = E.lastMonthlyDay(m.verifiedAt, day);
    return anniversary && day <= E.addDays(anniversary, 2) ? { message: MONTHLY, key: `${prefix}monthly-${anniversary}` } : null;
  };
  if (event === 'schedule') return monthly(today, '');
  if (event !== 'workflow_dispatch') return null;
  const body = String(inputs.body || '').trim();
  if (body) return { message: { title: String(inputs.title || '').trim() || 'הדרך הביתה', body, url: './#home', urgency: 'high' }, key: '' };
  return E.isValidISO(inputs.as_of) ? monthly(inputs.as_of, 'test-') : null;
}

async function main(mode) {
  if (mode === 'plan') {
    const event = process.env.EVENT, today = new Date().toISOString().slice(0, 10); // runs at 06:17 and 17:47 UTC
    const inputs = event === 'workflow_dispatch' ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).inputs || {} : {};
    const p = plan({ event, today, meta: meta(), inputs });
    if (p) writeFileSync('.notify.json', JSON.stringify(p.message));
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `send=${p ? 'yes' : 'no'}\nkey=${p ? p.key : ''}\n`);
    return console.log(p ? (p.key ? `Monthly reminder (${p.key}).` : 'A message from the owner.') : `Nothing to send (${event}, ${today}).`);
  }
  if (mode !== 'send') throw new Error('usage: node notify.mjs plan|send');
  const { urgency, ...message } = JSON.parse(readFileSync('.notify.json', 'utf8'));
  const { PUSH_ENDPOINT: endpoint, PUSH_P256DH: p256dh, PUSH_AUTH: auth } = process.env;
  if (!endpoint) return console.log('No phone saved: nothing was sent.');
  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(SUBJECT, meta().pushKey, process.env.VAPID_PRIVATE_KEY);
  try {
    const r = await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify(message), { TTL: 4 * 24 * 3600, urgency });
    console.log(`Sent (${r.statusCode}).`);
  } catch (err) { // log the status and Apple's reason only: the error object also carries the endpoint
    let reason = ''; try { reason = JSON.parse(err.body).reason || ''; } catch (e) { reason = err.statusCode ? '' : err.code || 'network error'; }
    console.log(`Failed: ${err.statusCode || ''} ${reason}`);
    if (err.statusCode === 404 || err.statusCode === 410) console.log('The phone\'s subscription is gone: ask him to turn notifications on again in the app and send the new code.');
    process.exit(1); // a failed run emails the repository owner
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv[2]);
