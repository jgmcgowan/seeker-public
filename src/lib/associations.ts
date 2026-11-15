// Larger bodies a congregation belongs to (conventions, synods, dioceses, networks),
// so related places can be tagged and shown together. Matched from OSM tags
// (`denomination`, `operator`, `diocese`) or the name; a listing can also set one.
// Known associations come first; otherwise an `operator` or `diocese` tag that looks
// like an organization becomes its own association so its places still group.
import { findBranch } from "./traditions";

export type Association = {
  slug: string;
  name: string;
  /** Branch slug from traditions.ts. */
  branch?: string;
  url?: string;
};

type Rule = Association & { denominations?: string[]; operator?: RegExp; pattern?: RegExp };

export const ASSOCIATIONS: Rule[] = [
  // Baptist
  { slug: "southern-baptist", name: "Southern Baptist Convention", branch: "baptist", url: "https://www.sbc.net", denominations: ["southern_baptist", "southern_baptist_convention", "sbc"], operator: /southern baptist|\bSBC\b/i },
  { slug: "american-baptist", name: "American Baptist Churches USA", branch: "baptist", url: "https://www.abc-usa.org", denominations: ["american_baptist", "american_baptist_churches_usa", "abcusa"], operator: /american baptist churches/i },
  { slug: "national-baptist", name: "National Baptist Convention, USA", branch: "baptist", url: "https://www.nationalbaptist.com", denominations: ["national_baptist", "national_baptist_convention"], operator: /national baptist convention/i },
  { slug: "progressive-national-baptist", name: "Progressive National Baptist Convention", branch: "baptist", url: "https://www.pnbc.org", denominations: ["progressive_national_baptist"], operator: /progressive national baptist/i },
  { slug: "cooperative-baptist", name: "Cooperative Baptist Fellowship", branch: "baptist", url: "https://cbf.net", denominations: ["cooperative_baptist", "cooperative_baptist_fellowship"], operator: /cooperative baptist/i },
  { slug: "free-will-baptist", name: "National Association of Free Will Baptists", branch: "baptist", url: "https://nafwb.org", denominations: ["free_will_baptist"], pattern: /free will baptist/i },
  { slug: "missionary-baptist", name: "Missionary Baptist", branch: "baptist", denominations: ["missionary_baptist"], pattern: /missionary baptist/i },
  { slug: "primitive-baptist", name: "Primitive Baptist", branch: "baptist", denominations: ["primitive_baptist"], pattern: /primitive baptist/i },
  { slug: "reformed-baptist", name: "Reformed Baptist Network", branch: "baptist", denominations: ["reformed_baptist"], operator: /reformed baptist/i },
  // Methodist & Wesleyan
  { slug: "united-methodist", name: "United Methodist Church", branch: "methodist", url: "https://www.umc.org", denominations: ["united_methodist", "umc"], operator: /united methodist/i, pattern: /united methodist|\bUMC\b/i },
  { slug: "global-methodist", name: "Global Methodist Church", branch: "methodist", url: "https://globalmethodist.org", denominations: ["global_methodist"], pattern: /global methodist/i },
  { slug: "ame-zion", name: "AME Zion Church", branch: "methodist", url: "https://www.amez.org", denominations: ["african_methodist_episcopal_zion", "ame_zion"], pattern: /\bA\.?\s?M\.?\s?E\.?\s+zion|african methodist episcopal zion/i },
  { slug: "ame", name: "African Methodist Episcopal Church", branch: "methodist", url: "https://www.ame-church.com", denominations: ["african_methodist_episcopal", "ame"], pattern: /\bA\.?\s?M\.?\s?E\.?\b|african methodist episcopal/i },
  { slug: "cme", name: "Christian Methodist Episcopal Church", branch: "methodist", url: "https://thecmechurch.org", denominations: ["christian_methodist_episcopal", "cme"], pattern: /\bC\.?\s?M\.?\s?E\.?\b|christian methodist episcopal/i },
  { slug: "free-methodist", name: "Free Methodist Church", branch: "methodist", url: "https://fmcusa.org", denominations: ["free_methodist"], pattern: /free methodist/i },
  { slug: "wesleyan", name: "The Wesleyan Church", branch: "methodist", url: "https://www.wesleyan.org", denominations: ["wesleyan"], pattern: /wesleyan/i },
  { slug: "nazarene", name: "Church of the Nazarene", branch: "methodist", url: "https://nazarene.org", denominations: ["nazarene", "church_of_the_nazarene"], pattern: /nazarene/i },
  // Lutheran
  { slug: "elca", name: "Evangelical Lutheran Church in America", branch: "lutheran", url: "https://www.elca.org", denominations: ["elca", "evangelical_lutheran", "evangelical_lutheran_church_in_america"], operator: /evangelical lutheran church (in|of) america|\bELCA\b/i, pattern: /\bELCA\b/ },
  { slug: "lcms", name: "Lutheran Church–Missouri Synod", branch: "lutheran", url: "https://www.lcms.org", denominations: ["lcms", "missouri_synod", "lutheran_church_missouri_synod"], operator: /missouri synod|\bLCMS\b/i, pattern: /missouri synod|\bLCMS\b/i },
  { slug: "wels", name: "Wisconsin Evangelical Lutheran Synod", branch: "lutheran", url: "https://wels.net", denominations: ["wels"], operator: /wisconsin evangelical lutheran/i, pattern: /\bWELS\b/ },
  { slug: "nalc", name: "North American Lutheran Church", branch: "lutheran", url: "https://thenalc.org", denominations: ["nalc", "north_american_lutheran"], operator: /north american lutheran/i },
  // Presbyterian & Reformed
  { slug: "pcusa", name: "Presbyterian Church (U.S.A.)", branch: "presbyterian-reformed", url: "https://www.presbyterianmission.org", denominations: ["pcusa", "presbyterian_church_usa", "presbyterian_church_(usa)", "presbyterian_church_(u.s.a.)"], operator: /presbyterian church \(?u\.?s\.?a\.?\)?/i },
  { slug: "pca", name: "Presbyterian Church in America", branch: "presbyterian-reformed", url: "https://pcanet.org", denominations: ["pca", "presbyterian_church_in_america"], operator: /presbyterian church in america/i, pattern: /\(PCA\)/ },
  { slug: "epc", name: "Evangelical Presbyterian Church", branch: "presbyterian-reformed", url: "https://epc.org", denominations: ["evangelical_presbyterian"], operator: /evangelical presbyterian church/i },
  { slug: "eco", name: "ECO: A Covenant Order of Evangelical Presbyterians", branch: "presbyterian-reformed", url: "https://eco-pres.org", operator: /covenant order of evangelical presbyterians/i },
  { slug: "opc", name: "Orthodox Presbyterian Church", branch: "presbyterian-reformed", url: "https://opc.org", denominations: ["orthodox_presbyterian"], operator: /orthodox presbyterian/i },
  { slug: "cumberland-presbyterian", name: "Cumberland Presbyterian Church", branch: "presbyterian-reformed", url: "https://www.cumberland.org", denominations: ["cumberland_presbyterian"], pattern: /cumberland presbyterian/i },
  { slug: "crc", name: "Christian Reformed Church", branch: "presbyterian-reformed", url: "https://www.crcna.org", denominations: ["christian_reformed"], pattern: /christian reformed/i },
  { slug: "rca", name: "Reformed Church in America", branch: "presbyterian-reformed", url: "https://www.rca.org", denominations: ["reformed_church_in_america"], operator: /reformed church in america/i },
  // Episcopal & Anglican
  { slug: "episcopal-church", name: "The Episcopal Church", branch: "episcopal-anglican", url: "https://www.episcopalchurch.org", denominations: ["episcopal", "episcopalian"], pattern: /episcopal(?! zion)/i },
  { slug: "acna", name: "Anglican Church in North America", branch: "episcopal-anglican", url: "https://anglicanchurch.net", denominations: ["acna", "anglican_church_in_north_america"], operator: /anglican church in north america|\bACNA\b/i },
  // Congregational & Disciples
  { slug: "ucc", name: "United Church of Christ", branch: "congregational", url: "https://www.ucc.org", denominations: ["united_church_of_christ", "ucc"], pattern: /united church of christ|\bUCC\b/ },
  { slug: "disciples", name: "Christian Church (Disciples of Christ)", branch: "congregational", url: "https://disciples.org", denominations: ["disciples_of_christ", "christian_church_disciples_of_christ"], pattern: /disciples of christ/i },
  // Pentecostal & Charismatic
  { slug: "assemblies-of-god", name: "Assemblies of God", branch: "pentecostal", url: "https://ag.org", denominations: ["assemblies_of_god", "assembly_of_god"], operator: /assembl(y|ies)[ _]of[ _]god/i, pattern: /assembl(y|ies) of god/i },
  { slug: "cogic", name: "Church of God in Christ", branch: "pentecostal", url: "https://www.cogic.org", denominations: ["church_of_god_in_christ", "cogic"], operator: /church of god in christ/i, pattern: /church of god in christ|\bCOGIC\b/i },
  { slug: "foursquare", name: "Foursquare Church", branch: "pentecostal", url: "https://www.foursquare.org", denominations: ["foursquare"], pattern: /foursquare/i },
  { slug: "upci", name: "United Pentecostal Church International", branch: "pentecostal", url: "https://www.upci.org", denominations: ["united_pentecostal"], pattern: /united pentecostal/i },
  // Evangelical & Non-denominational
  { slug: "calvary-chapel", name: "Calvary Chapel", branch: "evangelical-nondenominational", url: "https://calvarychapel.com", denominations: ["calvary_chapel"], pattern: /calvary chapel/i },
  { slug: "vineyard", name: "Vineyard USA", branch: "evangelical-nondenominational", url: "https://vineyardusa.org", denominations: ["vineyard"], pattern: /vineyard/i },
  { slug: "cma", name: "Christian and Missionary Alliance", branch: "evangelical-nondenominational", url: "https://www.cmalliance.org", denominations: ["christian_and_missionary_alliance"], operator: /christian (and|&) missionary alliance/i },
  { slug: "efca", name: "Evangelical Free Church of America", branch: "evangelical-nondenominational", url: "https://www.efca.org", denominations: ["evangelical_free"], operator: /evangelical free church/i, pattern: /evangelical free/i },
  { slug: "covenant", name: "Evangelical Covenant Church", branch: "evangelical-nondenominational", url: "https://covchurch.org", denominations: ["evangelical_covenant"], pattern: /evangelical covenant/i },
  { slug: "sovereign-grace", name: "Sovereign Grace Churches", branch: "evangelical-nondenominational", url: "https://sovereigngrace.com", operator: /sovereign grace churches/i },
  // Anabaptist & Quaker
  { slug: "church-of-the-brethren", name: "Church of the Brethren", branch: "anabaptist-quaker", url: "https://www.brethren.org", denominations: ["church_of_the_brethren"], operator: /church of the brethren/i, pattern: /church of the brethren/i },
  { slug: "brethren-in-christ", name: "Brethren in Christ", branch: "anabaptist-quaker", url: "https://bicus.org", denominations: ["brethren_in_christ"], pattern: /brethren in christ/i },
  // Orthodox Christian
  { slug: "goarch", name: "Greek Orthodox Archdiocese of America", branch: "orthodox-christian", url: "https://www.goarch.org", denominations: ["greek_orthodox"], pattern: /greek orthodox/i },
  { slug: "oca", name: "Orthodox Church in America", branch: "orthodox-christian", url: "https://www.oca.org", denominations: ["orthodox_church_in_america"], operator: /orthodox church in america/i },
  { slug: "antiochian", name: "Antiochian Orthodox Archdiocese", branch: "orthodox-christian", url: "https://www.antiochian.org", denominations: ["antiochian_orthodox"], pattern: /antiochian/i },
  { slug: "coptic", name: "Coptic Orthodox Church", branch: "orthodox-christian", url: "https://suscopts.org", denominations: ["coptic_orthodox"], pattern: /coptic/i },
  // Judaism
  { slug: "chabad", name: "Chabad-Lubavitch", branch: "orthodox-judaism", url: "https://www.chabad.org", denominations: ["chabad", "chabad_lubavitch"], pattern: /chabad|lubavitch/i },
  { slug: "young-israel", name: "National Council of Young Israel", branch: "orthodox-judaism", url: "https://youngisrael.org", pattern: /young israel/i },
  // Hinduism
  { slug: "baps", name: "BAPS Swaminarayan Sanstha", branch: "hindu-temples", url: "https://www.baps.org", pattern: /\bBAPS\b/ },
  { slug: "iskcon", name: "ISKCON (Hare Krishna)", branch: "vedanta-yoga", url: "https://www.iskcon.org", denominations: ["iskcon"], pattern: /iskcon|hare krishna/i },
  { slug: "vedanta-society", name: "Vedanta Society", branch: "vedanta-yoga", pattern: /vedanta society/i },
  // Buddhism
  { slug: "sgi", name: "Soka Gakkai International", branch: "zen-mahayana", url: "https://www.sgi-usa.org", denominations: ["soka_gakkai"], pattern: /soka gakkai|\bSGI\b/i },
  { slug: "bca", name: "Buddhist Churches of America", branch: "zen-mahayana", url: "https://www.buddhistchurchesofamerica.org", denominations: ["jodo_shinshu"], pattern: /buddhist church(es)? of/i },
  { slug: "kadampa", name: "New Kadampa Tradition", branch: "tibetan", url: "https://kadampa.org", pattern: /kadampa/i },
  { slug: "shambhala", name: "Shambhala", branch: "tibetan", url: "https://shambhala.org", denominations: ["shambhala"], pattern: /shambhala/i },
];

export function findAssociation(slug: string | null | undefined): Association | undefined {
  if (!slug) return undefined;
  const rule = ASSOCIATIONS.find((a) => a.slug === slug);
  return rule && { slug: rule.slug, name: rule.name, branch: rule.branch, url: rule.url };
}

const ORG_WORDS = /\b(church|convention|conference|synod|diocese|archdiocese|eparchy|metropol\w*|association|fellowship|network|alliance|union|federation|presbytery|communion|order)\b/i;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The association a place belongs to, from its tags. `denomination` is normalized (see osm.ts `norm`). */
export function associationFor(p: {
  name: string;
  religion: string | null;
  denomination: string | null;
  operator?: string | null;
  diocese?: string | null;
}): Association | null {
  const d = p.denomination;
  for (const a of ASSOCIATIONS) {
    const byTag = (d && a.denominations?.includes(d)) || (p.operator && a.operator?.test(p.operator));
    // A name match ("Vineyard", "Zion") only counts when the tags don't say otherwise.
    const byName = !byTag && a.pattern?.test(p.name) && nameFits(a, p.religion, d);
    if (byTag || byName) return { slug: a.slug, name: a.name, branch: a.branch, url: a.url };
  }
  if (p.diocese) {
    const name = /diocese|archdiocese|eparchy|metropol/i.test(p.diocese) ? p.diocese : `Diocese of ${p.diocese.replace(/[=]/g, "-")}`;
    return { slug: `diocese-${slugify(name)}`, name };
  }
  if (p.operator && ORG_WORDS.test(p.operator) && !/^(pastor|rev|father|rabbi|imam)\b/i.test(p.operator)) {
    return { slug: `org-${slugify(p.operator)}`, name: p.operator };
  }
  return null;
}

const GENERIC = new Set(["protestant", "christian", "none", "unknown", "other", "multi"]);

function nameFits(a: Rule, religion: string | null, d: string | null) {
  const ref = findBranch(a.branch);
  if (!ref) return true;
  if (religion && !ref.branch.osm.religion.includes(religion)) return false;
  return !d || GENERIC.has(d) || !!ref.branch.osm.denominations?.includes(d);
}

/** Associations under a branch, for tradition pages and the listing form. */
export function associationsForBranch(branch: string): Association[] {
  return ASSOCIATIONS.filter((a) => a.branch === branch).map(({ slug, name, branch, url }) => ({ slug, name, branch, url }));
}
