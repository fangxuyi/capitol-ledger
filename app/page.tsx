import TrackerDashboard from "./components/TrackerDashboard";
import { requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <TrackerDashboard viewer={{ displayName: user.displayName, email: user.email }} />;
}
