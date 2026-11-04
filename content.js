// Temporary placeholder for building the screens. tools/build-content.mjs overwrites this file
// with the verified content.
window.CONTENT = {
  meta: { version: '0.0.0-dev', verifiedAt: '2026-11-04' },
  rules: {
    NINETY_DAY_INTERVAL: 90, NINETY_ONLINE_FROM: 15, NINETY_ONLINE_TO: 7,
    EXEMPT_DAYS: 30, EXTENSION_DAYS: 30, TR_DAYS: 60, TR_EXTENSION_DAYS: 30,
    LEASE_NOTICE_DAYS: 30, FINAL_WAGES_DAYS: 3, FIFTY_TAWI_DAYS: 30, DOE_REPORT_DAYS: 15,
    SSO_COVER_MONTHS: 6, CUSTOMS_YEARS: 2, CUSTOMS_SHIPMENT_MONTHS: 9,
    PND91_FROM: '2027-01-01', PND91_TO: '2027-03-31', IL_REPORT_ONLINE: '2027-05-31',
    SSO_CLAIM_FROM_AGE: 55, SSO_CLAIM_TO_AGE: 57,
    sources: { EXEMPT_DAYS: { url: 'https://www.example.org/', checked: '2026-11-04', note: 'טקסט זמני לבדיקת המסכים.' } },
  },
  guides: [{
    id: 'stay-legal', stage: 'vacation', order: 9, title: 'שתי הדרכים להישאר בצורה חוקית',
    summary: 'טקסט זמני לבדיקת המסכים. דרך א: פטור מוויזה ואחריו הארכה (TM.7, ‏1,900 באט). דרך ב: ויזת תייר.',
    sections: [
      { kind: 'rights', items: [{ t: 'פריט זמני עם מקור.', s: 0 }, { t: 'פריט זמני שלא אומת.', tag: 'unverified' }] },
      { kind: 'steps', items: [{ t: 'צעד ראשון: הגש TM.7 בלשכת ההגירה.', s: 0, tag: 'discretion' }, { t: 'צעד שני: חייג +66 2 204 9200.', s: 0, tag: 'varies' }] },
      { kind: 'traps', items: [{ t: 'מלכודת זמנית: ‏1–3 ימים של איחור עולים בקנס.', s: 0 }] },
    ],
    sources: [{ title: 'מקור זמני', url: 'https://www.example.org/', checked: '2026-11-04' }],
  }],
  emergency: {
    numbers: [
      { label: 'משטרה (זמני)', number: '191', s: 0 },
      { label: 'מספר בינלאומי (זמני)', number: '+66 2 204 9200', note: 'הערה זמנית.', tag: 'unverified' },
    ],
    places: [{ id: 'sample', name_he: 'מקום זמני', address_en: 'Sample Rd, Bangkok', phone: '+66 2 204 9200', maps: 'https://www.google.com/maps/search/?api=1&query=Bangkok' }],
    sources: [{ title: 'מקור זמני', url: 'https://www.example.org/', checked: '2026-11-04' }],
  },
  checklist: [
    { id: 'tmp-1', stage: 'before', text: 'משימה זמנית לפני העזיבה', guide: 'stay-legal' },
    { id: 'tmp-2', stage: 'vacation', text: 'משימה זמנית בחופשה', guide: 'stay-legal' },
    { id: 'tmp-3', stage: 'israel', text: 'משימה זמנית בישראל', guide: 'no-such-guide' },
  ],
};
