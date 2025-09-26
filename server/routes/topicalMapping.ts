import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { dataForSEOService } from "../services/dataforseo";
import { insertTopicalMappingSessionSchema, insertRelatedKeywordSchema, insertGeneratedTitleSchema } from "@shared/schema";
import { generateBlogContentWithClaude } from "../services/claude";

const topicalMappingRouter = Router();

// Fallback title generation for when APIs fail
function generateFallbackTitles(keyword: string, count: number = 10): string[] {
  const titleTemplates = [
    `The Complete Guide to ${keyword}`,
    `${keyword}: Everything You Need to Know`,
    `${keyword} for Beginners: A Step-by-Step Guide`,
    `${keyword}: Pros and Cons Explained`,
    `Comparing Different ${keyword} Methods`,
    `${keyword}: Best Practices and Tips`,
    `${keyword}: Common Mistakes to Avoid`,
    `How to Choose the Right ${keyword}`,
    `${keyword}: Benefits and Drawbacks`,
    `${keyword}: Techniques and Strategies`,
    `${keyword}: A Comprehensive Overview`,
    `${keyword}: What You Need to Know`,
    `${keyword}: Effective Methods and Approaches`,
    `${keyword}: Success Stories and Case Studies`,
    `${keyword}: Troubleshooting Common Issues`
  ];

  return titleTemplates.slice(0, count);
}

// Generate titles for a specific keyword with multiple fallbacks
async function generateTitlesForKeyword(keyword: string, keywordId: number, count: number = 10): Promise<any[]> {
  console.log(`Generating ${count} titles for keyword: "${keyword}" (ID: ${keywordId})`);
  
  try {
    // Try Claude API first
    const claudeContent = await generateBlogContentWithClaude({
      topic: keyword,
      length: 'short',
      requesterInfo: { storeId: 1 }
    });

    if (claudeContent && claudeContent.titles && claudeContent.titles.length > 0) {
      const createdTitles = [];
      
      for (let i = 0; i < Math.min(claudeContent.titles.length, count); i++) {
        const title = await storage.createGeneratedTitle({
          keywordId: keywordId,
          title: claudeContent.titles[i],
          isSelected: false
        });
        createdTitles.push(title);
      }
      
      console.log(`✅ Generated ${createdTitles.length} titles using Claude API`);
      return createdTitles;
    }
  } catch (claudeError) {
    console.log(`Claude API failed for keyword "${keyword}":`, claudeError.message);
  }

  // Fallback to template-based generation
  console.log(`🔄 Using fallback title generation for "${keyword}"`);
  const fallbackTitles = generateFallbackTitles(keyword, count);
  const createdTitles = [];
  
  for (const titleText of fallbackTitles) {
    try {
      const title = await storage.createGeneratedTitle({
        keywordId: keywordId,
        title: titleText,
        isSelected: false
      });
      createdTitles.push(title);
    } catch (error) {
      console.error(`Failed to save fallback title "${titleText}":`, error);
    }
  }
  
  console.log(`✅ Generated ${createdTitles.length} fallback titles for "${keyword}"`);
  return createdTitles;
}

// Create a new topical mapping session and fetch related keywords
topicalMappingRouter.post("/create-session", async (req: Request, res: Response) => {
  try {
    const reqSchema = z.object({
      rootKeyword: z.string().min(1, "Root keyword is required"),
      storeId: z.number().int().positive(),
      languageCode: z.string().optional().default("en"),
      locationCode: z.string().optional().default("2840")
    });

    const { rootKeyword, storeId, languageCode, locationCode } = reqSchema.parse(req.body);

    console.log(`Creating topical mapping session for keyword: "${rootKeyword}" (Store: ${storeId})`);

    // Create the topical mapping session
    const session = await storage.createTopicalMappingSession({
      storeId,
      rootKeyword,
      status: "pending",
      languageCode,
      locationCode
    });

    // Fetch related keywords from DataForSEO API
    try {
      console.log(`Fetching related keywords for "${rootKeyword}" using DataForSEO`);
      const keywordSuggestions = await dataForSEOService.getKeywordSuggestions(
        rootKeyword,
        locationCode,
        languageCode,
        5 // Get top 5 related keywords
      );

      // Store the related keywords in the database
      const relatedKeywords = [];
      for (const suggestion of keywordSuggestions) {
        const keyword = await storage.createRelatedKeyword({
          sessionId: session.id,
          keyword: suggestion.keyword,
          searchVolume: suggestion.search_volume || null,
          difficulty: Math.round((suggestion.competition || 0) * 100), // Convert to 0-100 scale
          cpcCents: suggestion.cpc ? Math.round(suggestion.cpc * 100) : null // Convert to cents
        });
        relatedKeywords.push(keyword);
      }

      // Automatically generate titles for all keywords
      console.log(`Auto-generating titles for ${relatedKeywords.length} keywords`);
      const keywordsWithTitles = [];
      
      for (const keyword of relatedKeywords) {
        try {
          // Generate titles for this keyword
          const titles = await generateTitlesForKeyword(keyword.keyword, keyword.id);
          keywordsWithTitles.push({
            ...keyword,
            titles: titles
          });
        } catch (error) {
          console.error(`Failed to generate titles for keyword "${keyword.keyword}":`, error);
          // Add keyword without titles on error
          keywordsWithTitles.push({
            ...keyword,
            titles: []
          });
        }
      }

      // Update session status to completed
      await storage.updateTopicalMappingSession(session.id, { status: "completed" });

      console.log(`Successfully created session with ${relatedKeywords.length} related keywords and auto-generated titles`);

      res.json({
        success: true,
        session: { ...session, status: "completed" },
        keywords: keywordsWithTitles
      });

    } catch (dataForSEOError: any) {
      console.error("DataForSEO API error:", dataForSEOError);
      
      // Update session status to failed
      await storage.updateTopicalMappingSession(session.id, { status: "failed" });

      res.status(500).json({
        success: false,
        error: "Failed to fetch keyword suggestions",
        details: dataForSEOError.message,
        session: { ...session, status: "failed" }
      });
    }

  } catch (error: any) {
    console.error("Error creating topical mapping session:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

// Generate titles for a specific keyword using Claude AI
topicalMappingRouter.post("/generate-titles", async (req: Request, res: Response) => {
  try {
    const reqSchema = z.object({
      keywordId: z.number().int().positive(),
      keyword: z.string().min(1),
      count: z.number().int().min(1).max(20).optional().default(10)
    });

    const { keywordId, keyword, count } = reqSchema.parse(req.body);

    console.log(`Generating ${count} titles for keyword: "${keyword}" (ID: ${keywordId})`);

    // Create a prompt for generating SEO-optimized titles
    const titlePrompt = `Generate ${count} SEO-optimized, engaging blog post titles for the keyword "${keyword}". 

Requirements:
- Each title should be unique and compelling
- Include the target keyword naturally
- Titles should be 40-60 characters long for optimal SEO
- Mix different content types: how-to guides, listicles, comparisons, tips, etc.
- Make them clickable and valuable to readers
- Avoid duplicate concepts or phrasing

Return ONLY a JSON array of strings, no additional text or formatting. Example format:
["Title 1", "Title 2", "Title 3"]`;

    try {
      // Use Claude to generate titles
      const response = await generateBlogContentWithClaude({
        topic: keyword,
        tone: "professional",
        length: "short",
        customPrompt: titlePrompt
      });

      // Parse the generated content to extract titles
      let titles: string[] = [];
      try {
        // Try to extract JSON array from the response
        const content = response.content || "";
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          titles = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: split by lines and clean up
          titles = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && !line.startsWith('*'))
            .map(line => line.replace(/^\d+\.?\s*/, '').replace(/^[-•]\s*/, ''))
            .filter(line => line.length > 10)
            .slice(0, count);
        }
      } catch (parseError) {
        console.error("Error parsing AI response, using fallback:", parseError);
        // Fallback: create basic titles
        titles = [
          `Ultimate Guide to ${keyword}`,
          `How to Master ${keyword}: Complete Tutorial`,
          `Top 10 ${keyword} Tips for Beginners`,
          `${keyword}: Everything You Need to Know`,
          `Best Practices for ${keyword} Success`,
          `Common ${keyword} Mistakes to Avoid`,
          `${keyword} vs Alternatives: Complete Comparison`,
          `Advanced ${keyword} Strategies That Work`,
          `${keyword} for Professionals: Expert Guide`,
          `Quick ${keyword} Solutions for Busy People`
        ].slice(0, count);
      }

      // Ensure we have the right number of titles
      if (titles.length < count) {
        const additionalTitles = [
          `Complete ${keyword} Handbook`,
          `${keyword} Made Simple: Step by Step`,
          `Professional ${keyword} Techniques`,
          `${keyword} Secrets Revealed`,
          `Master ${keyword} in 30 Days`
        ];
        titles.push(...additionalTitles.slice(0, count - titles.length));
      }

      // Store the generated titles in the database
      const generatedTitles = [];
      for (const title of titles.slice(0, count)) {
        if (title && title.trim()) {
          const generatedTitle = await storage.createGeneratedTitle({
            keywordId,
            title: title.trim(),
            isSelected: false
          });
          generatedTitles.push(generatedTitle);
        }
      }

      console.log(`Successfully generated ${generatedTitles.length} titles for keyword "${keyword}"`);

      res.json({
        success: true,
        titles: generatedTitles,
        keyword,
        keywordId
      });

    } catch (aiError: any) {
      console.error("Claude AI error:", aiError);
      res.status(500).json({
        success: false,
        error: "Failed to generate titles",
        details: aiError.message
      });
    }

  } catch (error: any) {
    console.error("Error generating titles:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

// Toggle title selection status
topicalMappingRouter.post("/toggle-title", async (req: Request, res: Response) => {
  try {
    const reqSchema = z.object({
      titleId: z.number().int().positive(),
      isSelected: z.boolean()
    });

    const { titleId, isSelected } = reqSchema.parse(req.body);

    console.log(`Toggling title selection: ID ${titleId} to ${isSelected}`);

    const updatedTitle = await storage.updateGeneratedTitle(titleId, { isSelected });

    res.json({
      success: true,
      title: updatedTitle
    });

  } catch (error: any) {
    console.error("Error toggling title selection:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

// Get all sessions for a store
topicalMappingRouter.get("/sessions/:storeId", async (req: Request, res: Response) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid store ID"
      });
    }

    const sessions = await storage.getTopicalMappingSessions(storeId);

    res.json({
      success: true,
      sessions
    });

  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch sessions"
    });
  }
});

// Get session details with related keywords and titles
topicalMappingRouter.get("/session/:sessionId", async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session ID"
      });
    }

    const session = await storage.getTopicalMappingSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found"
      });
    }

    const keywords = await storage.getRelatedKeywords(sessionId);
    const keywordsWithTitles = [];

    for (const keyword of keywords) {
      const titles = await storage.getGeneratedTitles(keyword.id);
      keywordsWithTitles.push({
        ...keyword,
        titles
      });
    }

    res.json({
      success: true,
      session,
      keywords: keywordsWithTitles
    });

  } catch (error: any) {
    console.error("Error fetching session details:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch session details"
    });
  }
});

// Get selected titles for bulk generation
topicalMappingRouter.get("/selected-titles/:sessionId", async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session ID"
      });
    }

    const selectedTitles = await storage.getSelectedTitles(sessionId);

    res.json({
      success: true,
      selectedTitles,
      count: selectedTitles.length
    });

  } catch (error: any) {
    console.error("Error fetching selected titles:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch selected titles"
    });
  }
});

// Bulk select/deselect titles
topicalMappingRouter.post("/bulk-toggle-titles", async (req: Request, res: Response) => {
  try {
    const reqSchema = z.object({
      titleIds: z.array(z.number().int().positive()),
      isSelected: z.boolean()
    });

    const { titleIds, isSelected } = reqSchema.parse(req.body);

    console.log(`Bulk toggling ${titleIds.length} titles to ${isSelected}`);

    const updatedTitles = [];
    for (const titleId of titleIds) {
      try {
        const updatedTitle = await storage.updateGeneratedTitle(titleId, { isSelected });
        updatedTitles.push(updatedTitle);
      } catch (error) {
        console.error(`Error updating title ${titleId}:`, error);
      }
    }

    res.json({
      success: true,
      updatedTitles,
      count: updatedTitles.length
    });

  } catch (error: any) {
    console.error("Error bulk toggling titles:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

export default topicalMappingRouter;
