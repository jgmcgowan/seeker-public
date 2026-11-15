// Sacred texts for each tradition: what's read, the editions and translations
// congregations commonly use, and free places to read them. Listed in no order of
// preference. Links checked 2026-10-31; prices and features of apps change, so we only
// say "free" where the publisher does.

export type Link = { label: string; url: string };

export type SacredText = {
  name: string;
  /** Original language or script, when it matters for reading along. */
  original?: string;
  about: string;
  /** Editions or translations you're likely to meet, with a few words on each. */
  editions?: { name: string; note: string }[];
};

export type Reader = {
  name: string;
  url: string;
  note: string;
};

export type Scriptures = {
  tradition: string;
  intro: string;
  texts: SacredText[];
  readers: Reader[];
};

export const SCRIPTURES: Scriptures[] = [
  {
    tradition: "christianity",
    intro:
      "Christians read the Bible: the Old Testament, which is largely the Hebrew scriptures, and the New Testament, which tells of Jesus and the early church. Churches use many English translations, and you're welcome to bring any of them.",
    texts: [
      {
        name: "The Bible",
        original: "Hebrew, Aramaic and Greek",
        about:
          "Protestant Bibles have 66 books. Catholic and Orthodox Bibles add several Old Testament books (the deuterocanonical books, which some call the Apocrypha). Translations range from word-for-word to thought-for-thought.",
        editions: [
          { name: "King James Version (KJV)", note: "The 1611 classic in traditional English, still one of the most read." },
          { name: "New International Version (NIV)", note: "Modern and readable; common in evangelical churches." },
          { name: "English Standard Version (ESV)", note: "Closer to word-for-word; popular in evangelical and Reformed churches." },
          { name: "New Living Translation (NLT)", note: "Thought-for-thought and very easy to read." },
          { name: "New King James Version (NKJV)", note: "The King James style in updated English." },
          { name: "Christian Standard Bible (CSB)", note: "Balanced and readable; common in Baptist churches." },
          { name: "New American Standard Bible (NASB)", note: "Very literal; often used for close study." },
          { name: "New American Bible, Revised Edition (NABRE)", note: "The US Catholic bishops' translation, the basis of readings at Mass in the US." },
          { name: "New Revised Standard Version (NRSV, NRSVue)", note: "Common in mainline Protestant churches and in universities." },
          { name: "Orthodox Study Bible", note: "Its Old Testament follows the Greek Septuagint, the version Orthodox churches use." },
        ],
      },
      {
        name: "Other books some churches use",
        about:
          "Latter-day Saints read the Book of Mormon alongside the Bible. Jehovah's Witnesses use their own New World Translation. Episcopal and Anglican services follow the Book of Common Prayer, and the Catechism of the Catholic Church summarizes Catholic teaching.",
      },
    ],
    readers: [
      { name: "YouVersion Bible App", url: "https://www.bible.com/", note: "Free with no ads. A huge range of translations and languages, audio Bibles and reading plans." },
      { name: "Bible Gateway", url: "https://www.biblegateway.com/", note: "Free website and app for reading and comparing translations side by side (ads unless you pay)." },
      { name: "Blue Letter Bible", url: "https://www.blueletterbible.org/", note: "Free study tools, including Hebrew and Greek word lookups and commentaries." },
      { name: "Olive Tree", url: "https://www.olivetree.com/", note: "Free app with free translations; study Bibles and notes cost extra." },
      { name: "USCCB Bible", url: "https://bible.usccb.org/bible", note: "The Catholic NABRE online, free, with each day's Mass readings." },
      { name: "Gospel Library", url: "https://www.churchofjesuschrist.org/study/scriptures", note: "The Latter-day Saints' free app and site: the Bible, Book of Mormon and other scriptures." },
      { name: "JW Library", url: "https://www.jw.org/en/library/bible/", note: "Jehovah's Witnesses' free app and site with the New World Translation." },
    ],
  },
  {
    tradition: "judaism",
    intro:
      "The Hebrew Bible, or Tanakh, is the heart of Jewish study. Each Shabbat a portion of the Torah is chanted in Hebrew from a handwritten scroll, and the congregation follows along in a Chumash, the Torah in book form with Hebrew and English side by side.",
    texts: [
      {
        name: "Tanakh (Hebrew Bible)",
        original: "Hebrew (a little Aramaic)",
        about:
          "Three parts: Torah (the five books of Moses), Nevi'im (Prophets) and Ketuvim (Writings). The standard Hebrew text is the Masoretic Text. Christians know the same books as the Old Testament, in a different order.",
        editions: [
          { name: "JPS Tanakh", note: "The Jewish Publication Society's English translation, a standard in Jewish homes and classrooms (the 1985 edition is Sefaria's default English)." },
          { name: "Stone Edition Chumash (ArtScroll)", note: "Hebrew and English with traditional commentary; found in many Orthodox synagogues." },
          { name: "Etz Hayim", note: "Torah and commentary used in many Conservative synagogues." },
          { name: "The Torah: A Modern Commentary (Plaut)", note: "The Reform movement's Torah and commentary." },
          { name: "Koren Jerusalem Bible", note: "Hebrew and English on facing pages." },
        ],
      },
      {
        name: "Siddur, Mishnah and Talmud",
        about:
          "The siddur is the prayer book used at every service; each movement has its own. The Mishnah and Talmud record the rabbis' teaching and debate on Jewish law and life, and are studied in classes and study pairs.",
      },
    ],
    readers: [
      { name: "Sefaria", url: "https://www.sefaria.org/texts/Tanakh", note: "Free nonprofit library and app: the Tanakh in Hebrew with the JPS English, plus the Talmud, siddur and commentaries." },
      { name: "Chabad.org Tanakh", url: "https://www.chabad.org/library/bible_cdo/aid/63255/jewish/The-Bible-with-Rashi.htm", note: "Free Hebrew and English with Rashi's classic commentary." },
      { name: "Mechon Mamre", url: "https://www.mechon-mamre.org/", note: "Free Hebrew Masoretic text, with the older JPS English alongside." },
    ],
  },
  {
    tradition: "islam",
    intro:
      "Muslims believe the Quran was revealed to the Prophet Muhammad in Arabic, and it is recited in Arabic in every prayer. Translations are treated as explanations of its meaning rather than the Quran itself, so most English editions print the Arabic alongside.",
    texts: [
      {
        name: "The Quran",
        original: "Arabic",
        about: "114 chapters (surahs). Many Muslims memorize parts or all of it, and the whole Quran is often recited over the nights of Ramadan.",
        editions: [
          { name: "Saheeh International", note: "Clear, fairly literal modern English; widely used." },
          { name: "The Clear Quran (Mustafa Khattab)", note: "Plain, readable modern English." },
          { name: "M.A.S. Abdel Haleem (Oxford)", note: "Fluent English from a university press." },
          { name: "Yusuf Ali and Pickthall", note: "Older, classic translations still found in many mosques." },
        ],
      },
      {
        name: "Hadith and other texts",
        about:
          "Hadith are reports of the Prophet's words and actions. Sunni Muslims rely most on collections like Sahih al-Bukhari and Sahih Muslim; Shia Muslims have their own collections, such as al-Kafi, and treasure Nahj al-Balagha, the sermons and letters of Imam Ali.",
      },
    ],
    readers: [
      { name: "Quran.com", url: "https://quran.com/", note: "Free nonprofit site and app: Arabic with many English translations, word-by-word meanings and recitations." },
      { name: "Sunnah.com", url: "https://sunnah.com/", note: "Free hadith collections in Arabic and English." },
      { name: "Al-Islam.org", url: "https://www.al-islam.org/nahjul-balagha-part-1-sermons", note: "Free Shia library, including Nahj al-Balagha in English." },
    ],
  },
  {
    tradition: "buddhism",
    intro:
      "Buddhism has no single book. Each school treasures its own large collection of teachings, and temples chant short texts in services. Most newcomers start with a small collection like the Dhammapada.",
    texts: [
      {
        name: "Pali Canon (Tipitaka)",
        original: "Pali",
        about:
          "The scriptures of Theravada Buddhism: the Buddha's discourses (suttas), the monastic rules and philosophical texts. The Dhammapada, a short book of verses, is part of it.",
      },
      {
        name: "Mahayana sutras and the Tibetan canon",
        original: "Sanskrit, Chinese and Tibetan",
        about:
          "Zen and other Mahayana temples often chant the Heart Sutra and study the Diamond and Lotus Sutras. Tibetan Buddhism has its own canon, the Kangyur and Tengyur, along with many teachers' writings.",
      },
    ],
    readers: [
      { name: "SuttaCentral", url: "https://suttacentral.net/", note: "Free early Buddhist texts with modern English translations (Bhikkhu Sujato's are free of copyright)." },
      { name: "Access to Insight", url: "https://www.accesstoinsight.org/", note: "Free library of Theravada texts and introductions." },
      { name: "Dhammatalks.org", url: "https://www.dhammatalks.org/suttas/", note: "Free sutta translations by Thanissaro Bhikkhu." },
      { name: "Lotsawa House", url: "https://www.lotsawahouse.org/words-of-the-buddha/heart-sutra", note: "Free Tibetan Buddhist texts in English, including the Heart Sutra." },
    ],
  },
  {
    tradition: "hinduism",
    intro:
      "Hindu scripture is a vast library rather than one book, and families and temples often follow particular texts and teachers. The Bhagavad Gita is the most widely read starting point.",
    texts: [
      {
        name: "Bhagavad Gita",
        original: "Sanskrit",
        about:
          "A 700-verse dialogue between Prince Arjuna and Krishna, part of the epic Mahabharata, on duty, devotion and the self. Many English translations exist; temple communities often recommend their own.",
      },
      {
        name: "Vedas, Upanishads and the epics",
        original: "Sanskrit",
        about:
          "The Vedas are the oldest scriptures and are chanted in ritual. The Upanishads explore the nature of reality and the self, and are central to Vedanta. The Ramayana and Mahabharata epics, and the Puranas, carry much of the stories behind festivals and worship.",
      },
    ],
    readers: [
      { name: "Vedabase", url: "https://vedabase.io/en/library/bg/", note: "Free online Bhagavad-gita As It Is (ISKCON) with Sanskrit, word meanings and commentary." },
      { name: "Holy-Bhagavad-Gita.org", url: "https://www.holy-bhagavad-gita.org/", note: "Free Sanskrit, transliteration, translation and commentary, verse by verse." },
    ],
  },
  {
    tradition: "sikhism",
    intro:
      "Sikhs revere the Guru Granth Sahib as their living Guru. Every gurdwara installs it with great respect, and its hymns are sung (kirtan) and read aloud at every gathering. Screens in many gurdwaras show the words with English translation.",
    texts: [
      {
        name: "Guru Granth Sahib",
        original: "Gurmukhi script",
        about:
          "Hymns by the Sikh Gurus and by Hindu and Muslim saints, arranged by musical measure (raag). The English translation by Dr. Sant Singh Khalsa is the one most often shown online.",
      },
      {
        name: "Nitnem and Dasam Granth",
        about:
          "Nitnem is the set of daily prayers, beginning with Japji Sahib at dawn. The Dasam Granth contains writings attributed to Guru Gobind Singh, some of which are part of Nitnem.",
      },
    ],
    readers: [
      { name: "SikhiToTheMax", url: "https://www.sikhitothemax.org/", note: "Free search and reading of Gurbani in Gurmukhi, English and Punjabi; also an app." },
      { name: "SearchGurbani", url: "https://www.searchgurbani.com/", note: "Free Guru Granth Sahib with translations and commentary." },
      { name: "iGurbani", url: "https://apps.apple.com/app/id569235977", note: "Free iPhone app with Gurmukhi and English translations." },
    ],
  },
  {
    tradition: "bahai",
    intro:
      "Bahá'ís read the writings of Bahá'u'lláh, the Báb and 'Abdu'l-Bahá, and devotional gatherings often include readings from other faiths' scriptures as well.",
    texts: [
      {
        name: "Writings of Bahá'u'lláh",
        original: "Persian and Arabic",
        about:
          "The Kitáb-i-Aqdas (the Most Holy Book) sets out laws and institutions; the Kitáb-i-Íqán (the Book of Certitude) explains how revelation unfolds across religions; The Hidden Words is a short book of spiritual counsels many people start with.",
      },
    ],
    readers: [{ name: "Bahá'í Reference Library", url: "https://www.bahai.org/library/", note: "The official, free library of Bahá'í writings in English and the original languages." }],
  },
  {
    tradition: "unitarian-universalism",
    intro:
      "Unitarian Universalism has no single scripture or creed. Services draw readings from the world's religions, poetry, science and members' own experience.",
    texts: [
      {
        name: "Hymnals and readings",
        about:
          "Congregations sing and read from the hymnals Singing the Living Tradition and Singing the Journey, which mix hymns with readings from many traditions. The Bible and other scriptures are read as sources of wisdom among many.",
      },
    ],
    readers: [{ name: "UUA: sources of inspiration", url: "https://www.uua.org/beliefs/what-we-believe/sources", note: "The Unitarian Universalist Association on what UUs draw from (now part of its Shared Values)." }],
  },
  {
    tradition: "jainism",
    intro:
      "Jain scripture preserves the teachings of Mahavira and the earlier Tirthankaras. The two main communities, Śvetāmbara and Digambara, accept different sets of texts, but both honor the Tattvartha Sutra.",
    texts: [
      {
        name: "Agamas",
        original: "Ardhamagadhi Prakrit",
        about:
          "Śvetāmbara Jains keep a canon of Agamas compiled from Mahavira's teaching; the Kalpa Sutra is read aloud during Paryushan. Digambara Jains hold that the original Agamas were lost and study later works such as the Shatkhandagama.",
      },
      {
        name: "Tattvartha Sutra",
        original: "Sanskrit",
        about: "Umaswati's short summary of Jain philosophy, accepted by every Jain tradition and a common first text to study.",
      },
    ],
    readers: [
      { name: "Wisdom Library", url: "https://www.wisdomlib.org/jainism/book/tattvartha-sutra-with-commentary", note: "Free Tattvartha Sutra in English with commentary." },
      { name: "JainQQ", url: "https://jainqq.org/", note: "Free online library of Jain texts and translations." },
      { name: "Jainpedia", url: "https://www.jainpedia.org/", note: "Free introductions to Jain texts, history and practice." },
    ],
  },
];

export function scripturesFor(tradition: string) {
  return SCRIPTURES.find((s) => s.tradition === tradition) ?? null;
}
