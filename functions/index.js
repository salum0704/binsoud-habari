const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const Parser = require("rss-parser");

admin.initializeApp();

const db = admin.firestore();

const parser = new Parser({
  timeout: 20000,
});

/*
=========================================
 GLOBAL SETTINGS
=========================================
*/

setGlobalOptions({
  region: "us-central1",
  maxInstances: 1,
});


/*
=========================================
 RSS SOURCES
=========================================
*/

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


/*
=========================================
 CLEAN HTML
=========================================
*/

function cleanText(text) {

  if (!text) {
    return "";
  }

  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}


/*
=========================================
 FIND IMAGE
=========================================
*/

function getImage(item) {

  if (
    item.enclosure &&
    item.enclosure.url
  ) {
    return item.enclosure.url;
  }

  if (
    item["media:content"] &&
    item["media:content"].url
  ) {
    return item["media:content"].url;
  }

  if (
    item["media:thumbnail"] &&
    item["media:thumbnail"].url
  ) {
    return item["media:thumbnail"].url;
  }

  return "";
}


/*
=========================================
 CREATE SAFE ID
=========================================
*/

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


/*
=========================================
 IMPORT INTERNATIONAL NEWS
=========================================
*/

async function importInternationalNews() {

  let totalAdded = 0;

  for (const source of SOURCES) {

    try {

      console.log(
        `Inasoma RSS: ${source.name}`
      );

      const feed =
        await parser.parseURL(
          source.url
        );


      /*
      Chukua habari 10 tu
      kutoka kila source
      */

      const items =
        (feed.items || [])
          .slice(0, 10);


      for (const item of items) {

        const title =
          cleanText(
            item.title
          );

        const link =
          item.link ||
          "";

        if (!title || !link) {
          continue;
        }


        /*
        ID ya kipekee
        */

        const articleId =
          createArticleId(
            item,
            source.name
          );


        const articleRef =
          db
            .collection("articles")
            .doc(articleId);


        const existing =
          await articleRef.get();


        /*
        Usirudie habari
        */

        if (existing.exists) {

          continue;

        }


        const description =
          cleanText(
            item.contentSnippet ||
            item.content ||
            item.description ||
            ""
          );


        const image =
          getImage(item);


        let publishedDate =
          null;


        if (item.isoDate) {

          publishedDate =
            new Date(
              item.isoDate
            );

        }

        else if (item.pubDate) {

          publishedDate =
            new Date(
              item.pubDate
            );

        }


        /*
        Hifadhi Firebase
        */

        await articleRef.set({

          title: title,

          intro:
            description.substring(
              0,
              300
            ),

          description:
            description.substring(
              0,
              500
            ),

          content:
            description,

          category:
            source.category,

          subcategory:
            source.subcategory,

          image:
            image,

          imageUrl:
            image,

          author:
            source.name,

          source:
            source.name,

          sourceUrl:
            link,

          originalUrl:
            link,

          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),

          publishedAt:
            publishedDate
              ? admin.firestore.Timestamp.fromDate(
                  publishedDate
                )
              : null,

          date:
            publishedDate
              ? publishedDate.toLocaleDateString(
                  "sw-TZ"
                )
              : "",

          readTime:
            "Dakika 2",

          importedAutomatically:
            true,

        });


        totalAdded++;

        console.log(
          `Imeongezwa: ${title}`
        );

      }

    }

    catch (error) {

      console.error(
        `RSS error: ${source.name}`,
        error
      );

    }

  }


  console.log(
    `Jumla ya habari mpya: ${totalAdded}`
  );


  return totalAdded;
}


/*
=========================================
 RUN AUTOMATICALLY
=========================================

Kila dakika 30
*/

exports.importInternationalNews =
  onSchedule(
    {
      schedule: "every 30 minutes",
      timeZone: "Africa/Dar_es_Salaam",
    },

    async () => {

      await importInternationalNews();

    }
  );