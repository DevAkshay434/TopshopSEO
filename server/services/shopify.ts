import axios, { AxiosInstance } from 'axios';
import { ShopifyConnection, ShopifyStore, BlogPost } from '@shared/schema';

interface ShopifyBlog {
  id: string;
  title: string;
}

interface ShopifyArticle {
  id: string;
  title: string;
  handle: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  body_html: string;
  blog_id: string;
  author: string;
  user_id: string;
  summary_html: string;
  template_suffix: string;
  tags: string;
  admin_graphql_api_id: string;
}

// Interfaces for products and collections
export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description?: string;
  vendor?: string;
  product_type?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  tags?: string;
  variants?: ShopifyProductVariant[];
  images?: ShopifyProductImage[];
  url?: string; // Full URL to the product
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
}

export interface ShopifyProductImage {
  id: string;
  src: string;
  width?: number;
  height?: number;
  alt?: string;
  position?: number;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description?: string;
  published_at?: string;
  updated_at: string;
  url?: string; // Full URL to the collection
}

export class ShopifyService {
  private clients: Map<number, AxiosInstance> = new Map();
  private shopDomains: Map<number, string> = new Map();
  
  /**
   * Initialize a client for a specific store
   * @param store The Shopify store information
   * @returns The created axios instance
   */
  private initializeClient(store: ShopifyStore): AxiosInstance {
    console.log(`Initializing Shopify client for store: ${store.shopName}`);
    console.log(`Access token (first 5 chars): ${store.accessToken.substring(0, 5)}...`);
    
    const client = axios.create({
      baseURL: `https://rajeshshah.myshopify.com/admin/api/2023-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });
    
    // Add request and response interceptors for debugging
    client.interceptors.request.use(config => {
      console.log(`Shopify API request for ${store.shopName}: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });
    
    client.interceptors.response.use(
      response => {
        console.log(`Shopify API response for ${store.shopName}: ${response.status} for ${response.config.url}`);
        return response;
      },
      error => {
        if (error.response) {
          console.error(`Shopify API error for ${store.shopName}: ${error.response.status} for ${error.config.url}`);
          console.error(`Error data:`, error.response.data);
        } else {
          console.error(`Shopify API error for ${store.shopName}:`, error.message);
        }
        return Promise.reject(error);
      }
    );
    
    // Cache the client and domain name
    this.clients.set(store.id, client);
    this.shopDomains.set(store.id, store.shopName);
    
    return client;
  }
  
  /**
   * Get the client for a specific store, initializing it if necessary
   * @param store The Shopify store to get a client for
   * @returns The axios client for the store
   */
  private getClient(store: ShopifyStore): AxiosInstance {
    // Check if we already have a client for this store
    let client = this.clients.get(store.id);
    
    // If not, initialize one
    if (!client || !store.isConnected) {
      client = this.initializeClient(store);
    }
    
    return client;
  }
  
  /**
   * For backward compatibility with old connection interface
   * @param connection Legacy ShopifyConnection 
   */
  public setConnection(connection: ShopifyConnection) {
    console.log("Warning: Using legacy setConnection method");
    
    // Create a temporary store object to use with the new client system
    const store: ShopifyStore = {
      id: 1,
      shopName: 'rajeshshah.myshopify.com',
      accessToken: 'shpua_a3cb5421464bdfad1969f818e83d41a3',
      scope: 'read_products,write_products,read_content,write_content', // Not available in legacy connection
      defaultBlogId: null,
      isConnected: connection.isConnected || true,
      lastSynced: connection.lastSynced,
      installedAt: new Date(),
      uninstalledAt: null,
      planName: null,
      chargeId: null,
      trialEndsAt: null
    };
    
    // Initialize the client
    this.initializeClient(store);
  }
  
  /**
   * Get blogs from a specific store
   * @param store The store to get blogs from
   * @returns Array of Shopify blogs
   */
  public async getBlogs(store: ShopifyStore): Promise<ShopifyBlog[]> {
    try {
      const client = this.getClient(store);
      const response = await client.get('/blogs.json');
      return response.data.blogs;
    } catch (error: any) {
      console.error(`Error fetching blogs from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch blogs: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get blog details including handle/slug
   * @param store The store to get the blog from
   * @param blogId The ID of the blog to fetch
   * @returns The Shopify blog with handle
   */
  public async getBlogById(store: ShopifyStore, blogId: string): Promise<any> {
    try {
      const client = this.getClient(store);
      const response = await client.get(`/blogs/${blogId}.json`);
      return response.data.blog;
    } catch (error: any) {
      console.error(`Error fetching blog from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch blog: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Create an article in a specific store
   * @param store The store to create the article in
   * @param blogId The ID of the blog to create the article in
   * @param post The blog post to create
   * @returns The created Shopify article
   */
  public async createArticle(store: ShopifyStore, blogId: string, post: BlogPost): Promise<ShopifyArticle> {
    try {
      const client = this.getClient(store);
      
      // Properly handle the date formatting for Shopify API
      // Use current date if no publishedDate is provided
      let publishedAt: string | undefined = undefined;
      
      if (post.status === 'published') {
        publishedAt = post.publishedDate 
          ? new Date(post.publishedDate).toISOString() 
          : new Date().toISOString();
      }
      
      // Process content to handle proxied image URLs
      let processedContent = post.content;
      
      // Replace proxy image URLs with their Pexels source URLs
      // Look for both relative URLs and URLs with <a> tags
      const proxyImagePattern = /src="\/api\/proxy\/image\/(\d+)"/g;
      const proxyImageLinkPattern = /<a href="([^"]+)"><img src="\/api\/proxy\/image\/(\d+)"/g;
      let proxyMatch;
      let proxyLinkMatch;
      
      const pexelsService = await import('./pexels').then(module => module.pexelsService);
      
      // First, handle images with links
      while ((proxyLinkMatch = proxyImageLinkPattern.exec(processedContent)) !== null) {
        const productUrl = proxyLinkMatch[1];
        const imageId = proxyLinkMatch[2];
        console.log(`Found linked proxied image in content: ${imageId} with product link: ${productUrl}`);
        
        try {
          // Get the Pexels image with this ID
          const image = await pexelsService.getImageById(imageId);
          
          if (image && image.src) {
            // Get the best quality image URL
            const directImageUrl = image.src.large || image.src.medium || image.src.small || image.src.original;
            
            if (directImageUrl) {
              console.log(`Replacing linked proxy URL with direct URL: ${directImageUrl}`);
              // Replace the proxy URL with the direct URL in content, maintaining the link
              processedContent = processedContent.replace(
                `<a href="${productUrl}"><img src="/api/proxy/image/${imageId}"`, 
                `<a href="${productUrl}"><img src="${directImageUrl}"`
              );
            }
          }
        } catch (imageError) {
          console.error(`Error processing linked proxied image ${imageId}:`, imageError);
          // Continue with other images if one fails
        }
      }
      
      // Now handle standalone images (without links)
      while ((proxyMatch = proxyImagePattern.exec(processedContent)) !== null) {
        const imageId = proxyMatch[1];
        console.log(`Found standalone proxied image in content: ${imageId}`);
        
        try {
          // Get the Pexels image with this ID
          const image = await pexelsService.getImageById(imageId);
          
          if (image && image.src) {
            // Get the best quality image URL
            const directImageUrl = image.src.large || image.src.medium || image.src.small || image.src.original;
            
            if (directImageUrl) {
              console.log(`Replacing proxy URL with direct URL: ${directImageUrl}`);
              // Replace the proxy URL with the direct URL in content
              processedContent = processedContent.replace(
                `src="/api/proxy/image/${imageId}"`, 
                `src="${directImageUrl}"`
              );
            }
          }
        } catch (imageError) {
          console.error(`Error processing proxied image ${imageId}:`, imageError);
          // Continue with other images if one fails
        }
      }
      
      const article = {
        title: post.title,
        author: post.author || store.shopName,
        body_html: processedContent, // Use processed content with direct image URLs
        tags: post.tags || "",
        published: post.status === 'published',
        published_at: publishedAt,
        image: post.featuredImage ? { src: post.featuredImage } : undefined
      };
      
      console.log(`Creating Shopify article "${post.title}" in blog ${blogId}`);
      const response = await client.post(`/blogs/${blogId}/articles.json`, {
        article
      });
      
      console.log(`Successfully created Shopify article with ID: ${response.data.article.id}`);
      return response.data.article;
    } catch (error: any) {
      console.error(`Error creating article in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to create article: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Update an article in a specific store
   * @param store The store to update the article in
   * @param blogId The ID of the blog containing the article
   * @param articleId The ID of the article to update
   * @param post The updated blog post data
   * @returns The updated Shopify article
   */
  public async updateArticle(store: ShopifyStore, blogId: string, articleId: string, post: Partial<BlogPost>): Promise<ShopifyArticle> {
    try {
      const client = this.getClient(store);
      const article: any = {};
      
      // Log the post data to help diagnose issues
      console.log("Updating Shopify article with post data:", JSON.stringify({
        id: post.id,
        title: post.title,
        contentLength: post.content ? post.content.length : 0,
        tags: post.tags,
        status: post.status
      }));
      
      // Make sure we have required fields
      if (!post.title) {
        console.warn("No title provided for Shopify article update!");
        article.title = "Untitled Post";
      } else {
        article.title = post.title;
      }
      
      // Handle content with fallback
      if (post.content && post.content.length > 0) {
        // Process content to handle proxied image URLs just like in createArticle
        let processedContent = post.content;
        
        // Replace proxy image URLs with their Pexels source URLs
        // Look for both relative URLs and URLs with <a> tags
        const proxyImagePattern = /src="\/api\/proxy\/image\/(\d+)"/g;
        const proxyImageLinkPattern = /<a href="([^"]+)"><img src="\/api\/proxy\/image\/(\d+)"/g;
        let proxyMatch;
        let proxyLinkMatch;
        
        const pexelsService = await import('./pexels').then(module => module.pexelsService);
        
        // First, handle images with links
        while ((proxyLinkMatch = proxyImageLinkPattern.exec(processedContent)) !== null) {
          const productUrl = proxyLinkMatch[1];
          const imageId = proxyLinkMatch[2];
          console.log(`Found linked proxied image in content for update: ${imageId} with product link: ${productUrl}`);
          
          try {
            // Get the Pexels image with this ID
            const image = await pexelsService.getImageById(imageId);
            
            if (image && image.src) {
              // Get the best quality image URL
              const directImageUrl = image.src.large || image.src.medium || image.src.small || image.src.original;
              
              if (directImageUrl) {
                console.log(`Replacing linked proxy URL with direct URL for update: ${directImageUrl}`);
                // Replace the proxy URL with the direct URL in content, maintaining the link
                processedContent = processedContent.replace(
                  `<a href="${productUrl}"><img src="/api/proxy/image/${imageId}"`, 
                  `<a href="${productUrl}"><img src="${directImageUrl}"`
                );
              }
            }
          } catch (imageError) {
            console.error(`Error processing linked proxied image ${imageId} for update:`, imageError);
            // Continue with other images if one fails
          }
        }
        
        // Now handle standalone images (without links)
        while ((proxyMatch = proxyImagePattern.exec(processedContent)) !== null) {
          const imageId = proxyMatch[1];
          console.log(`Found standalone proxied image in content for update: ${imageId}`);
          
          try {
            // Get the Pexels image with this ID
            const image = await pexelsService.getImageById(imageId);
            
            if (image && image.src) {
              // Get the best quality image URL
              const directImageUrl = image.src.large || image.src.medium || image.src.small || image.src.original;
              
              if (directImageUrl) {
                console.log(`Replacing proxy URL with direct URL for update: ${directImageUrl}`);
                // Replace the proxy URL with the direct URL in content
                processedContent = processedContent.replace(
                  `src="/api/proxy/image/${imageId}"`, 
                  `src="${directImageUrl}"`
                );
              }
            }
          } catch (imageError) {
            console.error(`Error processing proxied image ${imageId} for update:`, imageError);
            // Continue with other images if one fails
          }
        }
        
        article.body_html = processedContent;
      } else {
        console.warn("Empty content for Shopify article update!");
        article.body_html = `<p>Content for "${article.title}" is being updated.</p>`;
      }
      
      if (post.tags) article.tags = post.tags;
      
      // Set the author if provided
      if (post.author) {
        article.author = post.author;
      } else {
        article.author = store.shopName;
      }
      
      // Properly handle date formatting for Shopify API
      if (post.status === 'published') {
        article.published = true;
        
        // Make sure the date is properly formatted as an ISO string
        let publishedAt: string;
        if (post.publishedDate) {
          publishedAt = new Date(post.publishedDate).toISOString();
        } else {
          publishedAt = new Date().toISOString();
        }
        article.published_at = publishedAt;
      } else if (post.status === 'draft') {
        article.published = false;
      }
      
      if (post.featuredImage) article.image = { src: post.featuredImage };
      
      console.log(`Sending article update to Shopify: ${JSON.stringify(article)}`);
      
      const response = await client.put(`/blogs/${blogId}/articles/${articleId}.json`, {
        article
      });
      
      return response.data.article;
    } catch (error: any) {
      console.error(`Error updating article in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to update article: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Delete an article from a specific store
   * @param store The store to delete the article from
   * @param blogId The ID of the blog containing the article
   * @param articleId The ID of the article to delete
   * @returns True if successful
   */
  public async deleteArticle(store: ShopifyStore, blogId: string, articleId: string): Promise<boolean> {
    try {
      const client = this.getClient(store);
      await client.delete(`/blogs/${blogId}/articles/${articleId}.json`);
      return true;
    } catch (error: any) {
      console.error(`Error deleting article from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to delete article: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get articles from a specific store and blog
   * @param store The store to get articles from
   * @param blogId The ID of the blog to get articles from
   * @returns Array of Shopify articles
   */
  public async getArticles(store: ShopifyStore, blogId: string): Promise<ShopifyArticle[]> {
    try {
      const client = this.getClient(store);
      const response = await client.get(`/blogs/${blogId}/articles.json`);
      return response.data.articles;
    } catch (error: any) {
      console.error(`Error fetching articles from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch articles: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Test the connection to a specific store
   * @param store The store to test the connection to
   * @returns True if the connection is successful
   */
  public async testConnection(store: ShopifyStore): Promise<boolean> {
    try {
      await this.getBlogs(store);
      return true;
    } catch (error) {
      console.error(`Failed to connect to Shopify store ${store.shopName}:`, error);
      return false;
    }
  }
  
  /**
   * Get the URL for a specific store
   * @param store The store to get the URL for
   * @returns The store URL
   */
  public getStoreUrl(store: ShopifyStore): string {
    return `https://${store.shopName}`;
  }
  
  /**
   * Get products from a specific store
   * @param store The store to get products from
   * @param limit Maximum number of products to return
   * @returns Array of Shopify products
   */
  public async getProducts(store: ShopifyStore, limit: number = 50): Promise<ShopifyProduct[]> {
    try {
      const client = this.getClient(store);
      const response = await client.get(`/products.json?limit=${limit}`);
      
      // Add the full URL to each product
      const products = response.data.products.map((product: any) => ({
        ...product,
        url: `https://${store.shopName}/products/${product.handle}`
      }));
      
      return products;
    } catch (error: any) {
      console.error(`Error fetching products from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch products: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get products by their IDs
   * @param store The store to get products from
   * @param productIds Array of product IDs to fetch
   * @returns Array of Shopify products
   */
  public async getProductsById(store: ShopifyStore, productIds: string[]): Promise<ShopifyProduct[]> {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }
      
      const client = this.getClient(store);
      const products: ShopifyProduct[] = [];
      
      // Process in batches of 10 IDs to avoid long URLs
      const batchSize = 10;
      
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const idsParam = batch.join(',');
        
        console.log(`Fetching products batch ${i/batchSize + 1} with IDs: ${idsParam}`);
        
        try {
          const response = await client.get(`/products.json?ids=${idsParam}`);
          
          // Add the full URL to each product
          const batchProducts = response.data.products.map((product: any) => ({
            ...product,
            url: `https://${store.shopName}/products/${product.handle}`
          }));
          
          products.push(...batchProducts);
        } catch (batchError) {
          console.error(`Error fetching product batch from Shopify store ${store.shopName}:`, batchError);
          // Continue with other batches even if one fails
        }
      }
      
      console.log(`Successfully fetched ${products.length} out of ${productIds.length} requested products`);
      return products;
    } catch (error: any) {
      console.error(`Error fetching products by ID from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch products by ID: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Search products in a specific store
   * @param store The store to search products in
   * @param query The search query
   * @param limit Maximum number of products to return
   * @returns Array of Shopify products
   */
  public async searchProducts(store: ShopifyStore, query: string, limit: number = 20): Promise<ShopifyProduct[]> {
    try {
      const client = this.getClient(store);
      const response = await client.get(`/products.json?title=${encodeURIComponent(query)}&limit=${limit}`);
      
      // Add the full URL to each product
      const products = response.data.products.map((product: any) => ({
        ...product,
        url: `https://${store.shopName}/products/${product.handle}`
      }));
      
      return products;
    } catch (error: any) {
      console.error(`Error searching products in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to search products: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get collections from a specific store
   * @param store The store to get collections from
   * @param limit Maximum number of collections to return
   * @returns Array of Shopify collections
   */
  public async getCollections(store: ShopifyStore, limit: number = 50): Promise<ShopifyCollection[]> {
    try {
      const client = this.getClient(store);
      // Use custom collections as these are the manually created ones
      const response = await client.get(`/custom_collections.json?limit=${limit}`);
      
      // Add the full URL to each collection
      const collections = response.data.custom_collections.map((collection: any) => ({
        ...collection,
        url: `https://${store.shopName}/collections/${collection.handle}`
      }));
      
      return collections;
    } catch (error: any) {
      console.error(`Error fetching collections from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch collections: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get both smart and custom collections from a specific store
   * @param store The store to get collections from
   * @param limit Maximum number of collections to return
   * @returns Array of Shopify collections
   */
  public async getAllCollections(store: ShopifyStore, limit: number = 50): Promise<ShopifyCollection[]> {
    try {
      const client = this.getClient(store);
      
      // Fetch custom collections
      const customResponse = await client.get(`/custom_collections.json?limit=${limit}`);
      const customCollections = customResponse.data.custom_collections.map((collection: any) => ({
        ...collection,
        url: `https://${store.shopName}/collections/${collection.handle}`,
        type: 'custom'
      }));
      
      // Fetch smart collections
      const smartResponse = await client.get(`/smart_collections.json?limit=${limit}`);
      const smartCollections = smartResponse.data.smart_collections.map((collection: any) => ({
        ...collection,
        url: `https://${store.shopName}/collections/${collection.handle}`,
        type: 'smart'
      }));
      
      // Combine both types of collections
      return [...customCollections, ...smartCollections];
    } catch (error: any) {
      console.error(`Error fetching all collections from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch collections: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get a specific page
   * @param store The store to get the page from
   * @param pageId The ID of the page
   * @returns The Shopify page
   */
  public async getPage(store: ShopifyStore, pageId: string): Promise<any> {
    try {
      const client = this.getClient(store);
      const response = await client.get(`/pages/${pageId}.json`);
      return response.data.page;
    } catch (error: any) {
      console.error(`Error fetching page from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch page: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Create a page in a specific store
   * @param store The store to create the page in
   * @param title The title of the page
   * @param content The HTML content of the page
   * @param published Whether to publish the page
   * @returns The created Shopify page
   */
  public async createPage(store: ShopifyStore, title: string, content: string, published: boolean = true): Promise<any> {
    try {
      const client = this.getClient(store);
      
      // Process content to handle proxied image URLs - same as in createArticle
      let processedContent = content;
      
      // Replace proxy image URLs with their Pexels source URLs
      // Look for both relative URLs and URLs with <a> tags
      const proxyImagePattern = /src="\/api\/proxy\/image\/(\d+)"/g;
      const proxyImageLinkPattern = /<a href="([^"]+)"><img src="\/api\/proxy\/image\/(\d+)"/g;
      let proxyMatch;
      let proxyLinkMatch;
      
      const pexelsService = await import('./pexels').then(module => module.pexelsService);
      
      // First, handle images with links
      while ((proxyLinkMatch = proxyImageLinkPattern.exec(processedContent)) !== null) {
        const productUrl = proxyLinkMatch[1];
        const imageId = proxyLinkMatch[2];
        console.log(`Found linked proxied image in page content: ${imageId} with product link: ${productUrl}`);
        
        try {
          // Get the Pexels image with this ID
          const image = await pexelsService.getImageById(imageId);
          
          if (image && image.src) {
            // Get the best quality image URL
            const directImageUrl = image.src.large || image.src.medium || image.src.small || image.src.original;
            
            if (directImageUrl) {
              console.log(`Replacing linked proxy URL with direct URL in page: ${directImageUrl}`);
              // Replace the proxy URL with the direct URL in content, maintaining the link
              processedContent = processedContent.replace(
                `<a href="${productUrl}"><img src="/api/proxy/image/${imageId}"`, 
                `<a href="${productUrl}"><img src="${directImageUrl}"`
              );
            }
          }
        } catch (imageError) {
          console.error(`Error processing linked proxied image ${imageId} for page:`, imageError);
          // Continue with other images if one fails
        }
      }
      
      // Now handle standalone images (without links)
      while ((proxyMatch = proxyImagePattern.exec(processedContent)) !== null) {
        const imageId = proxyMatch[1];
        console.log(`Found standalone proxied image in page content: ${imageId}`);
        
        try {
          // Get the Pexels image with this ID
          const image = await pexelsService.getImageById(imageId);
          
          if (image && image.src) {
            // Get the best quality image URL
            const directImageUrl = image.src.large || image.src.medium || image.src.small || image.src.original;
            
            if (directImageUrl) {
              console.log(`Replacing proxy URL with direct URL in page: ${directImageUrl}`);
              // Replace the proxy URL with the direct URL in content
              processedContent = processedContent.replace(
                `src="/api/proxy/image/${imageId}"`, 
                `src="${directImageUrl}"`
              );
            }
          }
        } catch (imageError) {
          console.error(`Error processing proxied image ${imageId} for page:`, imageError);
          // Continue with other images if one fails
        }
      }
      
      const page = {
        title,
        body_html: processedContent, // Use processed content with direct image URLs
        published
      };
      
      const response = await client.post('/pages.json', { page });
      return response.data.page;
    } catch (error: any) {
      console.error(`Error creating page in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to create page: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Legacy compatibility methods for backward compatibility
   * These will be removed once the app is fully migrated to multi-store
   */
  
  // Legacy getBlogs method
  public async getBlogsLegacy(): Promise<ShopifyBlog[]> {
    const storeIds = Array.from(this.clients.keys());
    if (storeIds.length === 0) {
      throw new Error('No Shopify clients initialized. Please connect to a store first.');
    }
    
    // Use the first store in the list (for backward compatibility)
    const storeId = storeIds[0];
    const client = this.clients.get(storeId);
    
    if (!client) {
      throw new Error('Shopify client not initialized. Please connect to a store first.');
    }
    
    try {
      const response = await client.get('/blogs.json');
      return response.data.blogs || [];
    } catch (error: any) {
      console.error('Error fetching blogs from Shopify:', error);
      throw new Error(`Failed to fetch blogs: ${error.message}`);
    }
  }
  
  // Legacy test connection method
  public async testConnectionLegacy(): Promise<boolean> {
    try {
      await this.getBlogsLegacy();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create a singleton instance
const shopifyServiceInstance = new ShopifyService();

// Export the singleton instance and individual methods
export const shopifyService = shopifyServiceInstance;

// Blog and article methods
export const getBlogs = (store: ShopifyStore) => shopifyServiceInstance.getBlogs(store);
export const getBlogById = (store: ShopifyStore, blogId: string) => shopifyServiceInstance.getBlogById(store, blogId);
export const createArticle = (store: ShopifyStore, blogId: string, post: BlogPost) => shopifyServiceInstance.createArticle(store, blogId, post);
export const updateArticle = (store: ShopifyStore, blogId: string, articleId: string, post: Partial<BlogPost>) => shopifyServiceInstance.updateArticle(store, blogId, articleId, post);
export const deleteArticle = (store: ShopifyStore, blogId: string, articleId: string) => shopifyServiceInstance.deleteArticle(store, blogId, articleId);
export const getArticles = (store: ShopifyStore, blogId: string) => shopifyServiceInstance.getArticles(store, blogId);

// Product and collection methods
export const getProducts = (store: ShopifyStore, limit?: number) => shopifyServiceInstance.getProducts(store, limit);
export const getProductsById = (store: ShopifyStore, productIds: string[]) => shopifyServiceInstance.getProductsById(store, productIds);
export const searchProducts = (store: ShopifyStore, query: string, limit?: number) => shopifyServiceInstance.searchProducts(store, query, limit);
export const getCollections = (store: ShopifyStore, limit?: number) => shopifyServiceInstance.getCollections(store, limit);
export const getAllCollections = (store: ShopifyStore, limit?: number) => shopifyServiceInstance.getAllCollections(store, limit);

// Page methods
export const getPage = (store: ShopifyStore, pageId: string) => shopifyServiceInstance.getPage(store, pageId);
export const createPage = (store: ShopifyStore, title: string, content: string, published?: boolean) => shopifyServiceInstance.createPage(store, title, content, published);

// Utility methods
export const testConnection = (store: ShopifyStore) => shopifyServiceInstance.testConnection(store);
export const getStoreUrl = (store: ShopifyStore) => shopifyServiceInstance.getStoreUrl(store);

// Legacy compatibility exports
export const setConnection = (connection: ShopifyConnection) => shopifyServiceInstance.setConnection(connection);
export const getBlogsLegacy = () => shopifyServiceInstance.getBlogsLegacy();
export const testConnectionLegacy = () => shopifyServiceInstance.testConnectionLegacy();
