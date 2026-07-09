import { FaqChatbot } from "./faq-chatbot";

export const metadata = {
  title: "FAQ | FIFA X BTS Watch Party",
};

export default function FaqPage() {
  return (
    <main className="app-frame faq-page">
      <section className="faq-shell">
        <header className="faq-header">
          <p className="faq-eyebrow">FAQ</p>
          <h1>Chat with us</h1>
        </header>

        <FaqChatbot />
      </section>
    </main>
  );
}
