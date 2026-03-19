import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
} from "@react-email/components";
import type {
  DigestLessonItem,
  GrowingSuggestionDigestItem,
  PromotionDigestItem,
  RecentGrowingKnowledgeItem,
  RecentGrowingWindowItem,
  RenewalDigestItem,
  Task,
} from "../types";

type Props = {
  date: string;
  weatherSummary: string;
  rainForecast: boolean;
  todayTasks: Task[];
  thisWeekTasks: Task[];
  laterTasks: Task[];
  lessons: DigestLessonItem[];
  promotionItems: PromotionDigestItem[];
  renewalItems: RenewalDigestItem[];
  growingSuggestions: GrowingSuggestionDigestItem[];
  recentGrowingKnowledge: RecentGrowingKnowledgeItem[];
  recentGrowingWindows: RecentGrowingWindowItem[];
  narrative: string;
  dashboardUrl: string;
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 16,
  margin: "24px 0 8px 0",
  fontWeight: 600,
};

const smallHeadingStyle: React.CSSProperties = {
  fontSize: 14,
  margin: "12px 0 4px 0",
  fontWeight: 600,
};

const listStyle: React.CSSProperties = {
  margin: "0 0 12px 18px",
  padding: 0,
};

function TaskSection({ label, tasks }: { label: string; tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <>
        <Heading as="h3" style={{ fontSize: 14, margin: "8px 0 4px 0" }}>
          {label}
        </Heading>
        <Text style={{ color: "#888", fontSize: 12, margin: "0 0 8px 0" }}>
          No pending tasks
        </Text>
      </>
    );
  }

  return (
    <>
      <Heading as="h3" style={{ fontSize: 14, margin: "8px 0 4px 0" }}>
        {label}
      </Heading>
      <ul style={{ ...listStyle }}>
        {tasks.map((t) => {
          const dueText = t.due_date
            ? `— due ${new Date(t.due_date).toLocaleDateString("sv-SE")}`
            : "";
          return (
            <li key={t.id}>
              {t.title}{" "}
              {dueText && (
                <span style={{ color: "#888", fontSize: 12 }}>{dueText}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function DailyDigestEmail(props: Props) {
  const {
    date,
    weatherSummary,
    rainForecast,
    todayTasks,
    thisWeekTasks,
    laterTasks,
    lessons,
    promotionItems,
    renewalItems,
    growingSuggestions,
    recentGrowingKnowledge,
    recentGrowingWindows,
    narrative,
    dashboardUrl,
  } = props;

  const hasNewKnowledge =
    recentGrowingKnowledge.length > 0 || recentGrowingWindows.length > 0;

  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: "sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
          padding: "10px",
          color: "#1a1a1a",
        }}
      >
        <Container>
          <Heading as="h1" style={{ fontSize: 20, marginBottom: 4 }}>
            Dad-Ops Daily Digest
          </Heading>
          <Text style={{ color: "#888", marginTop: 0 }}>{date}</Text>

          {/* Weather */}
          <Section
            style={{
              background: "#f0f4ff",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 24,
            }}
          >
            <Text style={{ margin: 0 }}>
              <strong>🌤 Stockholm Weather:</strong> {weatherSummary}
              {rainForecast ? (
                <>
                  <br />
                  <strong style={{ color: "#2563eb" }}>
                    ☔ Remind kids to bring rain coats today!
                  </strong>
                </>
              ) : null}
            </Text>
          </Section>

          {/* Briefing */}
          <Section
            style={{
              background: "#f9f9f9",
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            <Heading
              as="h2"
              style={{ marginTop: 0, fontSize: 16, fontWeight: 600 }}
            >
              Today&apos;s Briefing
            </Heading>
            {narrative.split("\n").map((p, idx) => (
              <Text key={idx} style={{ margin: "8px 0" }}>
                {p}
              </Text>
            ))}
          </Section>

          {/* Tasks */}
          <Heading as="h2" style={sectionHeadingStyle}>
            Your Tasks
          </Heading>
          <TaskSection label="📅 Today" tasks={todayTasks} />
          <TaskSection label="📆 This Week" tasks={thisWeekTasks} />
          <TaskSection label="🗂 Later" tasks={laterTasks} />

          {/* Growing inspirations */}
          {growingSuggestions.length > 0 && (
            <>
              <Heading as="h2" style={sectionHeadingStyle}>
                Inspirations for growing this week
              </Heading>
              <ul style={listStyle}>
                {growingSuggestions.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>: {item.details}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* New Growing Knowledge */}
          {hasNewKnowledge && (
            <>
              <Heading as="h2" style={sectionHeadingStyle}>
                New Growing Knowledge
              </Heading>

              {recentGrowingWindows.length > 0 && (
                <>
                  <Heading as="h3" style={smallHeadingStyle}>
                    Actionable Tips from Videos
                  </Heading>
                  <ul style={listStyle}>
                    {recentGrowingWindows.map((item) => (
                      <li key={item.title}>
                        <strong>{item.title}</strong>: {item.note}
                        {item.sourceUrl ? (
                          <>
                            {" "}
                            (
                            <a
                              href={item.sourceUrl}
                              style={{ color: "#2563eb" }}
                            >
                              Source
                            </a>
                            )
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {recentGrowingKnowledge.length > 0 && (
                <>
                  <Heading as="h3" style={smallHeadingStyle}>
                    Reference Knowledge
                  </Heading>
                  <ul style={listStyle}>
                    {recentGrowingKnowledge.map((item) => {
                      const snippet =
                        item.content.length > 220
                          ? `${item.content.slice(0, 220)}...`
                          : item.content;
                      return (
                        <li key={item.title}>
                          <strong>{item.title}</strong> ({item.category}):{" "}
                          {snippet}
                          {item.sourceUrl ? (
                            <>
                              {" "}
                              (
                              <a
                                href={item.sourceUrl}
                                style={{ color: "#2563eb" }}
                              >
                                Source
                              </a>
                              )
                            </>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}

          {/* Upcoming Renewals */}
          {renewalItems.length > 0 && (
            <>
              <Heading as="h2" style={sectionHeadingStyle}>
                Upcoming Renewals
              </Heading>
              <ul style={listStyle}>
                {renewalItems.map((item) => (
                  <li key={item.title}>
                    {item.title} — due in {item.daysLeft} days (
                    {new Date(item.dueDate).toLocaleDateString("sv-SE")})
                    {item.link ? (
                      <>
                        {" "}
                        (
                        <a href={item.link} style={{ color: "#2563eb" }}>
                          Open
                        </a>
                        )
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}


          {/* Deals */}
          {promotionItems.length > 0 && (
            <>
              <Heading as="h2" style={sectionHeadingStyle}>
                Deals for You
              </Heading>
              <ul style={listStyle}>
                {promotionItems.map((item, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={`${item.store}-${idx}`}>
                    <strong>{item.store}</strong>: {item.summary}
                    {item.link ? (
                      <>
                        {" "}
                        (
                        <a href={item.link} style={{ color: "#2563eb" }}>
                          Open deal
                        </a>
                        )
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "24px 0",
            }}
          />
          <Text
            style={{
              color: "#888",
              fontSize: 12,
              textAlign: "center",
              margin: 0,
            }}
          >
            <a href={dashboardUrl} style={{ color: "#2563eb" }}>
              Open Dashboard
            </a>{" "}
            · Dad-Ops Agent
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

