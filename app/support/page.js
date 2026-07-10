import { SupportChatbot } from "./support-chatbot";

export const metadata = {
  title: "Support | FIFA X BTS Watch Party",
};

export default function SupportPage({ searchParams }) {
  const inviteToken = typeof searchParams?.invite === "string" ? searchParams.invite : "";

  return (
    <main className="app-frame support-page">
      <section className="support-shell">
        <header className="support-header">
          <p className="support-eyebrow">support</p>
          <h1>Chat with us</h1>
        </header>

        <SupportChatbot inviteToken={inviteToken} />
      </section>
    </main>
  );
}
