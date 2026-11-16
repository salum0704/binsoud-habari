const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const SITE_URL =
  "https://salum0704.github.io/binsoud-habari/";

const SHARE_DIR = path.join(
  __dirname,
  "..",
  "share"
);

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanDescription(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 200);
}

// Badilisha anwani fupi ya picha kuwa URL kamili
function getFullImageUrl(image) {
  if (!image || typeof image !== "string") {
    return SITE_URL + "images/habari.jpg";
  }

  const cleanImage = image.trim();

  if (
    cleanImage.startsWith("http://") ||
    cleanImage.startsWith("https://")
  ) {
    return cleanImage;
  }

  if (cleanImage.startsWith("//")) {
    return "https:" + cleanImage;
  }

  return new URL(cleanImage, SITE_URL).href;
}

function isPublished(article) {
  if (
    article.isPublished === false ||
    article.published === false
  ) {
    return false;
  }

  if (article.status) {
    const status = String(article.status).toLowerCase();

    if (
      !["published", "publish", "active", "live", "true"]
        .includes(status)
    ) {
      return false;
    }
  }

  return true;
}

function createSharePage(id, article) {
  const title =
    article.title ||
    article.name ||
    "BINSOUD HABARI";

  const description = cleanDescription(
    article.description ||
    article.intro ||
    article.summary ||
    article.content ||
    "Soma habari kamili kutoka BINSOUD HABARI."
  );

  const image = getFullImageUrl(
    article.image ||
    article.imageUrl ||
    article.imageURL
  );

  const shareUrl =
    SITE_URL + "share/" + encodeURIComponent(id) + "/";

  const articleUrl =
    SITE_URL + "habari.html?id=" + encodeURIComponent(id);

  const safeTitle = escapeHTML(title);
  const safeDescription = escapeHTML(description);
  const safeImage = escapeHTML(image);
  const safeShareUrl = escapeHTML(shareUrl);
  const safeArticleUrl = escapeHTML(articleUrl);

  return `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${safeTitle} | BINSOUD HABARI</title>

  <meta name="description" content="${safeDescription}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="BINSOUD HABARI">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${safeShareUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">

  <link rel="canonical" href="${safeShareUrl}">
</head>

<body>
  <h1>${safeTitle}</h1>
  <p>${safeDescription}</p>

  <p>
    Unaelekezwa kwenye habari...
    <a href="${safeArticleUrl}">
      Bonyeza hapa kusoma habari.
    </a>
  </p>

  <script>
    setTimeout(() => {
      window.location.replace(
        ${JSON.stringify(articleUrl)}
      );
    }, 3000);
  </script>
</body>
</html>`;
}

async function generateSharePages() {
  fs.mkdirSync(SHARE_DIR, {
    recursive: true,
  });

  let total = 0;

  for (const collectionName of ["articles", "videos"]) {
    console.log("Inasoma: " + collectionName);

    const snapshot = await db
      .collection(collectionName)
      .get();

    for (const document of snapshot.docs) {
      const article = document.data();
      const id = document.id;

      if (!isPublished(article)) {
        continue;
      }

      const articleDir = path.join(
        SHARE_DIR,
        id
      );

      fs.mkdirSync(articleDir, {
        recursive: true,
      });

      const html = createSharePage(
        id,
        article
      );

      fs.writeFileSync(
        path.join(articleDir, "index.html"),
        html,
        "utf8"
      );

      total++;

      console.log("Imetengenezwa: " + id);
    }
  }

  console.log(
    "Jumla ya kurasa za kushirikisha: " + total
  );
}

generateSharePages().catch((error) => {
  console.error("Share pages error:", error);
  process.exit(1);
});
