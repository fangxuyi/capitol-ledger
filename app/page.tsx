import TrackerDashboard from "./components/TrackerDashboard";
import { getDashboardData } from "../db/analytics";
import { requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  const data = await getDashboardData();
  return <TrackerDashboard initialData={data} viewer={{ displayName: user.displayName, email: user.email }} />;
}
