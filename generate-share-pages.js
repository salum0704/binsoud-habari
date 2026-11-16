const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const SITE_URL = (process.env.SITE_URL || "https://salum0704.github.io/binsoud-habari").replace(/\/+$/, "");
const serviceAccountText = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountText) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT haijawekwa kwenye GitHub Secrets.");
}

const serviceAccount = JSON.parse(serviceAccountText);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id || "binsoud-habari-8a5fa",
});

const db = admin.firestore();
const shareRoot = path.join(__dirname, "..", "share");
const fallbackImage = `${SITE_URL}/images/binsoud-habari-logo.png.png`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainText(value) {
  if (value && typeof value === "object") {
    value = value.text || value.value || value.url || "";
  }
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstValue(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }
  return "";
}

function safeHttpUrl(value) {
  const text = plainText(value);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function isPublished(article) {
  if (article.isPublished === false || article.published === false) return false;
  if (article.status !== undefined && article.status !== null) {
    const status = plainText(article.status).toLowerCase();
    const accepted = ["published", "publish", "active", "live", "true"];
    if (status && !accepted.includes(status)) return false;
  }
  return true;
}

function makePage(id, collectionName, article) {
  const title = plainText(firstValue(article, ["title", "headline", "name"])) || "BINSOUD HABARI";
  const description = (
    plainText(firstValue(article, ["intro", "description", "summary", "excerpt", "content"])) ||
    "Soma habari kamili kutoka BINSOUD HABARI."
  ).slice(0, 300);
  const image = safeHttpUrl(firstValue(article, [
    "image", "imageUrl", "imageURL", "image_url", "photo", "photoUrl",
    "photoURL", "thumbnail", "thumbnailUrl", "thumbnailURL", "picture",
    "cover", "coverImage", "coverUrl", "featuredImage", "featured_image",
    "urlImage", "img", "imageLink"
  ])) || fallbackImage;

  const encodedId = encodeURIComponent(id);
  const pageUrl = `${SITE_URL}/share/${encodedId}/`;
  const articleUrl = `${SITE_URL}/habari.html?${collectionName === "videos" ? "video" : "id"}=${encodedId}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safePageUrl = escapeHtml(pageUrl);
  const safeArticleUrl = escapeHtml(articleUrl);
  const kind = collectionName === "videos" ? "video.other" : "article";

  return `<!DOCTYPE html>
<html lang="sw-TZ">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} | BINSOUD HABARI</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${safePageUrl}">
  <meta property="og:type" content="${kind}">
  <meta property="og:site_name" content="BINSOUD HABARI">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safePageUrl}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  <meta name="theme-color" content="#0757a6">
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:#172b3a;font-family:Arial,Helvetica,sans-serif}
    main{max-width:760px;margin:32px auto;padding:0 16px}
    article{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(0,40,70,.08)}
    img{display:block;width:100%;max-height:420px;object-fit:cover;background:#e8eef5}
    section{padding:22px}h1{font-size:clamp(23px,5vw,34px);line-height:1.25;margin:0 0 12px}
    p{font-size:17px;line-height:1.65;color:#526273;margin:0 0 20px}
    a{display:inline-block;background:#0878c9;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700}
    footer{text-align:center;color:#71808c;font-size:13px;padding:20px}
  </style>
</head>
<body>
  <main>
    <article>
      <img src="${safeImage}" alt="${safeTitle}">
      <section>
        <h1>${safeTitle}</h1>
        <p>${safeDescription}</p>
        <a href="${safeArticleUrl}">Soma habari kamili</a>
      </section>
    </article>
    <footer>BINSOUD HABARI</footer>
  </main>
  <script>
    // Mgeni wa kawaida apelekwe kwenye ukurasa kamili wa habari.
    // WhatsApp/Facebook husoma Open Graph tags zilizo juu kabla ya JavaScript.
    window.location.replace(${JSON.stringify(articleUrl)});
  </script>
</body>
</html>`;
}

async function main() {
  await fs.promises.rm(shareRoot, { recursive: true, force: true });
  await fs.promises.mkdir(shareRoot, { recursive: true });

  let total = 0;
  for (const collectionName of ["articles", "videos"]) {
    const snapshot = await db.collection(collectionName).get();

    for (const doc of snapshot.docs) {
      const article = doc.data();
      if (!isPublished(article)) continue;

      const folder = path.join(shareRoot, encodeURIComponent(doc.id));
      await fs.promises.mkdir(folder, { recursive: true });
      await fs.promises.writeFile(
        path.join(folder, "index.html"),
        makePage(doc.id, collectionName, article),
        "utf8"
      );
      total++;
    }
  }

  console.log(`Kurasa za kushiriki zimetengenezwa: ${total}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Imeshindikana kutengeneza kurasa za kushiriki:", error);
    process.exit(1);
  });
