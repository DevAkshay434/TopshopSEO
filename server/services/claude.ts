// Integration with Anthropic's Claude API
import Anthropic from '@anthropic-ai/sdk';

interface BlogContentRequest {
  topic: string;
  tone: string;
  length: string;
  customPrompt?: string;
  systemPrompt?: string;
  includeProducts?: boolean;
  includeCollections?: boolean;
  includeKeywords?: boolean;
  contentStyleToneId?: string;
  contentStyleDisplayName?: string;
  // Media selection fields
  primaryImage?: any;
  secondaryImages?: any[];
  youtubeEmbed?: string;
  // Product linking fields
  productIds?: string[];
  productsInfo?: any[];
}

interface BlogContent {
  title: string;
  content: string;
  tags: string[];
  metaDescription: string;
}

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Function to automatically generate Table of Contents from H2 headings
function addTableOfContents(content: string): string {
  // Check if content has TOC placement marker
  if (!content.includes('<!-- TABLE_OF_CONTENTS_PLACEMENT -->')) {
    return content; // No TOC marker, return content as-is
  }
  
  // Extract all H2 headings with their id attributes
  const h2Regex = /<h2[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h2>/gi;
  const headings: { id: string; title: string }[] = [];
  let match;
  
  while ((match = h2Regex.exec(content)) !== null) {
    const id = match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim(); // Remove any HTML tags from title
    headings.push({ id, title });
  }
  
  // If no headings found, remove the TOC marker
  if (headings.length === 0) {
    return content.replace('<!-- TABLE_OF_CONTENTS_PLACEMENT -->', '');
  }
  
  // Generate TOC HTML
  const tocHtml = `
<div class="table-of-contents" style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
  <h3 style="margin-top: 0; color: #495057; font-size: 18px; font-weight: 600; border-bottom: 2px solid #007bff; padding-bottom: 8px; margin-bottom: 15px;">
    📋 Table of Contents
  </h3>
  <ol style="margin: 0; padding: 0 0 0 20px; line-height: 1.6;">
    ${headings.map(heading => 
      `<li style="margin: 8px 0;"><a href="#${heading.id}" style="color: #007bff; text-decoration: none; font-weight: 500; transition: color 0.2s ease;" onmouseover="this.style.color='#0056b3'" onmouseout="this.style.color='#007bff'">${heading.title}</a></li>`
    ).join('')}
  </ol>
</div>`;
  
  // Replace the TOC marker with the generated TOC
  return content.replace('<!-- TABLE_OF_CONTENTS_PLACEMENT -->', tocHtml);
}

// Function to remove any H1 tags from content to prevent title duplication
function removeH1Tags(content: string): string {
  // Remove H1 tags and their content, but preserve the text inside
  return content.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '');
}

// Function to process media placements and prevent duplicate secondary images
function processMediaPlacementsHandler(content: string, request: BlogContentRequest): string {
  let processedContent = content;
  
  // Handle YouTube video placement under second H2 heading
  if (request.youtubeEmbed) {
    const videoId = request.youtubeEmbed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
    
    if (videoId) {
      const videoHtml = `
<div style="margin: 20px 0; text-align: center;">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" 
    frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen style="max-width: 100%; border-radius: 8px;">
  </iframe>
</div>`;
      
      // Replace only the first occurrence (under second H2)
      processedContent = processedContent.replace('<!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->', videoHtml);
      
      // Remove any additional video placement markers
      processedContent = processedContent.replace(/<!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->/g, '');
    }
  }
  
  // Handle secondary images placement - ensure no duplicates and proper distribution with product links
  if (request.secondaryImages && request.secondaryImages.length > 0) {
    // Find all secondary image placement markers
    const markers = processedContent.match(/<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->/g);
    const availableMarkers = markers ? markers.length : 0;
    
    // Create a set to track used image URLs to prevent duplicates
    const usedImages = new Set<string>();
    
    // Get products information for linking (from request or from secondary image metadata)
    const availableProducts = request.productIds || [];
    
    // Process each marker location with a unique image
    for (let i = 0; i < availableMarkers && i < request.secondaryImages.length; i++) {
      const image = request.secondaryImages[i];
      
      // Skip if this image URL has already been used
      if (usedImages.has(image.url)) {
        continue;
      }
      
      usedImages.add(image.url);
      
      let imageHtml = '';
      
      // Try to link the image to a product
      if (availableProducts.length > 0) {
        // Cycle through available products to ensure each secondary image links to a product
        const productIndex = i % availableProducts.length;
        const productId = availableProducts[productIndex];
        
        // Create product-linked image HTML
        imageHtml = `
<div style="margin: 20px 0; text-align: center;">
  <a href="/products/${productId}" title="View Product Details" style="text-decoration: none;">
    <img src="${image.url}" alt="${image.alt || ''}" 
      style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); transition: transform 0.2s ease;" 
      onmouseover="this.style.transform='scale(1.02)'" 
      onmouseout="this.style.transform='scale(1)'" />
  </a>
  ${image.alt ? `<p style="margin-top: 8px; font-style: italic; color: #666; font-size: 14px;">${image.alt}</p>` : ''}
  <p style="margin-top: 4px; font-size: 12px;">
    <a href="/products/${productId}" style="color: #2563eb; text-decoration: none; font-weight: 500;">View Product Details →</a>
  </p>
</div>`;
        
        console.log(`Secondary image ${i + 1} linked to product ID: ${productId}`);
      } else {
        // Fallback without product link if no products available
        imageHtml = `
<div style="margin: 20px 0; text-align: center;">
  <img src="${image.url}" alt="${image.alt || ''}" 
    style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
  ${image.alt ? `<p style="margin-top: 8px; font-style: italic; color: #666; font-size: 14px;">${image.alt}</p>` : ''}
</div>`;
        
        console.log(`Secondary image ${i + 1} added without product link (no products selected)`);
      }
      
      // Replace only the first remaining marker to ensure even distribution
      processedContent = processedContent.replace('<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->', imageHtml);
    }
    
    // Remove any remaining unused markers
    processedContent = processedContent.replace(/<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->/g, '');
  }
  
  return processedContent;
}

// Function to generate blog content using Claude
export async function generateBlogContentWithClaude(request: BlogContentRequest): Promise<BlogContent> {
  try {
    console.log(`Generating blog content with Claude for topic: "${request.topic}"`);
    
    // Determine content length based on request
    let contentLength = "approximately 800-1000 words";
    if (request.length.toLowerCase().includes("short")) {
      contentLength = "approximately 500-700 words";
    } else if (request.length.toLowerCase().includes("long")) {
      contentLength = "approximately 1500-2000 words";
    }
    
    // Enhanced base prompt for Claude with proper structure
    let toneStyle = request.tone;
    // If content style display name is provided, use it instead of the default tone
    if (request.contentStyleDisplayName) {
      toneStyle = request.contentStyleDisplayName;
      console.log(`Using custom content style: ${request.contentStyleDisplayName} (ID: ${request.contentStyleToneId || 'none'})`);
    }
    
    // Get copywriter persona if available
const copywriterPersona = request.contentStyleDisplayName ? `Write this content in the style of ${request.contentStyleDisplayName}.` : '';

    // Build media context for the prompt
    let mediaContext = '';
    if (request.primaryImage) {
      mediaContext += `\n    SELECTED PRIMARY IMAGE: A high-quality image has been selected as the featured image for this content. This will be automatically positioned as the main visual.`;
    }
    if (request.secondaryImages && request.secondaryImages.length > 0) {
      mediaContext += `\n    SELECTED SECONDARY IMAGES: ${request.secondaryImages.length} additional images have been selected to support the content. These will be automatically placed under H2 headings after the video.`;
    }
    if (request.youtubeEmbed) {
      mediaContext += `\n    SELECTED YOUTUBE VIDEO: A relevant YouTube video has been selected to enhance the content. This will be placed under the second H2 heading.`;
    }

let promptText = `Generate a well-structured, SEO-optimized blog post about ${request.topic} in a ${toneStyle} tone, ${contentLength}. ${copywriterPersona}${mediaContext}
    
    The blog post MUST follow this exact structure:
    1. A compelling title that includes the main topic and primary keywords (this will be used separately)
    2. Multiple clearly defined sections with H2 headings that incorporate important keywords
    3. Appropriate H3 subheadings within each section where needed
    4. Well-organized paragraphs (2-4 paragraphs per section)
    5. Proper HTML formatting throughout (h2, h3, p, ul, li, etc.)
    6. Lists and tables where appropriate to improve readability
    7. A conclusion with a clear call to action
    
    MEDIA PLACEMENT RULES:
    - Selected YouTube video MUST be placed under the SECOND H2 heading only
    - Secondary images MUST be placed under H2 headings that come AFTER the video
    - Each secondary image should be placed under a different H2 heading
    - Never repeat the same secondary image multiple times
    - Distribute secondary images evenly across remaining H2 sections
    
    IMPORTANT CONTENT STRUCTURE REQUIREMENTS:
    - DO NOT include the title as H1 in the content - the title will be handled separately by the platform
    - Start the content directly with the Table of Contents placement marker, then the introduction
    - Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <table>, etc.
    - Create at least 3-4 H2 sections for proper structure with descriptive, SEO-friendly headings
    - Make sure sections flow logically and coherently
    - Include all specified keywords naturally throughout the content (especially in headings and early paragraphs)
    - Include a meta description of 155-160 characters that includes at least 2 primary keywords
    - Format the introduction paragraph special: Make the first sentence bold with <strong> tags AND add <br> after each sentence in the intro paragraph
    - DO NOT generate content that compares competitor products or prices - focus solely on the features and benefits of our products
    
    SPECIFIC MEDIA PLACEMENT INSTRUCTIONS:
    - Under the SECOND H2 heading ONLY, add: <!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->
    - Under each subsequent H2 heading (after the video), add: <!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->
    - Use unique placement markers - each secondary image will be automatically assigned to different H2 sections
    - DO NOT repeat the same secondary image placement marker multiple times
    - The system will automatically prevent duplicate images and distribute them evenly
    
    TABLE OF CONTENTS REQUIREMENTS:
    - AUTOMATICALLY include a Table of Contents at the very beginning of the content
    - Add this TOC placement marker at the start: <!-- TABLE_OF_CONTENTS_PLACEMENT -->
    - The system will automatically generate a TOC using all H2 headings in your content
    - Make sure each H2 heading has a unique id attribute (e.g., <h2 id="benefits">Benefits</h2>)
    - Use descriptive, SEO-friendly id names based on the heading text (lowercase, hyphenated)
    - Include an id="faq" on your FAQ section if present
    - The TOC will be styled with a clean, professional appearance and will improve user navigation
    
    FAQ SECTION FORMATTING (if FAQ is enabled):
    - Format all FAQ questions with "Q:" prefix (colon, not period)
    - Format all FAQ answers with "A:" prefix (colon, not period) 
    - Use proper HTML structure: <h3>Q: Question here?</h3><p>A: Answer here.</p>
    - Make FAQ section engaging and helpful for readers
    
    IMPORTANT IMAGE AND LINK GUIDELINES:
    - NEVER include direct image URLs or links to external websites like qualitywatertreatment.com, filterwater.com, or any other retailer sites
    - NEVER reference competitor websites or external commercial domains in any links or image sources
    - DO NOT include ANY external links except to trusted reference sites like .gov, .edu, or wikipedia.org
    - DO NOT include external images from third-party domains - the system will automatically insert optimized images
    - All images will be center-aligned and properly linked to product pages
    - Do not include any image placeholders or special markup except for the placement markers mentioned above
    - The system will handle image insertion automatically at the marked locations
    - Each image will include a caption with a link back to the relevant product to enhance SEO value
    
    Also suggest 5-7 relevant tags for the post, focusing on SEO value and search intent.`;
    
    // Add media information if provided from Choose Media step
    if (request.primaryImage || (request.secondaryImages && request.secondaryImages.length > 0) || request.youtubeEmbed) {
      promptText += `
      
      SELECTED MEDIA CONTEXT (from Choose Media step):`;
      
      if (request.primaryImage) {
        promptText += `
      
      PRIMARY/FEATURED IMAGE: "${request.primaryImage.alt}" (${request.primaryImage.url})
      - This will be used as the featured image at the top of the content
      - Reference this image context in your introduction to create cohesion`;
      }
      
      if (request.secondaryImages && request.secondaryImages.length > 0) {
        promptText += `
      
      SECONDARY IMAGES (${request.secondaryImages.length} selected):`;
        request.secondaryImages.forEach((img, index) => {
          promptText += `
      ${index + 1}. "${img.alt}" (${img.url})`;
        });
        promptText += `
      - These images will be placed under H2 headings after the video
      - Reference these images in your content to create natural flow`;
      }
      
      if (request.youtubeEmbed) {
        promptText += `
      
      YOUTUBE VIDEO: ${request.youtubeEmbed}
      - This video MUST be embedded under the SECOND H2 heading only
      - Use the marker: <!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->
      - Reference this video content in your structure to create natural integration`;
      }
      
      promptText += `
      
      IMPORTANT: Structure your content to naturally incorporate these selected media elements. Make sure the content flows logically with the media placements.`;
    }
    
    // Add custom prompt if provided
    if (request.customPrompt) {
      const customPromptFormatted = request.customPrompt.replace(/\[TOPIC\]/g, request.topic);
      promptText = `${promptText}
      
      IMPORTANT: Follow these specific instructions for the content:
      ${customPromptFormatted}
      
      The content must directly address these instructions while maintaining a ${toneStyle} tone and proper blog structure.`;
    }
    
    // Make API call to Claude with increased token limit for longer content
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: request.contentStyleToneId 
        ? `Act as the selected copywriter: ${request.contentStyleDisplayName || toneStyle}. You are a professional content writer who specializes in writing in this specific style and tone. Embody the persona, writing patterns, and expertise of this copywriter type throughout the content creation.` 
        : undefined,
      messages: [
        {
          role: 'user',
          content: `${promptText}
          
          IMPORTANT: Return the response in JSON format with the following structure:
          {
            "title": "The title of the blog post",
            "content": "The complete HTML content of the blog post",
            "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
            "metaDescription": "A compelling meta description of 155-160 characters that summarizes the content with keywords"
          }
          
          Ensure the content is properly formatted with HTML tags. Do not include explanation of your process, just return the JSON.`
        }
      ],
    });
    
    // Extract and parse the JSON response
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
    
    console.log("Raw Claude response (first 500 chars):", responseText.substring(0, 500) + "...");
    
    // Try different strategies to extract valid JSON from Claude's response
    let jsonContent;
    
    try {
      // Strategy 1: Find the most complete JSON object in the response
      const jsonObjectRegex = /\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g;
      const jsonMatches = responseText.match(jsonObjectRegex);
      
      if (jsonMatches && jsonMatches.length > 0) {
        // Find the longest match, which is likely the complete JSON
        const longestMatch = jsonMatches.reduce((longest, current) => 
          current.length > longest.length ? current : longest, "");
        
        if (longestMatch) {
          console.log("Found JSON object match:", longestMatch.substring(0, 100) + "...");
          jsonContent = JSON.parse(longestMatch);
        }
      }
    } catch (jsonError: any) {
      console.log("Error parsing complete JSON object:", jsonError?.message || "Unknown error");
    }
    
    // Strategy 2: If strategy 1 fails, try to extract JSON by matching braces
    if (!jsonContent) {
      try {
        let braceCount = 0;
        let startIndex = -1;
        let jsonCandidate = "";
        
        // Find the opening brace
        startIndex = responseText.indexOf('{');
        
        if (startIndex >= 0) {
          for (let i = startIndex; i < responseText.length; i++) {
            jsonCandidate += responseText[i];
            
            if (responseText[i] === '{') braceCount++;
            if (responseText[i] === '}') braceCount--;
            
            // When braces are balanced, we've found a complete JSON object
            if (braceCount === 0 && jsonCandidate.length > 2) {
              console.log("Found balanced JSON via brace counting:", jsonCandidate.substring(0, 100) + "...");
              jsonContent = JSON.parse(jsonCandidate);
              break;
            }
          }
        }
      } catch (balancedError: any) {
        console.log("Error parsing balanced braces JSON:", balancedError?.message || "Unknown error");
      }
    }
    
    // Strategy 3: Manual extraction of key fields if JSON parsing fails
    if (!jsonContent) {
      console.log("Attempting manual extraction of content components...");
      
      // Extract title
      const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : "Blog Post";
      
      // Extract content - look for content field followed by a large HTML block
      const contentMatch = responseText.match(/"content"\s*:\s*"([\s\S]+?)(?:"\s*,\s*"|"\s*})/);
      let content = contentMatch ? contentMatch[1] : "";
      
      // Unescape content string
      content = content.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      
      // Extract tags
      const tagsMatch = responseText.match(/"tags"\s*:\s*\[([\s\S]+?)\]/);
      const tagsString = tagsMatch ? tagsMatch[1] : "";
      const tags = tagsString.split(',').map(tag => 
        tag.trim().replace(/^"|"$/g, '')
      ).filter(Boolean);
      
      // Extract meta description
      const metaMatch = responseText.match(/"metaDescription"\s*:\s*"([^"]+)"/);
      const metaDescription = metaMatch ? metaMatch[1] : "";
      
      jsonContent = {
        title,
        content,
        tags,
        metaDescription
      };
    }
    
    if (!jsonContent) {
      throw new Error("Failed to extract content from Claude response using all available methods");
    }
    
    // Process the content to remove H1 tags, add automatic Table of Contents and handle media placement
    let processedContent = removeH1Tags(jsonContent.content);
    processedContent = addTableOfContents(processedContent);
    processedContent = processMediaPlacementsHandler(processedContent, request);
    
    return {
      title: jsonContent.title,
      content: processedContent,
      tags: jsonContent.tags,
      metaDescription: jsonContent.metaDescription || ''
    };
  } catch (error: any) {
    console.error("Error generating content with Claude:", error);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? error.message 
      : 'Unknown error during Claude content generation';
    throw new Error(`Failed to generate content with Claude: ${errorMessage}`);
  }
}

// Function to generate title suggestions using Claude
export async function generateTitles(request: { prompt: string, responseFormat: string }): Promise<{ titles: string[] }> {
  try {
    console.log("Generating title suggestions with Claude model:", CLAUDE_MODEL);
    
    // Make API call to Claude
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
    });
    
    // Extract response text
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
    
    console.log("Claude raw response:", responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    // Parse the response based on format
    if (request.responseFormat === 'json') {
      try {
        // Find JSON content - handle any wrapping text Claude might add
        const jsonRegex = /\[[\s\S]*\]/;
        const match = responseText.match(jsonRegex);
        
        if (match) {
          console.log("Found JSON array in Claude response:", match[0]);
          const titles = JSON.parse(match[0]);
          return { titles };
        } else {
          console.log("No JSON array found, trying to parse entire response as JSON");
          // If no JSON array found, try to parse the entire response as JSON
          const jsonResponse = JSON.parse(responseText);
          if (Array.isArray(jsonResponse)) {
            console.log("Response is an array:", jsonResponse);
            return { titles: jsonResponse };
          } else if (jsonResponse.titles && Array.isArray(jsonResponse.titles)) {
            console.log("Response has titles property:", jsonResponse.titles);
            return { titles: jsonResponse.titles };
          } else {
            console.error("Unable to find titles array in JSON response:", jsonResponse);
          }
        }
      } catch (parseError) {
        console.error("Error parsing JSON from Claude response:", parseError);
        // Fall back to extracting titles from text
      }
    }
    
    // If parsing fails or format is not JSON, extract titles from text
    // Look for numbered lines, bullet points, or line breaks
    const lines = responseText.split(/[\n\r]+/);
    const titleCandidates = lines.filter(line => 
      line.trim().length > 10 && // Minimum reasonable title length
      !line.includes("Here are") && // Skip intro lines
      !line.includes("suggestions") &&
      !line.includes("titles") &&
      (
        /^\d+[\.\)]\s+/.test(line.trim()) || // numbered items
        /^[-*•]\s+/.test(line.trim()) || // bullet points
        /^["'].*["']$/.test(line.trim()) // quoted text
      )
    );
    
    // Clean up the titles
    const titles = titleCandidates.map(title => 
      title.replace(/^\d+[\.\)]\s+|^[-*•]\s+|^["']|["']$/g, '').trim()
    ).filter(title => title.length > 0);
    
    // Return at least some titles
    if (titles.length === 0) {
      // If we couldn't extract any titles, just return 5 lines that look like titles
      return { 
        titles: lines
          .filter(line => line.trim().length > 15 && line.trim().length < 100)
          .slice(0, 5)
          .map(line => line.trim())
      };
    }
    
    return { titles };
  } catch (error: any) {
    console.error("Error generating titles with Claude:", error);
    throw new Error(`Failed to generate titles with Claude: ${error.message || 'Unknown error'}`);
  }
}

// Test function to check if Claude API is working
export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Hello, please respond with "Claude API is connected successfully!" if you receive this message.'
        }
      ],
    });
    
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
      
    return {
      success: true,
      message: responseText.trim()
    };
  } catch (error: any) {
    console.error("Claude connection test failed:", error);
    return {
      success: false,
      message: error.message || "Failed to connect to Claude API"
    };
  }
}