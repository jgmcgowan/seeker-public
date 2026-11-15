// Faith traditions and their branches, written to be even-handed: each is described
// the way its own members would recognize, with no ranking between them.
// `traits` are rough tendencies (-2..2) used only by the Explore questionnaire;
// individual congregations vary a lot, and the UI says so.
// `osm` says how a branch shows up in OpenStreetMap's place_of_worship tags.

export type Trait =
  | "personal" // a personal God who knows and loves you
  | "liturgy" // formal, ancient, ritual-rich worship
  | "scripture" // study of a sacred text is central
  | "contemplative" // silence, meditation, inner practice
  | "community" // close-knit community and shared obligations
  | "service" // outreach, justice and service to others
  | "open" // room for questions and a range of beliefs
  | "lively" // energetic, expressive worship and music
  | "practice"; // daily disciplines: set prayers, food, rest

export const TRAITS: Trait[] = [
  "personal",
  "liturgy",
  "scripture",
  "contemplative",
  "community",
  "service",
  "open",
  "lively",
  "practice",
];

/** How a positive trait match reads in "why this might resonate". */
export const TRAIT_REASON: Record<Trait, string> = {
  personal: "a relationship with a personal God",
  liturgy: "rich, time-honored ritual",
  scripture: "studying a sacred text together",
  contemplative: "silence, prayer and meditation",
  community: "a close-knit community",
  service: "serving others and working for justice",
  open: "room for questions and differing views",
  lively: "energetic, expressive worship",
  practice: "structured daily practice",
};

export type OsmMatch = {
  /** OSM `religion` values. */
  religion: string[];
  /** OSM `denomination` values (normalized: lowercase, spaces/dashes → _). Empty = any. */
  denominations?: string[];
  /** Name pattern used when a place has no denomination tag. */
  name?: RegExp;
};

export type Branch = {
  slug: string;
  name: string;
  aka?: string;
  summary: string;
  beliefs: string;
  worship: string;
  firstVisit: string[];
  traits: Partial<Record<Trait, number>>;
  osm: OsmMatch;
};

export type Tradition = {
  slug: string;
  name: string;
  /** What a local congregation's place is usually called. */
  place: string;
  summary: string;
  origins: string;
  coreIdeas: string[];
  practices: string[];
  usNote: string;
  branches: Branch[];
};

export const TRADITIONS: Tradition[] = [
  {
    slug: "christianity",
    name: "Christianity",
    place: "church",
    summary:
      "Christians follow Jesus of Nazareth, whom they believe is the Son of God, and seek to live by his teaching of love for God and neighbor.",
    origins:
      "Began in the 1st century in Roman Judea among Jesus's followers, who proclaimed that he was raised from the dead. It grew from a Jewish movement into the world's largest faith, dividing over the centuries into Catholic, Orthodox and Protestant families.",
    coreIdeas: [
      "One God known as Father, Son and Holy Spirit (the Trinity), for most Christians",
      "Jesus's life, death and resurrection bring forgiveness and new life",
      "The Bible (Old and New Testaments) as sacred scripture",
      "Grace: God's love is a gift, not something earned",
    ],
    practices: ["Sunday worship", "Prayer", "Baptism and Communion", "Bible study", "Serving the poor"],
    usNote:
      "The most common faith in the US, with hundreds of denominations, from centuries-old parishes to new non-denominational churches.",
    branches: [
      {
        slug: "evangelical-nondenominational",
        name: "Evangelical & Non-denominational",
        summary:
          "Independent and evangelical churches, from small Bible churches to large multi-site churches, focused on a personal relationship with Jesus.",
        beliefs:
          "Personal conversion, the authority of the Bible and sharing faith with others. Many aren't part of a denomination at all.",
        worship:
          "Contemporary worship music with a band, a practical sermon, and casual dress. Larger churches have kids' programs during the service.",
        firstVisit: [
          "Look for a welcome or connect desk; many offer a newcomer gift or lunch.",
          "Small groups during the week are the main way people get to know each other.",
          "Kids' check-in is usually secure, with a tag for parents.",
        ],
        traits: { personal: 2, liturgy: -2, scripture: 2, contemplative: -1, community: 1, service: 1, open: -1, lively: 2, practice: 0 },
        osm: { religion: ["christian"], denominations: ["nondenominational", "non_denominational", "interdenominational", "evangelical", "evangelical_free", "evangelical_covenant", "bible", "calvary_chapel", "vineyard", "christian_and_missionary_alliance", "church_of_christ", "churches_of_christ", "christian_church", "independent"], name: /bible church|community church|non-?denominational|calvary chapel|vineyard|(?<!united )church of christ\b/i },
      },
      {
        slug: "catholic",
        name: "Catholic",
        aka: "Roman Catholic",
        summary:
          "The largest single Christian church, led by the Pope and bishops, with a worldwide parish system and a long tradition of sacraments, saints and social teaching.",
        beliefs:
          "Scripture and Church tradition together guide belief. Seven sacraments, especially the Eucharist, are central. Mary and the saints are honored as companions in prayer.",
        worship:
          "Mass follows a set order (the liturgy) with readings, a short homily, and Communion. Parishes usually offer several Masses each weekend, often including a Saturday evening Vigil Mass, and daily Mass on weekdays.",
        firstVisit: [
          "Anyone is welcome to attend Mass. Communion is generally for Catholics; others may come forward with arms crossed for a blessing or stay seated.",
          "Expect to stand, sit and kneel at set points. Following along is fine.",
          "Parishes are tied to neighborhoods and often run schools, food pantries and young adult groups.",
          "Many parishes offer Mass in Spanish and other languages.",
        ],
        traits: { personal: 1, liturgy: 2, scripture: 0, contemplative: 1, community: 1, service: 2, open: -1, lively: -1, practice: 1 },
        osm: { religion: ["christian"], denominations: ["catholic", "roman_catholic", "latin_catholic", "byzantine_catholic", "ukrainian_greek_catholic", "maronite", "melkite"], name: /\bcatholic\b|\bparish\b/i },
      },
      {
        slug: "orthodox-christian",
        name: "Orthodox Christian",
        aka: "Eastern and Oriental Orthodox",
        summary:
          "Ancient churches of the Christian East (Greek, Russian, Serbian, Antiochian, Coptic, Ethiopian, Armenian and others) that keep worship much as it was in the early centuries.",
        beliefs:
          "Faith is handed down through scripture, the early Church councils and the Church Fathers. Salvation is described as theosis: growing into union with God.",
        worship:
          "The Divine Liturgy is chanted or sung, often for 90 minutes or more, surrounded by icons, incense and candles. Many parishes worship partly in English and partly in a heritage language.",
        firstVisit: [
          "Visitors are welcome; Communion is for Orthodox Christians, but anyone may receive the blessed bread (antidoron) offered at the end.",
          "People often stand for much of the service, and arriving a little late is common.",
          "Modest dress is appreciated; some parishes have women cover their heads, though visitors aren't expected to.",
          "Many parishes have a coffee hour afterward where newcomers are warmly greeted.",
        ],
        traits: { personal: 1, liturgy: 2, scripture: 0, contemplative: 2, community: 2, service: 0, open: -1, lively: -1, practice: 2 },
        osm: { religion: ["christian"], denominations: ["orthodox", "eastern_orthodox", "greek_orthodox", "russian_orthodox", "serbian_orthodox", "antiochian_orthodox", "romanian_orthodox", "ukrainian_orthodox", "bulgarian_orthodox", "orthodox_church_in_america", "coptic_orthodox", "ethiopian_orthodox", "eritrean_orthodox", "armenian_apostolic", "syriac_orthodox", "oriental_orthodox", "malankara_orthodox"], name: /\borthodox\b|armenian apostolic/i },
      },
      {
        slug: "episcopal-anglican",
        name: "Episcopal & Anglican",
        summary:
          "Part of the worldwide Anglican family that grew from the Church of England. Known for beautiful liturgy alongside a broad, questioning theology.",
        beliefs:
          "Scripture, tradition and reason together guide faith. The Episcopal Church in particular welcomes a wide range of views, including full inclusion of LGBTQ people; Anglican Church in North America congregations are more traditional.",
        worship:
          "Services follow the Book of Common Prayer, with hymns, readings, a sermon and Communion (the Eucharist) most Sundays.",
        firstVisit: [
          "All baptized Christians are usually invited to Communion; others can come forward for a blessing.",
          "The service leaflet walks you through when to sit, stand and respond.",
          "Many parishes are strong on music, outreach and community dinners.",
        ],
        traits: { personal: 1, liturgy: 2, scripture: 0, contemplative: 1, community: 1, service: 2, open: 2, lively: -1, practice: 0 },
        osm: { religion: ["christian"], denominations: ["anglican", "episcopal", "episcopalian", "church_of_england", "acna"], name: /episcopal|anglican/i },
      },
      {
        slug: "lutheran",
        name: "Lutheran",
        summary:
          "Churches that follow the 16th-century reformer Martin Luther, centered on God's grace received through faith.",
        beliefs:
          "People are made right with God by grace through faith, not by good works. The ELCA is the more progressive body; the Missouri and Wisconsin Synods are more traditional.",
        worship:
          "A liturgical service with hymns, readings, sermon and Communion, sometimes alongside a contemporary-style service.",
        firstVisit: [
          "Communion practice varies: many ELCA churches invite all baptized Christians; LCMS churches usually ask visitors to speak to the pastor first.",
          "Strong traditions of choral music, potlucks and community service.",
        ],
        traits: { personal: 1, liturgy: 1, scripture: 1, contemplative: 0, community: 1, service: 1, open: 0, lively: -1, practice: 0 },
        osm: { religion: ["christian"], denominations: ["lutheran", "evangelical_lutheran", "elca", "lcms", "wels", "missouri_synod", "lutheran_church_missouri_synod"], name: /lutheran/i },
      },
      {
        slug: "methodist",
        name: "Methodist & Wesleyan",
        summary:
          "Churches rooted in John Wesley's 18th-century revival, which joined personal faith with practical holiness and care for the poor.",
        beliefs:
          "God's grace is offered to everyone, and faith shows itself in love and service. Includes the United Methodist, Global Methodist, African Methodist Episcopal (AME and AME Zion), Free Methodist and Nazarene churches.",
        worship:
          "Hymn singing, prayer, scripture and a sermon; Communion is often monthly and open to all.",
        firstVisit: [
          "Communion is usually open to anyone who wishes to receive.",
          "Many congregations run food pantries, recovery groups and mission trips.",
          "AME churches carry deep roots in Black American history and are known for powerful preaching and choirs.",
        ],
        traits: { personal: 1, liturgy: 0, scripture: 1, contemplative: 0, community: 1, service: 2, open: 1, lively: 0, practice: 0 },
        osm: { religion: ["christian"], denominations: ["methodist", "united_methodist", "global_methodist", "african_methodist_episcopal", "ame", "african_methodist_episcopal_zion", "ame_zion", "christian_methodist_episcopal", "free_methodist", "wesleyan", "nazarene", "church_of_the_nazarene"], name: /methodist|\bA\.?M\.?E\.?\b|wesleyan|nazarene|\bumc\b/i },
      },
      {
        slug: "presbyterian-reformed",
        name: "Presbyterian & Reformed",
        summary:
          "Churches from the tradition of John Calvin and John Knox, governed by elected elders and known for thoughtful preaching.",
        beliefs:
          "God's sovereignty and grace are central. The PC(USA) is progressive; the PCA, OPC and Christian Reformed churches are more traditional.",
        worship:
          "An orderly service built around scripture and an in-depth sermon, with hymns and prayers; Communion monthly or quarterly.",
        firstVisit: [
          "Expect a sermon that teaches through a Bible passage.",
          "Adult education classes before or after worship are common.",
        ],
        traits: { personal: 1, liturgy: 0, scripture: 2, contemplative: 0, community: 1, service: 1, open: 0, lively: -1, practice: 0 },
        osm: { religion: ["christian"], denominations: ["presbyterian", "pcusa", "pca", "reformed", "christian_reformed", "reformed_church_in_america", "orthodox_presbyterian", "calvinist", "cumberland_presbyterian"], name: /presbyterian|\breformed\b/i },
      },
      {
        slug: "congregational",
        name: "Congregational & Disciples",
        aka: "UCC, Disciples of Christ",
        summary:
          "Progressive Protestant churches where each congregation governs itself, with a strong emphasis on inclusion and social justice.",
        beliefs:
          "\"No creed but Christ\" for the Disciples; the UCC's motto is \"God is still speaking.\" Both welcome a wide range of beliefs and are open and affirming of LGBTQ people.",
        worship: "Hymns, scripture, sermon and an open Communion table (weekly for the Disciples).",
        firstVisit: [
          "Everyone is invited to Communion.",
          "Expect announcements about justice work and community partnerships.",
        ],
        traits: { personal: 1, liturgy: 0, scripture: 0, contemplative: 0, community: 1, service: 2, open: 2, lively: 0, practice: -1 },
        osm: { religion: ["christian"], denominations: ["united_church_of_christ", "ucc", "congregational", "disciples_of_christ", "christian_church_disciples_of_christ"], name: /united church of christ|congregational|disciples of christ/i },
      },
      {
        slug: "baptist",
        name: "Baptist",
        summary:
          "One of the largest Protestant families in the US, built on personal faith, believer's baptism and the independence of each local church.",
        beliefs:
          "Each person must choose faith for themselves, shown by baptism by immersion. The Bible is the final authority. Ranges from the Southern Baptist Convention to American Baptist and the historic Black Baptist conventions.",
        worship:
          "Congregational singing, prayer and a central sermon, often ending with an invitation to respond to faith.",
        firstVisit: [
          "Dress ranges from Sunday best to jeans depending on the church.",
          "Sunday school or small groups for every age often meet before or after worship.",
          "Black Baptist churches are known for gospel music and a strong community role.",
        ],
        traits: { personal: 2, liturgy: -1, scripture: 2, contemplative: -1, community: 2, service: 1, open: -1, lively: 1, practice: 0 },
        osm: { religion: ["christian"], denominations: ["baptist", "southern_baptist", "american_baptist", "national_baptist", "missionary_baptist", "free_will_baptist", "independent_baptist", "primitive_baptist", "progressive_national_baptist", "cooperative_baptist", "reformed_baptist"], name: /baptist/i },
      },
      {
        slug: "pentecostal",
        name: "Pentecostal & Charismatic",
        summary:
          "Fast-growing churches that emphasize the Holy Spirit's presence and gifts today, including healing, prophecy and speaking in tongues.",
        beliefs:
          "God acts powerfully and personally now. Includes the Assemblies of God, Church of God in Christ (COGIC), Church of God, Foursquare and many independent churches.",
        worship:
          "Energetic, expressive worship with raised hands, spontaneous prayer and long stretches of music. Services can run long.",
        firstVisit: [
          "Join in as much or as little as you like; no one expects visitors to know what to do.",
          "Many congregations are Spanish-speaking or bilingual.",
        ],
        traits: { personal: 2, liturgy: -2, scripture: 1, contemplative: -1, community: 2, service: 1, open: -1, lively: 2, practice: 0 },
        osm: { religion: ["christian"], denominations: ["pentecostal", "assemblies_of_god", "assembly_of_god", "church_of_god", "church_of_god_in_christ", "cogic", "foursquare", "apostolic", "charismatic", "united_pentecostal", "full_gospel"], name: /pentecostal|assembl(y|ies) of god|church of god|foursquare|apostolic|full gospel/i },
      },
      {
        slug: "anabaptist-quaker",
        name: "Anabaptist & Quaker",
        aka: "Mennonite, Brethren, Friends",
        summary:
          "Peace churches that emphasize simple living, nonviolence and community. Quakers (the Religious Society of Friends) often worship in shared silence.",
        beliefs:
          "Following Jesus in daily life matters more than formal creeds. Quakers speak of \"the Light\" or \"that of God\" in everyone.",
        worship:
          "Mennonite and Brethren services feature strong a cappella or hymn singing. Many Quaker meetings are \"unprogrammed\": an hour of silence where anyone may stand and speak.",
        firstVisit: [
          "At a silent Quaker meeting, simply sit; the meeting ends when people shake hands.",
          "These communities are often deeply involved in service, disaster relief and peace work.",
        ],
        traits: { personal: 1, liturgy: -1, scripture: 0, contemplative: 2, community: 2, service: 2, open: 1, lively: -2, practice: 1 },
        osm: { religion: ["christian"], denominations: ["mennonite", "amish", "brethren", "church_of_the_brethren", "quaker", "friends", "religious_society_of_friends", "anabaptist", "hutterite"], name: /mennonite|friends meeting|quaker|brethren/i },
      },
      {
        slug: "adventist",
        name: "Seventh-day Adventist",
        summary:
          "A Protestant church that keeps the Sabbath on Saturday and is known for its focus on health, education and hope in Christ's return.",
        beliefs:
          "The seventh-day Sabbath, the soon return of Jesus, and caring for the body as God's creation (many members are vegetarian).",
        worship: "Saturday morning: Sabbath School (Bible study groups) followed by a worship service.",
        firstVisit: ["Services are on Saturday, not Sunday.", "A fellowship lunch often follows."],
        traits: { personal: 2, liturgy: -1, scripture: 2, contemplative: 0, community: 2, service: 1, open: -1, lively: 0, practice: 2 },
        osm: { religion: ["christian"], denominations: ["adventist", "seventh_day_adventist"], name: /adventist/i },
      },
      {
        slug: "latter-day-saints",
        name: "The Church of Jesus Christ of Latter-day Saints",
        aka: "Latter-day Saints",
        summary:
          "A restorationist church founded in 1830 by Joseph Smith, with a strong focus on family, lay service and community.",
        beliefs:
          "Alongside the Bible, members read the Book of Mormon and other modern revelation, and believe families can be together eternally.",
        worship:
          "Sunday sacrament meeting (about an hour) led by lay members, followed by classes. Wards are assigned by where you live.",
        firstVisit: [
          "Meetinghouses are open to everyone; temples are reserved for members.",
          "Members serve as unpaid clergy and teachers, and newcomers are often visited by missionaries if they'd like.",
        ],
        traits: { personal: 2, liturgy: 0, scripture: 2, contemplative: -1, community: 2, service: 2, open: -2, lively: -1, practice: 2 },
        osm: { religion: ["christian"], denominations: ["latter_day_saints", "mormon", "lds", "the_church_of_jesus_christ_of_latter_day_saints"], name: /latter[- ]day saints/i },
      },
      {
        slug: "jehovahs-witnesses",
        name: "Jehovah's Witnesses",
        summary:
          "A Bible-centered movement that worships in Kingdom Halls and is known for door-to-door ministry.",
        beliefs:
          "Jehovah is the one true God; Jesus is his son but not part of a Trinity. Members expect God's Kingdom to transform the earth.",
        worship: "Twice-weekly meetings of Bible talks, study and song, led by elders.",
        firstVisit: ["Meetings are free and open to all; no collection is taken."],
        traits: { personal: 2, liturgy: -1, scripture: 2, contemplative: -1, community: 2, service: 0, open: -2, lively: -1, practice: 1 },
        osm: { religion: ["christian"], denominations: ["jehovahs_witness", "jehovahs_witnesses", "jehovah's_witnesses"], name: /kingdom hall|jehovah/i },
      },
    ],
  },
  {
    slug: "judaism",
    name: "Judaism",
    place: "synagogue",
    summary:
      "Judaism is the faith and way of life of the Jewish people, centered on the covenant between God and Israel and on living out the Torah's teachings.",
    origins:
      "Traces back more than 3,000 years to Abraham, Moses and the people of Israel. After the Temple in Jerusalem was destroyed in 70 CE, rabbinic Judaism grew around study, prayer and the synagogue.",
    coreIdeas: [
      "One God, who is the source of justice and compassion",
      "The Torah and centuries of interpretation (the Talmud) as a guide for life",
      "Mitzvot: commandments and good deeds that sanctify everyday life",
      "Tikkun olam: helping repair the world",
    ],
    practices: ["Shabbat (Friday evening to Saturday evening)", "Holidays like Passover and Yom Kippur", "Torah study", "Life-cycle rituals"],
    usNote:
      "The US has one of the world's largest Jewish communities. Converting is possible but not required to take part, and most synagogues welcome curious visitors.",
    branches: [
      {
        slug: "orthodox-judaism",
        name: "Orthodox",
        aka: "Modern Orthodox, Haredi, Chabad",
        summary:
          "Keeps Jewish law (halakha) as binding: Shabbat, kosher food and daily prayer, with services mostly in Hebrew.",
        beliefs: "The Torah was given by God at Sinai, and its laws, as interpreted by the rabbis, apply today.",
        worship:
          "Three daily services, with longer Shabbat services on Friday evening and Saturday morning. Men and women sit separately (divided by a mechitza).",
        firstVisit: [
          "Dress modestly: men wear a kippah (provided at the door); women often wear skirts and sleeves.",
          "Phones and photos aren't used on Shabbat.",
          "Chabad centers in particular are known for welcoming Jews of any background, often with a Shabbat meal.",
        ],
        traits: { personal: 1, liturgy: 2, scripture: 2, contemplative: 0, community: 2, service: 1, open: -2, lively: 0, practice: 2 },
        osm: { religion: ["jewish"], denominations: ["orthodox", "modern_orthodox", "ultra_orthodox", "haredi", "hasidic", "chabad", "sephardi", "sephardic", "chabad_lubavitch"], name: /chabad|orthodox|\byoung israel\b/i },
      },
      {
        slug: "conservative-judaism",
        name: "Conservative",
        aka: "Masorti",
        summary:
          "A middle path: Jewish law is taken seriously and also understood to evolve over time.",
        beliefs: "Tradition and modern scholarship together; most congregations are fully egalitarian.",
        worship: "Mostly Hebrew services following the traditional prayer book, with English readings and explanation.",
        firstVisit: [
          "Kippot are provided; non-Jewish visitors are welcome to wear one or not.",
          "Kiddush (a shared meal) often follows Saturday morning services.",
        ],
        traits: { personal: 1, liturgy: 2, scripture: 2, contemplative: 0, community: 2, service: 1, open: 0, lively: 0, practice: 1 },
        osm: { religion: ["jewish"], denominations: ["conservative", "masorti"] },
      },
      {
        slug: "reform-judaism",
        name: "Reform",
        summary:
          "The largest US movement. Emphasizes ethics, personal choice in observance, and full inclusion.",
        beliefs:
          "Jewish tradition is meant to be engaged with, not just obeyed. Interfaith families and LGBTQ people are warmly included.",
        worship:
          "Services in Hebrew and English, often with instruments and modern melodies. Friday evening services are a main gathering.",
        firstVisit: [
          "Dress is usually business casual; kippot are optional.",
          "Many temples offer \"Intro to Judaism\" classes open to anyone.",
        ],
        traits: { personal: 0, liturgy: 1, scripture: 1, contemplative: 0, community: 1, service: 2, open: 2, lively: 1, practice: -1 },
        osm: { religion: ["jewish"], denominations: ["reform", "liberal", "progressive"] },
      },
      {
        slug: "reconstructionist-renewal",
        name: "Reconstructionist & Renewal",
        summary:
          "Smaller, creative communities that see Judaism as an evolving civilization, with an emphasis on spirituality, music and democratic decision-making.",
        beliefs: "Tradition \"has a vote but not a veto.\" Renewal congregations add meditation and joyful, musical prayer.",
        worship: "Participatory services, often in a circle, with chanting, singing and discussion.",
        firstVisit: ["Expect discussion rather than a sermon.", "Often lay-led and very informal."],
        traits: { personal: 0, liturgy: 0, scripture: 1, contemplative: 2, community: 2, service: 2, open: 2, lively: 1, practice: 0 },
        osm: { religion: ["jewish"], denominations: ["reconstructionist", "renewal", "jewish_renewal", "humanistic"] },
      },
    ],
  },
  {
    slug: "islam",
    name: "Islam",
    place: "mosque",
    summary:
      "Muslims worship the one God (Allah, the Arabic word for God) and follow the teachings revealed to the Prophet Muhammad in the Qur'an.",
    origins:
      "Began in 7th-century Arabia when Muhammad received the revelations of the Qur'an. Muslims see it as continuing the message of earlier prophets including Abraham, Moses and Jesus.",
    coreIdeas: [
      "Tawhid: God is one, merciful and compassionate",
      "The Qur'an as God's word, and the example (Sunnah) of the Prophet",
      "The Five Pillars: faith, prayer, charity, fasting in Ramadan, and pilgrimage",
      "Every person is accountable to God for how they live",
    ],
    practices: ["Five daily prayers", "Friday congregational prayer (Jumu'ah)", "Ramadan fast", "Zakat (charity)"],
    usNote:
      "American Muslims are among the most diverse faith communities in the country. Many mosques hold open houses and welcome questions.",
    branches: [
      {
        slug: "sunni",
        name: "Sunni",
        summary:
          "About 85–90% of Muslims worldwide. Follows the Sunnah of the Prophet as interpreted by four main schools of law.",
        beliefs: "Leadership passed to the Prophet's companions, chosen by the community.",
        worship:
          "Friday midday prayer with a sermon (khutbah) is the main weekly gathering; most mosques also hold weekend classes and community events.",
        firstVisit: [
          "Remove your shoes before the prayer hall. Women typically cover their hair; scarves are often available.",
          "Men and women usually pray in separate areas.",
          "Non-Muslims are welcome to observe; call ahead or ask about an open house.",
        ],
        traits: { personal: 1, liturgy: 1, scripture: 2, contemplative: 1, community: 2, service: 2, open: -1, lively: -1, practice: 2 },
        osm: { religion: ["muslim"], denominations: ["sunni"] },
      },
      {
        slug: "shia",
        name: "Shia",
        summary:
          "The second-largest branch, following a line of Imams descended from the Prophet's family, beginning with Ali.",
        beliefs: "Spiritual authority passed through the Prophet's family. Includes Twelver, Ismaili and Zaydi communities.",
        worship:
          "Daily and Friday prayers, plus gatherings to remember the Imams, especially during Muharram. Centers may be called a mosque, imambargah or Islamic center.",
        firstVisit: ["Same etiquette as most mosques: shoes off, modest dress, head covering for women."],
        traits: { personal: 1, liturgy: 2, scripture: 2, contemplative: 1, community: 2, service: 2, open: -1, lively: 0, practice: 2 },
        osm: { religion: ["muslim"], denominations: ["shia", "shiite", "shia_islam", "twelver", "ismaili", "zaydi"] },
      },
    ],
  },
  {
    slug: "buddhism",
    name: "Buddhism",
    place: "temple or meditation center",
    summary:
      "Buddhists follow the teaching of the Buddha on the causes of suffering and the path to awakening, through ethics, meditation and wisdom.",
    origins:
      "Began about 2,500 years ago in northern India with Siddhartha Gautama, who became the Buddha (\"awakened one\"). It spread across Asia into many schools and has grown in the US since the 1960s.",
    coreIdeas: [
      "The Four Noble Truths: suffering, its cause, its end, and the path",
      "The Eightfold Path of right view, intention, speech, action, livelihood, effort, mindfulness and concentration",
      "Impermanence and interdependence",
      "Compassion for all beings",
    ],
    practices: ["Meditation", "Chanting", "Dharma talks", "Retreats", "Ethical precepts"],
    usNote:
      "US Buddhism includes immigrant temples that have served families for generations and meditation centers where many people begin with no religious background.",
    branches: [
      {
        slug: "theravada",
        name: "Theravada & Insight",
        aka: "Thai, Sri Lankan, Burmese, Cambodian, Lao temples; Vipassana",
        summary:
          "The \"teaching of the elders,\" preserved in Southeast Asia, with monastic communities and a focus on insight (vipassana) meditation.",
        beliefs: "Personal effort along the Eightfold Path leads to liberation; monks and nuns keep the early teachings.",
        worship:
          "Temples hold chanting, offerings to monks and meditation, especially on weekends and full-moon days. Insight meditation centers offer secular-friendly sits and classes.",
        firstVisit: [
          "Remove shoes, and avoid pointing your feet toward the Buddha image or monks.",
          "Many temples welcome visitors to a Sunday meal or meditation session.",
        ],
        traits: { personal: -2, liturgy: 1, scripture: 1, contemplative: 2, community: 1, service: 1, open: 1, lively: -2, practice: 2 },
        osm: { religion: ["buddhist"], denominations: ["theravada", "vipassana", "insight"], name: /\bwat\b|vipassana|insight meditation|vihara/i },
      },
      {
        slug: "zen-mahayana",
        name: "Zen & Mahayana",
        aka: "Zen, Chan, Pure Land, Nichiren",
        summary:
          "Schools of East Asian Buddhism, from Zen's seated meditation to Pure Land's devotional chanting.",
        beliefs: "Everyone has Buddha-nature; the bodhisattva ideal is to awaken for the benefit of all beings.",
        worship:
          "Zen centers practice zazen (seated meditation) with chanting and talks. Pure Land and Nichiren temples gather for chanting and community services, often on Sundays.",
        firstVisit: [
          "Most Zen centers offer a short newcomer orientation on how to sit and bow.",
          "Japanese-American Buddhist temples often have Sunday services that feel familiar to churchgoers.",
        ],
        traits: { personal: -2, liturgy: 1, scripture: 0, contemplative: 2, community: 1, service: 1, open: 2, lively: -2, practice: 2 },
        osm: { religion: ["buddhist"], denominations: ["zen", "mahayana", "chan", "pure_land", "jodo_shinshu", "shin", "nichiren", "soka_gakkai", "seon", "thien"], name: /\bzen\b|soka gakkai|nichiren|jodo|shin buddhist|buddhist church/i },
      },
      {
        slug: "tibetan",
        name: "Tibetan & Vajrayana",
        summary:
          "Buddhism of the Himalayas, known for rich ritual, visualization practices and close teacher–student relationships.",
        beliefs: "Compassion and wisdom are cultivated through meditation, mantra and the guidance of a qualified teacher.",
        worship: "Group meditation, chanting, teachings and seasonal pujas (ceremonies), with colorful shrines.",
        firstVisit: ["Intro meditation nights are a common starting point."],
        traits: { personal: -1, liturgy: 2, scripture: 1, contemplative: 2, community: 1, service: 1, open: 1, lively: -1, practice: 2 },
        osm: { religion: ["buddhist"], denominations: ["tibetan", "vajrayana", "gelug", "kagyu", "nyingma", "sakya", "shambhala"], name: /tibetan|kadampa|shambhala|dharma center/i },
      },
    ],
  },
  {
    slug: "hinduism",
    name: "Hinduism",
    place: "temple (mandir)",
    summary:
      "Hinduism (Sanatana Dharma, \"the eternal way\") is a family of traditions sharing reverence for the Vedas and the belief that all life is sacred and connected.",
    origins:
      "Has no single founder; its roots in the Indian subcontinent go back more than 3,000 years. It includes many schools of devotion, philosophy and practice.",
    coreIdeas: [
      "Brahman: one ultimate reality, worshipped in many divine forms",
      "Dharma (right living), karma, and rebirth",
      "Many paths to the divine: devotion, knowledge, action and meditation",
      "Moksha: liberation from the cycle of rebirth",
    ],
    practices: ["Puja (worship) at home and temple", "Festivals like Diwali and Holi", "Yoga and meditation", "Devotional singing (bhajan, kirtan)"],
    usNote:
      "US temples serve many regional communities and often hold weekend pujas, cultural classes and festivals open to visitors.",
    branches: [
      {
        slug: "hindu-temples",
        name: "Hindu temples",
        aka: "Vaishnava, Shaiva, Shakta and community temples",
        summary:
          "Most US temples honor several deities, with priests performing daily rituals and families gathering on weekends.",
        beliefs: "Devotion to God in forms such as Vishnu (and Krishna, Rama), Shiva or the Goddess, all seen as expressions of the divine.",
        worship:
          "Darshan (seeing the deity), aarti (offering of light), and pujas led by priests. Weekend mornings and evenings are busiest.",
        firstVisit: [
          "Remove shoes, dress modestly, and you're welcome to walk around quietly.",
          "You may be offered prasad (blessed food); accept it with your right hand.",
        ],
        traits: { personal: 1, liturgy: 2, scripture: 0, contemplative: 1, community: 2, service: 1, open: 2, lively: 1, practice: 2 },
        osm: { religion: ["hindu"], denominations: [] },
      },
      {
        slug: "vedanta-yoga",
        name: "Vedanta, Yoga & Kirtan",
        aka: "Vedanta Society, ISKCON (Hare Krishna), Self-Realization Fellowship",
        summary:
          "Teaching-centered communities, often welcoming to people from any background, focused on meditation, philosophy or devotional chanting.",
        beliefs:
          "Vedanta teaches that the true self is one with the divine; ISKCON centers devotion to Krishna through chanting.",
        worship: "Lectures, meditation and kirtan (call-and-response chanting), often followed by a vegetarian meal.",
        firstVisit: ["Sunday programs are designed for newcomers."],
        traits: { personal: 0, liturgy: 1, scripture: 1, contemplative: 2, community: 1, service: 1, open: 2, lively: 1, practice: 2 },
        osm: { religion: ["hindu"], denominations: ["vedanta", "iskcon", "gaudiya_vaishnavism", "self_realization_fellowship"], name: /vedanta|iskcon|krishna|self-realization/i },
      },
    ],
  },
  {
    slug: "sikhism",
    name: "Sikhism",
    place: "gurdwara",
    summary:
      "Sikhs follow the teachings of ten Gurus and the scripture Guru Granth Sahib, centered on devotion to one God, equality and service.",
    origins: "Founded by Guru Nanak in 15th-century Punjab, in what is now India and Pakistan.",
    coreIdeas: [
      "One God (Ik Onkar), beyond form",
      "Equality of all people regardless of caste, gender or religion",
      "Honest work, sharing with others, and remembering God",
      "Seva: selfless service",
    ],
    practices: ["Kirtan (singing scripture)", "Langar (free community meal)", "Daily prayer"],
    usNote: "Every gurdwara serves langar, a free vegetarian meal open to anyone.",
    branches: [
      {
        slug: "gurdwara",
        name: "Gurdwara",
        summary: "Sikh houses of worship, open to everyone, often with weekend programs and the community kitchen.",
        beliefs: "The Guru Granth Sahib is the living Guru, honored at the center of the hall.",
        worship: "Kirtan, readings and prayer (Ardas), usually on Sunday mornings, followed by langar.",
        firstVisit: [
          "Cover your head (scarves are provided), remove shoes and wash hands.",
          "Sit on the floor; at langar everyone eats together as equals.",
          "No tobacco or alcohol on the premises.",
        ],
        traits: { personal: 1, liturgy: 1, scripture: 1, contemplative: 1, community: 2, service: 2, open: 1, lively: 0, practice: 2 },
        osm: { religion: ["sikh"], denominations: [] },
      },
    ],
  },
  {
    slug: "bahai",
    name: "Bahá'í Faith",
    place: "center",
    summary:
      "Bahá'ís believe in one God who has sent a series of messengers, and work for the unity of humanity.",
    origins: "Founded in 19th-century Persia by Bahá'u'lláh.",
    coreIdeas: [
      "Unity of God, of religion and of humanity",
      "Equality of women and men; harmony of science and religion",
      "Service to the community",
    ],
    practices: ["Daily prayer", "Nineteen Day Feast", "Devotional gatherings and study circles"],
    usNote: "There are no clergy; most activity happens in homes and local centers, open to all.",
    branches: [
      {
        slug: "bahai-community",
        name: "Bahá'í community",
        summary: "Local communities that host devotional gatherings, children's classes and study circles.",
        beliefs: "All the major religions come from the same God.",
        worship: "Readings from many scriptures, music and conversation; no sermons or rituals.",
        firstVisit: ["Devotional gatherings are informal and often in someone's home."],
        traits: { personal: 1, liturgy: -1, scripture: 1, contemplative: 1, community: 2, service: 2, open: 2, lively: -1, practice: 1 },
        osm: { religion: ["bahai", "baha'i"], denominations: [] },
      },
    ],
  },
  {
    slug: "unitarian-universalism",
    name: "Unitarian Universalism",
    place: "congregation",
    summary:
      "A creedless faith where people of many beliefs, including theists, humanists and seekers, worship together around shared values.",
    origins: "Grew from two liberal Christian movements in America that merged in 1961.",
    coreIdeas: [
      "No required creed; each person's search for truth is honored",
      "Shared values of love, justice, equity and interdependence",
      "Wisdom from many religions, science and the arts",
    ],
    practices: ["Sunday services", "Social justice work", "Small group ministry", "Religious education for all ages"],
    usNote: "A common home for interfaith families and people who want community without a set creed.",
    branches: [
      {
        slug: "unitarian-universalist",
        name: "Unitarian Universalist",
        summary: "Congregations led by ministers and members, often active in local justice work.",
        beliefs: "Members may be Christian, Jewish, Buddhist, humanist, pagan or simply searching.",
        worship: "Readings from many sources, music, a reflection or sermon, and a time to share joys and concerns.",
        firstVisit: ["Newcomer tables and \"UU 101\" classes are common."],
        traits: { personal: -1, liturgy: 0, scripture: -1, contemplative: 1, community: 2, service: 2, open: 2, lively: 0, practice: -1 },
        osm: { religion: ["unitarian_universalist", "unitarian"], denominations: [], name: /unitarian/i },
      },
    ],
  },
  {
    slug: "jainism",
    name: "Jainism",
    place: "temple (derasar)",
    summary:
      "An ancient Indian tradition centered on ahimsa: non-violence toward every living being.",
    origins: "Shaped by Mahavira in the 6th century BCE, the last of 24 teachers (Tirthankaras).",
    coreIdeas: ["Ahimsa (non-violence)", "Anekantavada: truth has many sides", "Aparigraha: non-attachment"],
    practices: ["Vegetarian diet", "Meditation", "Temple worship", "Fasting"],
    usNote: "US Jain centers are community hubs that welcome respectful visitors.",
    branches: [
      {
        slug: "jain-center",
        name: "Jain center",
        summary: "Temples and community centers with worship, classes and festivals like Paryushana.",
        beliefs: "Every soul can reach liberation through right faith, knowledge and conduct.",
        worship: "Personal worship before images of the Tirthankaras, group prayers and lectures.",
        firstVisit: ["Remove shoes; leather items and food aren't brought inside."],
        traits: { personal: -2, liturgy: 1, scripture: 1, contemplative: 2, community: 2, service: 1, open: 2, lively: -1, practice: 2 },
        osm: { religion: ["jain"], denominations: [] },
      },
    ],
  },
];

export type BranchRef = { tradition: Tradition; branch: Branch };

export const ALL_BRANCHES: BranchRef[] = TRADITIONS.flatMap((tradition) =>
  tradition.branches.map((branch) => ({ tradition, branch })),
);

export function findBranch(slug: string | null | undefined): BranchRef | undefined {
  return slug ? ALL_BRANCHES.find((b) => b.branch.slug === slug) : undefined;
}

export function findTradition(slug: string): Tradition | undefined {
  return TRADITIONS.find((t) => t.slug === slug);
}

/** "Episcopal & Anglican (Christianity)", or just the tradition when it has one branch. */
export function branchLabel({ tradition, branch }: BranchRef): string {
  return tradition.branches.length === 1 ? tradition.name : `${branch.name} · ${tradition.name}`;
}

// Top-level groups for pickers and lists: the three largest US traditions get their own,
// everything else shares "Other" to keep menus short. No ranking is implied.
export type GroupSlug = "christianity" | "judaism" | "islam" | "other";
export type FaithGroup = { slug: GroupSlug; name: string; traditions: Tradition[] };

const MAIN: GroupSlug[] = ["christianity", "judaism", "islam"];
/** OSM religions with their own group; any other religion belongs to "Other". */
export const MAIN_RELIGIONS = ["christian", "jewish", "muslim"];

export const GROUPS: FaithGroup[] = [
  ...MAIN.map((slug) => ({ slug, name: findTradition(slug)!.name, traditions: [findTradition(slug)!] })),
  { slug: "other", name: "Other", traditions: TRADITIONS.filter((t) => !(MAIN as string[]).includes(t.slug)) },
];

export function groupOf(tradition: Tradition): FaithGroup {
  return GROUPS.find((g) => g.traditions.includes(tradition))!;
}

/** "Christian", "Buddhist": reads well before "places". */
export const ADJECTIVE: Record<string, string> = {
  christianity: "Christian",
  judaism: "Jewish",
  islam: "Muslim",
  buddhism: "Buddhist",
  hinduism: "Hindu",
  sikhism: "Sikh",
  bahai: "Bahá'í",
  "unitarian-universalism": "Unitarian Universalist",
  jainism: "Jain",
  other: "other-faith",
};

/** What a search covers: one branch, a whole tradition, or a whole group. */
export type Scope = {
  slug: string;
  label: string;
  group: FaithGroup;
  branches: BranchRef[];
  /** Set when the scope is exactly one branch (keeps the "maybe" list for untagged places). */
  single?: BranchRef;
  tradition?: Tradition;
};

export function resolveScope(slug: string | null | undefined): Scope | undefined {
  if (!slug) return undefined;
  const ref = findBranch(slug);
  if (ref) return { slug, label: ref.branch.name, group: groupOf(ref.tradition), branches: [ref], single: ref, tradition: ref.tradition };
  const tradition = findTradition(slug);
  const group = GROUPS.find((g) => g.slug === slug);
  if (group && (group.slug === "other" || tradition)) {
    return {
      slug,
      label: ADJECTIVE[slug],
      group,
      tradition,
      branches: ALL_BRANCHES.filter((b) => group.traditions.includes(b.tradition)),
      single: tradition?.branches.length === 1 ? { tradition, branch: tradition.branches[0] } : undefined,
    };
  }
  if (tradition) {
    const branches = ALL_BRANCHES.filter((b) => b.tradition === tradition);
    return { slug, label: ADJECTIVE[slug] ?? tradition.name, group: groupOf(tradition), tradition, branches, single: branches.length === 1 ? branches[0] : undefined };
  }
  return undefined;
}

/** Short name for a branch on a listing: "Baptist", or "Sikhism" for one-branch traditions. */
export function shortBranchName({ tradition, branch }: BranchRef): string {
  return tradition.branches.length === 1 ? tradition.name : branch.name;
}
