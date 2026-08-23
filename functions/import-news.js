const admin = require("firebase-admin");
const Parser = require("rss-parser");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const parser = new Parser({
  timeout: 20000,
});

const SOURCES = [
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "Kimataifa",
    subcategory: "Matukio ya Dunia",
  },

  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    category: "Kimataifa",
    subcategory: "Matukio ya Dunia",
  },

  {
    name: "DW",
    url: "https://rss.dw.com/rdf/rss-en-world",
    category: "Kimataifa",
    subcategory: "Matukio ya Dunia",
  },
];

function cleanText(text) {
  if (!text) return "";

  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getImage(item) {
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  if (item["media:content"] && item["media:content"].url) {
    return item["media:content"].url;
  }

  if (item["media:thumbnail"] && item["media:thumbnail"].url) {
    return item["media:thumbnail"].url;
  }

  return "";
}

function createArticleId(item, source) {
  const value =
    item.guid ||
    item.link ||
    item.title ||
    "";

  return `${source}-${value}`
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 100);
}

async function importInternationalNews() {
  let totalAdded = 0;

  for (const source of SOURCES) {
    try {
      console.log(`Inasoma RSS: ${source.name}`);

      const feed = await parser.parseURL(source.url);

      const items = (feed.items || []).slice(0, 10);

      for (const item of items) {
        const title = cleanText(item.title);
        const link = item.link || "";

        if (!title || !link) {
          continue;
        }

        const articleId = createArticleId(
          item,
          source.name
        );

        const articleRef = db
          .collection("articles")
          .doc(articleId);

        const existing = await articleRef.get();

        if (existing.exists) {
          continue;
        }

        const description = cleanText(
          item.contentSnippet ||
          item.content ||
          item.description ||
          ""
        );

        const image = getImage(item);

        let publishedDate = null;

        if (item.isoDate) {
          publishedDate = new Date(item.isoDate);
        } else if (item.pubDate) {
          publishedDate = new Date(item.pubDate);
        }

        await articleRef.set({
          title,

          intro: description.substring(0, 300),

          description: description.substring(0, 500),

          content: description,

          category: source.category,

          subcategory: source.subcategory,

          image,

          imageUrl: image,

          author: source.name,

          source: source.name,

          sourceUrl: link,

          originalUrl: link,

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),

          publishedAt:
            publishedDate &&
            !Number.isNaN(publishedDate.getTime())
              ? admin.firestore.Timestamp.fromDate(
                  publishedDate
                )
              : null,

          date:
            publishedDate &&
            !Number.isNaN(publishedDate.getTime())
              ? publishedDate.toLocaleDateString("sw-TZ")
              : "",

          readTime: "Dakika 2",

          importedAutomatically: true,
        });

        totalAdded++;

        console.log(`Imeongezwa: ${title}`);
      }
    } catch (error) {
      console.error(
        `RSS error: ${source.name}`,
        error.message
      );
    }
  }

  console.log(
    `Jumla ya habari mpya: ${totalAdded}`
  );
}

importInternationalNews()
  .then(() => {
    console.log("Import imekamilika.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import error:", error);
    process.exit(1);
  });