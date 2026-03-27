// app/api/chat/route.js
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // System prompt for study assistant
    const systemPrompt = `You are a helpful AI study assistant designed to help students learn effectively. Your role is to:

1. Explain complex concepts in simple, easy-to-understand terms
2. Answer questions about any academic subject
3. Create study plans and learning strategies
4. Quiz students to test their knowledge
5. Provide study tips and memory techniques
6. Break down difficult topics into manageable chunks
7. Encourage and motivate students in their learning journey

Guidelines:
- Be friendly, patient, and encouraging
- Use clear, concise language
- Provide examples when explaining concepts
- Ask clarifying questions if the student's request is unclear
- Adapt your teaching style to the student's needs
- Use analogies and real-world examples to make learning relatable
- When quizzing, provide explanations for correct and incorrect answers

Always aim to make learning engaging and accessible for students of all levels.`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
    });

    // Extract the response text
    const assistantMessage = response.content[0].text;

    return NextResponse.json({
      message: assistantMessage,
      content: assistantMessage, // Support both formats
    });

  } catch (error) {
    console.error("Chat API error:", error);
    
    // Handle specific Anthropic API errors
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    if (error.status === 401) {
      return NextResponse.json(
        { error: "API authentication failed. Please check your API key." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to process chat request",
        details: error.message 
      },
      { status: 500 }
    );
  }
}