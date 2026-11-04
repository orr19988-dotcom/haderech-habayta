// "הדרך הביתה": pure logic, no DOM. Dates are YYYY-MM-DD strings, all math in UTC,
// so the result never depends on the phone's time zone.
// Browser: window.Engine. Node (tests): module.exports.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY = 864e5;
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DATE_FIELDS = ['lastWorkDay', 'leftIsraelOn', 'last90', 'touristEntry', 'stampUntil', 'moveOut', 'flightHome', 'birthDate'];

  const toUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const fromUTC = t => new Date(t).toISOString().slice(0, 10);

  function isValidISO(s) { return typeof s === 'string' && ISO.test(s) && fromUTC(toUTC(s)) === s; }
  function addDays(iso, n) { return fromUTC(toUTC(iso) + n * DAY); }
  function addMonths(iso, n) { // clamps to the end of the month: 31.8 + 6 months = 28.2
    const [y, m, d] = iso.split('-').map(Number);
    const t = y * 12 + m - 1 + n, ny = Math.floor(t / 12), nm = t - ny * 12;
    return fromUTC(Date.UTC(ny, nm, Math.min(d, new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate())));
  }
  function addYears(iso, n) { return addMonths(iso, 12 * n); }
  function diffDays(a, b) { return Math.round((toUTC(b) - toUTC(a)) / DAY); }

  function fieldWarning(v) {
    if (!v) return null;
    const m = ISO.exec(v);
    if (m && +m[1] > 2400) return `נראה כמו שנה בודהיסטית (\u200f${m[1]} = ${m[1] - 543})`;
    return isValidISO(v) ? null : 'תאריך לא תקין';
  }
  function checkProfile(p) { return DATE_FIELDS.map(k => fieldWarning(p[k])).filter(Boolean); }

  // Which deadline comes from which field: plan, Task 2 table. A field with a warning is ignored.
  function computeDeadlines(p, r) {
    const val = k => (p[k] && !fieldWarning(p[k]) ? p[k] : null);
    const out = [];
    const add = (id, date, guide, title, detail, extra) => out.push(Object.assign({ id, date, title, detail, guide }, extra));

    const last = val('lastWorkDay');
    if (last) {
      add('immigration-last-day', last, 'last-day', 'היום האחרון בעבודה: ההיתר נגמר',
        'היתר העבודה וההארכה שקיבלת בזכות העבודה נגמרים היום, לא בתאריך שבחותמת. תכנן מראש: לצאת מתאילנד, או להגיע בבוקר ללשכת ההגירה עם מכתב מהמעסיק. ימים נוספים לעזיבה הם לשיקול דעת הפקיד, לא זכות.');
      add('final-wages', addDays(last, r.FINAL_WAGES_DAYS), 'job-end', 'השכר האחרון',
        `אם המעסיק הוא שסיים את העבודה, השכר שמגיע לך צריך להגיע תוך ${r.FINAL_WAGES_DAYS} ימים. אם התפטרת, הכלל אחר: ראה המדריך.`);
      add('doe-report', addDays(last, r.DOE_REPORT_DAYS), 'last-day', 'המעסיק מדווח על סיום ההעסקה',
        `המעסיק צריך לדווח למשרד התעסוקה (DOE) שעזבת, תוך ${r.DOE_REPORT_DAYS} יום. בקש ממנו אישור שדיווח.`);
      add('fifty-tawi', addDays(last, r.FIFTY_TAWI_DAYS), 'thai-tax-sso', 'אישור ניכוי המס (50 Tawi)',
        'עד היום הזה המעסיק צריך לתת לך את ה-50 Tawi. בלעדיו לא תוכל להגיש דוח מס ולקבל החזר.');
      add('sso-cover-end', addMonths(last, r.SSO_COVER_MONTHS), 'insurance', 'סוף הכיסוי הרפואי של ה-SSO',
        `הכיסוי הרפואי של ה-SSO נמשך ${r.SSO_COVER_MONTHS} חודשים אחרי סיום העבודה. מהיום הזה צריך ביטוח בריאות אחר.`);
    }

    const last90 = val('last90');
    if (last90) {
      const due = addDays(last90, r.NINETY_DAY_INTERVAL);
      add('report-90-window', addDays(due, -r.NINETY_ONLINE_FROM), 'report-90', 'חלון דיווח 90 יום אונליין',
        'בימים האלה אפשר להגיש את דיווח 90 היום באתר של לשכת ההגירה. אם יצאת מתאילנד לפני כן, הספירה מתחילה מחדש.',
        { end: addDays(due, -r.NINETY_ONLINE_TO) });
      add('report-90-due', due, 'report-90', 'דיווח 90 יום', 'המועד של דיווח 90 היום. איחור עולה בקנס.');
    }

    const route = p.route === 'A' || p.route === 'B' ? p.route : null;
    const stamp = val('stampUntil'), entry = val('touristEntry');
    if (route && (stamp || entry)) {
      const a = route === 'A', ext = a ? r.EXTENSION_DAYS : r.TR_EXTENSION_DAYS;
      const by = stamp || addDays(entry, (a ? r.EXEMPT_DAYS : r.TR_DAYS) - 1); // the entry day is day 1
      const extra = stamp ? {} : { estimate: true };
      add('stay-extend-by', by, 'stay-legal', 'המועד האחרון להגשת הארכה',
        'עד התאריך שבחותמת הכניסה: הגש בקשת הארכה (TM.7) בלשכת ההגירה. האישור לשיקול דעת הפקיד.', extra);
      add('stay-end', addDays(by, ext), 'stay-legal', 'סוף השהייה, אם ההארכה אושרה',
        `ההארכה מוסיפה עד ${ext} יום. אחרי התאריך הזה כל יום נוסף הוא שהייה לא חוקית, עם קנס.`, extra);
    }

    const moveOut = val('moveOut');
    if (moveOut) {
      add('lease-notice', addDays(moveOut, -r.LEASE_NOTICE_DAYS), 'lease', 'הודעת עזיבה בכתב למשכיר',
        `תן למשכיר הודעה בכתב לפחות ${r.LEASE_NOTICE_DAYS} יום לפני היציאה, ושמור עותק. ההודעה חשובה להחזר הפיקדון.`);
    }

    const left = val('leftIsraelOn'), flight = val('flightHome');
    if (left) {
      const earliest = addYears(left, r.CUSTOMS_YEARS);
      add('customs-earliest', earliest, 'il-customs', 'נחיתה בארץ: התאריך המוקדם להטבות המכס',
        `הטבות המכס של תושב חוזר דורשות לפחות ${r.CUSTOMS_YEARS} שנים בחו״ל. נחיתה לפני התאריך הזה עלולה לבטל אותן. ביקורים בארץ בתקופה הזו נספרים, ראה המדריך.`,
        flight && flight < earliest ? { warn: true } : {});
    }
    if (flight) {
      add('landing-check', addDays(flight, 7), 'il-btl-health', 'בדיקת מעמד בביטוח לאומי ובקופת החולים',
        'בשבוע הראשון בארץ: בדוק בביטוח לאומי ובקופת החולים שאתה מבוטח ושאין חוב.');
      add('customs-shipments-by', addMonths(flight, r.CUSTOMS_SHIPMENT_MONTHS), 'il-customs', 'המועד האחרון להגעת המשלוחים',
        `כדי לשמור על פטור המכס, החפצים שלך צריכים להגיע לארץ עד ${r.CUSTOMS_SHIPMENT_MONTHS} חודשים אחרי הנחיתה.`);
      add('pnd91-2026', r.PND91_FROM, 'after-leaving', 'דוח מס תאילנדי (PND 91) לשנת 2026',
        'הזמן להגיש את דוח המס התאילנדי על 2026. דרכו מקבלים החזר, אם מגיע לך.', { end: r.PND91_TO });
      add('il-report-2026', r.IL_REPORT_ONLINE, 'il-tax', 'דוח מס ישראלי לשנת 2026',
        'רק אם יועץ המס קבע שאתה צריך להגיש דוח. זה המועד להגשה מקוונת.');
    }

    const birth = val('birthDate');
    if (birth) {
      add('sso-claim-window', addYears(birth, r.SSO_CLAIM_FROM_AGE), 'after-leaving', 'חלון התביעה של כספי הזקנה ב-SSO',
        `לפי ה-SSO, את כספי הזקנה תובעים מגיל ${r.SSO_CLAIM_FROM_AGE} ועד גיל ${r.SSO_CLAIM_TO_AGE}. יש מקורות שסותרים את זה, ראה המדריך.`,
        { end: addYears(birth, r.SSO_CLAIM_TO_AGE) });
    }

    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  }

  function upcoming(ds, today, n = 3) { return ds.filter(d => (d.end || d.date) >= today).slice(0, n); }

  // RFC 5545. All-day events have no time zone: the date is the same day in Bangkok and in Israel.
  // The alarm rings at 09:00 the day before (-PT15H from midnight), like the iPhone's own all-day alert.
  const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function fold(line) { // at most 75 bytes per line, never inside a UTF-8 character
    let out = '', len = 0;
    for (const ch of line) {
      const c = ch.codePointAt(0), b = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (len + b > 75) { out += '\r\n '; len = 1; }
      out += ch; len += b;
    }
    return out + '\r\n';
  }
  function vevent(uid, date, title, detail, stamp) {
    return ['BEGIN:VEVENT', `UID:${uid}@haderech-habayta`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(date, 1).replace(/-/g, '')}`,
      `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(detail)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(title)}`, 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT'];
  }
  function toICS(ds, stamp) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//haderech-habayta//he', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const d of ds) {
      if (d.end) { // a window: one event when it opens, one on its last day, instead of a months-long bar
        lines.push(...vevent(d.id + '-open', d.date, 'נפתח היום: ' + d.title, d.detail, stamp));
        lines.push(...vevent(d.id + '-close', d.end, 'היום האחרון: ' + d.title, d.detail, stamp));
      } else lines.push(...vevent(d.id, d.date, d.title, d.detail, stamp));
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('');
  }

  function waUrl(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }

  // Latin and number runs (TM.7, 1,900, +66 2 204 9200, 1–3) go inside <bdi> so they keep
  // their order inside Hebrew. Everything else is escaped.
  const RUN = /([A-Za-z0-9+][A-Za-z0-9+.,:/%\u2013 -]*[A-Za-z0-9%])/;
  const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function inline(text) {
    return String(text).split(RUN)
      .map((part, i) => (i % 2 ? `<bdi dir="ltr">${part}</bdi>` : part.replace(/[&<>"']/g, c => ENT[c]))).join('');
  }

  return { addDays, addMonths, addYears, diffDays, isValidISO, checkProfile, computeDeadlines, upcoming, toICS, waUrl, inline };
});
