// app/api/chat/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Post-process response to remove all markdown formatting for pure plain text output
function cleanResponse(text) {
  if (!text) return text;
  let cleaned = text;
  // Remove markdown headings (###, ##, #) and keep only the text
  cleaned = cleaned.replace(/^\s*#{1,6}\s*(.*)$/gm, (match, p1) => p1.trim());
  // Remove all bold markers (**text**) and keep only the text
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  // Remove italics (*text*)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  // Remove inline code `text`
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  // Remove strikethrough ~~text~~
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');
  // Remove blockquotes
  cleaned = cleaned.replace(/^>\s?/gm, '');
  // Remove unordered/ordered list markers
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');
  // Remove images and links
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  cleaned = cleaned.replace(/\[[^\]]*\]\([^)]*\)/g, '');
  // Remove extra blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

export async function POST(req) {
  try {
    // Handle both JSON and FormData
    let messages = [];
    let files = [];

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with files
      const formData = await req.formData();
      const messagesJson = formData.get('messages');
      if (messagesJson) {
        messages = JSON.parse(messagesJson);
      }

      // Process uploaded files
      const fileEntries = formData.getAll('files');
      files = await Promise.all(fileEntries.map(async (file) => {
        if (file.type.startsWith('image/')) {
          // Convert image to base64 for OpenAI vision
          const buffer = Buffer.from(await file.arrayBuffer());
          const base64 = buffer.toString('base64');
          return {
            type: 'image',
            mimeType: file.type,
            data: base64,
            name: file.name
          };
        } else {
          // For non-image files, try to extract text
          const buffer = Buffer.from(await file.arrayBuffer());
          const text = buffer.toString('utf-8');
          return {
            type: 'document',
            mimeType: file.type,
            text: text,
            name: file.name
          };
        }
      }));
    } else {
      // Handle JSON (backward compatibility)
      const body = await req.json();
      messages = body.messages || [];
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // System prompt - CRITICAL: NO BOLD MARKERS ALLOWED
    const systemPrompt = `You are a helpful AI study assistant designed to help students learn effectively.

CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS:
NEVER use ** (double asterisks) for bold text in your responses. NEVER use markdown formatting. Use plain text only.

Your role is to:
1. Explain complex concepts in simple, easy-to-understand terms
2. Answer questions about any academic subject
3. Create study plans and learning strategies
4. Quiz students to test their knowledge
5. Provide study tips and memory techniques
6. Break down difficult topics into manageable chunks
7. Encourage and motivate students in their learning journey
8. Analyze images, screenshots, and documents to help with learning

Guidelines:
- Be friendly, patient, and encouraging
- Use clear, concise language
- Provide examples when explaining concepts
- Ask clarifying questions if the student's request is unclear
- Adapt your teaching style to the student's needs
- Use analogies and real-world examples to make learning relatable
- When quizzing, provide explanations for correct and incorrect answers
- When analyzing images or screenshots, describe what you see and relate it to the learning context
- For text documents, summarize key points and help students understand the content
- Always aim to make learning engaging and accessible for students of all levels
- Be very informative and give answers only if you are 100% sure they are correct
- If you are not sure about the answer, say "I'm not sure about that, but I can help you find more information."

REMEMBER: DO NOT USE ** FOR BOLD. DO NOT USE MARKDOWN. PLAIN TEXT ONLY.`;

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: "system", content: systemPrompt }
    ];

    // Process each message and add any attached files
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.hasAttachments && msg.role === 'user' && files.length > 0) {
        // Create a message with both text and images
        const content = [];

        // Add text content
        if (msg.content) {
          content.push({
            type: "text",
            text: msg.content
          });
        }

        // Add file content
        files.forEach(file => {
          if (file.type === 'image') {
            content.push({
              type: "image_url",
              image_url: {
                url: `data:${file.mimeType};base64,${file.data}`
              }
            });
          } else if (file.type === 'document') {
            // Add document text as additional context
            content.push({
              type: "text",
              text: `Document "${file.name}" content:\n${file.text}`
            });
          }
        });

        openaiMessages.push({
          role: msg.role,
          content: content
        });
      } else {
        // Regular text message
        openaiMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      messages: openaiMessages,
    });

    // Extract the response text and clean it
    let assistantMessage = response.choices[0].message.content;
    // Post-process to remove any remaining ** markers
    assistantMessage = cleanResponse(assistantMessage);
    // Fallback if response is empty, only whitespace, or only '**'
    if (!assistantMessage || !assistantMessage.trim() || assistantMessage.trim() === "**") {
      assistantMessage = "Sorry, I couldn't generate a response. Please try rephrasing your question or try again later.";
    }
    return NextResponse.json({
      message: assistantMessage,
      content: assistantMessage,
    });

  } catch (error) {
    console.error("Chat API error:", error);

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

  