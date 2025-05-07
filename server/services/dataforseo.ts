// DataForSEO API Integration
import axios from 'axios';

// Interface for the keyword data returned by DataForSEO
export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  cpc?: number;
  competition?: number;
  competitionLevel?: string; // Low, Medium, High
  intent?: string;
  trend?: number[]; // Monthly trend data
  difficulty?: number; // Keyword difficulty score (0-100)
  selected?: boolean; // For frontend selection
}

// Class for DataForSEO API integration
export class DataForSEOService {
  private apiUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.apiUrl = 'https://api.dataforseo.com';
    
    // DataForSEO requires credentials in the format 'username:password'
    // The DATAFORSEO_API_KEY should be set to "login:password" from DataForSEO account
    const apiKey = process.env.DATAFORSEO_API_KEY || '';
    
    console.log(`Initializing DataForSEO service with key format: ${apiKey.includes(':') ? 'username:password' : 'invalid format'}`);
    
    if (apiKey.includes(':')) {
      // Split the API key into username and password
      const [username, password] = apiKey.split(':');
      this.username = username;
      this.password = password;
      
      console.log(`DataForSEO credentials parsed - Login: ${username}, Password length: ${password.length}`);
    } else {
      // Log warning about invalid format
      console.warn('WARNING: DataForSEO credentials not in correct format. Should be "login:password"');
      
      // Still try to use whatever was provided as both username and password
      this.username = apiKey;
      this.password = apiKey;
    }
    
    if (this.hasValidCredentials()) {
      console.log(`DataForSEO service initialized successfully with login: ${this.username}`);
    } else {
      console.warn('WARNING: DataForSEO service initialized without valid credentials');
    }
  }

  /**
   * Validate credentials are set
   * @returns True if credentials are set
   */
  public hasValidCredentials(): boolean {
    return this.username.length > 0 && this.password.length > 0;
  }

  /**
   * Get keywords for a specific product URL
   * @param productUrl The URL of the product to get keywords for
   * @returns Array of keyword data
   */
  public async getKeywordsForProduct(productUrl: string): Promise<KeywordData[]> {
    try {
      // Extract keyword from URL or use as direct input
      const keyword = this.extractKeywordFromUrl(productUrl);
      console.log(`DataForSEO search for keyword: "${keyword}"`);

      // Check if we should use API or fallback directly
      if (!this.hasValidCredentials()) {
        console.log("No valid DataForSEO credentials, using fallback keyword generation");
        return this.generateFallbackKeywords(keyword);
      }

      try {
        // Create basic auth header
        const auth = {
          username: this.username,
          password: this.password
        };

        console.log(`Using DataForSEO credentials - Login: ${this.username}, Password length: ${this.password.length}`);

        // Clean the keyword to remove problematic characters
        const cleanedKeyword = this.cleanKeywordString(keyword);
        console.log(`Cleaned keyword for API request: "${cleanedKeyword}" (original: "${keyword}")`);
        
        // Prepare request payload for search_volume endpoint
        // Note: search_volume expects 'keywords' array instead of a single 'keyword'
        
        // Extract some common variations to include in the API request to get more data
        const baseKeyword = cleanedKeyword;
        
        // Generate keyword variations for the API request
        // This helps us get actual data for multiple related terms instead of just the main keyword
        const keywordVariations = [
          baseKeyword,
          `best ${baseKeyword}`,
          `${baseKeyword} review`,
          `${baseKeyword} guide`,
          `buy ${baseKeyword}`
        ];
        
        // Extract generic terms to add to the request
        const genericTerms = this.extractGenericTerms(baseKeyword);
        
        // Generate many more keyword variations based on common patterns
        // These will all be real API requests, not synthetic data
        const productVariations: string[] = [];
        
        // Create prefix-based variations (e.g., "best water softener")
        const commonPrefixes = ['best', 'top', 'affordable', 'cheap', 'quality', 'premium', 
                              'professional', 'commercial', 'residential', 'high-end', 
                              'budget', 'luxury', 'efficient', 'modern', 'eco-friendly',
                              'latest', 'newest', 'popular', 'recommended', 'reliable', 
                              'durable', 'leading', 'trusted', 'advanced', 'high quality'];
                              
        // Create question-based variations (e.g., "how to install water softener")
        const questionPrefixes = ['how to', 'what is', 'why use', 'when to', 'where to buy',
                                'which', 'how much', 'how long', 'how does', 'who sells', 
                                'is a', 'can a', 'best way to', 'benefits of', 'reviews for',
                                'do i need', 'are', 'how to choose', 'installation of', 'how to fix',
                                'how to maintain', 'is it worth', 'what size', 'when to replace', 'troubleshooting'];
                                
        // Create suffix-based variations (e.g., "water softener reviews")
        const commonSuffixes = ['review', 'reviews', 'comparison', 'vs', 'guide', 'tips', 
                              'problems', 'installation', 'maintenance', 'cost', 'price',
                              'near me', 'for home', 'for business', 'system', 'model',
                              'best brands', 'alternative', 'replacement', 'repair', 'service',
                              'warranty', 'for sale', 'discount', 'online', 'parts', 'manual',
                              'setup', 'troubleshooting', 'benefits', 'advantages'];
        
        // Add prefix variations for the main keyword and generic terms - use more terms
        [...keywordVariations, ...genericTerms.slice(0, 5)].forEach(term => {
          commonPrefixes.slice(0, 10).forEach(prefix => {
            productVariations.push(`${prefix} ${term}`);
          });
        });
        
        // Add question-based variations for generic terms only (more natural) - use more terms
        genericTerms.slice(0, 3).forEach(term => {
          questionPrefixes.slice(0, 10).forEach(prefix => {
            productVariations.push(`${prefix} ${term}`);
          });
        });
        
        // Add suffix variations for main keyword and generic terms - use more terms
        [...keywordVariations, ...genericTerms.slice(0, 5)].forEach(term => {
          commonSuffixes.slice(0, 10).forEach(suffix => {
            productVariations.push(`${term} ${suffix}`);
          });
        });
        
        // Add year-based variations for trending/current searches
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        [...keywordVariations, ...genericTerms.slice(0, 3)].forEach(term => {
          productVariations.push(`${term} ${currentYear}`);
          productVariations.push(`${term} ${nextYear}`);
          productVariations.push(`best ${term} ${currentYear}`);
          productVariations.push(`top ${term} ${currentYear}`);
        });
        
        // Combine common phrases with terms to create more variations
        const commonPhrases = ['how to choose', 'best brands of', 'top rated', 'price comparison'];
        genericTerms.slice(0, 3).forEach(term => {
          commonPhrases.forEach(phrase => {
            productVariations.push(`${phrase} ${term}`);
          });
        });
        
        // Combine all variations - use all keywords from all sources
        const combinedKeywords = [
          ...keywordVariations,
          ...genericTerms,
          ...productVariations
        ];
        
        // Create multiple batches of keywords to make multiple API calls
        // This will significantly increase our keyword count
        const allUniqueKeywords = Array.from(new Set(combinedKeywords));
        
        // Split into batches of 50 keywords each (DataForSEO's recommended batch size)
        // We'll use these to make multiple API calls
        const keywordBatches = [];
        for (let i = 0; i < allUniqueKeywords.length; i += 50) {
          keywordBatches.push(allUniqueKeywords.slice(i, i + 50));
        }
        
        // Make sure we have at least one batch, even if it's small
        if (keywordBatches.length === 0) {
          keywordBatches.push(allUniqueKeywords);
        }
        
        // For the first API call, use just the first batch
        const uniqueKeywords = keywordBatches[0];
        
        console.log(`Sending ${uniqueKeywords.length} keyword variations to DataForSEO API:`, uniqueKeywords);
        
        const requestData = [{
          keywords: uniqueKeywords,
          language_code: "en",
          location_code: 2840, // United States
          limit: 200 // Get up to 200 results per keyword (maximum allowed by DataForSEO)
        }];

        console.log("DataForSEO request payload:", JSON.stringify(requestData));

        // POST request to DataForSEO API to get keyword data
        // Try using the keywords_data endpoint that should work with our account
        const endpoint = `/v3/keywords_data/google/search_volume/live`;
        console.log(`Using DataForSEO endpoint: ${endpoint}`);
        
        const response = await axios.post(
          `${this.apiUrl}${endpoint}`,
          requestData,
          { 
            auth,
            timeout: 15000, // 15 second timeout
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`DataForSEO API status code: ${response.status}`);
        
        // Additional logging to troubleshoot issues
        if (response.data?.status_code) {
          console.log(`DataForSEO API response status code: ${response.data.status_code}`);
          console.log(`DataForSEO API response status message: ${response.data.status_message || 'No message'}`);
        }

        // Full response logging for debugging
        console.log("DataForSEO API full response:", JSON.stringify(response.data));
        
        // Return fallback data if the API response doesn't have the expected format
        if (!response.data?.tasks || !Array.isArray(response.data.tasks) || response.data.tasks.length === 0) {
          console.log("No tasks in response, generating fallback keywords for:", keyword);
          
          // Generate related keywords based on the input
          return this.generateFallbackKeywords(keyword);
        }

        // Check if the response is successful
        if (response.data.tasks[0]?.status_code !== 20000) {
          console.log(`API error: ${response.data.tasks[0]?.status_message || 'Unknown error'}`);
          
          // If API error, use fallback data
          return this.generateFallbackKeywords(keyword);
        }

        // Extract keyword data from response
        const keywordData: KeywordData[] = [];
        const results = response.data.tasks[0]?.result || [];
        
        // Now, let's process additional batches - Make API requests for other batches if they exist
        // This is the key to getting hundreds of keywords
        if (keywordBatches.length > 1) {
          console.log(`Processing ${keywordBatches.length - 1} additional batches of keywords`);
          
          // Process each additional batch (skip the first as we already did it)
          for (let batchIndex = 1; batchIndex < keywordBatches.length && batchIndex < 4; batchIndex++) {
            try {
              const batch = keywordBatches[batchIndex];
              console.log(`Processing batch ${batchIndex} with ${batch.length} keywords`);
              
              // Create request for this batch
              const batchRequestData = [{
                keywords: batch,
                language_code: "en",
                location_code: 2840, // United States
                limit: 200 // Maximum allowed
              }];
              
              // Make API call for this batch
              const batchResponse = await axios.post(
                `${this.apiUrl}${endpoint}`,
                batchRequestData,
                { 
                  auth,
                  timeout: 15000,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              // Process the batch results and add to keyword data
              if (batchResponse.data?.tasks?.[0]?.result) {
                const batchResults = batchResponse.data.tasks[0].result;
                console.log(`Batch ${batchIndex} returned ${batchResults.length} keywords`);
                
                // We'll merge these with the main results array for processing below
                results.push(...batchResults);
              }
            } catch (err: any) {
              console.error(`Error processing batch ${batchIndex}: ${err.message}`);
              // Continue with next batch even if one fails
            }
          }
          
          console.log(`Total results after processing all batches: ${results.length} keywords`);
        }
        
        if (results.length === 0) {
          console.log("No results in response, generating fallback keywords");
          return this.generateFallbackKeywords(keyword);
        }
        
        // For search_volume endpoint, results is a direct array of keyword data
        console.log(`Processing ${results.length} keyword results`);
        if (results.length > 0) {
          console.log("Sample result structure:", JSON.stringify(results[0]));
        }
        
        // Process main keyword data from search_volume endpoint
        let hasValidData = false;
        
        for (const result of results) {
          // Extract keyword data based on the search_volume endpoint structure
          const keywordText = result.keyword || '';
          const searchVolume = result.search_volume || 0;
          const competition = result.competition || 0;
          const competitionLevel = this.getCompetitionLevel(competition);
          const cpc = result.cpc || 0;
          
          // Check if we have valid search data - sometimes very specific product names return null data
          const hasSearchData = result.search_volume !== null && result.monthly_searches !== null;
          
          // Process monthly_searches data which is directly in the result object
          const trend = result.monthly_searches
            ? result.monthly_searches.map((monthData: any) => monthData.search_volume)
            : Array(12).fill(Math.round(searchVolume * 0.8 + Math.random() * searchVolume * 0.4)); // Approximate if not available
            
          // Calculate keyword difficulty
          const difficulty = this.calculateKeywordDifficulty({
            search_volume: searchVolume,
            competition: competition,
            cpc: cpc
          });
          
          // Add the keyword data
          keywordData.push({
            keyword: keywordText,
            searchVolume,
            cpc,
            competition,
            competitionLevel,
            intent: this.determineIntent({ keyword: keywordText }),
            trend,
            difficulty,
            selected: false // Default to not selected
          });
          
          // Flag whether we got valid data
          if (hasSearchData) {
            hasValidData = true;
          }
        }
        
        // If we don't have valid search data for the specific product, try to get data for a more generic term
        if (!hasValidData && keywordData.length > 0) {
          console.log("No valid search data found for specific term, trying generic alternatives");
          
          // Extract more generic terms from the product name
          const genericTerms = this.extractGenericTerms(keywordData[0].keyword);
          
          // Only proceed if we found generic terms
          if (genericTerms.length > 0) {
            console.log(`Found generic terms: ${genericTerms.join(', ')}`);
            
            // Try each generic term in sequence until we find one with data
            for (const genericKeyword of genericTerms) {
              try {
                console.log(`Trying generic term: ${genericKeyword}`);
                const genericKeywordData = await this.getKeywordsForProduct(genericKeyword);
                
                if (genericKeywordData.length > 0 && 
                    genericKeywordData[0].searchVolume && 
                    genericKeywordData[0].searchVolume > 0) {
                  console.log(`Got valid data for generic term: ${genericKeyword}`);
                  
                  // Replace main keyword's metrics with the generic term's data, but keep the original keyword text
                  const originalKeyword = keywordData[0].keyword;
                  const mainGenericKeyword = genericKeywordData[0];
                  
                  keywordData[0] = {
                    ...mainGenericKeyword,
                    keyword: originalKeyword, // Keep the original product name
                    selected: false
                  };
                  
                  // Flag that we now have valid data
                  hasValidData = true;
                  
                  // Break the loop once we find a term with data
                  break;
                } else {
                  console.log(`No valid search volume for generic term: ${genericKeyword}`);
                }
              } catch (err: any) {
                console.error(`Error getting data for generic term ${genericKeyword}: ${err.message}`);
                // Continue to the next term if this one fails
              }
            }
            
            // If we still don't have valid data from generic keywords, try common industry terms via direct API calls
            if (!hasValidData) {
              console.log("Generic terms failed, trying direct industry term API requests");
              
              const originalKeyword = keywordData[0].keyword;
              
              // List of standard industry terms to try - these should have data in the DataForSEO API
              const industryTerms = [
                'water softener', 'water filter', 'water treatment', 'water conditioner',
                'softener', 'water system', 'water purification',
                'home appliance', 'home water', 'water quality'
              ];
              
              // Try each industry term as a direct API call
              for (const industryTerm of industryTerms) {
                try {
                  console.log(`Making direct API call for industry term: ${industryTerm}`);
                  
                  // Make a direct API call for industry term
                  const auth = {
                    username: this.username,
                    password: this.password
                  };
                  
                  const simpleRequestData = [{
                    keywords: [industryTerm],
                    language_code: "en",
                    location_code: 2840,
                    limit: 50 // Get more keywords from the industry terms query
                  }];
                  
                  const response = await axios.post(
                    `${this.apiUrl}/v3/keywords_data/google/search_volume/live`,
                    simpleRequestData,
                    { 
                      auth,
                      timeout: 15000,
                      headers: { 'Content-Type': 'application/json' }
                    }
                  );
                  
                  if (response.data?.tasks?.[0]?.result && 
                      Array.isArray(response.data.tasks[0].result) && 
                      response.data.tasks[0].result.length > 0) {
                    
                    const result = response.data.tasks[0].result[0];
                    
                    if (result.search_volume && result.search_volume > 0) {
                      console.log(`Got valid industry term data from API: ${industryTerm} with volume: ${result.search_volume}`);
                      
                      // Extract trend data
                      const trend = result.monthly_searches
                        ? result.monthly_searches.map((monthData: any) => monthData.search_volume)
                        : Array(12).fill(Math.round(result.search_volume));
                      
                      keywordData[0] = {
                        keyword: originalKeyword,
                        searchVolume: result.search_volume,
                        cpc: result.cpc || 0,
                        competition: result.competition || 0,
                        competitionLevel: this.getCompetitionLevel(result.competition || 0),
                        intent: this.determineIntent({ keyword: originalKeyword }),
                        trend,
                        difficulty: this.calculateKeywordDifficulty({
                          search_volume: result.search_volume,
                          competition: result.competition,
                          cpc: result.cpc
                        }),
                        selected: false
                      };
                      
                      hasValidData = true;
                      break;
                    }
                  }
                } catch (err: any) {
                  console.error(`Error getting data for industry term ${industryTerm}: ${err.message}`);
                }
              }
              
              // If all API attempts failed, use a very minimal placeholder to avoid breaking the UI
              if (!hasValidData) {
                console.error("CRITICAL: All DataForSEO API attempts failed to retrieve keyword data");
                console.error("Please check DataForSEO API credentials and connection");
                
                // Use obvious placeholder with zero metrics to make it clear this is an API failure
                keywordData[0] = {
                  keyword: originalKeyword + " (API ERROR - CHECK DATAFORSEO CREDENTIALS)",
                  searchVolume: 0,
                  cpc: 0,
                  competition: 0,
                  competitionLevel: "Low", 
                  intent: "Navigational",
                  trend: Array(12).fill(0),
                  difficulty: 0,
                  selected: false
                };
              }
            }
          }
        }
        
        // Get related keywords from DataForSEO API to expand our keyword list
        // Use keyword suggestions endpoint to get a broader range of keywords
        if (keywordData.length > 0) {
          try {
            // Only proceed if we have at least one keyword with valid search volume
            const validKeyword = keywordData.find(k => k.searchVolume && k.searchVolume > 0);
            
            if (validKeyword) {
              // Use this keyword to get keyword suggestions from the API
              console.log(`Getting API keyword suggestions for: ${validKeyword.keyword}`);
              
              const auth = {
                username: this.username,
                password: this.password
              };
              
              // Use 3 different keyword suggestion approaches to maximize our keyword count
              const suggestionsRequestData = [{
                keyword: validKeyword.keyword,
                language_code: "en",
                location_code: 2840, // United States
                limit: 100 // Get up to 100 keyword suggestions
              }];
              
              // Make DataForSEO API call to get keyword suggestions
              console.log("Fetching keyword suggestions from DataForSEO API");
              const suggestionsEndpoint = `/v3/keywords_data/google/keywords_for_keywords/live`;
              
              try {
                const suggestionsResponse = await axios.post(
                  `${this.apiUrl}${suggestionsEndpoint}`,
                  suggestionsRequestData,
                  { 
                    auth,
                    timeout: 30000, // 30 second timeout
                    headers: { 'Content-Type': 'application/json' }
                  }
                );
                
                // Process the suggestions response
                if (suggestionsResponse.data?.tasks?.[0]?.result) {
                  const suggestionsResults = suggestionsResponse.data.tasks[0].result;
                  console.log(`Got ${suggestionsResults.length} keyword suggestions from API`);
                  
                  // Process each suggestion
                  for (const suggestion of suggestionsResults) {
                    // Only add if we don't already have this keyword
                    if (!keywordData.some(k => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase())) {
                      const searchVolume = suggestion.search_volume || 0;
                      const competition = suggestion.competition || 0;
                      const cpc = suggestion.cpc || 0;
                      
                      // Create trend data from monthly_searches if available
                      const trend = suggestion.monthly_searches
                        ? suggestion.monthly_searches.map((monthData: any) => monthData.search_volume)
                        : Array(12).fill(Math.round(searchVolume));
                      
                      // Calculate keyword difficulty
                      const difficulty = this.calculateKeywordDifficulty({
                        search_volume: searchVolume,
                        competition,
                        cpc
                      });
                      
                      // Add to our keywords list
                      keywordData.push({
                        keyword: suggestion.keyword,
                        searchVolume,
                        cpc,
                        competition,
                        competitionLevel: this.getCompetitionLevel(competition),
                        intent: this.determineIntent({ keyword: suggestion.keyword }),
                        trend,
                        difficulty,
                        selected: false
                      });
                    }
                  }
                } else {
                  console.log("No keyword suggestions found in API response");
                }
              } catch (suggestionsError: any) {
                console.error(`Error getting keyword suggestions: ${suggestionsError.message}`);
              }
              
              // Try a second API call with "related_keywords" endpoint
              try {
                console.log("Trying related keywords API endpoint for more keyword ideas");
                const relatedEndpoint = `/v3/keywords_data/google/related_keywords/live`;
                
                const relatedResponse = await axios.post(
                  `${this.apiUrl}${relatedEndpoint}`,
                  suggestionsRequestData, // Use the same request data
                  { 
                    auth,
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                  }
                );
                
                // Process the related keywords response
                if (relatedResponse.data?.tasks?.[0]?.result?.[0]?.keywords) {
                  const relatedResults = relatedResponse.data.tasks[0].result[0].keywords;
                  console.log(`Got ${relatedResults.length} related keywords from API`);
                  
                  // Process each related keyword
                  for (const related of relatedResults) {
                    // Only add if we don't already have this keyword
                    if (!keywordData.some(k => k.keyword.toLowerCase() === related.keyword.toLowerCase())) {
                      const searchVolume = related.search_volume || 0;
                      const competition = related.competition || 0;
                      const cpc = related.cpc || 0;
                      
                      // Create trend data from monthly_searches if available
                      const trend = related.monthly_searches
                        ? related.monthly_searches.map((monthData: any) => monthData.search_volume)
                        : Array(12).fill(Math.round(searchVolume));
                      
                      // Calculate keyword difficulty
                      const difficulty = this.calculateKeywordDifficulty({
                        search_volume: searchVolume,
                        competition,
                        cpc
                      });
                      
                      // Add to our keywords list
                      keywordData.push({
                        keyword: related.keyword,
                        searchVolume,
                        cpc,
                        competition,
                        competitionLevel: this.getCompetitionLevel(competition),
                        intent: this.determineIntent({ keyword: related.keyword }),
                        trend,
                        difficulty,
                        selected: false
                      });
                    }
                  }
                }
              } catch (relatedError: any) {
                console.error(`Error getting related keywords: ${relatedError.message}`);
              }
            } else {
              console.log("No valid keywords found to use for suggestions");
            }
          } catch (suggestionsError: any) {
            console.error(`Error processing keyword suggestions: ${suggestionsError.message}`);
          }
        }
        
        // If no keywords were found, return fallback data
        if (keywordData.length === 0) {
          console.log("No keywords found in results, generating fallback keywords");
          return this.generateFallbackKeywords(keyword);
        }

        // Sort keywords by relevance and search volume
        let sortedKeywords = this.sortKeywordsByRelevance(keywordData);
        
        // Auto-select the most relevant keywords (up to 3)
        if (sortedKeywords.length > 0) {
          // Always select the main keyword
          sortedKeywords[0].selected = true;
          
          // Select a few more based on search volume and relevance
          // Prioritize terms that would make good blog post topics
          let selectedCount = 1;
          const maxToSelect = Math.min(3, sortedKeywords.length);
          
          for (let i = 1; i < sortedKeywords.length && selectedCount < maxToSelect; i++) {
            const keyword = sortedKeywords[i];
            
            // Prioritize informational keywords for content creation
            if (keyword.intent === 'Informational' && (keyword.searchVolume || 0) > 1000) {
              keyword.selected = true;
              selectedCount++;
            }
          }
          
          // If we didn't select enough informational keywords, add commercial ones
          for (let i = 1; i < sortedKeywords.length && selectedCount < maxToSelect; i++) {
            const keyword = sortedKeywords[i];
            
            if (!keyword.selected && keyword.intent === 'Commercial' && (keyword.searchVolume || 0) > 1000) {
              keyword.selected = true;
              selectedCount++;
            }
          }
          
          // If we still need more, select based on search volume
          for (let i = 1; i < sortedKeywords.length && selectedCount < maxToSelect; i++) {
            const keyword = sortedKeywords[i];
            
            if (!keyword.selected && (keyword.searchVolume || 0) > 1000) {
              keyword.selected = true;
              selectedCount++;
            }
          }
        }
        
        // Now add related keywords from API calls to get many more keyword variations
        // This is a crucial step to increase our keyword count to 100-200
        console.log(`Generating related keywords via API calls...`);
        
        try {
          // Use the top 3 keywords with highest search volume to generate related terms
          const topKeywords = sortedKeywords.slice(0, 3).filter(k => (k.searchVolume || 0) > 0);
          let relatedKeywords: KeywordData[] = [];
          
          // Make API calls for related keywords (these will be entirely different keywords)
          for (const topKeyword of topKeywords) {
            try {
              console.log(`Getting related keywords for: ${topKeyword.keyword}`);
              // This call will make additional API requests to different endpoints
              const moreKeywords = await this.generateRelatedKeywords(topKeyword);
              console.log(`Found ${moreKeywords.length} related keywords for ${topKeyword.keyword}`);
              relatedKeywords = [...relatedKeywords, ...moreKeywords];
            } catch (err: any) {
              console.error(`Error getting related keywords for ${topKeyword.keyword}: ${err.message}`);
            }
            
            // Don't overwhelm the API with too many requests
            if (relatedKeywords.length > 100) {
              break;
            }
          }
          
          console.log(`Total related keywords found: ${relatedKeywords.length}`);
          
          // Add the related keywords to our existing keywords
          // This should dramatically increase our keyword count
          if (relatedKeywords.length > 0) {
            // Remove any duplicates based on keyword text
            const existingKeywordTexts = sortedKeywords.map(k => k.keyword.toLowerCase());
            const uniqueRelatedKeywords = relatedKeywords.filter(
              k => !existingKeywordTexts.includes(k.keyword.toLowerCase())
            );
            
            console.log(`Adding ${uniqueRelatedKeywords.length} unique related keywords`);
            
            // Add the unique related keywords to our result set
            sortedKeywords = [...sortedKeywords, ...uniqueRelatedKeywords];
          }
        } catch (relatedError: any) {
          console.error(`Error processing related keywords: ${relatedError.message}`);
          // Continue with what we have even if related keywords fail
        }
        
        console.log(`Final keyword count: ${sortedKeywords.length}`);
        return sortedKeywords;
      } catch (apiError: any) {
        // If any error occurs during API call, log it and use fallback
        console.error('Error fetching keywords from DataForSEO API:', apiError.message);
        
        // Log detailed error information for debugging
        if (apiError.response) {
          // The request was made and the server responded with a status code outside of 2xx
          console.error('DataForSEO API error details:');
          console.error('Status:', apiError.response.status);
          console.error('Data:', JSON.stringify(apiError.response.data));
          console.error('Headers:', JSON.stringify(apiError.response.headers));
        } else if (apiError.request) {
          // The request was made but no response was received
          console.error('DataForSEO API request made but no response received:', apiError.request);
        } else {
          // Something happened in setting up the request
          console.error('DataForSEO API error during request setup:', apiError.message);
        }
        
        console.log('Using fallback keyword generation due to API error');
        return this.generateFallbackKeywords(keyword);
      }
    } catch (error: any) {
      console.error('Error in keyword processing:', error);
      throw new Error(`Failed to fetch keywords: ${error.message}`);
    }
  }

  /**
   * Clean a keyword string by removing special characters and noise words
   * @param input The raw keyword string
   * @returns Cleaned keyword string
   */
  private cleanKeywordString(input: string): string {
    console.log(`Cleaning keyword string: "${input}"`);
    
    // First, remove common symbols and noise
    let cleaned = input
      .replace(/®|™|©|℠/g, '') // Remove trademark/copyright symbols
      .replace(/\[.*?\]|\(.*?\)/g, '') // Remove text in brackets and parentheses
      .replace(/[[\]{}|<>]/g, ' ') // Remove special characters
      .replace(/^\d+\s*[.:)]\s*/, '') // Remove list numbers (e.g., "1. ", "2) ")
      .replace(/\b\d{5,}\b/g, '') // Remove long numbers (likely SKUs, model numbers)
      .replace(/\s+-\s+.*$/, '') // Remove everything after a dash with spaces around it
      .replace(/\s*,\s*([a-z])/g, ' $1') // Convert commas to spaces when followed by lowercase (likely list items)
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim(); // Remove leading/trailing whitespace
      
    // Next, check if there are any model numbers or variant codes that should be removed
    // These often appear as alphanumeric codes that don't add search value
    cleaned = cleaned
      .replace(/\b[A-Z]\d{3,}\b/g, '') // Remove model numbers like "A1234"
      .replace(/\b[A-Z]{2,}\d{2,}\b/g, '') // Remove codes like "AB123"
      .replace(/\b\d{2,}[A-Z]{1,}\b/g, '') // Remove codes like "123A"
      .replace(/\s+/g, ' ') // Normalize spaces again
      .trim();
      
    console.log(`After cleaning: "${cleaned}"`);
    
    // Remove any excess words if the keyword is still very long
    if (cleaned.length > 50) {
      const words = cleaned.split(' ');
      if (words.length > 7) {
        // Keep only the first 7 words which typically contain the main product details
        cleaned = words.slice(0, 7).join(' ');
        console.log(`Truncated long keyword to: "${cleaned}"`);
      }
    }
    
    return cleaned;
  }

  /**
   * Extract meaningful keywords from a product URL or title
   * This improved method focuses on pulling out the most relevant search terms
   * @param input The URL or product title/topic to use
   * @returns The extracted keywords
   */
  private extractKeywordFromUrl(input: string): string {
    console.log(`Extracting keywords from input: "${input}"`);
    
    // First check if input is a URL or direct topic
    let extractedKeyword;

    if (input.startsWith('http://') || input.startsWith('https://')) {
      try {
        // Extract product name from URL
        const urlObj = new URL(input);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        
        // Get the last segment (usually product handle)
        const handle = pathSegments[pathSegments.length - 1];
        
        // Convert handle to keywords (replace hyphens with spaces)
        extractedKeyword = handle.replace(/-/g, ' ');
        console.log(`Extracted from URL handle: "${extractedKeyword}"`);
      } catch (error) {
        // If URL parsing fails, just use the input
        extractedKeyword = input;
        console.log(`URL parsing failed, using raw input: "${extractedKeyword}"`);
      }
    } else {
      // If it's not a URL, use the input directly
      extractedKeyword = input;
      console.log(`Using direct input as keyword: "${extractedKeyword}"`);
    }

    // Special case: Sometimes we get product titles that are very long and specific
    // Extract the most relevant parts to use as keyword
    if (extractedKeyword.length > 30) {
      console.log(`Long keyword detected (${extractedKeyword.length} chars), extracting core terms...`);
      
      // Remove common product identifiers and model numbers that don't make good search keywords
      // e.g. "(Model: ABC123)" or "- XYZ456"
      extractedKeyword = extractedKeyword
        .replace(/\s*[-–—]\s*[A-Z0-9]{3,8}\b/g, '') // Remove model numbers after dashes
        .replace(/\bmodel[:\s]+[A-Z0-9\-]{3,10}\b/i, '') // Remove model numbers with "model:" prefix
        .replace(/\b(?:model|type|item|sku|part|size|style)\b[:\s]+[\w\d\-]{3,10}\b/gi, '') // Remove various product identifiers
        .replace(/\b[A-Z0-9]{2,3}[-–—][A-Z0-9]{3,6}\b/g, '') // Remove formatted model numbers like "AB-12345"
        .replace(/\([^)]*\)/g, '') // Remove text in parentheses
        .replace(/\sby\s[\w\s]+$/i, ''); // Remove "by [Brand]" at the end
      
      // Extract core product terms (the first 3-5 words usually contain the key product terms)
      const words = extractedKeyword.split(/\s+/);
      
      if (words.length > 5) {
        // Get the most likely core product terms
        // For water products, look for specific product category indicators
        const waterProductIndex = words.findIndex(word => 
          word.toLowerCase().includes('water') || 
          word.toLowerCase().includes('filter') || 
          word.toLowerCase().includes('softener')
        );
        
        // If we found water-related terms, use them as central point
        if (waterProductIndex >= 0) {
          // Get a few words before and after the water term
          const startIndex = Math.max(0, waterProductIndex - 1);
          const endIndex = Math.min(words.length, waterProductIndex + 3);
          const coreTerms = words.slice(startIndex, endIndex);
          
          // Join the core terms back together
          extractedKeyword = coreTerms.join(' ');
          console.log(`Extracted water-related core terms: "${extractedKeyword}"`);
        } else {
          // Default: just use the first 3-4 words which typically contain the main product type
          extractedKeyword = words.slice(0, 4).join(' ');
          console.log(`Extracted first 4 words as core terms: "${extractedKeyword}"`);
        }
      }
    }

    // Apply final cleaning to the keyword
    const cleanedKeyword = this.cleanKeywordString(extractedKeyword);
    console.log(`Final cleaned keyword: "${cleanedKeyword}"`);
    
    return cleanedKeyword;
  }

  /**
   * Determine intent from keyword data
   * @param keywordItem The keyword data to determine intent from
   * @returns The determined intent
   */
  private determineIntent(keywordItem: any): string {
    // This is a simplified intent determination based on common patterns
    // In a real implementation, this would be more sophisticated
    const keyword = keywordItem.keyword?.toLowerCase() || '';
    
    if (keyword.includes('buy') || keyword.includes('price') || keyword.includes('cost') || keyword.includes('shop')) {
      return 'Transactional';
    } else if (keyword.includes('how to') || keyword.includes('guide') || keyword.includes('tutorial')) {
      return 'Informational';
    } else if (keyword.includes('best') || keyword.includes('vs') || keyword.includes('review')) {
      return 'Commercial';
    } else {
      return 'Navigational';
    }
  }

  /**
   * Get competition level description from competition value
   * @param competition Competition value from 0-1
   * @returns Competition level description (Low, Medium, High)
   */
  private getCompetitionLevel(competition: number): string {
    if (competition < 0.33) {
      return "Low";
    } else if (competition < 0.66) {
      return "Medium";
    } else {
      return "High";
    }
  }

  /**
   * Calculate keyword difficulty based on available metrics
   * @param keywordItem Keyword data item
   * @returns Keyword difficulty score from 0-100
   */
  private calculateKeywordDifficulty(keywordItem: any): number {
    // This is a simplified calculation
    // In a real implementation, this would be more sophisticated
    
    // Use competition as a base factor (0-1)
    const competitionFactor = keywordItem.competition || 0;
    
    // Factor in search volume (more searches = more difficult)
    const volumeFactor = Math.min(1, (keywordItem.search_volume || 0) / 10000);
    
    // Factor in CPC (higher CPC = more difficult)
    const cpcFactor = Math.min(1, (keywordItem.cpc || 0) / 5);
    
    // Calculate and return difficulty score from 0-100
    return Math.round((competitionFactor * 0.5 + volumeFactor * 0.3 + cpcFactor * 0.2) * 100);
  }

  /**
   * Extract generic terms from a specific product name
   * This helps find more general categories when specific product names have no search volume
   * @param productName The specific product name to extract generic terms from
   * @returns Array of generic terms in order of relevance
   */
  private extractGenericTerms(productName: string): string[] {
    console.log(`Extracting generic terms from: ${productName}`);
    const terms: string[] = [];
    
    // Convert to lowercase for better matching
    const input = productName.toLowerCase();
    
    // Remove special characters and normalize
    const normalizedInput = input
      .replace(/®|™|©|\[.*?\]|\(.*?\)/g, '') // Remove registered/trademark symbols and bracketed text
      .replace(/[^\w\s-]/g, ' ')             // Replace other special chars with spaces
      .replace(/\s+/g, ' ')                  // Normalize spaces
      .trim();
      
    console.log(`Normalized input: ${normalizedInput}`);
    
    // Split into individual words
    const words = normalizedInput.split(' ');
    
    // Build an expanded set of category keywords for various industries
    // This helps us generate high-quality API queries that are likely to return data
    const categoryKeywords = {
      // Water treatment keywords
      waterTreatment: [
        'water softener', 'water conditioner', 'water filter', 'water purifier', 'water system',
        'water treatment', 'water purification', 'softener', 'conditioner', 'water filtration',
        'water system', 'water quality', 'reverse osmosis', 'deionization', 'water testing',
        'well water', 'city water', 'hard water', 'soft water', 'iron filter', 'salt free'
      ],
      
      // Clothing and apparel
      clothing: [
        'jacket', 'coat', 'sweater', 'shoes', 'boots', 'pants', 'jeans', 'shirt', 't-shirt',
        'hoodie', 'sweatshirt', 'dress', 'skirt', 'hat', 'cap', 'beanie', 'gloves', 'socks',
        'underwear', 'activewear', 'sportswear', 'workout clothes', 'gym clothes', 'shorts'
      ],
      
      // Electronics
      electronics: [
        'laptop', 'computer', 'phone', 'smartphone', 'tablet', 'monitor', 'tv', 'television',
        'camera', 'headphones', 'earbuds', 'speaker', 'smart watch', 'gaming console', 'keyboard',
        'mouse', 'router', 'modem', 'printer', 'scanner', 'microphone', 'charger', 'power bank'
      ],
      
      // Home goods and furniture
      home: [
        'furniture', 'chair', 'table', 'desk', 'sofa', 'couch', 'bed', 'mattress', 'dresser',
        'bookshelf', 'shelf', 'cabinet', 'wardrobe', 'nightstand', 'ottoman', 'coffee table',
        'dining table', 'bedding', 'towels', 'curtains', 'blinds', 'rug', 'carpet', 'lamp'
      ],
      
      // Appliances
      appliances: [
        'appliance', 'refrigerator', 'fridge', 'dishwasher', 'washer', 'dryer', 'microwave',
        'oven', 'stove', 'range', 'cooktop', 'blender', 'mixer', 'toaster', 'coffee maker',
        'vacuum', 'air purifier', 'humidifier', 'dehumidifier', 'air conditioner', 'heater'
      ],
      
      // Tools
      tools: [
        'tool', 'drill', 'saw', 'hammer', 'screwdriver', 'wrench', 'pliers', 'level', 'tape measure',
        'power tool', 'lawn mower', 'trimmer', 'generator', 'battery', 'gardening tools', 'yard tools'
      ],
      
      // Outdoor and sports
      outdoor: [
        'grill', 'bbq', 'tent', 'camping', 'hiking', 'backpack', 'fishing', 'boat', 'bike', 'bicycle',
        'scooter', 'helmet', 'kayak', 'paddle', 'golf', 'basketball', 'football', 'baseball', 'tennis',
        'snowboard', 'ski', 'skateboard', 'surfboard', 'wetsuit'
      ]
    };
    
    // Flatten all categories into a single array for initial search
    const allCategories = Object.values(categoryKeywords).flat();
    
    // Check for category terms in the product name
    for (const category of allCategories) {
      if (normalizedInput.includes(category)) {
        terms.push(category);
      }
    }
    
    // Look for word pairs that might be categories (2-3 words)
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]} ${words[i + 1]}`;
      const triple = i < words.length - 2 ? `${words[i]} ${words[i + 1]} ${words[i + 2]}` : '';
      
      // Check if this pair/triple looks like a category
      if (triple && triple.length > 5 && !terms.includes(triple)) {
        terms.push(triple);
      }
      
      if (pair.length > 5 && !terms.includes(pair)) {
        terms.push(pair);
      }
    }
    
    // Add single words that might be meaningful (exclude common stop words)
    const stopWords = ['the', 'and', 'or', 'for', 'with', 'in', 'on', 'at', 'to', 'a', 'an', 'by', 'is', 'it', 'of', 'from'];
    for (const word of words) {
      if (word.length > 3 && !stopWords.includes(word) && !terms.some(term => term.includes(word))) {
        terms.push(word);
      }
    }
    
    // Determine which category this product likely belongs to
    let categoryType: keyof typeof categoryKeywords | null = null;
    
    // Check for water treatment products first (primary focus of the app)
    if (normalizedInput.includes('water') || 
        normalizedInput.includes('softener') || 
        normalizedInput.includes('conditioner') || 
        normalizedInput.includes('filter')) {
      categoryType = 'waterTreatment';
    } 
    // Check for clothing products
    else if (normalizedInput.includes('jacket') || 
             normalizedInput.includes('coat') || 
             normalizedInput.includes('shirt') || 
             normalizedInput.includes('pant') || 
             normalizedInput.includes('shoe') || 
             normalizedInput.includes('boot')) {
      categoryType = 'clothing';
    }
    // Check for electronics
    else if (normalizedInput.includes('phone') || 
             normalizedInput.includes('laptop') || 
             normalizedInput.includes('computer') || 
             normalizedInput.includes('tv') || 
             normalizedInput.includes('headphone')) {
      categoryType = 'electronics';
    }
    // Check for outdoor/sports products
    else if (normalizedInput.includes('snowboard') || 
             normalizedInput.includes('ski') || 
             normalizedInput.includes('bike') || 
             normalizedInput.includes('camp') || 
             normalizedInput.includes('hike') || 
             normalizedInput.includes('fish')) {
      categoryType = 'outdoor';
    }
    // Check for appliance products
    else if (normalizedInput.includes('appliance') || 
             normalizedInput.includes('fridge') || 
             normalizedInput.includes('oven') || 
             normalizedInput.includes('washer') || 
             normalizedInput.includes('dryer')) {
      categoryType = 'appliances';
    }
    // Check for furniture/home products
    else if (normalizedInput.includes('furniture') || 
             normalizedInput.includes('sofa') || 
             normalizedInput.includes('bed') || 
             normalizedInput.includes('chair') || 
             normalizedInput.includes('table')) {
      categoryType = 'home';
    }
    // Check for tools
    else if (normalizedInput.includes('tool') || 
             normalizedInput.includes('drill') || 
             normalizedInput.includes('saw') || 
             normalizedInput.includes('hammer')) {
      categoryType = 'tools';
    }
    
    // Add more targeted terms based on the identified category
    if (categoryType) {
      const categorySpecificTerms = categoryKeywords[categoryType];
      
      // Add the top 10 most relevant category terms that aren't already in our list
      for (let i = 0; i < categorySpecificTerms.length && i < 20; i++) {
        const term = categorySpecificTerms[i];
        if (!terms.includes(term)) {
          terms.push(term);
        }
      }
      
      // If this is a water treatment product, add special handling
      if (categoryType === 'waterTreatment') {
        // Add specific water treatment terms in order of relevance
        if (normalizedInput.includes('softener')) {
          terms.unshift('water softener'); // Add to front of array if it's specifically a softener
        } else if (normalizedInput.includes('filter')) {
          terms.unshift('water filter');
        } else if (normalizedInput.includes('conditioner')) {
          terms.unshift('water conditioner');
        } else {
          // Generic water treatment terms
          terms.unshift('water treatment system');
        }
        
        // Add salt free specific terms if applicable
        if (normalizedInput.includes('salt free') || normalizedInput.includes('saltfree')) {
          if (!terms.includes('salt free water softener')) terms.unshift('salt free water softener');
          if (!terms.includes('salt free water conditioner')) terms.push('salt free water conditioner');
        }
        
        // Add specific usage contexts if present
        if (normalizedInput.includes('city water') || normalizedInput.includes('citywater')) {
          if (!terms.includes('city water treatment')) terms.push('city water treatment');
          if (!terms.includes('city water filter')) terms.push('city water filter');
        }
        
        if (normalizedInput.includes('well water') || normalizedInput.includes('wellwater')) {
          if (!terms.includes('well water treatment')) terms.push('well water treatment');
          if (!terms.includes('well water filter')) terms.push('well water filter');
        }
      }
      
      // If this is a clothing product, add special handling
      else if (categoryType === 'clothing') {
        if (normalizedInput.includes('jacket')) {
          if (!terms.includes('winter jacket')) terms.push('winter jacket');
          if (!terms.includes('rain jacket')) terms.push('rain jacket');
          if (!terms.includes('jacket styles')) terms.push('jacket styles');
        }
        if (normalizedInput.includes('shoe') || normalizedInput.includes('boot')) {
          if (!terms.includes('shoe sizing')) terms.push('shoe sizing');
          if (!terms.includes('comfortable shoes')) terms.push('comfortable shoes');
        }
      }
      
      // For electronics, add specific terms
      else if (categoryType === 'electronics') {
        if (!terms.includes('tech review')) terms.push('tech review');
        if (!terms.includes('electronics guide')) terms.push('electronics guide');
        if (!terms.includes('gadget review')) terms.push('gadget review');
      }
      
      // For outdoor category
      else if (categoryType === 'outdoor') {
        if (normalizedInput.includes('snowboard')) {
          if (!terms.includes('snowboard')) terms.unshift('snowboard');
          if (!terms.includes('snowboarding')) terms.push('snowboarding');
          if (!terms.includes('winter sports')) terms.push('winter sports');
        }
        if (!terms.includes('outdoor gear')) terms.push('outdoor gear');
        if (!terms.includes('outdoor activities')) terms.push('outdoor activities');
      }
    } else {
      // For products we couldn't categorize, extract key terms
      if (words.length >= 2) {
        // Try to identify the main product category using the last 2 words
        // This works well for many products like "Sony Noise Cancelling Headphones"
        const lastTwoWords = `${words[words.length - 2]} ${words[words.length - 1]}`;
        if (lastTwoWords.length > 5) {
          terms.unshift(lastTwoWords);
        } else {
          // If just one word at the end, use it
          terms.unshift(words[words.length - 1]);
        }
      }
      
      // Always add some general e-commerce terms for unknown categories
      if (!terms.includes('product review')) terms.push('product review');
      if (!terms.includes('buying guide')) terms.push('buying guide');
      if (!terms.includes('comparison')) terms.push('comparison');
      if (!terms.includes('best brands')) terms.push('best brands');
    }
    
    // Create common combinations that generally perform well in search
    if (terms.length > 0) {
      const mainTerm = terms[0];
      const combinations = [
        `best ${mainTerm}`,
        `${mainTerm} reviews`,
        `${mainTerm} buying guide`,
        `how to choose ${mainTerm}`,
        `${mainTerm} comparison`,
        `top rated ${mainTerm}`
      ];
      
      // Add these combinations if they don't already exist
      for (const combo of combinations) {
        if (!terms.includes(combo)) {
          terms.push(combo);
        }
      }
    }
    
    console.log(`Extracted terms: ${terms.join(', ')}`);
    return terms;
  }

  /**
   * Sort keywords by relevance based on various metrics
   * This ensures the most valuable keywords for content creation are prioritized
   * @param keywords The array of keywords to sort
   * @returns Sorted array of keywords
   */
  private sortKeywordsByRelevance(keywords: KeywordData[]): KeywordData[] {
    console.log(`Sorting ${keywords.length} keywords by relevance`);
    
    // If there's only one keyword, no need to sort
    if (keywords.length <= 1) {
      return keywords;
    }

    // Keep the first keyword (main keyword) in position
    const mainKeyword = keywords[0];
    const otherKeywords = keywords.slice(1);
    
    // Create a scoring function to rank keywords by their value for content creation
    const getKeywordScore = (keyword: KeywordData): number => {
      let score = 0;
      
      // Start with search volume as the base score
      score += keyword.searchVolume ? keyword.searchVolume / 1000 : 0;
      
      // Adjust score based on intent (highest value for informational keywords)
      if (keyword.intent === 'Informational') {
        score *= 1.5; // Best for blog posts
      } else if (keyword.intent === 'Commercial') {
        score *= 1.2; // Good for product comparison
      } else if (keyword.intent === 'Navigational') {
        score *= 0.7; // Less useful for content
      }
      
      // Adjust for competition (lower competition is better)
      if (keyword.competition) {
        score *= (1 - keyword.competition * 0.3); // Reduce score by up to 30% for high competition
      }
      
      // Adjust for specific patterns ideal for blog content
      const lowercaseKeyword = keyword.keyword.toLowerCase();
      if (lowercaseKeyword.includes('how to') || 
          lowercaseKeyword.includes('guide') || 
          lowercaseKeyword.includes('tips')) {
        score *= 1.3;
      }
      
      // Adjust for specific patterns that make great blog titles
      if (lowercaseKeyword.includes('best') || 
          lowercaseKeyword.includes('vs') || 
          lowercaseKeyword.match(/^\d+\s+/)) { // Starts with number, like "10 best..."
        score *= 1.2;
      }
      
      return score;
    };
    
    // Sort other keywords by their content value score
    otherKeywords.sort((a, b) => {
      const scoreA = getKeywordScore(a);
      const scoreB = getKeywordScore(b);
      return scoreB - scoreA; // Descending order
    });
    
    // Return the main keyword followed by the sorted other keywords
    return [mainKeyword, ...otherKeywords];
  }

  /**
   * Generate related keywords based on a main keyword
   * This creates variations that maintain most of the metrics from the main keyword
   * @param mainKeyword The main keyword to generate variations from
   * @returns Array of related keyword data
   */
  // Convert this to an async method so we can make API calls to get related keywords
  // This change dramatically increases the number of keywords we can provide
  private async generateRelatedKeywords(mainKeyword: KeywordData): Promise<KeywordData[]> {
    // Get the base keyword
    const keyword = mainKeyword.keyword;
    console.log(`Generating related keywords for: ${keyword}`);
    
    // For related keywords, we'll make direct API calls using DataForSEO
    // We'll use a different endpoint to get a different set of keywords
    try {
      // First, try to use the related_keywords endpoint which should return complementary keywords
      console.log(`Making DataForSEO API call for related keywords`);
      
      // Set up auth for API call
      const auth = {
        username: this.username,
        password: this.password
      };
      
      // Use a different endpoint to get diverse results
      const requestData = [{
        keyword: keyword,
        language_code: "en",
        location_code: 2840, // United States
        limit: 200 // Get up to 200 results
      }];
      
      // Call the related_keywords endpoint which returns different associated terms
      const response = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/related_keywords/live`,
        requestData,
        { 
          auth,
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      // Process the response
      if (response.data?.tasks?.[0]?.result?.[0]?.keywords) {
        const relatedKeywords = response.data.tasks[0].result[0].keywords;
        console.log(`Got ${relatedKeywords.length} related keywords from API`);
        
        // Convert the related keywords into our standard KeywordData format
        const keywordData: KeywordData[] = [];
        
        for (const relatedKeyword of relatedKeywords) {
          const keywordText = relatedKeyword.keyword || '';
          
          // The related_keywords endpoint has a different structure
          // We need to handle the different properties it returns
          const searchVolume = relatedKeyword.keyword_properties?.search_volume || 0;
          const competition = relatedKeyword.keyword_properties?.competition || 0;
          const cpc = relatedKeyword.keyword_properties?.cpc || 0;
          
          // Build the keyword data
          keywordData.push({
            keyword: keywordText,
            searchVolume,
            cpc,
            competition,
            competitionLevel: this.getCompetitionLevel(competition),
            intent: this.determineIntent({ keyword: keywordText }),
            trend: Array(12).fill(Math.round(searchVolume / 12)), // Distribute volume evenly as trends aren't available
            difficulty: this.calculateKeywordDifficulty({
              search_volume: searchVolume,
              competition,
              cpc
            }),
            selected: false
          });
        }
        
        // If the related keywords API returned data, use it
        if (keywordData.length > 0) {
          console.log(`Successfully generated ${keywordData.length} related keywords`);
          return keywordData;
        }
      }
      
      // If the related keywords endpoint didn't return data, try the keyword_suggestions endpoint
      console.log(`Related keywords endpoint failed, trying keyword_suggestions endpoint`);
      
      const suggestionsRequestData = [{
        keyword: keyword,
        language_code: "en", 
        location_code: 2840,
        limit: 200
      }];
      
      const suggestionsResponse = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/keyword_suggestions/live`,
        suggestionsRequestData,
        { 
          auth, 
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (suggestionsResponse.data?.tasks?.[0]?.result) {
        const suggestions = suggestionsResponse.data.tasks[0].result;
        console.log(`Got ${suggestions.length} keyword suggestions from API`);
        
        // Convert the suggestions into our standard KeywordData format
        const keywordData: KeywordData[] = [];
        
        for (const suggestion of suggestions) {
          // The keyword_suggestions endpoint has a different data structure
          // Make sure we're extracting the right fields
          keywordData.push({
            keyword: suggestion.keyword || '',
            searchVolume: suggestion.search_volume || 0,
            cpc: suggestion.cpc || 0,
            competition: suggestion.competition_index || 0,
            competitionLevel: this.getCompetitionLevel(suggestion.competition_index || 0),
            intent: this.determineIntent({ keyword: suggestion.keyword || '' }),
            trend: Array(12).fill(Math.round((suggestion.search_volume || 0) / 12)),
            difficulty: this.calculateKeywordDifficulty({
              search_volume: suggestion.search_volume || 0,
              competition: suggestion.competition_index || 0,
              cpc: suggestion.cpc || 0
            }),
            selected: false
          });
        }
        
        // If the suggestions API returned data, use it
        if (keywordData.length > 0) {
          console.log(`Successfully generated ${keywordData.length} keyword suggestions`);
          return keywordData;
        }
      }
      
      // If both API calls failed, then fall back to minimal placeholder
      console.log(`Both related keywords and keyword suggestions APIs failed to return data`);
    } catch (err: any) {
      console.error(`Error generating related keywords: ${err.message}`);
    }
    
    // If all API calls fail, return a minimal placeholder that clearly indicates API failure
    return [
      {
        keyword: `${keyword} (API lookup required)`,
        searchVolume: 0,
        cpc: 0,
        competition: 0,
        competitionLevel: "Low",
        intent: "Informational",
        trend: Array(12).fill(0),
        difficulty: 0,
        selected: false
      }
    ];
  }

  /**
   * Generate fallback keywords for a given input 
   * This simulates API data when the real API call fails
   * @param input The keyword/topic to generate fallback data for
   * @returns Array of simulated keyword data
   */
  /**
   * Minimal fallback method - ONLY used when DataForSEO completely fails
   * We now try to avoid using fallback data and instead make multiple API attempts
   */
  private generateFallbackKeywords(input: string): KeywordData[] {
    console.error(`Critical: DataForSEO failed to return any keywords for "${input}"`);
    console.error(`This should not happen if API credentials are valid. Please check your DataForSEO connection and credentials.`);
    
    // We will attempt to use simpler, more generic versions of the input term
    // to query DataForSEO again instead of generating fake data
    const simplifiedTerms = this.extractGenericTerms(input);
    
    // Return just the input keyword with zero metrics to indicate API failure
    // This helps us identify when we need to fix the API connection
    const result: KeywordData[] = [{
      keyword: input,
      searchVolume: 0,
      cpc: 0,
      competition: 0,
      competitionLevel: "Low",
      intent: "Navigational",
      trend: Array(12).fill(0),
      difficulty: 0,
      selected: false
    }];
    
    // Add a few generic keywords ONLY for UI display purposes
    if (simplifiedTerms.length > 0) {
      // Add just the first generic term with a flag showing it's a suggested term
      const genericKeyword = simplifiedTerms[0];
      result.push({
        keyword: `Try API search for: ${genericKeyword}`,
        searchVolume: 0,
        cpc: 0,
        competition: 0,
        competitionLevel: "Low",
        intent: "Informational",
        trend: Array(12).fill(0),
        difficulty: 0,
        selected: false
      });
    }
    
    return result;
  }

  /**
   * Test the connection to DataForSEO API
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.hasValidCredentials()) {
      return {
        success: false,
        message: 'DataForSEO credentials not set'
      };
    }

    try {
      console.log(`Testing DataForSEO connection with login: ${this.username}`);
      console.log(`Auth details - username length: ${this.username.length}, password length: ${this.password.length}`);
      
      // Use a simple POST request instead of GET for testing
      // DataForSEO's API prefers POST requests for most endpoints
      const auth = {
        username: this.username,
        password: this.password
      };

      // Use a keyword search endpoint that's known to work
      // For search_volume endpoint, use 'keywords' array instead of 'keyword'
      const requestData = [{
        keywords: ["test connection"], // Always using a simple keyword for testing
        language_code: "en",
        location_code: 2840 // United States
      }];

      // Add more detailed logging
      const endpoint = `/v3/keywords_data/google/search_volume/live`;
      console.log(`DataForSEO test request URL: ${this.apiUrl}${endpoint}`);
      console.log(`DataForSEO test request data: ${JSON.stringify(requestData)}`);
      
      try {
        const response = await axios.post(
          `${this.apiUrl}${endpoint}`,
          requestData,
          { 
            auth,
            timeout: 15000, // 15 second timeout
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`DataForSEO test connection HTTP status: ${response.status}`);
        
        // Check DataForSEO specific status code in the response data
        if (response.data && response.data.status_code) {
          console.log(`DataForSEO API status code: ${response.data.status_code}`);
          console.log(`DataForSEO API status message: ${response.data.status_message || 'No message'}`);
          
          // DataForSEO uses 20000 as their success code
          if (response.data.status_code === 20000) {
            return {
              success: true,
              message: 'Connected to DataForSEO API successfully'
            };
          } else {
            return {
              success: false,
              message: `DataForSEO API error: ${response.data.status_message || 'Unknown error'}`
            };
          }
        }
        
        // If no DataForSEO specific status code, fall back to HTTP status
        if (response.status >= 200 && response.status < 300) {
          return {
            success: true,
            message: 'Connected to DataForSEO API successfully'
          };
        } else {
          return {
            success: false,
            message: `DataForSEO API returned unexpected status: ${response.status}`
          };
        }
      } catch (axiosError: any) {
        // Special handling for 401 errors which indicate authentication problems
        if (axiosError.response?.status === 401) {
          console.error("DataForSEO authentication failed. Status 401 Unauthorized");
          
          // Show the exact error response to help debug
          if (axiosError.response?.data) {
            console.error("DataForSEO error response:", JSON.stringify(axiosError.response.data));
          }
          
          return {
            success: false,
            message: 'Authentication failed: Invalid DataForSEO API credentials. Make sure your API key is in the format "username:password".'
          };
        }
        
        throw axiosError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: any) {
      console.error("DataForSEO connection test error:", error.message);
      
      // Log the full error object for debugging
      console.error("DataForSEO error details:", error);
      
      // Extract more detailed error information if available
      const errorResponse = error.response?.data;
      const errorDetails = errorResponse?.status_message || error.message || 'Unknown error';
      
      // Enhanced error messages based on common DataForSEO errors
      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: 'Could not connect to DataForSEO API server. Please check your internet connection.'
        };
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Connection to DataForSEO API timed out. Please try again later.'
        };
      } else if (errorDetails.toLowerCase().includes('unauthorized') || 
                 errorDetails.toLowerCase().includes('authentication')) {
        return {
          success: false,
          message: 'Invalid DataForSEO API credentials. Please check your API key format (should be username:password).'
        };
      }
      
      return {
        success: false,
        message: `Failed to connect to DataForSEO API: ${errorDetails}`
      };
    }
  }
}

// Create and export singleton instance
export const dataForSEOService = new DataForSEOService();