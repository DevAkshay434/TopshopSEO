import Anthropic from '@anthropic-ai/sdk';
import { shopifyApiRequest } from './shopify-api';
import { logger } from '../logger';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Interface for product analysis results
 */
export interface ProductAnalysisResult {
  original: {
    title: string;
    description: string;
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    seoScore: number;
    readabilityScore: number;
    targetAudience: string[];
    emotionalAppeal: number;
  };
  suggestions: {
    improvedTitle: string;
    improvedDescription: string;
    keywords: string[];
    callToAction: string;
  };
}

/**
 * Analyze a product using Claude AI
 * @param storeUrl The Shopify store URL
 * @param accessToken The Shopify access token
 * @param productId The product ID to analyze
 */
export async function analyzeProduct(
  storeUrl: string,
  accessToken: string,
  productId: string
): Promise<ProductAnalysisResult> {
  try {
    // Fetch the product details from Shopify
    const productResponse = await shopifyApiRequest(
      storeUrl,
      accessToken,
      `GET`,
      `/products/${productId}.json`
    );

    if (!productResponse.success || !productResponse.data.product) {
      throw new Error('Failed to fetch product details');
    }

    const product = productResponse.data.product;
    const title = product.title;
    const description = product.body_html?.replace(/<[^>]*>/g, ' ').trim() || '';
    const price = product.variants[0]?.price || 'N/A';
    const tags = product.tags || '';
    const productType = product.product_type || '';
    const images = product.images?.length || 0;

    // Format product data for analysis
    const productInfo = `
      Title: ${title}
      Description: ${description}
      Price: ${price}
      Product Type: ${productType}
      Tags: ${tags}
      Number of Images: ${images}
    `;

    // Create the prompt for Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1500,
      system: `You are an expert e-commerce and SEO consultant specializing in Shopify product listings. 
      Analyze the following product details and provide constructive feedback to improve sales and SEO.
      Format your response as valid JSON with the following structure:
      {
        "analysis": {
          "strengths": [array of string strengths],
          "weaknesses": [array of string weaknesses],
          "seoScore": number from 1-10,
          "readabilityScore": number from 1-10,
          "targetAudience": [array of potential customer types],
          "emotionalAppeal": number from 1-10
        },
        "suggestions": {
          "improvedTitle": "string with SEO-optimized title",
          "improvedDescription": "string with enhanced product description (HTML allowed)",
          "keywords": [array of recommended keywords],
          "callToAction": "string with effective call to action"
        }
      }`,
      messages: [
        {
          role: 'user', 
          content: `Please analyze this Shopify product listing and provide detailed feedback with specific improvements:\n\n${productInfo}`
        }
      ],
    });

    // Parse the JSON response
    const jsonResponseText = response.content[0].text;
    const jsonResponse = JSON.parse(jsonResponseText);

    // Return the analysis result
    return {
      original: {
        title,
        description,
      },
      analysis: jsonResponse.analysis,
      suggestions: jsonResponse.suggestions,
    };
  } catch (error) {
    logger.error('Error analyzing product:', error);
    throw new Error(`Failed to analyze product: ${error.message}`);
  }
}

/**
 * Apply suggested improvements to a product
 * @param storeUrl The Shopify store URL
 * @param accessToken The Shopify access token
 * @param productId The product ID to update
 * @param improvements The improvements to apply
 */
export async function applyProductImprovements(
  storeUrl: string,
  accessToken: string,
  productId: string,
  improvements: {
    title?: string;
    description?: string;
    metafields?: {
      key: string;
      value: string;
      type: string;
      namespace: string;
    }[];
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Create the product update payload
    const updatePayload: any = {
      product: {
        id: productId,
      },
    };

    if (improvements.title) {
      updatePayload.product.title = improvements.title;
    }

    if (improvements.description) {
      updatePayload.product.body_html = improvements.description;
    }

    // Update the product in Shopify
    const updateResponse = await shopifyApiRequest(
      storeUrl,
      accessToken,
      `PUT`,
      `/products/${productId}.json`,
      updatePayload
    );

    if (!updateResponse.success) {
      throw new Error('Failed to update product');
    }

    // If there are metafields to update
    if (improvements.metafields && improvements.metafields.length > 0) {
      for (const metafield of improvements.metafields) {
        const metafieldPayload = {
          metafield: {
            namespace: metafield.namespace,
            key: metafield.key,
            value: metafield.value,
            type: metafield.type,
          },
        };

        await shopifyApiRequest(
          storeUrl,
          accessToken,
          `POST`,
          `/products/${productId}/metafields.json`,
          metafieldPayload
        );
      }
    }

    return {
      success: true,
      message: 'Product improvements applied successfully',
    };
  } catch (error) {
    logger.error('Error applying product improvements:', error);
    return {
      success: false,
      message: `Failed to apply improvements: ${error.message}`,
    };
  }
}