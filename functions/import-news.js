const admin = require("firebase-admin");
const Parser = require("rss-parser");
const OpenAI = require("openai");

/*
==================================================
 FIREBASE SERVICE ACCOUNT
==================================================
*/

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();


/*
==================================================
 OPENAI
==================================================
*/

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


/*
==================================================
 RSS PARSER
==================================================
*/

const parser = new Parser({
  timeout: 30000,
});


/*
==================================================
 SETTINGS
==================================================
*/

const MAX_ARTICLES_PER_SOURCE = 5;

const MAX_SOURCE_TEXT = 12000;


/*
==================================================
 RSS SOURCES
==================================================
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
==================================================
 CLEAN TEXT
==================================================
*/

function cleanText(text) {

  if (!text) {
    return "";
  }

  return String(text)

    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )

    .replace(
      /<[^>]*>/g,
      " "
    )

    .replace(
      /&nbsp;/gi,
      " "
    )

    .replace(
      /&amp;/gi,
      "&"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

    .replace(
      /&#039;/gi,
      "'"
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /&lt;/gi,
      "<"
    )

    .replace(
      /&gt;/gi,
      ">"
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/*
==================================================
 IMAGE
==================================================
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
==================================================
 ARTICLE ID
==================================================
*/

function createArticleId(
  item,
  source
) {

  const value =
    item.guid ||
    item.link ||
    item.title ||
    "";

  return `${source}-${value}`

    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )

    .substring(
      0,
      100
    );

}


/*
==================================================
 DATE
==================================================
*/

function getPublishedDate(item) {

  if (item.isoDate) {

    const date =
      new Date(
        item.isoDate
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      return date;

    }

  }


  if (item.pubDate) {

    const date =
      new Date(
        item.pubDate
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      return date;

    }

  }


  return null;

}


/*
==================================================
 AI - TRANSLATE + WRITE NEWS
==================================================
*/

async function translateAndRewriteNews({

  title,
  description,
  content,
  sourceName,

}) {

  const sourceText = cleanText(

    content ||
    description ||
    ""

  ).substring(
    0,
    MAX_SOURCE_TEXT
  );


  if (
    !title ||
    !sourceText
  ) {

    throw new Error(
      "Habari haina taarifa za kutosha."
    );

  }


  console.log(
    `AI inaanza: ${title}`
  );


  const prompt = `

Wewe ni mhariri mtaalamu wa habari
wa Tanzania anayefanya kazi kwa
chombo cha habari kinachoitwa
BINSOUD HABARI.

CHANZO:
${sourceName}

KICHWA CHA AWALI:
${title}

MAELEZO YA CHANZO:
${sourceText}


KAZI:

Andika habari hii kwa Kiswahili
sanifu cha Tanzania.

1. Tafsiri na boresha kichwa cha habari.

2. Tengeneza utangulizi wa sentensi
   2 hadi 3 unaoeleza jambo kuu.

3. Tengeneza habari ndefu yenye
   aya 5 hadi 8.

4. Habari iwe na maelezo ya kutosha
   kuhusu tukio, wahusika, eneo,
   sababu na umuhimu wa tukio,
   lakini tumia taarifa zinazopatikana
   kwenye chanzo pekee.

5. Usibuni taarifa.

6. Usibuni takwimu.

7. Usibuni majina.

8. Usibuni nukuu.

9. Usibuni tarehe.

10. Usibuni matukio ambayo hayapo
    kwenye chanzo.

11. Usiongeze maoni yako binafsi.

12. Usitumie lugha ya matangazo.

13. Usitumie emoji.

14. Usitumie Markdown.

15. Usiseme kuwa wewe ni AI.

16. Usinakili sentensi ndefu za chanzo.

17. Andika upya habari kwa Kiswahili
    kinachoeleweka na wasomaji wa
    Tanzania.

18. Hifadhi maana ya habari ya awali.

19. Kama chanzo kina taarifa chache,
    usijaze mapengo kwa kubuni.

20. Habari iwe ya uandishi wa habari,
    si hadithi ya kubuni.


JIBU KWA JSON PEKEE:

{
  "title": "Kichwa cha habari",
  "intro": "Utangulizi wa habari",
  "content": "Habari ndefu yenye aya 5 hadi 8",
  "summary": "Muhtasari mfupi"
}

`;


  const response =
    await openai.responses.create({

      /*
      Model hii unaweza kubadilisha
      baadaye kama utahitaji.
      */

      model: "gpt-5.4",

      input: [

        {
          role: "system",

          content:
            "Wewe ni mhariri mtaalamu wa habari wa Kiswahili Tanzania. Usibuni taarifa ambazo hazipo kwenye chanzo.",

        },

        {
          role: "user",

          content:
            prompt,

        },

      ],

      max_output_tokens: 3500,

    });


  const raw =
    response.output_text
      .trim();


  console.log(
    "AI response imepokelewa."
  );


  let result;


  try {

    result =
      JSON.parse(
        raw
      );

  }

  catch (error) {

    console.error(
      "AI JSON ERROR:",
      raw
    );

    throw new Error(
      "AI haikurudisha JSON sahihi."
    );

  }


  if (
    !result.title ||
    !result.intro ||
    !result.content
  ) {

    throw new Error(
      "AI haikutoa content kamili."
    );

  }


  return {

    title:
      cleanText(
        result.title
      ),

    intro:
      cleanText(
        result.intro
      ),

    content:
      cleanText(
        result.content
      ),

    summary:
      cleanText(
        result.summary ||
        result.intro
      ),

  };

}


/*
==================================================
 IMPORT ONE ARTICLE
==================================================
*/

async function importArticle(
  item,
  source
) {

  const originalTitle =
    cleanText(
      item.title
    );


  const link =
    item.link ||
    "";


  if (
    !originalTitle ||
    !link
  ) {

    console.log(
      "Article imeachwa: title/link haipo."
    );

    return false;

  }


  /*
  ================================================
  CREATE ID
  ================================================
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


  /*
  ================================================
  CHECK DUPLICATE
  ================================================
  */

  const existing =
    await articleRef.get();


  if (
    existing.exists
  ) {

    console.log(
      `Tayari ipo: ${originalTitle}`
    );

    return false;

  }


  /*
  ================================================
  ORIGINAL DESCRIPTION
  ================================================
  */

  const description =
    cleanText(

      item.contentSnippet ||

      item.content ||

      item.description ||

      ""

    );


  if (!description) {

    console.log(
      `Imeachwa - hakuna maelezo: ${originalTitle}`
    );

    return false;

  }


  /*
  ================================================
  AI TRANSLATION
  ================================================
  */

  const translated =
    await translateAndRewriteNews({

      title:
        originalTitle,

      description:
        description,

      content:
        item.content ||
        item.description ||
        description,

      sourceName:
        source.name,

    });


  /*
  ================================================
  IMAGE
  ================================================
  */

  const image =
    getImage(item);


  /*
  ================================================
  DATE
  ================================================
  */

  const publishedDate =
    getPublishedDate(
      item
    );


  /*
  ================================================
  SAVE TO FIRESTORE
  ================================================
  */

  await articleRef.set({

    /*
    ==============================================
    KISWAHILI CONTENT
    ==============================================
    */

    title:
      translated.title,

    intro:
      translated.intro,

    description:
      translated.summary,

    content:
      translated.content,


    /*
    ==============================================
    CATEGORY
    ==============================================
    */

    category:
      source.category,

    subcategory:
      source.subcategory,


    /*
    ==============================================
    IMAGE
    ==============================================
    */

    image:
      image,

    imageUrl:
      image,


    /*
    ==============================================
    SOURCE
    ==============================================
    */

    author:
      source.name,

    source:
      source.name,

    sourceUrl:
      link,

    originalUrl:
      link,


    /*
    ==============================================
    DATES
    ==============================================
    */

    createdAt:
      admin.firestore.FieldValue
        .serverTimestamp(),

    publishedAt:

      publishedDate &&
      !Number.isNaN(
        publishedDate.getTime()
      )

        ? admin.firestore.Timestamp
            .fromDate(
              publishedDate
            )

        : null,


    date:

      publishedDate &&
      !Number.isNaN(
        publishedDate.getTime()
      )

        ? publishedDate
            .toLocaleDateString(
              "sw-TZ"
            )

        : "",


    /*
    ==============================================
    EXTRA
    ==============================================
    */

    readTime:
      "Dakika 3",

    language:
      "sw",

    originalLanguage:
      "en",

    translatedAutomatically:
      true,

    importedAutomatically:
      true,

    aiProcessed:
      true,

    aiModel:
      "gpt-5.4",

    updatedAt:
      admin.firestore.FieldValue
        .serverTimestamp(),

  });


  console.log(
    `IMEONGEZWA KWA KISWAHILI: ${translated.title}`
  );


  return true;

}


/*
==================================================
 IMPORT ALL SOURCES
==================================================
*/

async function importInternationalNews() {

  let totalAdded = 0;


  /*
  ================================================
  CHECK OPENAI KEY
  ================================================
  */

  if (
    !process.env.OPENAI_API_KEY
  ) {

    throw new Error(
      "OPENAI_API_KEY haijawekwa."
    );

  }


  /*
  ================================================
  SOURCES
  ================================================
  */

  for (
    const source of SOURCES
  ) {

    try {

      console.log(
        "================================"
      );

      console.log(
        `Inasoma RSS: ${source.name}`
      );


      /*
      ============================================
      READ RSS
      ============================================
      */

      const feed =
        await parser.parseURL(
          source.url
        );


      const items =
        (feed.items || [])
          .slice(
            0,
            MAX_ARTICLES_PER_SOURCE
          );


      console.log(
        `${items.length} habari kutoka ${source.name}`
      );


      /*
      ============================================
      ARTICLES
      ============================================
      */

      for (
        const item of items
      ) {

        try {

          const added =
            await importArticle(
              item,
              source
            );


          if (
            added
          ) {

            totalAdded++;

          }


          /*
          ========================================
          DELAY
          ========================================
          */

          await new Promise(
            resolve =>

              setTimeout(
                resolve,
                1500
              )

          );

        }

        catch (error) {

          console.error(

            `Article error: ${item.title}`,

            error.message

          );

        }

      }

    }

    catch (error) {

      console.error(

        `RSS ERROR: ${source.name}`,

        error.message

      );

    }

  }


  /*
  ================================================
  SUMMARY
  ================================================
  */

  console.log(
    "================================"
  );

  console.log(
    `JUMLA YA HABARI MPYA: ${totalAdded}`
  );

  console.log(
    "================================"
  );


  return totalAdded;

}


/*
==================================================
 START
==================================================
*/

importInternationalNews()

  .then(() => {

    console.log(
      "Import imekamilika."
    );

    process.exit(0);

  })

  .catch((error) => {

    console.error(
      "Import error:",
      error
    );

    process.exit(1);

  });