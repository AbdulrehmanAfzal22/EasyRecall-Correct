// app/api/extract-segments/route.js
import { NextResponse } from "next/server";
import { OpenAI } from "openai";

// Optional: allow longer processing time on platforms that support it
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { content, fileName } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[segments] OPENAI_API_KEY is missing");
      return NextResponse.json(
        {
          error: "OpenAI API key not configured",
          details: "Set OPENAI_API_KEY in your environment to enable segments.",
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are an expert content analyst. Extract and segment educational content into logical units.

Return ONLY this JSON structure (no markdown, no extra text):
{
  "groups": [
    {
      "id": "g1",
      "title": "Thematic group name",
      "segments": [
        {
          "id": "s1",
          "type": "topic|concept|statement|fact|definition",
          "title": "Short title max 8 words",
          "content": "2-4 sentences of extracted/paraphrased content",
          "keywords": ["word1", "word2", "word3"]
        }
      ]
    }
  ]
}

Types:
- topic: broad subject area or section
- concept: abstract idea, theory, or principle  
- statement: key claim, argument, or thesis
- fact: specific data point, statistic, or concrete detail
- definition: formal definition of a term

Rules:
- 2-4 groups based on themes
- 3-6 segments per group
- 10-18 total segments
- 2-3 keywords per segment
- Return ONLY valid JSON`;

    const cleanContent = content.trim();

    // Cap the text we send for segmentation to avoid context overflow
    const MAX_SEGMENT_CHARS = 40000;
    const segmentSource = cleanContent.slice(0, MAX_SEGMENT_CHARS);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extract segments from "${fileName || "uploaded content"}":\n\n${segmentSource}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "";

    let parsed;
    try {
      // Response should already be JSON due to response_format, but keep a fallback
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) {
        return NextResponse.json(
          { error: "Failed to parse AI response", details: raw.slice(0, 300) },
          { status: 500 }
        );
      }
      parsed = JSON.parse(m[0]);
    }

    // Ensure groups structure exists
    if (!Array.isArray(parsed.groups)) {
      return NextResponse.json(
        { error: "Invalid AI response shape", details: "Missing 'groups' array in response." },
        { status: 500 }
      );
    }

    // Compute stats
    const allSegs = parsed.groups.flatMap((g) => g.segments || []);
    parsed.stats = {
      totalSegments: allSegs.length,
      topics: allSegs.filter((s) => s.type === "topic").length,
      concepts: allSegs.filter((s) => s.type === "concept").length,
      statements: allSegs.filter((s) => s.type === "statement").length,
      facts: allSegs.filter((s) => s.type === "fact").length,
      definitions: allSegs.filter((s) => s.type === "definition").length,
      wordCount: cleanContent.split(/\s+/).length,
      fileName,
    };

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("extract-segments error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}