import type { Person } from "@/lib/sec";

// Curated past & present key people for mega-cap public companies.
// end: null = present. Keep it small but real (founders, CEOs, key execs).
export const LEADERS: Record<string, Person[]> = {
  AAPL: [
    { id: "aapl-jobs", name: "Steve Jobs", role: "Co-founder & CEO", start: "1976", end: "2011", status: "past", bio: "Co-founded Apple; CEO 1997–2011, launched iMac, iPod, iPhone, iPad." },
    { id: "aapl-cook", name: "Tim Cook", role: "CEO", start: "2011", end: null, status: "present", bio: "CEO since 2011; former COO. Led Apple past $3T market cap." },
    { id: "aapl-ive", name: "Jony Ive", role: "Chief Design Officer", start: "1992", end: "2019", status: "past", bio: "Led design of iMac, iPod, iPhone." },
    { id: "aapl-maestri", name: "Luca Maestri", role: "CFO", start: "2014", end: "2024", status: "past", bio: "CFO 2014–2024." },
    { id: "aapl-parekh", name: "Kevan Parekh", role: "CFO", start: "2025", end: null, status: "present", bio: "CFO from Jan 2025." },
    { id: "aapl-federighi", name: "Craig Federighi", role: "SVP Software Engineering", start: "2009", end: null, status: "present", bio: "Leads iOS/macOS engineering." },
  ],
  MSFT: [
    { id: "msft-gates", name: "Bill Gates", role: "Co-founder & CEO", start: "1975", end: "2000", status: "past", bio: "Co-founded Microsoft; CEO until 2000." },
    { id: "msft-ballmer", name: "Steve Ballmer", role: "CEO", start: "2000", end: "2014", status: "past", bio: "CEO 2000–2014; drove enterprise growth." },
    { id: "msft-nadella", name: "Satya Nadella", role: "CEO", start: "2014", end: null, status: "present", bio: "CEO since 2014; cloud-first turnaround, Azure growth." },
    { id: "msft-hood", name: "Amy Hood", role: "CFO", start: "2013", end: null, status: "present", bio: "CFO since 2013." },
  ],
  NVDA: [
    { id: "nvda-huang", name: "Jensen Huang", role: "Co-founder & CEO", start: "1993", end: null, status: "present", bio: "Co-founder and CEO; led GPU → AIDC boom." },
    { id: "nvda-kress", name: "Colette Kress", role: "CFO", start: "2013", end: null, status: "present", bio: "CFO since 2013." },
  ],
  AMZN: [
    { id: "amzn-bezos", name: "Jeff Bezos", role: "Founder & CEO", start: "1994", end: "2021", status: "past", bio: "Founded Amazon; CEO until 2021, now Executive Chair." },
    { id: "amzn-jassy", name: "Andy Jassy", role: "CEO", start: "2021", end: null, status: "present", bio: "Former AWS CEO; Amazon CEO since 2021." },
    { id: "amzn-olsavsky", name: "Brian Olsavsky", role: "CFO", start: "2015", end: "2024", status: "past", bio: "CFO 2015–2024." },
  ],
  GOOGL: [
    { id: "goog-page", name: "Larry Page", role: "Co-founder & CEO", start: "1998", end: "2015", status: "past", bio: "Co-founded Google; Alphabet CEO until 2019 via restructure." },
    { id: "goog-brin", name: "Sergey Brin", role: "Co-founder", start: "1998", end: "2019", status: "past", bio: "Co-founded Google; left Alphabet exec roles 2019." },
    { id: "goog-pichai", name: "Sundar Pichai", role: "CEO, Google & Alphabet", start: "2015", end: null, status: "present", bio: "Google CEO 2015, Alphabet CEO 2019." },
    { id: "goog-porat", name: "Ruth Porat", role: "CFO → President & CIO", start: "2015", end: null, status: "present", bio: "CFO 2015–2024, now President & CIO." },
  ],
  META: [
    { id: "meta-zuck", name: "Mark Zuckerberg", role: "Founder & CEO", start: "2004", end: null, status: "present", bio: "Founder, chairman & CEO." },
    { id: "meta-sandberg", name: "Sheryl Sandberg", role: "COO", start: "2008", end: "2022", status: "past", bio: "COO 2008–2022; scaled ads business." },
    { id: "meta-bosworth", name: "Andrew Bosworth", role: "CTO", start: "2017", end: null, status: "present", bio: "CTO since 2022 (VP eng from 2017); Reality Labs." },
  ],
  TSLA: [
    { id: "tsla-musk", name: "Elon Musk", role: "CEO", start: "2008", end: null, status: "present", bio: "CEO since 2008; also SpaceX, xAI." },
    { id: "tsla-kirkhorn", name: "Zachary Kirkhorn", role: "CFO", start: "2019", end: "2023", status: "past", bio: "CFO 2019–2023." },
    { id: "tsla-taneja", name: "Vaibhav Taneja", role: "CFO", start: "2023", end: null, status: "present", bio: "CFO since 2023." },
  ],
  AVGO: [
    { id: "avgo-tan", name: "Hock Tan", role: "CEO", start: "2006", end: null, status: "present", bio: "Broadcom CEO; serial acquirer (VMware, CA, Symantec enterprise)." },
  ],
  JPM: [
    { id: "jpm-dimon", name: "Jamie Dimon", role: "CEO", start: "2005", end: null, status: "present", bio: "JPMorgan Chase CEO since 2005." },
  ],
  XOM: [
    { id: "xom-woods", name: "Darren Woods", role: "CEO", start: "2017", end: null, status: "present", bio: "Chairman & CEO since 2017." },
    { id: "xom-tillerson", name: "Rex Tillerson", role: "CEO", start: "2006", end: "2016", status: "past", bio: "CEO 2006–2016; later US Secretary of State." },
  ],
  WMT: [
    { id: "wmt-mcmillon", name: "Doug McMillon", role: "CEO", start: "2014", end: null, status: "present", bio: "Walmart CEO since 2014." },
    { id: "wmt-walton", name: "Sam Walton", role: "Founder", start: "1962", end: "1992", status: "past", bio: "Founded Walmart in 1962." },
  ],
  MA: [
    { id: "ma-miebach", name: "Michael Miebach", role: "CEO", start: "2021", end: null, status: "present", bio: "CEO since 2021." },
    { id: "ma-banga", name: "Ajay Banga", role: "CEO", start: "2010", end: "2020", status: "past", bio: "CEO 2010–2020; later World Bank president." },
  ],
  V: [
    { id: "v-mcinerney", name: "Ryan McInerney", role: "CEO", start: "2023", end: null, status: "present", bio: "CEO since 2023." },
    { id: "v-kelly", name: "Al Kelly", role: "CEO", start: "2016", end: "2023", status: "past", bio: "CEO 2016–2023." },
  ],
  ORCL: [
    { id: "orcl-ellison", name: "Larry Ellison", role: "Founder, CTO & Chairman", start: "1977", end: null, status: "present", bio: "Founded Oracle; CEO until 2014, now CTO/Chairman." },
    { id: "orcl-catz", name: "Safra Catz", role: "CEO", start: "2014", end: null, status: "present", bio: "Co-CEO 2014, sole CEO since 2019." },
  ],
  NFLX: [
    { id: "nflx-hastings", name: "Reed Hastings", role: "Co-founder & Co-CEO", start: "1997", end: "2023", status: "past", bio: "Co-founder; Co-CEO until 2023, now Executive Chairman." },
    { id: "nflx-sarandos", name: "Ted Sarandos", role: "Co-CEO", start: "2020", end: null, status: "present", bio: "Co-CEO since 2020." },
    { id: "nflx-peters", name: "Greg Peters", role: "Co-CEO", start: "2023", end: null, status: "present", bio: "Co-CEO since 2023." },
  ],
  AMD: [
    { id: "amd-su", name: "Lisa Su", role: "CEO", start: "2014", end: null, status: "present", bio: "CEO since 2014; Ryzen/EPYC turnaround." },
    { id: "amd-read", name: "Rory Read", role: "CEO", start: "2011", end: "2014", status: "past", bio: "CEO 2011–2014." },
  ],
  CRM: [
    { id: "crm-benioff", name: "Marc Benioff", role: "Founder & CEO", start: "1999", end: null, status: "present", bio: "Founder and CEO of Salesforce." },
  ],
  DIS: [
    { id: "dis-iger", name: "Bob Iger", role: "CEO", start: "2005", end: null, status: "present", bio: "CEO 2005–2020, returned 2022." },
    { id: "dis-chapek", name: "Bob Chapek", role: "CEO", start: "2020", end: "2022", status: "past", bio: "CEO 2020–2022." },
    { id: "dis-disney", name: "Walt Disney", role: "Founder", start: "1923", end: "1966", status: "past", bio: "Co-founded Disney." },
  ],
  KO: [
    { id: "ko-quincey", name: "James Quincey", role: "CEO", start: "2017", end: null, status: "present", bio: "CEO since 2017." },
  ],
  JNJ: [
    { id: "jnj-duato", name: "Joaquin Duato", role: "CEO", start: "2022", end: null, status: "present", bio: "CEO since 2022." },
    { id: "jnj-gorsky", name: "Alex Gorsky", role: "CEO", start: "2012", end: "2021", status: "past", bio: "CEO 2012–2021." },
  ],
  BAC: [
    { id: "bac-moynihan", name: "Brian Moynihan", role: "CEO", start: "2010", end: null, status: "present", bio: "CEO since 2010." },
  ],
  COST: [
    { id: "cost-jelinek", name: "Craig Jelinek", role: "CEO", start: "2012", end: "2023", status: "past", bio: "CEO 2012–2023." },
    { id: "cost-vachris", name: "Ron Vachris", role: "CEO", start: "2024", end: null, status: "present", bio: "CEO since 2024." },
  ],
  INTC: [
    { id: "intc-gelsinger", name: "Pat Gelsinger", role: "CEO", start: "2021", end: "2024", status: "past", bio: "CEO 2021–2024." },
    { id: "intc-tan", name: "Lip-Bu Tan", role: "CEO", start: "2025", end: null, status: "present", bio: "CEO since 2025." },
    { id: "intc-moore", name: "Gordon Moore", role: "Co-founder", start: "1968", end: "2006", status: "past", bio: "Co-founder; Moore's law." },
  ],
  AXP: [
    { id: "axp-squeri", name: "Stephen Squeri", role: "CEO", start: "2018", end: null, status: "present", bio: "CEO since 2018." },
  ],
  GS: [
    { id: "gs-solomon", name: "David Solomon", role: "CEO", start: "2018", end: null, status: "present", bio: "CEO since 2018." },
    { id: "gs-blankfein", name: "Lloyd Blankfein", role: "CEO", start: "2006", end: "2018", status: "past", bio: "CEO 2006–2018." },
  ],
  SHOP: [
    { id: "shop-lutke", name: "Tobias Lütke", role: "Founder & CEO", start: "2006", end: null, status: "present", bio: "Founder and CEO." },
  ],
  TSM: [
    { id: "tsm-chang", name: "Morris Chang", role: "Founder", start: "1987", end: "2018", status: "past", bio: "Founded TSMC; retired 2018." },
    { id: "tsm-wei", name: "C.C. Wei", role: "CEO", start: "2018", end: null, status: "present", bio: "CEO since 2018." },
  ],
  ASML: [
    { id: "asml-fouquet", name: "Christophe Fouquet", role: "CEO", start: "2024", end: null, status: "present", bio: "CEO since 2024." },
    { id: "asml-wennink", name: "Peter Wennink", role: "CEO", start: "2013", end: "2024", status: "past", bio: "CEO 2013–2024." },
  ],
};

export function leadersFor(ticker: string): Person[] {
  return LEADERS[ticker.toUpperCase()] ?? [];
}
