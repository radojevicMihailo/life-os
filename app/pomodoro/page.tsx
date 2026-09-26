import { fetchTasks } from "@/lib/tasks-query";
import { PomodoroView } from "./_components/PomodoroView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pomodoro · Life OS",
};

export default async function PomodoroPage() {
  let taskOptions: { id: string; title: string; projectName: string | null }[] = [];
  let taskLoadError = false;
  try {
    const tasks = await fetchTasks({ status: "active", parentTaskId: null, sort: "title" });
    taskOptions = tasks.map(({ id, title, projectName }) => ({ id, title, projectName: projectName ?? null }));
  } catch {
    taskLoadError = true;
  }

  return <PomodoroView tasks={taskOptions} taskLoadError={taskLoadError} />;
}
