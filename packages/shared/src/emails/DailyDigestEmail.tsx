import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
  Hr,
  Row,
  Column,
  Tailwind,
  Preview,
} from "@react-email/components";
import React, { Fragment } from "react";
import type {
  DigestLessonItem,
  GrowingSuggestionDigestItem,
  GrowingTaskDigestItem,
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

function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <Text className="text-gray-400 text-[14px] italic m-0">
        No pending tasks
      </Text>
    );
  }

  return (
    <>
      {tasks.map((task, index) => (
        <Fragment key={task.id}>
          {index > 0 && <Hr className="border-gray-900/5 my-[12px]" />}
          <Section>
            <Row>
              <Column
                width="32"
                className="pr-[12px]"
                valign="top"
              >
                <Section className="w-[28px] h-[28px] rounded-full bg-indigo-50 border border-solid border-indigo-100 flex items-center justify-center">
                  <Text className="m-0 text-indigo-600 font-bold text-[13px] text-center w-full leading-[28px]">
                    {index + 1}
                  </Text>
                </Section>
              </Column>
              <Column>
                <Text className="m-0 font-semibold text-[16px] text-gray-900">
                  {task.title}
                </Text>
                {task.due_date && (
                   <Text className="m-0 text-[12px] text-gray-400 uppercase tracking-wider font-medium mt-[2px]">
                     Due: {new Date(task.due_date).toLocaleDateString("sv-SE")}
                   </Text>
                )}
                {task.original_body && (
                  <Text className="m-0 mt-[6px] text-[14px] text-gray-500 leading-[20px]">
                    {task.original_body}
                  </Text>
                )}
              </Column>
            </Row>
          </Section>
        </Fragment>
      ))}
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
      <Tailwind>
        <Head />
        <Preview>Your Daily Dad-Ops Digest for {date}</Preview>
        <Body className="bg-white font-sans text-gray-900">
          <Container className="mx-auto py-[20px] px-[10px] max-w-[600px]">
            <Section className="mb-[32px]">
              <Heading className="m-0 text-[28px] font-bold text-gray-950 tracking-tight leading-tight">
                Dad-Ops Daily
              </Heading>
              <Text className="m-0 mt-[4px] text-[14px] text-gray-500 font-medium tracking-wide uppercase">
                {date}
              </Text>
            </Section>

            {/* Weather Block */}
            <Section className="bg-blue-50/50 rounded-xl p-[20px] mb-[32px] border border-solid border-blue-100/50">
              <Row>
                <Column width="40" valign="top" className="pr-[12px]">
                   <Text className="m-0 text-[24px]">🌤</Text>
                </Column>
                <Column>
                  <Text className="m-0 text-gray-700 leading-[24px]">
                    <strong>Stockholm Weather:</strong> {weatherSummary}
                  </Text>
                  {rainForecast && (
                    <Text className="m-0 mt-[8px] text-blue-700 font-semibold">
                      ☔ Remind kids to bring rain coats today!
                    </Text>
                  )}
                </Column>
              </Row>
            </Section>

            {/* Today's Briefing */}
            <Section className="mb-[40px]">
              <Heading className="m-0 text-[14px] font-bold text-indigo-600 uppercase tracking-[0.1em] mb-[12px]">
                Today&apos;s Briefing
              </Heading>
              <Section className="bg-gray-50 rounded-xl p-[24px] border border-solid border-gray-100">
                {narrative.split("\n\n").map((p, idx, arr) => (
                  <Text key={idx} className={`m-0 text-[16px] text-gray-700 leading-[26px] ${idx === arr.length - 1 ? "" : "mb-[16px]"}`}>
                    {p}
                  </Text>
                ))}
              </Section>
            </Section>

            {/* Tasks Section */}
            <Section className="mb-[48px]">
              <Heading className="m-0 text-[22px] font-bold text-gray-950 mb-[24px]">
                Targeted Tasks
              </Heading>
              
              <Section className="mb-[32px]">
                 <Heading className="m-0 text-[14px] font-bold text-indigo-600 uppercase tracking-wider mb-[12px]">
                   📅 High Priority
                 </Heading>
                 <Section className="bg-indigo-50/30 rounded-xl p-[20px] border border-solid border-indigo-100/50">
                   <TaskList tasks={todayTasks} />
                 </Section>
              </Section>

              {thisWeekTasks.length > 0 && (
                <Section className="mb-[32px]">
                   <Heading className="m-0 text-[14px] font-bold text-blue-600 uppercase tracking-wider mb-[12px]">
                     📆 Upcoming this Week
                   </Heading>
                   <Section className="bg-blue-50/30 rounded-xl p-[20px] border border-solid border-blue-100/50">
                     <TaskList tasks={thisWeekTasks} />
                   </Section>
                </Section>
              )}
            </Section>

            {/* Growing Suggestions/Inspirations */}
            {growingSuggestions.length > 0 && (
              <Section className="mb-[48px]">
                <Heading className="m-0 text-[22px] font-bold text-gray-950 mb-[16px]">
                  Growing Insights
                </Heading>
                
                {/* Actions First */}
                {growingSuggestions.filter(s => s.suggestion_kind !== 'inspiration').length > 0 && (
                  <Section className="mb-[24px]">
                    <Heading className="m-0 text-[14px] font-bold text-indigo-600 uppercase tracking-wider mb-[12px]">
                      Recommended Actions
                    </Heading>
                    <Section className="bg-emerald-50/30 rounded-xl p-[20px] border border-solid border-emerald-100/50">
                      {growingSuggestions
                        .filter(s => s.suggestion_kind !== 'inspiration')
                        .map((item, index, arr) => (
                        <Fragment key={item.title}>
                          {index > 0 && <Hr className="border-emerald-100/30 my-[16px]" />}
                          <Row>
                            <Column width="32" valign="top" className="pr-[12px]">
                              <Section className="w-[24px] h-[24px] rounded-full bg-emerald-100 flex items-center justify-center">
                                <Text className="m-0 text-emerald-700 font-bold text-[12px]">✓</Text>
                              </Section>
                            </Column>
                            <Column>
                              <Text className="m-0 font-semibold text-[15px] text-gray-900">
                                {item.title}
                                {item.status === 'converted' && (
                                  <span className="ml-[8px] text-[10px] bg-emerald-100 text-emerald-700 px-[6px] py-[2px] rounded uppercase font-bold tracking-tighter">
                                    Converted
                                  </span>
                                )}
                              </Text>
                              <Text className="m-0 mt-[4px] text-[14px] text-gray-600 leading-[22px]">
                                {item.details}
                              </Text>
                            </Column>
                          </Row>
                        </Fragment>
                      ))}
                    </Section>
                  </Section>
                )}

                {/* Inspirations Second */}
                {growingSuggestions.filter(s => s.suggestion_kind === 'inspiration').length > 0 && (
                  <Section>
                    <Heading className="m-0 text-[14px] font-bold text-amber-600 uppercase tracking-wider mb-[12px]">
                      Weekly Inspirations
                    </Heading>
                    <Section className="bg-amber-50/30 rounded-xl p-[20px] border border-solid border-amber-100/50">
                      {growingSuggestions
                        .filter(s => s.suggestion_kind === 'inspiration')
                        .map((item, index, arr) => (
                        <Fragment key={item.title}>
                          {index > 0 && <Hr className="border-amber-100/30 my-[16px]" />}
                          <Row>
                            <Column width="32" valign="top" className="pr-[12px]">
                              <Text className="m-0 text-amber-600 font-bold text-[16px]">💡</Text>
                            </Column>
                            <Column>
                              <Text className="m-0 font-semibold text-[15px] text-gray-900">
                                {item.title}
                                {item.status === 'converted' && (
                                  <span className="ml-[8px] text-[10px] bg-amber-100 text-amber-700 px-[6px] py-[2px] rounded uppercase font-bold tracking-tighter">
                                    Converted
                                  </span>
                                )}
                              </Text>
                              <Text className="m-0 mt-[4px] text-[14px] text-gray-600 leading-[22px]">
                                {item.details}
                              </Text>
                            </Column>
                          </Row>
                        </Fragment>
                      ))}
                    </Section>
                  </Section>
                )}
              </Section>
            )}

            {/* New Growing Knowledge */}
            {hasNewKnowledge && (
              <Section className="mb-[48px]">
                <Heading className="m-0 text-[22px] font-bold text-gray-950 mb-[24px]">
                  Garden Intelligence
                </Heading>

                {recentGrowingWindows.length > 0 && (
                  <Section className="mb-[24px]">
                    <Heading className="m-0 text-[14px] font-bold text-indigo-600 uppercase tracking-wider mb-[16px]">
                      Actionable Tips
                    </Heading>
                    {recentGrowingWindows.map((item, idx, arr) => (
                      <Section key={item.title} className={`${idx === arr.length - 1 ? "" : "mb-[16px]"}`}>
                        <Text className="m-0 font-semibold text-[15px] text-gray-900 border-l-[3px] border-solid border-indigo-200 pl-[12px]">
                          {item.title}
                          {item.sourceUrl && (
                             <a href={item.sourceUrl} className="ml-[8px] text-[12px] text-indigo-500 font-medium underline">
                               Watch source
                             </a>
                          )}
                        </Text>
                        <Text className="m-0 mt-[6px] text-[14px] text-gray-600 leading-[22px] pl-[15px]">
                          {item.note}
                        </Text>
                      </Section>
                    ))}
                  </Section>
                )}

                {recentGrowingKnowledge.length > 0 && (
                  <Section className="mt-[32px]">
                    <Heading className="m-0 text-[14px] font-bold text-gray-400 uppercase tracking-wider mb-[16px]">
                      Reference Updates
                    </Heading>
                    {recentGrowingKnowledge.map((item, idx, arr) => (
                      <Section key={item.title} className={`${idx === arr.length - 1 ? "" : "mb-[16px]"}`}>
                         <Text className="m-0 font-semibold text-[15px] text-gray-900">
                           {item.title} <span className="text-gray-400 font-normal text-[13px] ml-[4px]">#{item.category}</span>
                         </Text>
                         <Text className="m-0 mt-[4px] text-[14px] text-gray-600 leading-[22px]">
                           {item.content.length > 200 ? `${item.content.slice(0, 200)}...` : item.content}
                           {item.sourceUrl && (
                             <a href={item.sourceUrl} className="ml-[6px] text-indigo-500 underline">
                               Read more
                             </a>
                           )}
                         </Text>
                      </Section>
                    ))}
                  </Section>
                )}
              </Section>
            )}

            {/* Upcoming Renewals */}
            {renewalItems.length > 0 && (
              <Section className="mb-[48px]">
                <Heading className="m-0 text-[22px] font-bold text-gray-950 mb-[16px]">
                  Upcoming Renewals
                </Heading>
                <Section className="bg-amber-50/50 rounded-xl p-[20px] border border-solid border-amber-100">
                  {renewalItems.map((item, index) => (
                    <Fragment key={item.title}>
                      {index > 0 && <Hr className="border-amber-100/50 my-[12px]" />}
                      <Row>
                         <Column width="24" valign="top">
                           <Text className="m-0 text-[14px]">🔔</Text>
                         </Column>
                         <Column>
                            <Text className="m-0 font-semibold text-[15px] text-amber-900">
                              {item.title}
                            </Text>
                            <Text className="m-0 text-[13px] text-amber-700 mt-[2px]">
                              Due in <strong>{item.daysLeft} days</strong> ({new Date(item.dueDate).toLocaleDateString("sv-SE")})
                              {item.link && (
                                <a href={item.link} className="ml-[8px] underline italic">
                                  Go to renewal
                                </a>
                              )}
                            </Text>
                         </Column>
                      </Row>
                    </Fragment>
                  ))}
                </Section>
              </Section>
            )}

            {/* Deals */}
            {promotionItems.length > 0 && (
              <Section className="mb-[48px]">
                <Heading className="m-0 text-[22px] font-bold text-gray-950 mb-[16px]">
                  Handpicked Deals
                </Heading>
                {promotionItems.map((item, idx, arr) => (
                  <Section key={`${item.store}-${idx}`} className={`${idx === arr.length - 1 ? "" : "mb-[12px]"} border border-solid border-gray-100 rounded-lg p-[16px]`}>
                    <Text className="m-0 font-bold text-[14px] text-indigo-600 uppercase tracking-tight">
                      {item.store}
                    </Text>
                    <Text className="m-0 mt-[4px] font-semibold text-[16px] text-gray-900">
                      {item.summary}
                    </Text>
                    {item.link && (
                      <a href={item.link} className="inline-block mt-[8px] text-[13px] font-semibold text-white bg-indigo-600 px-[12px] py-[6px] rounded-md no-underline">
                        View Deal
                      </a>
                    )}
                  </Section>
                ))}
              </Section>
            )}

            <Hr className="border-gray-100 mt-[48px] mb-[24px]" />
            
            <Section className="text-center">
              <a href={dashboardUrl} className="inline-block px-[24px] py-[12px] bg-gray-950 text-white rounded-lg font-bold text-[15px] no-underline">
                 Open Dashboard
              </a>
              <Text className="m-0 mt-[24px] text-[12px] text-gray-400 font-medium uppercase tracking-[0.2em]">
                Dad-Ops Agent · Personal Efficiency
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

