"use client";

import { useState } from "react";

const initialMessages = [
  {
    role: "assistant",
    text: "Hi, I am here to help. Ask me anything about the party, venue, or timing.",
  },
];

export function FaqChatbot() {
  const [messages, setMessages] = useState(initialMessages);
  const [value, setValue] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: "Thanks for your message. If you need more help, we will get back to you shortly.",
      },
    ]);
    setValue("");
  }

  return (
    <section className="chatbot-shell" aria-label="FAQ chatbot">
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <article
            className={`chatbot-message chatbot-message-${message.role}`}
            key={`${message.role}-${index}`}
          >
            {message.text}
          </article>
        ))}
      </div>

      <form className="chatbot-form" onSubmit={handleSubmit}>
        <input
          aria-label="Ask a question"
          placeholder="Type your question..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          type="text"
        />
        <button type="submit">send</button>
      </form>
    </section>
  );
}
