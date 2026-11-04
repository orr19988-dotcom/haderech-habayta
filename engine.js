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
  const DATE_FIELDS = ['lastWorkDay', 'leftIsraelOn', 'next90', 'touristEntry', 'stampUntil', 'moveOut', 'flightHome', 'birthDate'];

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

  const RANK = { varies: 1, discretion: 2, unverified: 3 };

  // Which deadline comes from which field: plan, Task 2 table. A field with a warning is ignored.
  // Each deadline names the rules it rests on and carries the strongest tag among their sources.
  function computeDeadlines(p, r) {
    const val = k => (p[k] && !fieldWarning(p[k]) ? p[k] : null);
    const src = r.sources || {};
    const out = [];
    const add = (id, date, guide, keys, title, detail, extra) => {
      const tag = keys.map(k => src[k] && src[k].tag).filter(t => RANK[t]).sort((a, b) => RANK[b] - RANK[a])[0];
      out.push(Object.assign({ id, date, title, detail, guide }, tag ? { tag } : {}, extra));
    };

    const last = val('lastWorkDay');
    if (last) {
      add('immigration-last-day', last, 'last-day', [], 'היום האחרון בעבודה: ההיתר לשהות נגמר',
        'ההיתר לשהות שקיבלת בזכות העבודה נגמר היום, גם אם בחותמת ההארכה כתוב תאריך מאוחר יותר. הגע בבוקר, בעצמך ועם הדרכון, למשרד ההגירה שבו קיבלת את ההארכה, עם המכתב והמסמכים מהמעסיק. תכנן לצאת מתאילנד באותו ערב: ימים נוספים לעזיבה אינם זכות, והם בידי הפקיד.');
      add('final-wages', addDays(last, r.FINAL_WAGES_DAYS), 'job-end', ['FINAL_WAGES_DAYS'], 'השכר האחרון, אם המעסיק סיים את העבודה',
        `כשהמעסיק מסיים את העבודה, הוא חייב לשלם את השכר האחרון תוך ${r.FINAL_WAGES_DAYS} ימים. בחוזה קצוב שלא חודש לא ברור אם הכלל חל: סכם בכתב מתי יגיע כל תשלום. אם התפטרת, השכר מגיע ביום התשלום הרגיל, אז אל תסגור את חשבון הבנק לפני שהוא נכנס.`);
      add('doe-report', addDays(last, r.DOE_REPORT_DAYS), 'last-day', ['DOE_REPORT_DAYS'], 'המעסיק מדווח על סיום ההעסקה',
        `המעסיק חייב לדווח ל-Department of Employment, שמטפל בהיתרי העבודה, שעזבת ומה הסיבה, תוך ${r.DOE_REPORT_DAYS} יום מיום העזיבה. אחרי המועד, בקש מה-HR אישור בכתב שהדיווח הוגש. ההיתר שלך לשהות לא מחכה לדיווח הזה: הוא נגמר כבר ביום העבודה האחרון.`);
      add('fifty-tawi', addMonths(last, r.FIFTY_TAWI_MONTHS), 'thai-tax-sso', ['FIFTY_TAWI_MONTHS'], 'אישור ניכוי המס (50 Tawi)',
        'המעסיק חייב לתת לך את ה-50 Tawi, האישור על המס שנוכה מהמשכורת, תוך חודש מיום העזיבה, ואם לא הגיע, דרוש אותו מה-HR. לפיו ממלאים את דוח המס התאילנדי, ותצטרך אותו גם בישראל.');
      add('sso-cover-end', addMonths(last, r.SSO_COVER_MONTHS), 'insurance', ['SSO_COVER_MONTHS'], 'סוף הכיסוי הרפואי של ה-SSO',
        `אם הפרשת מספיק חודשים, ה-SSO ממשיך לכסות אותך ${r.SSO_COVER_MONTHS} חודשים אחרי סיום העבודה, אבל בחינם רק בבית החולים שרשום אצלך. מחוץ לתאילנד הנח שאין לך כיסוי: ביטוח אחר צריך להתחיל לכל המאוחר ביום שתצא מתאילנד.`);
    }

    // The next report counts from the previous due date, not from the day it was filed, so the date printed
    // on the last receipt is the due date itself.
    const due = val('next90');
    if (due) {
      add('report-90-window', addDays(due, -r.NINETY_ONLINE_FROM), 'report-90', ['NINETY_ONLINE_FROM', 'NINETY_ONLINE_TO'],
        'חלון דיווח 90 יום באינטרנט',
        'בימים האלה מגישים את דיווח 90 היום באינטרנט, רק באתר הרשמי tm47.immigration.go.th, ועדיף כבר ביום הראשון. אחרי החלפת דרכון, את הדיווח הראשון עושים במשרד. אם תצא מתאילנד לפני המועד, אין צורך לדווח: הספירה מתחילה מחדש.',
        { end: addDays(due, -r.NINETY_ONLINE_TO) });
      add('report-90-due', due, 'report-90', [], 'דיווח 90 יום',
        `זה מועד דיווח 90 היום: באינטרנט החלון נסגר ${r.NINETY_ONLINE_TO} ימים לפניו, ובמשרד ההגירה אפשר עד 7 ימים אחריו. אחר כך יש קנס של 2,000 באט, ומדווחים רק בעצמך במשרד. החובה נמשכת גם אחרי סוף העבודה, עד שתצא מתאילנד.`);
    }

    const route = p.route === 'A' || p.route === 'B' ? p.route : null;
    const stamp = val('stampUntil'), entry = val('touristEntry');
    if (stamp || (route && entry)) { // the stamp date stands alone; only the extension length needs the route
      const a = route === 'A';
      const stayKeys = stamp ? [] : [a ? 'EXEMPT_DAYS' : 'TR_DAYS'];
      const by = stamp || addDays(entry, (a ? r.EXEMPT_DAYS : r.TR_DAYS) - 1); // the entry day is day 1
      const extra = stamp ? {} : { estimate: true };
      add('stay-extend-by', by, 'stay-legal', stayKeys, 'בקשת הארכה: לפני התאריך שבחותמת',
        'התאריך הזה הוא היום האחרון שמותר לך לשהות לפי חותמת הכניסה כתייר. הגש בעצמך בקשת הארכה (TM.7) במשרד ההגירה כמה ימי עבודה לפניו: ההארכה נספרת מסוף התקופה, אז הגשה מוקדמת לא מקצרת את השהייה. האישור לשיקול דעת הפקיד.', extra);
      if (route) {
        const ext = a ? r.EXTENSION_DAYS : r.TR_EXTENSION_DAYS;
        add('stay-end', addDays(by, ext), 'stay-legal', [...stayKeys, a ? 'EXTENSION_DAYS' : 'TR_EXTENSION_DAYS'], 'סוף השהייה, אם ההארכה אושרה',
          `ההארכה מוסיפה עד ${ext} יום, אז זה התאריך המאוחר ביותר. אם תקבל אותה, בדוק בדרכון את התאריך שנרשם וצא מתאילנד עד אליו: כל יום נוסף הוא שהייה לא חוקית, עם קנס על כל יום.`, extra);
      }
    }

    const moveOut = val('moveOut');
    if (moveOut) {
      add('lease-notice', addDays(moveOut, -r.LEASE_NOTICE_DAYS), 'lease', ['LEASE_NOTICE_DAYS'], 'הודעת עזיבה בכתב למשכיר',
        `אם המשכיר עסקי (3 יחידות ומעלה), החוזה נחתם מ-4.9.2025, גרת לפחות חצי מתקופתו ואין לך חוב, מותר לצאת מוקדם בהודעה בכתב לפחות ${r.LEASE_NOTICE_DAYS} יום מראש. בחוזה ישן יותר חל כלל דומה רק אצל משכיר עם 5 יחידות ומעלה, ואצל משכיר פרטי החוזה קובע. שמור הוכחה שההודעה התקבלה.`);
    }

    const left = val('leftIsraelOn'), flight = val('flightHome');
    if (left) {
      // Customs counts each year abroad from the day after departure, so the first safe landing day is one day later.
      const earliest = addDays(addYears(left, r.CUSTOMS_YEARS), 1);
      add('customs-earliest', earliest, 'il-customs', ['CUSTOMS_YEARS'], 'נחיתה בארץ: התאריך המוקדם להטבות המכס',
        `הטבות המכס לתושב חוזר דורשות ${r.CUSTOMS_YEARS} שנים מלאות בחו״ל, שנספרות ממחרת היציאה. נחיתה לפני התאריך הזה מבטלת אותן, ולכן כדאי להשאיר כמה ימי מרווח. ביקורים בארץ מותרים עד 4 חודשים בכל שנה, ראה המדריך.`,
        flight && flight < earliest ? { warn: true } : {});
    }
    if (flight) {
      add('landing-check', addDays(flight, 7), 'il-btl-health', [], 'בדיקת מעמד בביטוח לאומי ובקופת החולים',
        'בשבוע הראשון בארץ, או כבר מחו״ל: בדוק בביטוח לאומי שאתה רשום כתושב ושאין חוב, והורד מהאתר האישי ׳אישור פירוט חשבון׳ ו׳אישור חברות יחיד׳. ודא מול הקופה שאתה זכאי לשירותים, ובדוק גם את הביטוח המשלים.');
      // The nine months start on the landing day, so the last day inside them is one day before the date nine months on.
      add('customs-shipments-by', addDays(addMonths(flight, r.CUSTOMS_SHIPMENT_MONTHS), -1), 'il-customs', ['CUSTOMS_SHIPMENT_MONTHS'], 'המועד האחרון להגעת המשלוחים',
        `אם אתה זכאי כתושב חוזר, חפצי הבית צריכים להגיע לארץ בשני משלוחים לכל היותר, בתוך ${r.CUSTOMS_SHIPMENT_MONTHS} החודשים שמתחילים ביום הנחיתה, ואת התקופה אי אפשר להאריך. משלוח שיגיע לפני הנחיתה? לא ברור מה דינו, אז בקש קודם תשובה בכתב ממוקד המידע ביבוא אישי.`);
      add('pnd91-2026', r.PND91_FROM, 'after-leaving', ['PND91_FROM', 'PND91_TO'], 'דוח מס תאילנדי (PND 91) לשנת 2026',
        'חובה להגיש אם קיבלת ב-2026 משכורת של יותר מ-120,000 באט (נשוי: יותר מ-220,000 יחד עם בן הזוג), גם אם כבר עזבת. גם בלי חובה, דרך הדוח מבקשים החזר על מס שנוכה ממך ביתר. מגישים ברשת גם מישראל, עם קוד SMS לנייד שרשום ב-RD.', { end: r.PND91_TO });
      add('il-report-2026', r.IL_REPORT_ONLINE, 'il-tax', ['IL_REPORT_ONLINE'], 'דוח מס ישראלי לשנת 2026',
        'אם היית תושב ישראל ב-2026, משכורת ממעסיק תאילנדי מחייבת אותך בדרך כלל בדוח, ואת התושבות בודקים עם יועץ המס. זה המועד החוקי להגשה מקוונת, אלא אם תינתן ארכה. אין לך תיק במס הכנסה? פתח אותו לפני כן.');
    }

    const birth = val('birthDate');
    if (birth) {
      add('sso-claim-window', addYears(birth, r.SSO_CLAIM_FROM_AGE), 'after-leaving', ['SSO_CLAIM_FROM_AGE', 'SSO_CLAIM_TO_AGE'], 'חלון התביעה של כספי הזקנה ב-SSO',
        `מקורות רשמיים סותרים: ה-SSO נותן את כספי הזקנה רק מגיל ${r.SSO_CLAIM_FROM_AGE}, מול סעיף 77 bis לחוק, שנותן אותם לזר שעוזב לפי תקנה. התקנה דורשת הסכם ביטוח סוציאלי עם תאילנד, ולישראל אין, אז כנראה תתבע מגיל ${r.SSO_CLAIM_FROM_AGE}, אם הביטוח הסתיים, ותוך שנתיים. שאל את ה-SSO בכתב.`,
        { end: addYears(birth, r.SSO_CLAIM_TO_AGE) });
    }

    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  }

  // A window that is already open ranks by its closing day: what matters now is when it shuts.
  const rankDate = (d, today) => (d.end && d.date < today ? d.end : d.date);
  function upcoming(ds, today, n = 3) {
    return ds.filter(d => (d.end || d.date) >= today).sort((a, b) => {
      const x = rankDate(a, today), y = rankDate(b, today);
      return x < y ? -1 : x > y ? 1 : a.id < b.id ? -1 : 1;
    }).slice(0, n);
  }

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
  // their order inside Hebrew. One separator between two tokens, so "90. 3" (a sentence break) is two runs.
  // Everything else is escaped.
  const RUN = /([A-Za-z0-9+][A-Za-z0-9%]*(?:[.,:/+\u2013 -][A-Za-z0-9+][A-Za-z0-9%]*)*)/;
  const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function inline(text) {
    return String(text).split(RUN)
      .map((part, i) => (i % 2 && part.length > 1 ? `<bdi dir="ltr">${part}</bdi>` : part.replace(/[&<>"']/g, c => ENT[c]))).join('');
  }

  return { addDays, addMonths, addYears, diffDays, isValidISO, checkProfile, computeDeadlines, upcoming, toICS, waUrl, inline };
});
