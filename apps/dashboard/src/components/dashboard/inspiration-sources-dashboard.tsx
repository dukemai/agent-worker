import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookInspirationFlow } from "./book-inspiration-flow";

type BookSource = {
  name: string;
  url: string;
  domain: string;
  description: string;
  bestFor: string[];
  audience: string;
  kind: "Inspiration" | "Verification";
  health: "Working";
  lastChecked: string;
};

const BOOK_SOURCES: BookSource[] = [
  {
    name: "Huddinge bibliotek – Boktips",
    url: "https://bibliotek.huddinge.se/boktips",
    domain: "bibliotek.huddinge.se",
    description: "Library recommendations for children, teenagers, new books, and staff picks.",
    bestFor: ["Children", "Teenagers", "Staff picks", "New books"],
    audience: "Children, teenagers, and adults",
    kind: "Inspiration",
    health: "Working",
    lastChecked: "2026-07-02",
  },
  {
    name: "Jönköpings bibliotek – Boktips för barn",
    url: "https://bibliotek.jonkoping.se/boktips-barn",
    domain: "bibliotek.jonkoping.se",
    description: "Age-oriented reading lists, including picture books and books for ages 6–9.",
    bestFor: ["Age groups", "Picture books", "Early readers"],
    audience: "Children 0–12",
    kind: "Inspiration",
    health: "Working",
    lastChecked: "2026-07-02",
  },
  {
    name: "Strängnäs bibliotek – Boktips barn & unga",
    url: "https://bibliotek.strangnas.se/boktips-barn-unga",
    domain: "bibliotek.strangnas.se",
    description: "Thematic lists assembled by children’s and youth librarians.",
    bestFor: ["Similar books", "Themes", "Librarian picks"],
    audience: "Children and teenagers",
    kind: "Inspiration",
    health: "Working",
    lastChecked: "2026-07-02",
  },
  {
    name: "Kulturrådet – Barn- och ungdomsbokskatalogen",
    url: "https://www.kulturradet.se/globalassets/start/publikationer/2025/barn--och-ungdomsbokskatalogen-202526/ungdom_barn-och-ungdomsbokskatalogen_25_26_tg.pdf",
    domain: "kulturradet.se",
    description: "An authoritative annual catalogue of recent children’s and young-adult books.",
    bestFor: ["Recent releases", "Curated overview", "Swedish editions"],
    audience: "Children and teenagers",
    kind: "Inspiration",
    health: "Working",
    lastChecked: "2026-07-02",
  },
  {
    name: "Augustpriset",
    url: "https://www.augustpriset.se/",
    domain: "augustpriset.se",
    description: "Award nominees and winners for notable Swedish children’s and young-adult literature.",
    bestFor: ["Award winners", "Acclaimed books", "Swedish literature"],
    audience: "Children and teenagers",
    kind: "Inspiration",
    health: "Working",
    lastChecked: "2026-07-02",
  },
  {
    name: "Libris",
    url: "https://libris.kb.se/",
    domain: "libris.kb.se",
    description: "Sweden’s national library catalogue for confirming titles, authors, editions, and ISBNs.",
    bestFor: ["Book facts", "ISBN", "Editions", "Library holdings"],
    audience: "All ages",
    kind: "Verification",
    health: "Working",
    lastChecked: "2026-07-02",
  },
];

export function InspirationSourcesDashboard() {
  const inspirationCount = BOOK_SOURCES.filter((source) => source.kind === "Inspiration").length;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Inspiration Sources</h1>
          <Badge variant="outline">Books</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Start with trusted, browsable sources to discover what kind of book fits the moment. Capture promising
          titles later; this directory is for finding ideas, not maintaining a book library.
        </p>
      </div>

      <BookInspirationFlow />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-2 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardDescription>Recommended sources</CardDescription>
            <CardTitle className="text-2xl">{BOOK_SOURCES.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardDescription>For inspiration</CardDescription>
            <CardTitle className="text-2xl">{inspirationCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-2 py-4 shadow-none">
          <CardHeader className="px-4">
            <CardDescription>Source health</CardDescription>
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400">All working</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3" aria-labelledby="book-sources-heading">
        <div>
          <h2 id="book-sources-heading" className="text-lg font-semibold">Book sources</h2>
          <p className="text-sm text-muted-foreground">
            Inspiration sources help us discover candidates. Verification sources confirm bibliographic facts afterward.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {BOOK_SOURCES.map((source) => (
            <Card key={source.url} className="gap-4 py-5">
              <CardHeader className="gap-3 px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="leading-snug">{source.name}</CardTitle>
                    <CardDescription>{source.domain}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{source.kind}</Badge>
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {source.health}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{source.description}</p>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <div className="flex flex-wrap gap-1.5">
                  {source.bestFor.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
                </div>
                <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <div><dt className="inline font-medium text-foreground">Audience: </dt><dd className="inline">{source.audience}</dd></div>
                  <div><dt className="inline font-medium text-foreground">Checked: </dt><dd className="inline">{source.lastChecked}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <a href={source.url} target="_blank" rel="noreferrer">Open source <ExternalLink aria-hidden /></a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
