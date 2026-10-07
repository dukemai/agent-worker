import { DashboardHeader } from "@/components/dashboard/header";
import { LearningLesson } from "@/components/dashboard/learning-lesson";

type Props = { params: Promise<{ programId: string; dayNumber: string }> };

export default async function LearningLessonPage({ params }: Props) {
  const { programId, dayNumber } = await params;
  return (
    <>
      <DashboardHeader />
      <LearningLesson programId={programId} dayNumber={Number(dayNumber)} />
    </>
  );
}
