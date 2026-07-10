import { NextRequest, NextResponse } from "next/server";
import { corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/db";
import { conversations, messages, leads, campaigns } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { generateBotReply } from "@/lib/llm";

export const runtime = "edge";

export async function OPTIONS() {
  return corsPreflight();
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s-]{8,14}\d)/;

// POST /api/chat/message
// Body (freeform chat): { conversationId, text }
// Body (flow answer):   { conversationId, stepId, answerLabel, answerValue }
// Body (contact step):  { conversationId, stepId, contact: { email, whatsapp } }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, stepId, text, answerLabel, answerValue, contact } = body;

    if (!conversationId) {
      return corsJson({ error: "conversationId is required" }, { status: 400 });
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      return corsJson({ error: "Conversation not found" }, { status: 404 });
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, conversation.campaignId))
      .limit(1);

    // --- Flow-based contact step: visitor submitted email/whatsapp form ---
    if (contact) {
      const email = contact.email?.trim() || null;
      const whatsapp = contact.whatsapp?.trim() || null;

      await db.insert(messages).values({
        conversationId,
        sender: "visitor",
        content: [email, whatsapp].filter(Boolean).join(" / ") || "(submitted contact info)",
      });

      if (!conversation.converted) {
        await db.insert(leads).values({
          conversationId,
          campaignId: conversation.campaignId,
          clientId: campaign!.clientId,
          email,
          phone: whatsapp,
        });
        await db.update(conversations).set({ converted: true }).where(eq(conversations.id, conversationId));
      }

      return corsJson({ leadCaptured: true });
    }

    // --- Flow-based multiple-choice answer: just log it, widget already knows the next step ---
    if (stepId && (answerLabel || answerValue)) {
      await db.insert(messages).values({
        conversationId,
        sender: "visitor",
        content: answerLabel || answerValue,
      });
      return corsJson({ ok: true });
    }

    // --- Freeform text chat fallback (campaigns without a configured flow) ---
    if (!text?.trim()) {
      return corsJson({ error: "text is required for freeform chat" }, { status: 400 });
    }

    await db.insert(messages).values({
      conversationId,
      sender: "visitor",
      content: text,
    });

    // --- Lead auto-capture: scan message for email/phone, accumulate both over time ---
    const emailMatch = text.match(EMAIL_RE)?.[0];
    const phoneMatch = text.match(PHONE_RE)?.[0];

    if (emailMatch || phoneMatch) {
      const [existingLead] = await db
        .select()
        .from(leads)
        .where(eq(leads.conversationId, conversationId))
        .limit(1);

      if (existingLead) {
        await db
          .update(leads)
          .set({
            email: existingLead.email || emailMatch || null,
            phone: existingLead.phone || phoneMatch || null,
          })
          .where(eq(leads.id, existingLead.id));
      } else {
        await db.insert(leads).values({
          conversationId,
          campaignId: conversation.campaignId,
          clientId: campaign!.clientId,
          email: emailMatch || null,
          phone: phoneMatch || null,
        });
      }

      const finalEmail = existingLead?.email || emailMatch;
      const finalPhone = existingLead?.phone || phoneMatch;
      if (finalEmail && finalPhone && !conversation.converted) {
        await db.update(conversations).set({ converted: true }).where(eq(conversations.id, conversationId));
      }
    }

    // --- Bot reply logic ---
    // Pulls the full conversation history and asks Claude for a natural,
    // context-aware reply instead of walking a fixed question script.
    const priorMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    const history = priorMessages.map((m) => ({
      sender: m.sender as "bot" | "visitor",
      content: m.content,
    }));

    const reply = await generateBotReply({
      campaignName: campaign?.name || "this site",
      botConfig: campaign?.botConfig,
      history,
      leadAlreadyCaptured: conversation.converted,
    });

    await db.insert(messages).values({
      conversationId,
      sender: "bot",
      content: reply,
    });

    return corsJson({ reply, leadCaptured: Boolean(emailMatch || phoneMatch) });
  } catch (err) {
    console.error(err);
    return corsJson({ error: "Failed to process message" }, { status: 500 });
  }
}
