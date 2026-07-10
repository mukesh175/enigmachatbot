/**
 * Thin wrapper around the Groq API (OpenAI-compatible chat completions) for
 * generating the bot's replies. Groq is used instead of a paid-only provider
 * because it has a genuinely usable free tier and very low latency — both
 * matter a lot for a chat widget that needs to feel instant.
 *
 * Swapping providers later (e.g. once you're billing clients and want a
 * bigger model) only means changing this file — nothing else in the app
 * needs to know which LLM is behind it.
 */

type ChatTurn = { sender: "bot" | "visitor"; content: string };

export async function generateBotReply(opts: {
  campaignName: string;
  botConfig: any;
  history: ChatTurn[];
  leadAlreadyCaptured: boolean;
}): Promise<string> {
  const { campaignName, botConfig, history, leadAlreadyCaptured } = opts;

  const goal =
    botConfig?.goal ||
    "Qualify the visitor as a lead and collect their email or phone number.";
  const tone = botConfig?.tone || "friendly, concise, helpful";
  const questions: string[] = botConfig?.questions || [];

  const systemPrompt = [
    `You are a lead-generation chat assistant embedded on the landing page for "${campaignName}".`,
    `Your goal: ${goal}`,
    `Tone: ${tone}.`,
    questions.length > 0
      ? `Try to naturally work these qualifying questions into the conversation (don't ask them all in one message): ${questions.join(" | ")}`
      : "",
    leadAlreadyCaptured
      ? "The visitor's contact info has already been captured — thank them and let them know someone will follow up. Keep answering any further questions helpfully."
      : "You must collect BOTH the visitor's email address AND their WhatsApp/mobile phone number before the conversation is considered complete — not just one. If they only give one, politely ask for the other before wrapping up. Don't demand both in your very first message — build a little rapport first, then ask for email and phone/WhatsApp together in one message once they show interest.",
    "Keep every reply short: 1-3 sentences. No markdown, no headers, plain conversational text.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((t) => ({
      role: t.sender === "visitor" ? "user" : "assistant",
      content: t.content,
    })),
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages,
    }),
  });

  if (!res.ok) {
    console.error("Groq API error:", await res.text());
    // Graceful fallback so the widget never breaks if the LLM call fails
    return "Thanks for your message! Could you share your email or phone so we can follow up?";
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  return reply || "Thanks for sharing that!";
}

