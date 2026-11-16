# BINSOUD HABARI — Open Graph preview za WhatsApp na Facebook

Mabadiliko haya yanaongeza kurasa tuli za `share/ID/` zenye Open Graph metadata. WhatsApp/Facebook zinaweza kusoma kichwa, maelezo na picha moja kwa moja kwenye HTML, bila kutegemea JavaScript ya Firebase.

## Jinsi inavyofanya kazi

- GitHub Actions huendesha `functions/generate-share-pages.js` kila baada ya dakika 10.
- Script husoma habari zilizochapishwa kutoka Firestore collections `articles` na `videos`.
- Hutengeneza ukurasa wa `share/ID/index.html` kwa kila habari/video iliyochapishwa.
- Ukurasa huo una `og:title`, `og:description`, `og:image` na `og:url` zinazotolewa moja kwa moja kwenye HTML.
- Mtu akifungua link hiyo kwenye browser, ukurasa humpeleka kwenye `habari.html` ili aone habari yako ya kawaida.
- Vitufe vya Nakili Link, WhatsApp na Facebook kwenye `habari.html` sasa vinatumia link ya `share/ID/`.

## Kabla ya kuwasha

1. Hakikisha GitHub Pages ya repository hii imewekwa kuchapisha kutoka branch inayotumika (kwa kawaida `main`) na folder la root `/`.
2. Fungua GitHub repository → **Settings → Secrets and variables → Actions**.
3. Hakikisha Repository Secret inayoitwa `FIREBASE_SERVICE_ACCOUNT` ipo. Secret hiyo inapaswa kuwa JSON nzima ya Firebase service account yenye ruhusa ya kusoma Firestore ya project `binsoud-habari-8a5fa`.
   - Workflow ya `international-news.yml` iliyokuwepo tayari pia hutumia secret hii. Ikiwa workflow hiyo yako inafanya kazi, huenda secret tayari ipo.
   - Usiweke JSON ya service account ndani ya faili za HTML, JavaScript, au repository.
4. Kwenye GitHub → **Settings → Actions → General → Workflow permissions**, ruhusu workflows kusoma na kuandika repository contents ikiwa setting ya repository inazuia write access.

## Kuwasha na kupima

1. Pakia/commit mabadiliko haya kwenye branch ileile ambayo GitHub Pages hutumia.
2. Nenda kwenye tab ya **Actions**.
3. Chagua workflow **Generate Social Share Pages**.
4. Bonyeza **Run workflow** ili kuanzisha uzalishaji wa kwanza bila kusubiri ratiba.
5. Ikikamilika, angalia kama commit mpya ya `chore: refresh social share preview pages` imeongezwa na kama folder `share/` limeonekana.
6. Jaribu link ya mfano: `https://salum0704.github.io/binsoud-habari/share/ID/` ukibadilisha `ID` na Firestore document ID halisi.

Workflow hujirudia kila dakika 10. Habari mpya inaweza kuchukua hadi takribani dakika 10 (au zaidi ikiwa GitHub Actions imechelewa) kabla link yake ya `share/ID/` haijatengenezwa.

## Muhimu kuhusu cache ya WhatsApp/Facebook

Mitandao ya kijamii inaweza kuhifadhi preview ya link kwa muda. Baada ya workflow kutengeneza ukurasa, tumia Facebook Sharing Debugger na chagua **Scrape Again** ili kulazimisha Facebook kusoma metadata mpya. WhatsApp pia inaweza kuhitaji muda kabla ya kuonyesha preview iliyosasishwa.

Hakuna Firebase service-account key iliyoongezwa kwenye ZIP hii.
