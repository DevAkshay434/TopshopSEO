import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import ShopifyImageViewer from "../components/ShopifyImageViewer";
import { useQuery } from "@tanstack/react-query";
import { SchedulingPermissionNotice } from "../components/SchedulingPermissionNotice";
import { ContentStyleSelector } from "../components/ContentStyleSelector";

import { RelatedProductsSelector } from "../components/RelatedProductsSelector";
import { RelatedCollectionsSelector } from "../components/RelatedCollectionsSelector";
import { ProductMultiSelect } from "../components/ProductMultiSelect";
import MediaSelectionStep from "../components/MediaSelectionStep";
import { AuthorSelector } from "../components/AuthorSelector";
import { useStore } from "../contexts/StoreContext";
import { ProjectCreationDialog } from "../components/ProjectCreationDialog";
import { ProjectLoadDialog } from "../components/ProjectLoadDialog";
import { ProjectSaveDialog } from "../components/ProjectSaveDialog";
import { SimpleHTMLEditor } from "../components/SimpleHTMLEditor";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart,
  Calendar,
  CalendarCheck,
  Camera,
  CheckCircle,
  Check,
  PlusCircle,
  CircleDot,
  CheckSquare,
  ChevronLeft,
  ImagePlus,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Download,
  Edit,
  Edit2,
  ExternalLink,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Folders,
  Gem,
  Heart,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  Pencil,
  ShoppingBag,
  Leaf,
  Loader2,
  Package,
  Zap,
  PiggyBank,
  Plus,
  RefreshCw,
  Save,
  SaveAll,
  Search,
  Send,
  Store,
  Upload,
  User,
  Users,
  ShoppingCart,
  Sparkles,
  Trash,
  Type,
  X,
  XCircle,
  ZoomIn,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import KeywordSelector from "@/components/KeywordSelector";
import TitleSelector from "@/components/TitleSelector";
import ImageSearchDialog from "@/components/ImageSearchDialog";
import ImageSearchSuggestions from "@/components/ImageSearchSuggestions";
import CreatePostModal from "@/components/CreatePostModal";
import { ImageUpload } from "@/components/ImageUpload";

// Client-side TOC processing function removed - server-side processing handles this correctly

// Define the form schema for content generation
const contentFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  productIds: z.array(z.string()).optional(),
  collectionIds: z.array(z.string()).optional(),
  articleType: z.enum(["blog", "page"]),
  blogId: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  contentGender: z.enum(["male", "female", "neutral"]).optional(),
  writingPerspective: z.enum([
    "first_person_singular",
    "first_person_plural",
    "second_person",
    "third_person",
  ]),
  enableTables: z.boolean().default(true),
  enableLists: z.boolean().default(true),
  enableH3s: z.boolean().default(true),
  introType: z.enum(["none", "standard", "search_intent"]),
  faqType: z.enum(["none", "short", "long"]),
  enableCitations: z.boolean().default(true),
  // Removed non-functional image fields
  toneOfVoice: z.enum([
    "neutral",
    "professional",
    "empathetic",
    "casual",
    "excited",
    "formal",
    "friendly",
    "humorous",
  ]),
  postStatus: z.enum(["publish", "draft"]),
  generateImages: z.boolean().default(true),
  scheduledPublishDate: z.string().optional(), // Added for future scheduling date
  scheduledPublishTime: z.string().optional(), // Added for future scheduling time
  // Fields needed for scheduling functionality
  publicationType: z.enum(["publish", "schedule", "draft"]).optional(),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  // New fields for content generation
  articleLength: z
    .enum(["short", "medium", "long", "comprehensive"])
    .default("medium"),
  headingsCount: z.enum(["2", "3", "4", "5", "6"]).default("3"),
  // Custom category fields
  categories: z.array(z.string()).optional(),
  customCategory: z.string().optional(),
  // Buyer personas as flexible text input
  buyerPersonas: z.string().optional(),
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

interface ProductVariant {
  id: string;
  title: string;
  price: string;
  image?: string;
  inventory_quantity?: number;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
  body_html?: string;
  admin_url?: string;
  images?: {
    id: string;
    src: string;
    alt?: string;
    position?: number;
  }[];
  variants?: ProductVariant[];
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  image?: string;
}

interface Blog {
  id: string;
  title: string;
  handle: string;
}

interface BuyerPersona {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ServiceStatus {
  shopify: boolean;
  claude: boolean;
  dataForSEO: boolean;
  pexels: boolean;
}

// Interface for Pexels image
interface PexelsImage {
  id: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
  src?: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
  photographer?: string;
  photographer_url?: string;
  selected?: boolean;
  isPrimary?: boolean;
  type?: "image" | "youtube";
  videoId?: string;
  source?:
    | "product"
    | "variant"
    | "shopify"
    | "pexels"
    | "product_image"
    | "theme_asset"
    | "article_image"
    | "collection_image"
    | "shopify_media"
    | "variant_image"
    | "uploaded";
}

// Predefined categories for content
const predefinedCategories = [
  { id: "featured", name: "Featured" },
  { id: "new", name: "New Arrivals" },
  { id: "selected", name: "Selected" },
  { id: "trending", name: "Trending" },
  { id: "popular", name: "Popular" },
  { id: "seasonal", name: "Seasonal" },
  { id: "sale", name: "On Sale" },
  { id: "guides", name: "Buying Guides" },
  { id: "how-to", name: "How-To" },
];

// AI-generated buyer persona suggestions will be defined in component state

export default function AdminPanel() {
  // Store context and navigation
  const storeContext = useStore();
  const [, navigate] = useLocation();

  const [selectedTab, setSelectedTab] = useState("generate");
  const [selectedContentToneId, setSelectedContentToneId] =
    useState<string>("");
  const [selectedContentDisplayName, setSelectedContentDisplayName] =
    useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isOptimizingMetaTitle, setIsOptimizingMetaTitle] = useState(false);
  const [isOptimizingMetaDescription, setIsOptimizingMetaDescription] =
    useState(false);
  const [publicationMethod, setPublicationMethod] = useState<
    "draft" | "publish" | "schedule"
  >("draft");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [enhancedContentForEditor, setEnhancedContentForEditor] =
    useState<string>(""); // Store enhanced content with YouTube and images
  const [contentUpdateCounter, setContentUpdateCounter] = useState(0);
  const [contentEditorKey, setContentEditorKey] = useState(0); // Force re-render of editor
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState<string>("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>([]);
  const [primaryImages, setPrimaryImages] = useState<PexelsImage[]>([]);
  const [secondaryImages, setSecondaryImages] = useState<PexelsImage[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [shopifyFiles, setShopifyFiles] = useState<PexelsImage[]>([]);

  // Additional state variables
  const [customCategories, setCustomCategories] = useState<
    { id: string; name: string }[]
  >(() => {
    const savedCategories = localStorage.getItem("topshop-custom-categories");
    return savedCategories ? JSON.parse(savedCategories) : [];
  });

  const [imageSearchHistory, setImageSearchHistory] = useState<
    { query: string; images: PexelsImage[] }[]
  >([]);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);

  // Form key to force re-render of all form components when loading a project
  const [formKey, setFormKey] = useState(0);

  // State to control whether Select components should use controlled mode
  // const [isSelectControlled, setIsSelectControlled] = useState(true);

  // AI-generated buyer persona suggestions based on selected products
  const [buyerPersonaSuggestions, setBuyerPersonaSuggestions] = useState<
    string[]
  >([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);
  const [suggestionKey, setSuggestionKey] = useState(0); // Force re-render when suggestions change
  const [forceRerender, setForceRerender] = useState(0);
  const suggestionsRef = useRef<string[]>([]);
  
  // Ref for content preview section to enable auto-scroll
  const contentPreviewRef = useRef<HTMLDivElement>(null);

  // Debug state changes
  useEffect(() => {
    console.log(
      "🔄 buyerPersonaSuggestions state updated:",
      buyerPersonaSuggestions,
    );
  }, [buyerPersonaSuggestions]);

  useEffect(() => {
    console.log("📊 suggestionsLoading state updated:", suggestionsLoading);
  }, [suggestionsLoading]);

  useEffect(() => {
    console.log("✅ suggestionsGenerated state updated:", suggestionsGenerated);
  }, [suggestionsGenerated]);

  // Generate instant smart suggestions based on product analysis
  const generateInstantSmartSuggestions = (products: Product[]): string[] => {
    const suggestions = [];

    // Analyze product characteristics instantly
    const hasHighPriceProducts = products.some((p) => {
      const price = parseFloat(p.variants?.[0]?.price || "0");
      return price > 100;
    });

    const hasLowPriceProducts = products.some((p) => {
      const price = parseFloat(p.variants?.[0]?.price || "0");
      return price < 50;
    });

    // Category-based quick analysis
    const productText = products
      .map((p) => `${p.title} ${p.product_type || ""} ${p.tags || ""}`)
      .join(" ")
      .toLowerCase();

    if (
      productText.includes("water") ||
      productText.includes("filter") ||
      productText.includes("treatment")
    ) {
      suggestions.push(
        "Health-conscious homeowners 30-60",
        "Water quality concerned",
        "Quality-focused families",
      );
    }

    if (
      productText.includes("tech") ||
      productText.includes("electronic") ||
      productText.includes("digital")
    ) {
      suggestions.push(
        "Tech enthusiasts 25-45",
        "Early adopters",
        "Digital productivity seekers",
      );
    }

    if (
      productText.includes("fashion") ||
      productText.includes("clothing") ||
      productText.includes("apparel")
    ) {
      suggestions.push(
        "Style-conscious shoppers",
        "Fashion enthusiasts 18-45",
        "Trend followers",
      );
    }

    if (
      productText.includes("home") ||
      productText.includes("kitchen") ||
      productText.includes("furniture")
    ) {
      suggestions.push(
        "Home improvement enthusiasts",
        "DIY homeowners 25-65",
        "Property value conscious",
      );
    }

    if (
      productText.includes("health") ||
      productText.includes("wellness") ||
      productText.includes("fitness")
    ) {
      suggestions.push(
        "Health-conscious consumers",
        "Wellness seekers 25-55",
        "Fitness enthusiasts",
      );
    }

    // Price-based suggestions
    if (hasHighPriceProducts) {
      suggestions.push(
        "Premium quality seekers",
        "High-income professionals",
        "Investment-minded consumers",
      );
    }

    if (hasLowPriceProducts) {
      suggestions.push(
        "Budget-conscious families",
        "Value hunters 25-45",
        "Cost-effective shoppers",
      );
    }

    // Always include some universal suggestions
    suggestions.push(
      "Quality-focused buyers",
      "Problem solvers",
      "Brand loyalists",
      "Online shoppers",
    );

    // Return unique suggestions, limited to 8
    return Array.from(new Set(suggestions)).slice(0, 8);
  };

  // Fast buyer persona suggestion generation with instant smart fallback
  const generateBuyerPersonaSuggestions = async () => {
    console.log("🚀 Fast persona generation starting...");

    if (selectedProducts.length === 0) {
      setBuyerPersonaSuggestions([
        "General Consumers",
        "Budget-Conscious Shoppers",
        "Quality-Focused Buyers",
        "Online Shoppers",
        "Brand-Conscious Customers",
      ]);
      setSuggestionsGenerated(true);
      return;
    }

    // Show instant smart fallback first for immediate user feedback
    const instantSuggestions =
      generateInstantSmartSuggestions(selectedProducts);
    setBuyerPersonaSuggestions(instantSuggestions);
    setSuggestionsGenerated(true);
    setSuggestionsLoading(true); // Show we're improving them with AI

    try {
      // Try to get AI-enhanced suggestions in the background with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch("/api/buyer-personas/generate-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storeContext.currentStore && {
            "X-Store-ID": storeContext.currentStore.id.toString(),
          }),
        },
        body: JSON.stringify({
          products: selectedProducts.map((product) => ({
            id: product.id,
            title: product.title,
            description: product.body_html || product.description || "",
            price: product.variants?.[0]?.price || "N/A",
            productType: product.product_type || "",
            tags: product.tags
              ? product.tags.split(",").map((tag: string) => tag.trim())
              : [],
          })),
          collections: selectedCollections.map((collection) => ({
            id: collection.id,
            title: collection.title,
            description: collection.description || "",
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success && data.suggestions && Array.isArray(data.suggestions)) {
        // Update with AI-enhanced suggestions
        setBuyerPersonaSuggestions([...data.suggestions]);
        setSuggestionKey(Date.now());
        console.log("✅ AI-enhanced suggestions loaded");
      }
    } catch (error) {
      console.log(
        "⚠️ AI enhancement failed, keeping smart fallback suggestions",
      );
      // Keep the instant smart suggestions - don't show error to user
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Media selection state - initialized with empty values
  const [selectedMediaContent, setSelectedMediaContent] = useState<{
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  }>({
    primaryImage: null,
    secondaryImages: [],
    youtubeEmbed: null,
  });

  // Add logging to track state changes
  console.log("Current selectedMediaContent state:", selectedMediaContent);
  console.log("🔍 BUYER PERSONA STATE CHECK:", {
    buyerPersonaSuggestionsLength: buyerPersonaSuggestions.length,
    suggestions: buyerPersonaSuggestions,
    suggestionsGenerated,
    suggestionsLoading,
  });

  // Workflow step state
  const [currentStep, setCurrentStep] = useState<string>("product");

  // Author selection state
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const [shopifyMediaType, setShopifyMediaType] = useState<
    "products" | "variants" | "media"
  >("products");

  // Project management state
  const [currentProject, setCurrentProject] = useState<any | null>(null);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showLoadProjectDialog, setShowLoadProjectDialog] = useState(false);
  const [showProjectSaveDialog, setShowProjectSaveDialog] = useState(false);

  // Function to fetch product images for selected products
  const fetchProductImages = async (includeVariants: boolean = false) => {
    try {
      setIsLoadingMedia(true);
      setShopifyFiles([]);

      if (selectedProducts.length === 0) {
        toast({
          title: "No products selected",
          description: "Please select at least one product to view images",
          variant: "destructive",
        });
        setIsLoadingMedia(false);
        return;
      }

      // Extract images from the selected products
      const productImages: PexelsImage[] = [];
      let uniqueImageUrls = new Set<string>();

      selectedProducts.forEach((product) => {
        // Add main product image
        if (product.image && product.image.src) {
          const imageUrl = product.image.src;
          if (!uniqueImageUrls.has(imageUrl)) {
            uniqueImageUrls.add(imageUrl);
            productImages.push({
              id: `product-${product.id}-main`,
              url: imageUrl,
              width: 500,
              height: 500,
              alt: product.title || "Product image",
              src: {
                original: imageUrl,
                large: imageUrl,
                medium: imageUrl,
                small: imageUrl,
                thumbnail: imageUrl,
              },
              selected: false,
              source: "shopify",
            });
          }
        }

        // Add additional product images
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach((image, index) => {
            if (
              image.src &&
              (!product.image || image.id !== product.image.id)
            ) {
              // Skip the main image (already added above)
              const imageUrl = image.src;
              if (!uniqueImageUrls.has(imageUrl)) {
                uniqueImageUrls.add(imageUrl);
                productImages.push({
                  id: `product-${product.id}-image-${index}`,
                  url: imageUrl,
                  width: 500,
                  height: 500,
                  alt: image.alt || `${product.title} - Image ${index + 1}`,
                  src: {
                    original: imageUrl,
                    large: imageUrl,
                    medium: imageUrl,
                    small: imageUrl,
                    thumbnail: imageUrl,
                  },
                  selected: false,
                  source: "shopify",
                });
              }
            }
          });
        }

        // Add variant images if requested
        if (
          includeVariants &&
          product.variants &&
          Array.isArray(product.variants)
        ) {
          product.variants.forEach((variant, variantIndex) => {
            if (variant.image && variant.image.src) {
              const imageUrl = variant.image.src;
              if (!uniqueImageUrls.has(imageUrl)) {
                uniqueImageUrls.add(imageUrl);
                productImages.push({
                  id: `variant-${variant.id}`,
                  url: imageUrl,
                  width: 500,
                  height: 500,
                  alt: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
                  src: {
                    original: imageUrl,
                    large: imageUrl,
                    medium: imageUrl,
                    small: imageUrl,
                    thumbnail: imageUrl,
                  },
                  selected: false,
                  source: "shopify",
                });
              }
            }
          });
        }
      });

      setShopifyFiles(productImages);

      console.log(
        `Loaded ${productImages.length} product images (${uniqueImageUrls.size} unique)`,
      );

      toast({
        title: `${productImages.length} images found`,
        description: includeVariants
          ? "Showing product and variant images"
          : "Showing product images",
      });
    } catch (error) {
      console.error("Error processing product images:", error);
      toast({
        title: "Error loading images",
        description: "There was a problem processing product images",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Project management functions
  const handleCreateProject = (project: any) => {
    setCurrentProject(project);

    // Immediately save current form data to the newly created project
    const formState = extractFormStateForSaving();

    // Update the project with current form data using mutation
    const updateProjectMutation = {
      mutationFn: (projectData: any) =>
        apiRequest("PUT", `/api/projects/${project.id}`, {
          projectData: JSON.stringify(projectData),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        console.log("Project automatically saved with current form data");
      },
      onError: (error: any) => {
        console.error("Error auto-saving project:", error);
      },
    };

    // Execute the auto-save
    updateProjectMutation
      .mutationFn(formState)
      .then(() => {
        updateProjectMutation.onSuccess();
      })
      .catch((error) => {
        updateProjectMutation.onError(error);
      });

    toast({
      title: "Project created",
      description: `"${project.name}" is now your active project and has been saved with your current settings.`,
    });
  };

  const handleLoadProject = (project: any) => {
    try {
      setCurrentProject(project);

      // Parse project data and populate form
      const projectData = JSON.parse(project.projectData);
      console.log("Loading project data:", projectData);

      // 1. Clear any previously generated content to start fresh
      setGeneratedContent(null);
      setIsContentPosted(false);
      
      // 2. First restore non-form state variables (UI state that's not controlled by React Hook Form)
      if (projectData.selectedProducts) {
        console.log("🔍 PROJECT LOAD - Restoring selected products:", {
          savedProductsLength: projectData.selectedProducts.length,
          savedProductsData: projectData.selectedProducts
        });
        setSelectedProducts(projectData.selectedProducts);
      } else {
        console.log("⚠️ PROJECT LOAD - No selected products found in project data");
      }
      if (projectData.selectedCollections)
        setSelectedCollections(projectData.selectedCollections);
      if (projectData.selectedKeywords) {
        // Clean any corrupted keyword data during project loading
        const cleanedKeywords = projectData.selectedKeywords.map((kw: any) => {
          // If keyword contains numbers at the end that look like search volume, remove them
          const cleanedKeyword = typeof kw === 'string' 
            ? kw // Keep string keywords as-is
            : {
                ...kw,
                keyword: typeof kw.keyword === 'string' 
                  ? (kw.isManual ? kw.keyword : kw.keyword.replace(/\d+$/, '').trim()) // Only clean non-manual keywords
                  : kw.keyword
              };
          
          return cleanedKeyword;
        });
        
        setSelectedKeywords(cleanedKeywords);
      }
      if (projectData.selectedTitle)
        setSelectedTitle(projectData.selectedTitle);
      if (projectData.selectedAuthorId)
        setSelectedAuthorId(projectData.selectedAuthorId);
      if (projectData.categories) setCategories(projectData.categories);
      if (projectData.contentStyle) setContentStyle(projectData.contentStyle);

      // Content Style Selector data
      if (projectData.selectedContentToneId) {
        console.log("Loading Content Style data:", {
          selectedContentToneId: projectData.selectedContentToneId,
          selectedContentDisplayName: projectData.selectedContentDisplayName,
        });
        setSelectedContentToneId(projectData.selectedContentToneId);
      }
      if (projectData.selectedContentDisplayName) {
        setSelectedContentDisplayName(projectData.selectedContentDisplayName);
      }

      // 2. Restore media content with clean state management to prevent duplication
      if (projectData.mediaContent) {
        // CLEAN PROJECT LOAD: Reset all media states first to prevent duplication
        console.log(
          "🔄 PROJECT LOAD: Resetting all media states to prevent duplication",
        );
        setPrimaryImages([]);
        setSecondaryImages([]);
        setYoutubeEmbed(null);
        setSelectedMediaContent({
          primaryImage: null,
          secondaryImages: [],
          youtubeEmbed: null,
        });

        // SINGLE STATE UPDATE: Restore media content with one consolidated update
        const restoredMediaContent = {
          primaryImage: projectData.mediaContent.primaryImage || null,
          secondaryImages: projectData.mediaContent.secondaryImages || [],
          youtubeEmbed: projectData.mediaContent.youtubeEmbed || null,
        };

        // Set individual states once only
        if (projectData.mediaContent.primaryImage) {
          setPrimaryImages([projectData.mediaContent.primaryImage]);
          // CRITICAL: Also set selectedMediaContent.primaryImage for proper display
          setSelectedMediaContent((prev) => ({
            ...prev,
            primaryImage: projectData.mediaContent.primaryImage,
          }));
          console.log(
            "✅ Project load: Restored primary image and selectedMediaContent",
          );
        }

        if (
          projectData.mediaContent.secondaryImages &&
          projectData.mediaContent.secondaryImages.length > 0
        ) {
          // Ensure no duplicates in restored secondary images
          const uniqueSecondaryImages =
            projectData.mediaContent.secondaryImages.filter(
              (img: any, index: number, self: any[]) =>
                self.findIndex(
                  (i: any) => i.id === img.id && i.url === img.url,
                ) === index,
            );

          setSecondaryImages(uniqueSecondaryImages);
          console.log(
            "✅ Project load: Restored",
            uniqueSecondaryImages.length,
            "unique secondary images",
          );
          console.log("🔍 SECONDARY IMAGES:", uniqueSecondaryImages);

          // Update restoredMediaContent with deduplicated images
          restoredMediaContent.secondaryImages = uniqueSecondaryImages;
        }

        if (projectData.mediaContent.youtubeEmbed) {
          setYoutubeEmbed(projectData.mediaContent.youtubeEmbed);
          console.log("✅ Project load: Restored YouTube embed");
        }

        // FINAL SINGLE UPDATE: Set selectedMediaContent once with all restored data
        setSelectedMediaContent(restoredMediaContent);
        console.log(
          "✅ Project load: Final selectedMediaContent update completed",
        );

        console.log("Project load: Restored media content", {
          primaryImage: !!projectData.mediaContent.primaryImage,
          secondaryImagesCount:
            restoredMediaContent.secondaryImages?.length || 0,
          youtubeEmbed: !!projectData.mediaContent.youtubeEmbed,
        });
      }

      // 3. Build complete form data object with all saved values
      const currentFormValues = form.getValues();
      const updatedFormValues = {
        ...currentFormValues,
        // Form fields that were problematic - ensure they get the saved values
        articleType: projectData.articleType || currentFormValues.articleType,
        contentGender: projectData.contentGender || currentFormValues.contentGender,
        articleLength:
          projectData.articleLength || currentFormValues.articleLength,
        headingsCount:
          projectData.headingsCount || currentFormValues.headingsCount,
        writingPerspective:
          projectData.writingPerspective ||
          currentFormValues.writingPerspective,
        toneOfVoice: projectData.toneOfVoice || currentFormValues.toneOfVoice,
        introType: projectData.introType || currentFormValues.introType,
        faqType: projectData.faqType || currentFormValues.faqType,
        // Other form fields
        buyerPersonas:
          projectData.buyerPersonas || currentFormValues.buyerPersonas,
        postStatus: projectData.postStatus || currentFormValues.postStatus,
        scheduledPublishTime:
          projectData.scheduledPublishTime ||
          currentFormValues.scheduledPublishTime,
        blogId: projectData.blogId || currentFormValues.blogId,
        customCategory:
          projectData.customCategory || currentFormValues.customCategory,
        enableTables:
          projectData.enableTables !== undefined
            ? projectData.enableTables
            : currentFormValues.enableTables,
        enableLists:
          projectData.enableLists !== undefined
            ? projectData.enableLists
            : currentFormValues.enableLists,
        enableH3s:
          projectData.enableH3s !== undefined
            ? projectData.enableH3s
            : currentFormValues.enableH3s,
        enableCitations:
          projectData.enableCitations !== undefined
            ? projectData.enableCitations
            : currentFormValues.enableCitations,
        generateImages:
          projectData.generateImages !== undefined
            ? projectData.generateImages
            : currentFormValues.generateImages,
      };

      console.log("Project load: Setting form values", updatedFormValues);

      // 4. Use single form.reset() call to set all values at once
      // This is the most reliable way to update React Hook Form controlled components
      form.reset(updatedFormValues);

      // 5. Force component re-render to ensure all Select components display the new values
      setFormKey((prev) => prev + 1);

      // 6. Update any remaining state setters that are needed for non-form UI components
      if (projectData.articleLength)
        setArticleLength(projectData.articleLength);
      if (projectData.headingsCount)
        setHeadingsCount(projectData.headingsCount);
      if (projectData.writingPerspective)
        setWritingPerspective(projectData.writingPerspective);
      if (projectData.toneOfVoice) setToneOfVoice(projectData.toneOfVoice);
      if (projectData.introType) setIntroType(projectData.introType);
      if (projectData.faqType) setFaqType(projectData.faqType);
      if (projectData.postStatus) setPostStatus(projectData.postStatus);
      if (projectData.publicationType)
        setPublicationType(projectData.publicationType);
      if (projectData.scheduledPublishTime)
        setScheduledPublishTime(projectData.scheduledPublishTime);
      if (projectData.blogId) setBlogId(projectData.blogId);
      if (projectData.customCategory)
        setCustomCategory(projectData.customCategory);
      if (projectData.enableTables !== undefined)
        setEnableTables(projectData.enableTables);
      if (projectData.enableLists !== undefined)
        setEnableLists(projectData.enableLists);
      if (projectData.enableH3s !== undefined)
        setEnableH3s(projectData.enableH3s);
      if (projectData.enableCitations !== undefined)
        setEnableCitations(projectData.enableCitations);
      if (projectData.generateImages !== undefined)
        setGenerateImages(projectData.generateImages);

      console.log("Project loaded successfully with values:", {
        articleLength: updatedFormValues.articleLength,
        headingsCount: updatedFormValues.headingsCount,
        toneOfVoice: updatedFormValues.toneOfVoice,
        introType: updatedFormValues.introType,
        faqType: updatedFormValues.faqType,
      });

      // CRITICAL: Block content generation until state synchronization is complete
      // This prevents the timing issue where users generate content before state is ready
      setIsGenerating(true); // Temporarily disable content generation

      // Schedule state verification and re-enable generation
      setTimeout(() => {
        console.log("🔄 PROJECT LOAD COMPLETE: Re-enabling content generation");
        console.log("Final state verification:", {
          selectedMediaContentSecondaryImages:
            selectedMediaContent.secondaryImages?.length || 0,
          secondaryImagesState: secondaryImages?.length || 0,
          projectHasSecondaryImages:
            projectData.mediaContent?.secondaryImages?.length || 0,
        });
        setIsGenerating(false); // Re-enable content generation
      }, 200); // Longer timeout to ensure all state updates complete

      // Navigate to keywords step after project load
      setWorkflowStep("keyword");
      scrollToCurrentStep();

      toast({
        title: "Project loaded",
        description: `"${project.name}" has been loaded successfully. You're now in the Keywords step.`,
      });
    } catch (error) {
      console.error("Error loading project:", error);
      setIsGenerating(false); // Re-enable if error occurs
      toast({
        title: "Error loading project",
        description: "Failed to load project data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const extractFormStateForSaving = () => {
    // Get all current form values directly from React Hook Form
    const formValues = form.getValues();

    const extractedData = {
      selectedProducts,
      selectedCollections,
      buyerPersonas: formValues.buyerPersonas || "",
      selectedKeywords,
      selectedTitle,
      mediaContent: {
        primaryImage:
          primaryImages[0] || selectedMediaContent.primaryImage || null,
        secondaryImages:
          secondaryImages.length > 0
            ? secondaryImages
            : selectedMediaContent.secondaryImages || [],
        youtubeEmbed: youtubeEmbed || selectedMediaContent.youtubeEmbed || null,
      },
      selectedAuthorId,
      // CRITICAL FIX: Include articleType and use form values instead of state variables
      articleType: formValues.articleType || "blog",
      contentGender: formValues.contentGender || "male",
      title: formValues.title || "",
      articleLength: formValues.articleLength || "medium",
      headingsCount: formValues.headingsCount || headingsCount,
      writingPerspective: formValues.writingPerspective || writingPerspective,
      toneOfVoice: formValues.toneOfVoice || toneOfVoice,
      introType: formValues.introType || introType,
      faqType: formValues.faqType || faqType,
      // Continue with other form fields
      contentStyle,
      categories,
      postStatus: formValues.postStatus || postStatus,
      publicationType,
      scheduledPublishTime:
        formValues.scheduledPublishTime || scheduledPublishTime,
      blogId: formValues.blogId || blogId,
      customCategory: formValues.customCategory || customCategory,
      enableTables:
        formValues.enableTables !== undefined
          ? formValues.enableTables
          : enableTables,
      enableLists:
        formValues.enableLists !== undefined
          ? formValues.enableLists
          : enableLists,
      enableH3s:
        formValues.enableH3s !== undefined ? formValues.enableH3s : enableH3s,
      enableCitations:
        formValues.enableCitations !== undefined
          ? formValues.enableCitations
          : enableCitations,
      generateImages:
        formValues.generateImages !== undefined
          ? formValues.generateImages
          : generateImages,
      selectedContentToneId,
      selectedContentDisplayName,
    };

    console.log("Extracting project data for saving:", extractedData);
    console.log("🔍 SECONDARY IMAGES SAVE DEBUG:", {
      secondaryImagesStateLength: secondaryImages.length,
      selectedMediaContentSecondaryImagesLength:
        selectedMediaContent.secondaryImages?.length || 0,
      finalSecondaryImagesLength:
        extractedData.mediaContent.secondaryImages.length,
      secondaryImagesState: secondaryImages,
      selectedMediaContentSecondaryImages: selectedMediaContent.secondaryImages,
      finalSecondaryImages: extractedData.mediaContent.secondaryImages,
    });
    console.log("Form values being saved:", {
      articleLength: extractedData.articleLength,
      headingsCount: extractedData.headingsCount,
      writingPerspective: extractedData.writingPerspective,
      toneOfVoice: extractedData.toneOfVoice,
      introType: extractedData.introType,
      faqType: extractedData.faqType,
    });

    return extractedData;
  };

  // Save project mutation
  const saveProjectMutation = useMutation({
    mutationFn: (projectData: any) => {
      if (currentProject) {
        return apiRequest("PUT", `/api/projects/${currentProject.id}`, {
          projectData: JSON.stringify(projectData),
        });
      } else {
        throw new Error("No active project to save");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project saved",
        description: "Your project has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving project",
        description: error.message || "Failed to save project",
        variant: "destructive",
      });
    },
  });

  const handleSaveProject = () => {
    // Always show the new save dialog, regardless of whether there's a current project
    setShowProjectSaveDialog(true);
  };

  // Function to fetch product and variant images from selected products
  const fetchProductAndVariantImages = async () => {
    try {
      setIsLoadingMedia(true);
      setShopifyFiles([]);

      if (selectedProducts.length === 0) {
        toast({
          title: "No products selected",
          description: "Please select at least one product in Step 2 first.",
          variant: "destructive",
        });
        setIsLoadingMedia(false);
        return;
      }

      toast({
        title: "Loading product images",
        description: `Loading images from ${selectedProducts.length} selected product(s)...`,
      });

      // Collect all images from selected products and their variants
      const productImages: any[] = [];

      for (const product of selectedProducts) {
        // Add main product images
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach((image: any, index: number) => {
            const imageUrl = typeof image === "string" ? image : image.src;
            if (imageUrl) {
              productImages.push({
                id: `product-${product.id}-image-${image.id || index}`,
                url: imageUrl,
                width: 500,
                height: 500,
                alt: `${product.title} - Image ${index + 1}`,
                title: `${product.title} - Image ${index + 1}`,
                source: "product_image",
                product_id: product.id,
                product_title: product.title,
                selected: false,
                src: {
                  original: imageUrl,
                  large: imageUrl,
                  medium: imageUrl,
                  small: imageUrl,
                  thumbnail: imageUrl,
                },
              });
            }
          });
        } else if (product.image) {
          // Add single product image if no images array
          const imageUrl =
            typeof product.image === "string"
              ? product.image
              : product.image.src || "";
          if (imageUrl) {
            productImages.push({
              id: `product-${product.id}-main`,
              url: imageUrl,
              width: 500,
              height: 500,
              alt: product.title || "Product image",
              title: `${product.title} - Main Image`,
              source: "product_image",
              product_id: product.id,
              product_title: product.title,
              selected: false,
              src: {
                original: imageUrl,
                large: imageUrl,
                medium: imageUrl,
                small: imageUrl,
                thumbnail: imageUrl,
              },
            });
          }
        }

        // Add variant images
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant: any, variantIndex: number) => {
            if (variant.image) {
              const variantImageUrl =
                typeof variant.image === "string"
                  ? variant.image
                  : variant.image.src || "";
              if (variantImageUrl) {
                productImages.push({
                  id: `variant-${variant.id}-image`,
                  url: variantImageUrl,
                  width: 500,
                  height: 500,
                  alt: `${variant.title || "Variant"} - ${product.title}`,
                  title: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
                  source: "variant_image",
                  product_id: product.id,
                  product_title: product.title,
                  variant_id: variant.id,
                  variant_title: variant.title,
                  selected: false,
                  src: {
                    original: variantImageUrl,
                    large: variantImageUrl,
                    medium: variantImageUrl,
                    small: variantImageUrl,
                    thumbnail: variantImageUrl,
                  },
                });
              }
            }
          });
        }
      }

      // If no images found, show a message
      if (productImages.length === 0) {
        toast({
          title: "No product images found",
          description: "The selected products don't have any images.",
          variant: "destructive",
        });
        setIsLoadingMedia(false);
        return;
      }

      // Set the product images to display
      setShopifyFiles(productImages);
      toast({
        title: "Product Images Loaded",
        description: `Loaded ${productImages.length} images from your selected products and their variants.`,
      });

      setIsLoadingMedia(false);
    } catch (error) {
      console.error("Error fetching product images:", error);
      toast({
        title: "Error",
        description: "Failed to load product images",
        variant: "destructive",
      });
      setIsLoadingMedia(false);
    }
  };

  // Function to fetch images for a specific product by ID
  const fetchProductImagesById = async (productId: string) => {
    try {
      setIsLoadingContentFiles(true);
      toast({
        title: "Loading product images",
        description: "Fetching images for the selected product...",
      });

      // Use the dedicated endpoint for product-specific images
      const productImagesResponse = await fetch(
        `/api/admin/product-images/${productId}`,
      );
      const productImagesData = await productImagesResponse.json();

      if (
        productImagesData.success &&
        productImagesData.files &&
        productImagesData.files.length > 0
      ) {
        // Format the product images for our UI
        const productImages = productImagesData.files.map((file) => ({
          id: `product-${file.id || Math.random().toString(36).substring(7)}`,
          url: file.url,
          name: file.filename || "Product Image",
          alt: file.alt || file.filename || "Product Image",
          content_type: file.content_type || "image/jpeg",
          source: file.source || "product_image",
          position: file.position || 0,
        }));

        // Sort by position to show main product image first
        productImages.sort((a, b) => (a.position || 0) - (b.position || 0));

        setContentFiles(productImages);
        toast({
          title: "Product images loaded",
          description: `${productImages.length} images loaded for this product`,
        });
      } else {
        toast({
          title: "No product images found",
          description: "This product doesn't have any images",
          variant: "destructive",
        });
        setContentFiles([]);
      }
    } catch (error) {
      console.error("Error fetching product images:", error);
      toast({
        title: "Error loading product images",
        description: "There was a problem fetching images for this product",
        variant: "destructive",
      });
      setContentFiles([]);
    } finally {
      setIsLoadingContentFiles(false);
    }
  };

  // Legacy function for backward compatibility
  const fetchShopifyFiles = async () => {
    // Fetch from media library
    try {
      setIsLoadingMedia(true);
      const response = await fetch("/api/admin/files");
      const data = await response.json();
      if (data.success && data.files) {
        setShopifyFiles(data.files);
      }
    } catch (error) {
      console.error("Error fetching Shopify files:", error);
    } finally {
      setIsLoadingMedia(false);
    }
  };
  const [productImages, setProductImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<
    { url: string; id: string }[]
  >([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageSource, setImageSource] = useState<
    | "pexels"
    | "pixabay"
    | "shopify_media"
    | "product_images"
    | "upload"
    | "youtube"
  >("pexels");
  const [mediaTypeSelection, setMediaTypeSelection] = useState<
    "products" | "variants" | "media"
  >("products");
  const [contentFiles, setContentFiles] = useState<any[]>([]);
  const [isLoadingContentFiles, setIsLoadingContentFiles] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [currentImageEdit, setCurrentImageEdit] = useState<{
    id: string;
    alt: string;
  }>({ id: "", alt: "" });
  const [imageTab, setImageTab] = useState<"primary" | "secondary">("primary");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [youtubeVideoId, setYoutubeVideoId] = useState<string>("");
  const [youtubeEmbed, setYoutubeEmbed] = useState<string | null>(null);
  const [articleLength, setArticleLength] = useState<string>("medium");
  const [headingsCount, setHeadingsCount] = useState<string>("3");
  const [writingPerspective, setWritingPerspective] = useState<string>(
    "first_person_plural",
  );
  const [toneOfVoice, setToneOfVoice] = useState<string>("friendly");
  const [contentStyle, setContentStyle] = useState<string>("informative");
  const [introType, setIntroType] = useState<string>("search_intent");
  const [faqType, setFaqType] = useState<string>("short");
  const [categories, setCategories] = useState<string[]>([]);
  const [postStatus, setPostStatus] = useState<string>("draft");
  const [publicationType, setPublicationType] = useState<string>("blog");
  const [scheduledPublishTime, setScheduledPublishTime] =
    useState<string>("09:30");
  const [blogId, setBlogId] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [enableTables, setEnableTables] = useState<boolean>(true);
  const [enableLists, setEnableLists] = useState<boolean>(true);
  const [enableH3s, setEnableH3s] = useState<boolean>(true);
  const [enableCitations, setEnableCitations] = useState<boolean>(true);
  const [generateImages, setGenerateImages] = useState<boolean>(true);
  const [showKeywordSelector, setShowKeywordSelector] = useState(false);
  const [showTitleSelector, setShowTitleSelector] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>(
    [],
  );
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  // Manual keyword functionality
  const [manualKeyword, setManualKeyword] = useState<string>("");
  const [isAddingManualKeyword, setIsAddingManualKeyword] = useState(false);
  // Removed selectedBuyerPersonas state - now using form field buyerPersonas
  const [productTitle, setProductTitle] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [productDescription, setProductDescription] = useState<string>("");
  type WorkflowStep =
    | "content-type"
    | "product"
    | "related-products"
    | "related-collections"
    | "buying-avatars"
    | "keyword"
    | "title"
    | "media"
    | "author"
    | "content"
    | "post";

  // Helper function to determine step order for progress indicator
  const getStepOrder = (step: string): number => {
    const stepOrder = {
      "content-type": 1,
      product: 2,
      "related-collections": 3,
      persona: 4,
      keyword: 5,
      title: 6,
      media: 7,
      author: 8,
      style: 9,
      content: 10,
      post: 11,
      // Legacy step mappings for backward compatibility
      "related-products": 3,
      "buying-avatars": 4,
    };
    return stepOrder[step as keyof typeof stepOrder] || 0;
  };

  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("content-type");
  const [forceUpdate, setForceUpdate] = useState(0); // Used to force UI re-renders

  // Track completion status for Generate and Post steps
  const [isContentGenerated, setIsContentGenerated] = useState(false);
  const [isContentPosted, setIsContentPosted] = useState(false);

  // Auto-scroll step indicator starting from step 8 (Author)
  useEffect(() => {
    const stepOrder = getStepOrder(workflowStep);
    if (stepOrder >= 8) { // Author step (8) and onwards
      const stepIndicator = document.getElementById("step-indicator");
      if (stepIndicator) {
        // Find the current step button
        const currentStepButton = stepIndicator.querySelector(`[data-step="${workflowStep}"]`);
        if (currentStepButton) {
          // Scroll the current step into view within the step indicator container
          currentStepButton.scrollIntoView({
            behavior: "smooth",
            inline: "center", // Center the step horizontally
            block: "nearest"
          });
        }
      }
    }
  }, [workflowStep]);

  // Title editor state
  const [showTitleEditor, setShowTitleEditor] = useState(false);

  const { toast } = useToast();

  // Reset suggestions when products change
  useEffect(() => {
    if (selectedProducts.length > 0 && suggestionsGenerated) {
      setSuggestionsGenerated(false);
      setBuyerPersonaSuggestions([]);
    }
  }, [selectedProducts, suggestionsGenerated]);

  // Utility function to scroll to current step section
  const scrollToCurrentStep = () => {
    // Find the current step section based on workflowStep
    const currentStepElement = document.querySelector(
      `[data-step="${workflowStep}"]`,
    );

    if (currentStepElement) {
      // Scroll to the step section with smooth behavior
      currentStepElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      // Fallback to scrolling to top if step element not found
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // Default form values
  const defaultValues: Partial<ContentFormValues> = {
    articleType: "blog",
    contentGender: "male",
    writingPerspective: "first_person_plural",
    enableTables: true,
    enableLists: true,
    enableH3s: true,
    introType: "search_intent", // Changed from "standard" to "search_intent"
    faqType: "short",
    enableCitations: true,
    toneOfVoice: "friendly",
    postStatus: "draft",
    generateImages: true,

    keywords: [],
    productIds: [], // This needs to be initialized as an empty array
    collectionIds: [], // This needs to be initialized as an empty array
    scheduledPublishTime: "09:30", // Default to 9:30 AM
    blogId: "", // Initialize with empty string to ensure the field exists
    // Scheduling fields
    publicationType: "draft",
    scheduleDate: undefined,
    scheduleTime: "09:30",
    // New fields
    articleLength: "medium",
    headingsCount: "3",
    // Category fields
    categories: [],
    customCategory: "",
  };

  // Form setup
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues,
  });

  const formData = form.getValues();

  // COMPREHENSIVE PROJECT DATA - NO DUPLICATES
  const projectData = {
    // Core form fields
    title: formData.title || "",
    blogId: formData.blogId || "",
    articleType: formData.articleType || "blog",
    writingPerspective: formData.writingPerspective || "first_person_plural",
    enableTables:
      formData.enableTables !== undefined ? formData.enableTables : true,
    enableLists:
      formData.enableLists !== undefined ? formData.enableLists : true,
    enableH3s: formData.enableH3s !== undefined ? formData.enableH3s : true,
    introType: formData.introType || "search_intent",
    faqType: formData.faqType || "short",
    enableCitations:
      formData.enableCitations !== undefined ? formData.enableCitations : true,
    toneOfVoice: formData.toneOfVoice || "friendly",
    postStatus: formData.postStatus || "draft",
    generateImages:
      formData.generateImages !== undefined ? formData.generateImages : true,
    keywords: formData.keywords || [],
    productIds: formData.productIds || [],
    collectionIds: formData.collectionIds || [],
    scheduledPublishTime: formData.scheduledPublishTime || "09:30",
    scheduledPublishDate: formData.scheduledPublishDate || undefined,
    publicationType: formData.publicationType || "draft",
    scheduleDate: formData.scheduleDate || undefined,
    scheduleTime: formData.scheduleTime || "09:30",
    articleLength: formData.articleLength || "medium",
    headingsCount: formData.headingsCount || "3",
    categories: formData.categories || [],
    customCategory: formData.customCategory || "",
    buyerPersonas: formData.buyerPersonas || "",

    // Content Style fields - CRITICAL FOR PROJECT SAVE/LOAD
    selectedContentToneId: selectedContentToneId || "",
    selectedContentDisplayName: selectedContentDisplayName || "",

    // Additional state fields for comprehensive project save
    selectedProducts: selectedProducts || [],
    selectedCollections: selectedCollections || [],
    selectedKeywords: selectedKeywords || [],
    selectedTitle: selectedTitle || "",
    selectedAuthorId: selectedAuthorId || "",
    mediaContent: {
      primaryImage: primaryImages?.[0] || null,
      secondaryImages: secondaryImages || [],
      youtubeEmbed: youtubeEmbed || "",
    },

    // Metadata
    lastUpdated: new Date().toISOString(),
  };

  // Utility function to calculate reading time
  const calculateReadingTime = (content: string): number => {
    if (!content) return 0;

    // Remove HTML tags and count words
    const textContent = content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = textContent
      .split(" ")
      .filter((word) => word.length > 0).length;

    // Average reading speed is 200-250 words per minute, we'll use 225
    const wordsPerMinute = 225;
    const readingTimeMinutes = Math.ceil(wordCount / wordsPerMinute);

    return Math.max(1, readingTimeMinutes); // Minimum 1 minute
  };

  // Manual keyword addition with DataForSEO lookup
  const addManualKeyword = async () => {
    if (!manualKeyword.trim() || isAddingManualKeyword) return;

    setIsAddingManualKeyword(true);

    try {
      // Add manual keyword exactly as entered by user, without DataForSEO lookup
      const newKeyword = {
        keyword: manualKeyword.trim(),
        searchVolume: 0, // Use 0 for consistent search volume fetching logic
        competition: "MANUAL",
        difficulty: null, // Use null instead of 0
        selected: true,
        isManual: true,
      };
      
      // Debug logging removed

      // Check if keyword already exists
      const exists = selectedKeywords.some(
        (kw: any) =>
          kw.keyword.toLowerCase() === newKeyword.keyword.toLowerCase(),
      );

      if (!exists) {
        // Add to the beginning of the array (so manual keywords appear on top)
        setSelectedKeywords((prev) => [newKeyword, ...prev]);
        toast({
          title: "Manual Keyword Added",
          description: `Added "${newKeyword.keyword}" as manual keyword`,
        });
      } else {
        toast({
          title: "Keyword Already Added",
          description: `"${newKeyword.keyword}" is already in your selection`,
          variant: "destructive",
        });
      }

      setManualKeyword("");
    } catch (error) {
      console.error("Error adding manual keyword:", error);
      toast({
        title: "Error Adding Keyword",
        description: "Failed to add manual keyword. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingManualKeyword(false);
    }
  };

  // Content generation readiness validation
  const isReadyToGenerateContent = () => {
    const formValues = form.getValues();

    // Check required fields
    const hasTitle = !!formValues.title;
    const hasArticleType = !!formValues.articleType;
    const hasBlog = formValues.articleType !== "blog" || !!formValues.blogId;
    const hasKeywords = selectedKeywords && selectedKeywords.length > 0;
    const hasFeaturedImage = primaryImages && primaryImages.length > 0;
    const hasAuthor = !!selectedAuthorId; // Use selectedAuthorId state instead of form field

    // Check workflow step progression - must complete Style & Formatting step (step 8) before generating content
    const hasCompletedStyleStep =
      getStepOrder(workflowStep) >= getStepOrder("content"); // Step 9 or higher

    return (
      hasTitle &&
      hasArticleType &&
      hasBlog &&
      hasKeywords &&
      hasFeaturedImage &&
      hasAuthor &&
      hasCompletedStyleStep
    );
  };

  // Get incomplete steps for tooltip
  const getIncompleteSteps = () => {
    const formValues = form.getValues();
    const missing = [];

    if (!formValues.title) missing.push("Title");
    if (!formValues.articleType) missing.push("Article Type");
    if (formValues.articleType === "blog" && !formValues.blogId)
      missing.push("Blog Selection");
    
    // Check keyword state for validation
    
    if (!selectedKeywords || selectedKeywords.length === 0) {
      if (manualKeyword && manualKeyword.trim()) {
        missing.push(`Keywords (save "${manualKeyword.trim()}" by clicking Add)`);
      } else {
        missing.push("Keywords");
      }
    }
    if (!primaryImages || primaryImages.length === 0)
      missing.push("Featured Image");
    if (!selectedAuthorId) missing.push("Author"); // Use selectedAuthorId state instead of form field

    // Check workflow step progression
    if (getStepOrder(workflowStep) < getStepOrder("content")) {
      missing.push("Complete Style & Formatting Step");
    }

    return missing;
  };

  // Define response types

  interface ProductsResponse {
    success: boolean;
    products: Array<Product>;
  }

  interface CollectionsResponse {
    success: boolean;
    collections: Array<Collection>;
  }

  interface BlogsResponse {
    success: boolean;
    blogs: Array<Blog>;
  }

  interface ServiceStatusResponse {
    success: boolean;
    connections: ServiceStatus;
  }

  // Get current store context
  const { currentStore } = useStore();

  // Query for products (store-aware)
  const productsQuery = useQuery<ProductsResponse>({
    queryKey: ["/api/admin/products", currentStore?.id],
    enabled: selectedTab === "generate" && !!currentStore,
  });

  // Query for collections (store-aware)
  const collectionsQuery = useQuery<CollectionsResponse>({
    queryKey: ["/api/admin/collections", currentStore?.id],
    enabled: selectedTab === "generate" && !!currentStore,
  });

  // Check if the store has the scheduling permission (store-aware)
  const { data: permissionsData } = useQuery<{
    success: boolean;
    hasPermission: boolean;
    store: { name: string };
  }>({
    queryKey: ["/api/shopify/check-permissions", currentStore?.id],
    enabled: !!currentStore,
  });

  // Query for blogs (store-aware)
  const blogsQuery = useQuery<BlogsResponse>({
    queryKey: ["/api/admin/blogs", currentStore?.id],
    enabled: selectedTab === "generate" && form.watch("articleType") === "blog",
  });

  // Initialize form defaults when data is loaded
  useEffect(() => {
    // First, ensure we have articleType set to "blog"
    if (!form.getValues("articleType")) {
      form.setValue("articleType", "blog");
    }

    // Then set the default blog ID if blogs are loaded and no blog is selected
    if (
      blogsQuery.data?.blogs &&
      blogsQuery.data.blogs.length > 0 &&
      form.getValues("articleType") === "blog" &&
      !form.getValues("blogId")
    ) {
      form.setValue("blogId", String(blogsQuery.data.blogs[0].id));
    } else if (
      form.getValues("articleType") === "blog" &&
      !form.getValues("blogId")
    ) {
      // If no blogs are loaded but we're in blog mode, set a default value
      form.setValue("blogId", "default");
    }

    // If we've had a blogId set but the blogs data shows it's invalid, reset to first available or default
    if (form.getValues("blogId") && blogsQuery.data?.blogs) {
      const currentBlogId = form.getValues("blogId");
      const validBlog = blogsQuery.data.blogs.find(
        (blog) => String(blog.id) === String(currentBlogId),
      );

      if (!validBlog && blogsQuery.data.blogs.length > 0) {
        form.setValue("blogId", String(blogsQuery.data.blogs[0].id));
      }
    }
  }, [blogsQuery.data, form]);

  // Save custom categories to localStorage when they change
  useEffect(() => {
    localStorage.setItem(
      "topshop-custom-categories",
      JSON.stringify(customCategories),
    );
  }, [customCategories]);

  // Function to add a new custom category
  const addCustomCategory = (name: string) => {
    if (!name.trim()) return;

    // Create a slug-like ID from the name
    const id = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if this category already exists (case insensitive)
    const exists = [...predefinedCategories, ...customCategories].some(
      (cat) => cat.name.toLowerCase() === name.trim().toLowerCase(),
    );

    if (exists) {
      toast({
        title: "Category already exists",
        description: `"${name}" is already in your category list`,
        variant: "destructive",
      });
      return;
    }

    // Add the new category
    setCustomCategories((prev) => [...prev, { id, name: name.trim() }]);

    toast({
      title: "Category added",
      description: `"${name}" added to your categories`,
      variant: "default",
    });
  };

  // Query for connection status
  const servicesStatusQuery = useQuery<ServiceStatusResponse>({
    queryKey: ["/api/admin/test-connections"],
    enabled: selectedTab === "connections",
  });

  // Billing queries for automatic redirection
  const { data: usageData } = useQuery({
    queryKey: [`/api/billing/usage/${currentStore?.id}`],
    enabled: !!currentStore?.id,
  });

  const { data: limitData } = useQuery({
    queryKey: [`/api/billing/check-limits/${currentStore?.id}`],
    enabled: !!currentStore?.id,
  });

  // Automatic redirection to plans page when both limits reached and no credits
  // Add a ref to track if we've already redirected to prevent loops
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    if (limitData && usageData && !hasRedirectedRef.current) {
      // Only redirect if plan limit is reached AND user has no credits
      const planLimitReached = !limitData.canGenerate;
      const hasCredits = usageData.credits && usageData.credits.availableCredits > 0;
      
      console.log('Redirection check:', { 
        planLimitReached, 
        hasCredits, 
        availableCredits: usageData.credits?.availableCredits || 0,
        canGenerate: limitData.canGenerate,
        hasRedirected: hasRedirectedRef.current
      });
      
      if (planLimitReached && !hasCredits) {
        // Both plan limit reached and no credits available - redirect to plans page
        console.log('Automatically redirecting to plans page: limit reached and no credits available');
        hasRedirectedRef.current = true;
        navigate('/plans');
      }
    }
    
    // Reset redirect flag when user has credits
    if (usageData && usageData.credits && usageData.credits.availableCredits > 0) {
      hasRedirectedRef.current = false;
    }
  }, [limitData, usageData, navigate]);

  // Watch for featured image changes and sync with page content first image
  const [lastSyncedFeaturedImage, setLastSyncedFeaturedImage] = useState<string>("");
  
  useEffect(() => {
    const currentArticleType = form.watch("articleType");
    const currentFeaturedImage = form.watch("featuredImage");
    
    // Only sync if the featured image actually changed (not on every content update)
    if (currentFeaturedImage && currentFeaturedImage !== lastSyncedFeaturedImage && (generatedContent?.content || enhancedContentForEditor)) {
      console.log("🖼️ Featured image changed - syncing:", {
        articleType: currentArticleType,
        newImage: currentFeaturedImage.substring(0, 50) + "...",
        previousImage: lastSyncedFeaturedImage.substring(0, 50) + "..." || "none"
      });
      
      setLastSyncedFeaturedImage(currentFeaturedImage);
      
      console.log(`🔄 Syncing featured image with ${currentArticleType} content first image`);
      
      // Find and update the featured-image-container div specifically
      const currentContent = enhancedContentForEditor || generatedContent.content || "";
      
      // First, try to find and update the featured-image-container div
      let contentWithUpdatedFirstImage = currentContent.replace(
        /<div[^>]*class="[^"]*featured-image-container[^"]*"[^>]*>[\s\S]*?<\/div>/i,
        (match: string) => {
          console.log("📸 Replacing featured-image-container:", match.substring(0, 100) + "...");
          return `<div class="featured-image-container" style="text-align: center; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"><img src="${currentFeaturedImage}" alt="Featured image" style="width: 100%; height: auto; border-radius: 8px;"></div>`;
        }
      );
      
      // If no featured-image-container found, fallback to replacing first img tag
      if (contentWithUpdatedFirstImage === currentContent) {
        contentWithUpdatedFirstImage = currentContent.replace(
          /<img[^>]+src="[^"]*"[^>]*>/i,
          (match: string) => {
            console.log("📸 Fallback: Replacing first image in content:", match);
            const altMatch = match.match(/alt="([^"]*)"/i);
            const altText = altMatch ? altMatch[1] : "Featured image";
            return `<img src="${currentFeaturedImage}" alt="${altText}" style="width: 600px; height: 600px; object-fit: cover; margin: 20px auto; display: block; border-radius: 8px;">`;
          }
        );
      }
      
      // If still no changes and we're dealing with pages, add the featured image at the beginning
      if (contentWithUpdatedFirstImage === currentContent && currentArticleType === "page") {
        console.log("📸 No existing image found - adding featured image at the beginning for page");
        const featuredImageHtml = `<div class="featured-image-container" style="text-align: center; margin: 20px 0; border: 1px solid #ddd; border-radius: 8px;"><img src="${currentFeaturedImage}" alt="Featured image" style="width: 100%; height: auto; border-radius: 8px;"></div>\n\n`;
        contentWithUpdatedFirstImage = featuredImageHtml + currentContent;
      }
      
      // Only update if content actually changed
      if (contentWithUpdatedFirstImage !== currentContent) {
        console.log("✅ Content updated with new featured image");
        // Update both the generated content and enhanced content
        setGeneratedContent((prev: any) => ({
          ...prev,
          content: contentWithUpdatedFirstImage,
          rawContent: contentWithUpdatedFirstImage,
        }));
        
        // Always update the enhanced content for editor
        setEnhancedContentForEditor(contentWithUpdatedFirstImage);
        
        // Force content update counter to trigger re-render
        setContentUpdateCounter((prev) => prev + 1);
      } else {
        console.log("⚠️ No changes made - content already matches featured image");
      }
    }
  }, [form.watch("featuredImage"), form.watch("articleType")]);

  // Sync selectedMediaContent.primaryImage changes to form.featuredImage for real-time content updates
  useEffect(() => {
    if (selectedMediaContent.primaryImage?.url) {
      const currentFeaturedImage = form.getValues("featuredImage");
      if (currentFeaturedImage !== selectedMediaContent.primaryImage.url) {
        console.log("🔄 Syncing selectedMediaContent.primaryImage to form.featuredImage:", selectedMediaContent.primaryImage.url);
        form.setValue("featuredImage", selectedMediaContent.primaryImage.url);
      }
    } else if (!selectedMediaContent.primaryImage) {
      // Clear featured image when primary image is removed
      const currentFeaturedImage = form.getValues("featuredImage");
      if (currentFeaturedImage) {
        console.log("🗑️ Clearing featuredImage - primary image removed");
        form.setValue("featuredImage", "");
      }
    }
  }, [selectedMediaContent.primaryImage, form]);

  // Handle image search using Pexels API
  const handleImageSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      toast({
        title: "Search query required",
        description: "Please enter a search term to find images",
        variant: "destructive",
      });
      return;
    }

    // Check if we already have this search in history
    const existingSearch = imageSearchHistory.find(
      (hist) => hist.query === trimmedQuery,
    );
    if (existingSearch) {
      // Preserve uploaded images and add search history results
      setSearchedImages((prev) => {
        const uploadedImages = prev.filter((img) => img.source === "uploaded");
        const combined = [...uploadedImages, ...existingSearch.images];
        console.log(
          "Loading search history while preserving uploaded images:",
          {
            uploadedCount: uploadedImages.length,
            historyCount: existingSearch.images.length,
            totalCount: combined.length,
          },
        );
        return combined;
      });

      // If no primary images are set, automatically use the first image from history as featured
      if (primaryImages.length === 0 && existingSearch.images.length > 0) {
        setPrimaryImages([existingSearch.images[0]]);
        toast({
          title: "Featured image set",
          description:
            "A search result has been automatically set as your featured image",
        });
      }

      setImageSearchQuery(trimmedQuery);
      return;
    }

    setIsSearchingImages(true);

    try {
      const response = await apiRequest({
        url: "/api/admin/generate-images",
        method: "POST",
        data: {
          query: trimmedQuery, // Use "query" instead of "prompt" to match server expectations
          count: 10, // Request 10 images to choose from
        },
      });

      if (response.success && response.images && response.images.length > 0) {
        // Mark images as selected if they're already in selectedImages
        const newImages = response.images.map((img: any) => ({
          ...img,
          selected: selectedImages.some((selected) => selected.id === img.id),
        }));

        // Preserve uploaded images and add new search results
        setSearchedImages((prev) => {
          const uploadedImages = prev.filter(
            (img) => img.source === "uploaded",
          );
          const combined = [...uploadedImages, ...newImages];
          console.log(
            "Adding new search results while preserving uploaded images:",
            {
              uploadedCount: uploadedImages.length,
              newCount: newImages.length,
              totalCount: combined.length,
            },
          );
          return combined;
        });

        // Set Pexels images as default for primary images
        if (primaryImages.length === 0 && newImages.length > 0) {
          // Find an image with people if possible (better for featured images)
          const humanImage = newImages.find(
            (img) =>
              img.alt?.toLowerCase().includes("person") ||
              img.alt?.toLowerCase().includes("people") ||
              img.alt?.toLowerCase().includes("woman") ||
              img.alt?.toLowerCase().includes("man"),
          );

          // Use human image if found, otherwise first image
          const featuredImage = humanImage || newImages[0];

          setPrimaryImages([featuredImage]);
          toast({
            title: "Featured image set",
            description:
              "A Pexels image has been automatically set as your featured image",
          });
        }

        // Add to search history
        setImageSearchHistory((prev) => [
          ...prev,
          {
            query: trimmedQuery,
            images: newImages,
          },
        ]);

        toast({
          title: "Images found",
          description: `Found ${newImages.length} images for "${trimmedQuery}"`,
          variant: "default",
        });
      } else {
        toast({
          title: "No images found",
          description: "Try a different search term",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Image search error:", error);
      toast({
        title: "Error searching images",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    // Get the current selection state
    const currentImage = searchedImages.find((img) => img.id === imageId);
    const newSelectedState = !(currentImage?.selected || false);

    // Update in current search results
    setSearchedImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, selected: newSelectedState } : img,
      ),
    );

    // Update in search history
    setImageSearchHistory((prev) =>
      prev.map((history) => ({
        ...history,
        images: history.images.map((img) =>
          img.id === imageId ? { ...img, selected: newSelectedState } : img,
        ),
      })),
    );

    // Update selected images list
    if (newSelectedState) {
      // Add to selected images if not already there
      const imageToAdd = searchedImages.find((img) => img.id === imageId);
      if (imageToAdd && !selectedImages.some((img) => img.id === imageId)) {
        setSelectedImages((prev) => [
          ...prev,
          { ...imageToAdd, selected: true },
        ]);
      }
    } else {
      // Remove from selected images
      setSelectedImages((prev) => prev.filter((img) => img.id !== imageId));
    }
  };

  // Just open the dialog without auto-populating or auto-searching
  useEffect(() => {
    // No longer auto-populate or search based on title
    if (
      showImageDialog &&
      imageSearchHistory.length === 0 &&
      !searchedImages.length
    ) {
      // Just display empty search - user must enter their own query
      setImageSearchQuery("");
    }
  }, [showImageDialog, imageSearchHistory.length, searchedImages.length]);

  // Handle image selection confirmation
  const confirmImageSelection = () => {
    // Consolidate all selected images from all searches
    const allSelected: PexelsImage[] = [];

    // Get selected images from current search
    const currentSelected = searchedImages.filter((img) => img.selected);

    // Get selected images from history
    imageSearchHistory.forEach((history) => {
      const historySelected = history.images.filter((img) => img.selected);
      historySelected.forEach((img) => {
        // Only add if not already in the list
        if (!allSelected.some((selected) => selected.id === img.id)) {
          allSelected.push(img);
        }
      });
    });

    // Add current selected images if not in history
    currentSelected.forEach((img) => {
      if (!allSelected.some((selected) => selected.id === img.id)) {
        allSelected.push(img);
      }
    });

    setSelectedImages(allSelected);
    setShowImageDialog(false);

    toast({
      title: `${allSelected.length} image(s) selected`,
      description: "Images will be included in your content",
      variant: "default",
    });
  };

  // Handle keyword selection
  const handleKeywordsSelected = (keywords: any[]) => {
    setSelectedKeywords(keywords);
    setShowKeywordSelector(false);

    // Update form with selected keywords
    const keywordStrings = keywords.map((k) => k.keyword);
    form.setValue("keywords", keywordStrings);

    toast({
      title: `${keywords.length} keyword(s) selected`,
      description: "Keywords will be used to optimize your content",
      variant: "default",
    });

    // Move to title selection step
    setWorkflowStep("title");
    setShowTitleSelector(true);
  };

  // Handle title selection
  const handleTitleSelected = (title: string) => {
    form.setValue("title", title);
    setShowTitleSelector(false);

    toast({
      title: "Title selected",
      description: "Title will be used for your content",
      variant: "default",
    });

    // Move to media selection step
    setWorkflowStep("media");
  };

  // Handle media selection step completion
  const handleMediaSelectionComplete = (mediaContent: {
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  }) => {
    console.log("Media selection completed:", mediaContent);
    setSelectedMediaContent(mediaContent);

    // Store the media content in form state for API submission
    if (mediaContent.primaryImage) {
      form.setValue("featuredImage", mediaContent.primaryImage.url);
    }

    // Store secondary images for content generation - map to compatible format
    setSecondaryImages(
      mediaContent.secondaryImages.map((img) => ({
        id: img.id,
        url: img.url,
        width: img.width || 0,
        height: img.height || 0,
        alt: img.alt || "",
        source: img.source || "pexels",
        selected: true,
        type: "image" as const,
        src: {
          original: img.url,
          large: img.url,
          medium: img.url,
          small: img.url,
          thumbnail: img.url,
        },
      })),
    );

    // Move to author selection step
    setWorkflowStep("author");

    toast({
      title: "Media Selection Complete",
      description: `Selected ${mediaContent.primaryImage ? "a primary image" : "no primary image"}, ${mediaContent.secondaryImages.length} secondary images${mediaContent.youtubeEmbed ? ", and 1 video" : ""}.`,
    });
  };

  // Handle media selection back button
  const handleMediaSelectionBack = () => {
    // Go back to title selection
    setWorkflowStep("title");
    setShowTitleSelector(true);
  };

  // Handle author selection
  const handleAuthorSelected = (authorId: string | null) => {
    console.log(
      "AUTHOR SELECTION - handleAuthorSelected called with:",
      authorId,
    );
    setSelectedAuthorId(authorId);
    console.log(
      "AUTHOR SELECTION - selectedAuthorId state updated to:",
      authorId,
    );

    if (authorId) {
      toast({
        title: "Author selected",
        description: "Author will be assigned to your content",
        variant: "default",
      });
    }
  };

  // Handle author selection completion
  const handleAuthorSelectionComplete = () => {
    // Move to content generation step
    setWorkflowStep("content");
    scrollToCurrentStep();

    toast({
      title: "Setup Complete",
      description: "Ready to generate your content",
      variant: "default",
    });
  };

  // Handle author selection back button
  const handleAuthorSelectionBack = () => {
    // Go back to media selection
    setWorkflowStep("media");
    scrollToCurrentStep();
  };

  // Handle product selection
  const handleProductsSelected = (productIds: string[]) => {
    // Save the actual product objects instead of just IDs
    const selectedProductObjects: Product[] = [];

    productIds.forEach((id) => {
      const product = productsQuery.data?.products.find((p) => p.id === id);
      if (product) {
        selectedProductObjects.push(product);
      }
    });

    setSelectedProducts(selectedProductObjects);

    // Find the primary selected product to use for keyword generation and image suggestions
    if (productIds.length > 0 && selectedProductObjects.length > 0) {
      const primaryProduct = selectedProductObjects[0];
      setProductTitle(primaryProduct.title);
      setProductId(primaryProduct.id);

      // Set product description if available
      if (primaryProduct.body_html) {
        // Strip HTML tags for plain text description
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = primaryProduct.body_html;
        setProductDescription(tempDiv.textContent || tempDiv.innerText || "");
      } else {
        setProductDescription("");
      }
    } else {
      // Clear product-related fields if no products selected
      setProductTitle("");
      setProductId("");
      setProductDescription("");
    }

    // Update form value with the IDs
    form.setValue("productIds", productIds);

    // Move to related products selection step after product selection
    setWorkflowStep("related-products");
    scrollToCurrentStep();

    toast({
      title: "Product selected",
      description:
        "Now select any related products you want to include in your content",
    });
  };

  // Handle related products continue action
  const handleRelatedProductsContinue = () => {
    // Move to related collections step after related products selection
    setWorkflowStep("related-collections");
    scrollToCurrentStep();

    toast({
      title: "Related products saved",
      description: "Now select collections to include in your content",
    });
  };

  // Handle related collections continue action
  const handleRelatedCollectionsContinue = () => {
    // Move to buying avatars step after collections selection
    setWorkflowStep("buying-avatars");
    scrollToCurrentStep();

    // Generate AI buyer persona suggestions when entering this step
    if (!suggestionsGenerated) {
      generateBuyerPersonaSuggestions();
    }

    toast({
      title: "Related collections saved",
      description: "Now let's select your target buyer personas",
    });
  };

  // Handle buying avatars continue action
  const handleBuyerPersonasContinue = () => {
    // Store the selected buyer personas for later use in form submission
    // We'll include them in the API request when generating content
    // This avoids TypeScript errors with the form field that doesn't expect this property

    // Move to keyword selection step after buyer personas selection
    setWorkflowStep("keyword");
    scrollToCurrentStep();

    const buyerPersonas = form.getValues("buyerPersonas");
    toast({
      title: "Buyer personas saved",
      description:
        buyerPersonas && buyerPersonas.trim()
          ? "Content will be tailored to your defined audience"
          : "Using automatic audience detection",
    });
  };

  // Handle back button from collections to products
  const handleBackToProducts = () => {
    setWorkflowStep("product");
    scrollToCurrentStep();
  };

  // Handle collection selection
  const handleCollectionsSelected = (collectionIds: string[]) => {
    // Save the actual collection objects instead of just IDs
    const selectedCollectionObjects: Collection[] = [];

    collectionIds.forEach((id) => {
      const collection = collectionsQuery.data?.collections.find(
        (c) => c.id === id,
      );
      if (collection) {
        selectedCollectionObjects.push(collection);
      }
    });

    setSelectedCollections(selectedCollectionObjects);

    // Update form value with IDs
    form.setValue("collectionIds", collectionIds);

    // Only move to next step if no products were selected (products take precedence)
    const productIds = form.getValues("productIds") || [];
    if (productIds.length === 0 && collectionIds.length > 0) {
      // Just update the workflow step, don't auto-open keyword selector
      setWorkflowStep("keyword");
      scrollToCurrentStep();
      // The user will need to click the button manually
    }
  };

  // Handle publication actions
  // Function to handle image uploads in rich text editor
  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("source", "rich_editor");

      // Upload image to server
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const result = await response.json();
      const imageUrl = result.url;

      // Insert image into editor at cursor position
      const editorElement = document.querySelector(
        '[contenteditable="true"]',
      ) as HTMLDivElement;
      if (editorElement) {
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);

        if (range) {
          const imgElement = document.createElement("img");
          imgElement.src = imageUrl;
          imgElement.style.maxWidth = "100%";
          imgElement.style.height = "auto";
          imgElement.style.margin = "20px 0";
          imgElement.style.borderRadius = "8px";
          imgElement.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
          imgElement.alt = file.name;

          range.deleteContents();
          range.insertNode(imgElement);

          // Update content state
          setGeneratedContent((prev) => ({
            ...prev,
            content: editorElement.innerHTML,
          }));

          // Force preview re-render
          setContentUpdateCounter((prev) => prev + 1);
        }
      }

      toast({
        title: "Image uploaded",
        description: "Image has been inserted into your content",
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePublishContent = async (
    publicationType: "publish" | "draft" | "schedule",
  ) => {
    if (!generatedContent) {
      toast({
        title: "No content to publish",
        description: "Please generate content first before publishing",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      const formValues = form.getValues();

      // CRITICAL FIX: Capture the latest content directly from the editor DOM element
      const editorElement = document.querySelector(
        '[contenteditable="true"]',
      ) as HTMLDivElement;
      const latestContent = editorElement
        ? editorElement.innerHTML
        : generatedContent.content;

      // Update the state to ensure consistency
      if (editorElement && latestContent !== generatedContent.content) {
        setGeneratedContent((prev) => ({
          ...prev,
          content: latestContent,
        }));
      }

      console.log("Publishing content with latest editor state:", {
        contentLength: latestContent?.length || 0,
        contentPreview: latestContent?.substring(0, 200) + "...",
        hasImages: latestContent?.includes("<img") || false,
        hasIframes: latestContent?.includes("<iframe") || false,
        editorFound: !!editorElement,
        stateContentLength: generatedContent.content?.length || 0,
      });

      const publishData = {
        title: generatedContent.title,
        content: latestContent, // Use the latest content captured directly from the editor
        metaTitle: generatedContent.metaTitle,
        metaDescription: generatedContent.metaDescription,
        tags: Array.isArray(generatedContent.tags)
          ? generatedContent.tags.join(", ")
          : generatedContent.tags || "",
        featuredImage:
          primaryImages[0]?.url ||
          selectedMediaContent.primaryImage?.url ||
          generatedContent.featuredImage?.url ||
          generatedContent.featuredImage ||
          "",
        articleType: formValues.articleType,
        blogId: formValues.blogId,
        publicationType,
        status:
          publicationType === "publish"
            ? "published"
            : publicationType === "schedule"
              ? "scheduled"
              : "draft",
        scheduledPublishDate:
          publicationType === "schedule"
            ? formValues.scheduledPublishDate
            : undefined,
        scheduledPublishTime:
          publicationType === "schedule"
            ? formValues.scheduledPublishTime || "09:30"
            : undefined,
        authorId: selectedAuthorId,
        // Include media content for proper Shopify sync - prioritize current state over generated content
        primaryImage: primaryImages[0] || selectedMediaContent.primaryImage,
        secondaryImages: selectedMediaContent.secondaryImages,
      };

      console.log("Publishing content with complete data:", {
        ...publishData,
        contentLength: publishData.content?.length || 0,
      });

      const response = await apiRequest({
        url: "/api/posts",
        method: "POST",
        data: publishData,
      });

      if (response?.post) {
        // Check if content was successfully sent to Shopify (published or scheduled)
        const isSentToShopify =
          response.post.shopifyPostId &&
          (publicationType === "publish" || publicationType === "schedule");
        const isPublishedToShopify =
          response.post.shopifyPostId && publicationType === "publish";

        setGeneratedContent({
          ...generatedContent,
          contentUrl: response.contentUrl,
          isPublished: isPublishedToShopify,
        });

        const actionText =
          publicationType === "publish"
            ? "published"
            : publicationType === "schedule"
              ? "scheduled"
              : "saved as draft";

        let description = `Your content has been ${actionText} successfully`;
        if (isPublishedToShopify) {
          description = `Your content has been published to Shopify successfully (Article ID: ${response.post.shopifyPostId})`;
        } else if (
          publicationType === "schedule" &&
          response.post.shopifyPostId
        ) {
          description = `Your content has been scheduled in Shopify successfully (Article ID: ${response.post.shopifyPostId})`;
        }

        toast({
          title: `Content ${actionText}`,
          description: description,
          variant: "default",
        });

        // Update generated content with Shopify information if sent to Shopify (published or scheduled)
        if (isSentToShopify) {
          // Mark content as posted for workflow step indicator
          setIsContentPosted(true);
          
          // Auto-scroll to show the current step (Post step)
          setTimeout(() => {
            const stepIndicator = document.getElementById("step-indicator");
            if (stepIndicator) {
              const currentStepButton = stepIndicator.querySelector(`[data-step="post"]`);
              if (currentStepButton) {
                currentStepButton.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest"
                });
              }
            }
          }, 1000); // Delay to allow posting to complete

          setGeneratedContent((prev) =>
            prev
              ? {
                  ...prev,
                  shopifyPostId: response.post.shopifyPostId,
                  shopifyBlogId: response.post.shopifyBlogId,
                  shopifyUrl: response.shopifyUrl || response.post.shopifyUrl, // Use handle-based URL from API
                }
              : null,
          );
        }
      } else {
        throw new Error(response?.message || "Failed to process content");
      }
    } catch (error: any) {
      console.error("Publication error:", error);
      toast({
        title: "Publication failed",
        description:
          error?.message || "Failed to publish content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle content generation form submission
  const handleSubmit = async (values: ContentFormValues) => {
    try {
      console.log("Form submission started with values:", values);
      console.log("🔍 FORM DEBUG - Article length from form values:", values.articleLength);
      console.log("🔍 FORM DEBUG - Article length from state variable:", articleLength);
      console.log("🔍 FORM DEBUG - Final processedData will use:", values.articleLength || "medium");
      setIsGenerating(true);
      setGeneratedContent(null);

      // Validate required fields
      if (!values.title) {
        throw new Error("Please select a title for your content");
      }

      if (!values.articleType) {
        throw new Error("Please select an article type");
      }

      if (values.articleType === "blog" && !values.blogId) {
        throw new Error("Please select a blog for your content");
      }

      if (!Array.isArray(selectedKeywords) || selectedKeywords.length === 0) {
        throw new Error(
          "Please select at least one keyword for SEO optimization",
        );
      }

      if (workflowStep !== "content") {
        console.warn(
          "Attempting to generate content when not in content step. Current step:",
          workflowStep,
        );
        setWorkflowStep("content");
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure state update
      }

      // Determine publication type based on scheduling checkbox
      let publicationType =
        values.postStatus === "publish" ? "publish" : "draft";
      let scheduleDate: string | undefined = undefined;
      let scheduleTime: string | undefined = undefined;

      // Handle scheduling information
      if (values.scheduledPublishDate) {
        // If scheduled, override publication type to schedule and set status to scheduled
        publicationType = "schedule";
        scheduleDate = values.scheduledPublishDate;
        scheduleTime = values.scheduledPublishTime || "09:30";

        // Updating both for maximum compatibility with backend
        console.log(
          "Content will be scheduled for",
          scheduleDate,
          "at",
          scheduleTime,
        );

        // Add explicit debugging log to confirm scheduling is being set
        console.log("SCHEDULING MODE ACTIVE in AdminPanel form submission", {
          scheduledPublishDate: values.scheduledPublishDate,
          scheduledPublishTime: values.scheduledPublishTime || "09:30",
          publicationType,
          scheduleDate,
          scheduleTime,
        });
      }

      // Create a safe copy of the form values with guaranteed array values
      const processedData = {
        ...values,
        // Ensure these are always arrays of strings
        productIds: Array.isArray(values.productIds)
          ? values.productIds.map((id) => String(id))
          : [],
        collectionIds: Array.isArray(values.collectionIds)
          ? values.collectionIds.map((id) => String(id))
          : [],
        keywords: Array.isArray(values.keywords) ? values.keywords : [],
        // Ensure categories are properly included
        categories: Array.isArray(values.categories) ? values.categories : [],
        // Include buyer personas to target specific customer types
        buyerPersonas: values.buyerPersonas || "",
        // Map to backend expected fields for audience-aware content generation
        targetAudience: values.buyerPersonas || "",
        buyerPersona: values.buyerPersonas || "",
        // Ensure we have these required fields
        articleType: values.articleType || "blog",
        title: values.title || "",
        introType: values.introType || "search_intent",
        region: "us",
        // Make sure blogId is a string if it exists
        blogId: values.blogId ? String(values.blogId) : undefined,

        // Critical scheduling fields - includes multiple formats for compatibility
        // with different parts of the backend
        publicationType,
        status:
          publicationType === "schedule"
            ? "scheduled"
            : values.postStatus || "draft",
        scheduleDate,
        scheduleTime,
        // Use empty string instead of null to avoid validation errors
        scheduledPublishDate: values.scheduledPublishDate || "",
        scheduledPublishTime:
          values.scheduledPublishTime ||
          (values.scheduledPublishDate ? "09:30" : ""),

        // If we're scheduling, keep post as draft until scheduled time
        postStatus:
          publicationType === "schedule" ? "scheduled" : values.postStatus,

        // Include content generation option fields
        articleLength: values.articleLength || "medium",
        headingsCount: values.headingsCount || "3",
      };

      // Extra verification to ensure scheduling works correctly
      if (values.scheduledPublishDate) {
        console.log("Double-checking scheduling data is complete", {
          status: processedData.status,
          postStatus: processedData.postStatus,
          publicationType: processedData.publicationType,
          scheduleDate: processedData.scheduleDate,
          scheduleTime: processedData.scheduleTime,
          scheduledPublishDate: processedData.scheduledPublishDate,
          scheduledPublishTime: processedData.scheduledPublishTime,
        });
      }

      // Process keywords to ensure they're in the right format
      const processedKeywords = Array.isArray(selectedKeywords)
        ? selectedKeywords.map((kw) => ({
            keyword:
              typeof kw.keyword === "string"
                ? kw.keyword
                : String(kw.keyword || ""),
            searchVolume:
              typeof kw.searchVolume === "number" ? kw.searchVolume : (kw.isManual ? null : 0),
            // Ensure any other properties are included but properly typed
            difficulty: typeof kw.difficulty === "number" ? kw.difficulty : (kw.isManual ? null : 0),
            cpc: typeof kw.cpc === "number" ? kw.cpc : 0,
            // CRITICAL: Preserve manual keyword flag
            isManual: Boolean(kw.isManual),
            competition: kw.competition || (kw.isManual ? "MANUAL" : ""),
            selected: Boolean(kw.selected !== false), // Default to true unless explicitly false
          }))
        : [];

      // Add selected image IDs and keywords to form data
      const submitData = {
        ...processedData,
        selectedImageIds: selectedImages.map((img) => String(img.id)),
        // Include full keyword data (not just strings) for analysis on the server
        selectedKeywordData: processedKeywords,
        // Add content style selection if available
        contentStyleToneId: selectedContentToneId || "",
        contentStyleDisplayName: selectedContentDisplayName || "",
        // CRITICAL: Include selected author ID from workflow
        authorId: selectedAuthorId ? parseInt(selectedAuthorId) : null,
        // CRITICAL FIX: Include products info for secondary image product linking
        productsInfo: selectedProducts.map((product) => ({
          id: String(product.id),
          title: product.title,
          handle: product.handle,
          description: product.description || "",
          images: product.images || [],
          variants: product.variants || [],
        })),
        // Add selected media from selectedMediaContent state (the correct source)
        // CRITICAL FIX: Handle async state issue by using both selectedMediaContent and fallback state
        primaryImage:
          selectedMediaContent.primaryImage || primaryImages[0] || null,
        secondaryImages: (() => {
          console.log("🔍 SECONDARY IMAGES PREPARATION DEBUG:", {
            selectedMediaContentSecondaryImages:
              selectedMediaContent.secondaryImages,
            selectedMediaContentSecondaryImagesLength:
              selectedMediaContent.secondaryImages?.length || 0,
            secondaryImagesState: secondaryImages,
            secondaryImagesStateLength: secondaryImages?.length || 0,
          });

          // Combine all available secondary images from both sources
          let allSecondaryImages: any[] = [];

          // CRITICAL FIX: Get ALL possible primary image IDs for comprehensive filtering
          const getAllPrimaryImageIds = () => {
            const ids = new Set();
            if (selectedMediaContent.primaryImage?.id)
              ids.add(selectedMediaContent.primaryImage.id);
            if (selectedMediaContent.primaryImage?.url)
              ids.add(selectedMediaContent.primaryImage.url);
            if (primaryImages[0]?.id) ids.add(primaryImages[0].id);
            if (primaryImages[0]?.url) ids.add(primaryImages[0].url);
            return ids;
          };

          const primaryImageIds = getAllPrimaryImageIds();
          console.log(
            "🔍 PRIMARY IMAGE IDS FOR FILTERING:",
            Array.from(primaryImageIds),
          );

          // Add from selectedMediaContent if available
          if (
            selectedMediaContent.secondaryImages &&
            selectedMediaContent.secondaryImages.length > 0
          ) {
            console.log(
              "✓ Adding from selectedMediaContent.secondaryImages:",
              selectedMediaContent.secondaryImages.length,
            );
            // Enhanced primary image duplication prevention
            const filteredSecondaryImages =
              selectedMediaContent.secondaryImages.filter(
                (img) =>
                  !primaryImageIds.has(img.id) && !primaryImageIds.has(img.url),
              );
            console.log(
              "🔍 FILTERED OUT",
              selectedMediaContent.secondaryImages.length -
                filteredSecondaryImages.length,
              "duplicate primary images",
            );
            allSecondaryImages = [
              ...allSecondaryImages,
              ...filteredSecondaryImages,
            ];
          } else if (
            !selectedMediaContent.secondaryImages ||
            selectedMediaContent.secondaryImages.length === 0
          ) {
            console.log(
              "⚠️ selectedMediaContent.secondaryImages is empty/null - checking if this is a project load timing issue",
            );
            // Check if secondaryImages state has data but selectedMediaContent doesn't
            if (secondaryImages && secondaryImages.length > 0) {
              console.log(
                "🔄 PROJECT LOAD TIMING FIX: Using secondaryImages state as fallback",
              );
              console.log(
                "   This suggests selectedMediaContent wasn't properly synced after project load",
              );

              // CRITICAL FIX: Actually add the secondaryImages to allSecondaryImages
              const formattedFallbackImages = secondaryImages.map((img) => ({
                id: img.id,
                url: img.url || img.src?.original || img.src?.large || img.src,
                alt: img.alt || "",
                width: img.width || 0,
                height: img.height || 0,
                source: img.source || "project_fallback",
              }));

              // Filter out primary images from fallback
              const filteredFallbackImages = formattedFallbackImages.filter(
                (img) =>
                  !primaryImageIds.has(img.id) && !primaryImageIds.has(img.url),
              );

              allSecondaryImages = [
                ...allSecondaryImages,
                ...filteredFallbackImages,
              ];
              console.log(
                "✅ PROJECT LOAD FALLBACK APPLIED: Added",
                filteredFallbackImages.length,
                "secondary images from state",
              );
            }
          }

          // Add from secondaryImages state if available and not duplicates
          if (secondaryImages && secondaryImages.length > 0) {
            console.log(
              "✓ Adding from secondaryImages state:",
              secondaryImages.length,
            );
            const formattedSecondaryImages = secondaryImages.map((img) => ({
              id: img.id,
              url: img.url || img.src?.original || img.src?.large || img.src,
              alt: img.alt || "",
              width: img.width || 0,
              height: img.height || 0,
              source: img.source || "pexels",
            }));

            // FIXED: Enhanced duplicate and primary image filtering with proper deduplication
            formattedSecondaryImages.forEach((img) => {
              const isDuplicate = allSecondaryImages.some(
                (existing) =>
                  existing.id === img.id || existing.url === img.url,
              );
              const isPrimaryImage =
                primaryImageIds.has(img.id) || primaryImageIds.has(img.url);

              if (!isDuplicate && !isPrimaryImage) {
                allSecondaryImages.push(img);
                console.log("✅ ADDED unique secondary image:", img.id);
              } else {
                console.log("🚫 SKIPPED duplicate or primary image:", img.id, {
                  isDuplicate,
                  isPrimaryImage,
                });
              }
            });
            console.log(
              "🔍 SECONDARY IMAGES STATE: Added",
              formattedSecondaryImages.length -
                (formattedSecondaryImages.length - allSecondaryImages.length),
              "images after filtering",
            );
          }

          // CRITICAL PROJECT LOAD FIX: Enhanced emergency fallback for project loading scenarios
          // This is the most reliable fallback that directly accesses stored project data
          if (allSecondaryImages.length === 0 && currentProject) {
            console.log(
              "🔍 PROJECT LOAD SAFETY CHECK: No secondary images found in state variables",
            );
            console.log(
              "🔄 ATTEMPTING EMERGENCY FALLBACK: Accessing project data directly",
            );
            try {
              const projectData = JSON.parse(currentProject.projectData);
              if (
                projectData.mediaContent?.secondaryImages &&
                projectData.mediaContent.secondaryImages.length > 0
              ) {
                console.log(
                  "✅ EMERGENCY FALLBACK SUCCESS: Found",
                  projectData.mediaContent.secondaryImages.length,
                  "secondary images in project data",
                );
                console.log(
                  "🔍 Project data secondary images:",
                  projectData.mediaContent.secondaryImages,
                );

                const emergencySecondaryImages =
                  projectData.mediaContent.secondaryImages.map((img: any) => ({
                    id: img.id,
                    url:
                      img.url || img.src?.original || img.src?.large || img.src,
                    alt: img.alt || "",
                    width: img.width || 0,
                    height: img.height || 0,
                    source: img.source || "product_image",
                  }));

                // FIXED: Enhanced primary image filtering for emergency fallback with proper deduplication
                emergencySecondaryImages.forEach((img: any) => {
                  const isDuplicate = allSecondaryImages.some(
                    (existing) =>
                      existing.id === img.id || existing.url === img.url,
                  );
                  const isPrimaryImage =
                    primaryImageIds.has(img.id) || primaryImageIds.has(img.url);

                  if (!isDuplicate && !isPrimaryImage) {
                    allSecondaryImages.push(img);
                    console.log(
                      "✅ EMERGENCY: Added unique secondary image:",
                      img.id,
                    );
                  } else {
                    console.log(
                      "🚫 EMERGENCY: Skipped duplicate or primary image:",
                      img.id,
                      { isDuplicate, isPrimaryImage },
                    );
                  }
                });
                console.log(
                  "✅ EMERGENCY FALLBACK COMPLETE: Using",
                  allSecondaryImages.length,
                  "secondary images from project data",
                );
                console.log(
                  "🔍 EMERGENCY IMAGES DATA:",
                  allSecondaryImages.map((img) => ({
                    id: img.id,
                    source: img.source,
                  })),
                );
              } else {
                console.log(
                  "❌ EMERGENCY FALLBACK FAILED: No secondary images found in project data either",
                );
                console.log(
                  "🔍 Project mediaContent structure:",
                  projectData.mediaContent,
                );
              }
            } catch (parseError) {
              console.error(
                "❌ EMERGENCY FALLBACK ERROR: Failed to parse current project data:",
                parseError,
              );
            }
          }

          // FINAL DEBUG LOG: Show what we're actually sending to backend
          console.log("🚀 FINAL SECONDARY IMAGES SUMMARY:", {
            totalSecondaryImages: allSecondaryImages.length,
            fromSelectedMediaContent:
              selectedMediaContent.secondaryImages?.length || 0,
            fromSecondaryImagesState: secondaryImages?.length || 0,
            fromEmergencyFallback:
              allSecondaryImages.length > 0 &&
              !selectedMediaContent.secondaryImages?.length &&
              !secondaryImages?.length
                ? allSecondaryImages.length
                : 0,
            imageIds: allSecondaryImages.map((img) => img.id),
            hasCurrentProject: !!currentProject,
          });

          console.log(
            "🔄 FINAL secondary images count:",
            allSecondaryImages.length,
          );
          console.log("🔄 FINAL secondary images data:", allSecondaryImages);

          // CRITICAL DEBUG: Ensure we can track what's being sent to backend
          if (allSecondaryImages.length > 0) {
            console.log("✅ SECONDARY IMAGES READY FOR PRODUCT INTERLINKING");
            console.log(
              "🔗 Available products for interlinking:",
              selectedProducts.map((p: any) => ({
                id: p.id,
                handle: p.handle,
                title: p.title,
              })),
            );
            console.log("📊 Product interlinking data check:", {
              secondaryImagesCount: allSecondaryImages.length,
              selectedProductsCount: selectedProducts.length,
              productHandles: selectedProducts
                .map((p: any) => p.handle)
                .join(", "),
            });
            console.log("✅ SENDING SECONDARY IMAGES TO BACKEND:");
            allSecondaryImages.forEach((img, idx) => {
              console.log(
                `  ${idx + 1}. ID: ${img.id}, URL: ${img.url}, Source: ${img.source}`,
              );
            });
          } else {
            console.log(
              "❌ NO SECONDARY IMAGES TO SEND - will result in no product interlinking",
            );
            console.log(
              "❌ Check if selectedMediaContent.secondaryImages or secondaryImages state contain data",
            );
          }

          return allSecondaryImages;
        })(),
        youtubeEmbed: selectedMediaContent.youtubeEmbed || youtubeEmbed,
      };

      console.log(
        "Preparing API request to /api/admin/generate-content with data:",
        submitData,
      );
      console.log("🔍 SELECTED PRODUCTS DEBUG:", {
        selectedProductsLength: selectedProducts.length,
        selectedProductsData: selectedProducts,
        productsInfoInSubmitData: submitData.productsInfo
      });
      console.log("CRITICAL DEBUG: Secondary images being sent:", {
        count: submitData.secondaryImages.length,
        images: submitData.secondaryImages.map((img) => ({
          id: img.id,
          url: img.url,
          source: img.source,
          alt: img.alt,
        })),
      });
      console.log("Selected media content state:", selectedMediaContent);
      console.log("Primary image in submit data:", submitData.primaryImage);
      console.log(
        "Secondary images in submit data:",
        submitData.secondaryImages,
      );
      console.log("YouTube embed in submit data:", submitData.youtubeEmbed);
      console.log("AUTHOR SYNC DEBUG - Selected author ID:", selectedAuthorId);
      console.log(
        "AUTHOR SYNC DEBUG - Author ID in submit data:",
        submitData.authorId,
      );
      console.log(
        "Media data being sent to server - Primary:",
        !!submitData.primaryImage,
        "Secondary:",
        submitData.secondaryImages?.length || 0,
        "YouTube:",
        !!submitData.youtubeEmbed,
      );

      // CRITICAL DEBUG: Check if secondary images are properly formatted
      if (submitData.secondaryImages && submitData.secondaryImages.length > 0) {
        console.log("SECONDARY IMAGES DEBUG:");
        submitData.secondaryImages.forEach((img, idx) => {
          console.log(`  Secondary image ${idx + 1}:`, {
            id: img.id,
            url: img.url,
            alt: img.alt,
            source: img.source,
          });
        });
      } else {
        console.log(
          "SECONDARY IMAGES DEBUG: No secondary images in submit data",
        );
        console.log(
          "  selectedMediaContent.secondaryImages:",
          selectedMediaContent.secondaryImages,
        );
        console.log(
          "  selectedMediaContent.secondaryImages.length:",
          selectedMediaContent.secondaryImages?.length,
        );
        console.log("  secondaryImages state:", secondaryImages);
        console.log("  secondaryImages state length:", secondaryImages?.length);
        console.log(
          "  CRITICAL: Need to identify why selectedMediaContent.secondaryImages is empty after project load",
        );

        // Check if this is a project load scenario
        if (
          secondaryImages &&
          secondaryImages.length > 0 &&
          (!selectedMediaContent.secondaryImages ||
            selectedMediaContent.secondaryImages.length === 0)
        ) {
          console.error(
            "PROJECT LOAD BUG DETECTED: secondaryImages state has data but selectedMediaContent.secondaryImages is empty!",
          );
          console.log(
            "  This indicates project loading didn't properly sync selectedMediaContent state",
          );
          console.log("  secondaryImages state:", secondaryImages);
          console.log("  selectedMediaContent:", selectedMediaContent);
        }
      }

      // Specific try-catch for the API request
      try {
        const response = await apiRequest({
          url: "/api/admin/generate-content",
          method: "POST",
          data: submitData,
        });

        console.log("API response received:", response);

        if (!response) {
          throw new Error("Received empty response from server");
        }

        // Store the API response with proper URL mapping for frontend access
        console.log("🔍 API RESPONSE CONTENT DEBUG:");
        console.log("  Content length:", response.content?.length || 0);
        console.log("  First 500 chars:", response.content?.substring(0, 500));
        console.log("  Has H2 headings:", response.content?.includes("<h2"));
        console.log(
          "  H2 headings with IDs:",
          (response.content?.match(/<h2[^>]*id[^>]*>/g) || []).length,
        );
        console.log(
          "  TOC links with target=_blank:",
          (response.content?.match(/href="#[^"]*"[^>]*target="_blank"/g) || [])
            .length,
        );

        setGeneratedContent({
          ...response,
          contentUrl: response.contentUrl,
          shopifyUrl: response.contentUrl, // Map contentUrl to shopifyUrl for button compatibility
        });

        // Clear enhanced content to ensure clean content from server is displayed
        setEnhancedContentForEditor("");

        // Force content editor to re-render with new content
        setContentEditorKey((prev) => prev + 1);

        // Content Preview scroll already handled on button click

        // Mark content as generated for workflow step indicator
        setIsContentGenerated(true);

        toast({
          title: "Content generated successfully",
          description:
            "Your content has been generated and is ready for review in the Content Preview section.",
          variant: "default",
        });
      } catch (apiError: any) {
        console.error("API request failed:", apiError);
        toast({
          title: "API Request Failed",
          description:
            apiError?.message ||
            "Could not connect to the server. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Content generation error:", error);
      toast({
        title: "Error generating content",
        description:
          error?.message ||
          "An unexpected error occurred. Please check your form inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-full mx-auto pb-10 px-4">
      {/* Project Management Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Content Admin Panel</h1>
            {currentProject ? (
              <p className="text-sm text-muted-foreground mt-1">
                Active Project:{" "}
                <span className="font-medium">{currentProject.name}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                No active project - create or load a project to save your work
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateProjectDialog(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              New Project
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLoadProjectDialog(true)}
              className="flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Load Project
            </Button>
          </div>
        </div>
      </div>

      {/* Show scheduling permission notice if needed */}
      {permissionsData?.success && !permissionsData.hasPermission && (
        <div className="mb-4">
          <SchedulingPermissionNotice
            storeName={permissionsData.store?.name || "your store"}
          />
        </div>
      )}

      <div className="content-generation-container">
        {/* Full-Screen Content Generation Interface */}
        <div className="w-full max-w-full mx-auto space-y-12 px-4">
          {/* Main Content Generation Card */}
          <Card className="admin-card bg-white">
            <CardHeader className="text-center py-12">
              <CardTitle className="text-4xl font-bold tracking-tight text-gray-900 mb-4">Content Generator</CardTitle>
              <CardDescription className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Generate SEO-optimized content for your Shopify store with our AI-powered content creation wizard
              </CardDescription>
            </CardHeader>
            <CardContent className="px-12 pb-12">
              <Form {...form} key={formKey}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                  className="space-y-4"
                >
                  {/* Step guidance */}

                  <div className="z-30 mb-12 p-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200/60 shadow-sm backdrop-blur-sm bg-opacity-95">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                      Content Creation Workflow
                    </h3>

                    {/* Enhanced Clickable Step Indicator */}
                    <div 
                      id="step-indicator" 
                      className="flex items-center justify-center gap-2 overflow-x-auto pb-2 flex-wrap"
                    >
                      {[
                        {
                          step: "content-type",
                          number: 1,
                          label: "Choose Content",
                          shortLabel: "Content",
                        },
                        {
                          step: "product",
                          number: 2,
                          label: "Products",
                          shortLabel: "Products",
                        },
                        {
                          step: "related-collections",
                          number: 3,
                          label: "Collections",
                          shortLabel: "Collections",
                        },
                        {
                          step: "persona",
                          number: 4,
                          label: "Personas",
                          shortLabel: "Personas",
                        },
                        {
                          step: "keyword",
                          number: 5,
                          label: "Keywords",
                          shortLabel: "Keywords",
                        },
                        {
                          step: "title",
                          number: 6,
                          label: "Title",
                          shortLabel: "Title",
                        },
                        {
                          step: "media",
                          number: 7,
                          label: "Media",
                          shortLabel: "Media",
                        },
                        {
                          step: "author",
                          number: 8,
                          label: "Author",
                          shortLabel: "Author",
                        },
                        {
                          step: "style",
                          number: 9,
                          label: "Style",
                          shortLabel: "Style",
                        },
                        {
                          step: "content",
                          number: 10,
                          label: "Generate",
                          shortLabel: "Generate",
                        },
                        {
                          step: "post",
                          number: 11,
                          label: "Post",
                          shortLabel: "Post",
                        },
                      ].map((item, index) => {
                        // Special logic for Generate (step 9) and Post (step 10) completion status
                        let isCompleted =
                          getStepOrder(workflowStep) > getStepOrder(item.step);

                        // Override completion status for Generate step based on content generation
                        if (item.step === "content" && isContentGenerated) {
                          isCompleted = true;
                        }

                        // Override completion status for Post step based on posting status
                        if (item.step === "post" && isContentPosted) {
                          isCompleted = true;
                        }

                        const isCurrent = workflowStep === item.step;
                        const isClickable =
                          isCompleted ||
                          isCurrent ||
                          getStepOrder(workflowStep) >=
                            getStepOrder(item.step) - 1;

                        return (
                          <div key={item.step} className="flex items-center">
                            {/* Clickable Step Circle */}
                            <button
                              data-step={item.step}
                              onClick={() => {
                                if (isClickable) {
                                  setWorkflowStep(item.step as WorkflowStep);
                                  scrollToCurrentStep();
                                }
                              }}
                              disabled={!isClickable}
                              className={`group flex flex-col items-center justify-center min-w-[60px] max-w-[80px] px-2 py-2 rounded-lg transition-all duration-300 ${
                                isClickable
                                  ? "hover:bg-blue-100 cursor-pointer"
                                  : "cursor-not-allowed opacity-50"
                              }`}
                              title={`Step ${item.number}: ${item.label}`}
                            >
                              <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
                                  isCompleted
                                    ? "bg-green-500 text-white group-hover:bg-green-600"
                                    : isCurrent
                                      ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-300 ring-offset-2"
                                      : isClickable
                                        ? "bg-gray-300 text-gray-600 group-hover:bg-gray-400 group-hover:text-gray-700"
                                        : "bg-gray-200 text-gray-400"
                                }`}
                              >
                                {item.number}
                              </div>

                              {/* Step Label */}
                              <span
                                className={`text-xs mt-1 text-center leading-tight transition-colors duration-300 ${
                                  isCompleted
                                    ? "text-green-600 font-medium"
                                    : isCurrent
                                      ? "text-blue-700 font-medium"
                                      : isClickable
                                        ? "text-gray-600 group-hover:text-gray-700"
                                        : "text-gray-400"
                                }`}
                              >
                                {item.shortLabel}
                              </span>
                            </button>

                            {/* Connector Line (except for last item) */}
                            {index < 9 && (
                              <div
                                className={`h-0.5 w-2 mx-0.5 transition-all duration-300 ${
                                  isCompleted ? "bg-green-400" : "bg-gray-300"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Items Display - appears after blog selection */}
                  <div className="space-y-10 fade-in">
                    {(selectedProducts.length > 0 ||
                      selectedCollections.length > 0 ||
                      form.watch("buyerPersonas") ||
                      selectedKeywords.length > 0 ||
                      form.watch("title")) && (
                      <div className="space-y-6 border-0 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm  mx-auto max-w-5xl">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                          Current Selections
                        </h4>

                        {/* Selected Products */}
                        {selectedProducts.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <h5 className="text-sm font-medium flex items-center">
                                <Package className="h-4 w-4 mr-2 text-green-500" />
                                Selected Products ({selectedProducts.length})
                              </h5>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="flex items-center gap-2 bg-white rounded-md p-2 shadow-sm border"
                                >
                                  {product.image && (
                                    <img
                                      src={product.image}
                                      alt={product.title}
                                      className="w-8 h-8 rounded object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  )}
                                  <span className="text-sm font-medium truncate max-w-32">
                                    {product.title}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 rounded-full ml-1 hover:bg-slate-100"
                                    onClick={() => {
                                      // Remove the product from the selected products
                                      const updatedProducts =
                                        selectedProducts.filter(
                                          (p) => p.id !== product.id,
                                        );
                                      setSelectedProducts(updatedProducts);

                                      // Update form value with the IDs
                                      const productIds = updatedProducts.map(
                                        (p) => p.id,
                                      );
                                      form.setValue("productIds", productIds);

                                      // Show alert and redirect if no products left
                                      if (updatedProducts.length === 0) {
                                        toast({
                                          title: "Product Required",
                                          description:
                                            "Selecting a product is required to continue. Please choose at least one product.",
                                          variant: "destructive",
                                        });

                                        // Redirect back to product selection step
                                        setWorkflowStep("product");
                                        scrollToCurrentStep();
                                      }
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Selected Collections */}
                        {selectedCollections.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <h5 className="text-sm font-medium flex items-center">
                                <Folders className="h-4 w-4 mr-2 text-purple-500" />
                                Selected Collections (
                                {selectedCollections.length})
                              </h5>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedCollections.map((collection) => (
                                <div
                                  key={collection.id}
                                  className="flex items-center gap-2 bg-white rounded-md p-2 shadow-sm border"
                                >
                                  <FolderOpen className="h-4 w-4 text-purple-500" />
                                  <span className="text-sm font-medium truncate max-w-32">
                                    {collection.title}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 rounded-full ml-1 hover:bg-slate-100"
                                    onClick={() => {
                                      setSelectedCollections((prev) =>
                                        prev.filter(
                                          (c) => c.id !== collection.id,
                                        ),
                                      );
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Buyer Personas Display */}
                        {form.watch("buyerPersonas") && (
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <h5 className="text-sm font-medium flex items-center">
                                <Users className="h-4 w-4 mr-2 text-blue-500" />
                                Target Audience
                              </h5>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-md border">
                              <p className="text-sm text-gray-700">
                                {form.watch("buyerPersonas")}
                              </p>
                            </div>
                          </div>
                        )}


                        {/* Selected Title - Only show after keywords step */}
                        {form.watch("title") && getStepOrder(workflowStep) > getStepOrder("keyword") && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-medium flex items-center">
                                <Type className="h-4 w-4 mr-2 text-indigo-500" />
                                Selected Title
                              </h5>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setShowTitleEditor(true)}
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                            {showTitleEditor ? (
                              <div className="bg-white rounded-md p-3 shadow-sm border space-y-2">
                                <FormField
                                  control={form.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Textarea
                                          {...field}
                                          placeholder="Enter your custom title..."
                                          className="min-h-[60px] resize-y text-sm"
                                          autoFocus
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setShowTitleEditor(false)}
                                    className="h-7 text-xs"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowTitleEditor(false);
                                      // Reset to the original selected title if user wants to cancel
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white rounded-md p-3 shadow-sm border">
                                <p className="text-sm font-medium">
                                  {form.watch("title")}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title field (hidden initially, made visible and populated in title step) */}
                    <div
                      className={
                        workflowStep === "title" ? "block" : "hidden"
                      }
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Selected Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter a descriptive title"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                            <div className="mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTitleSelector(true)}
                              >
                                Change Title
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  
                  {/* Step 1: Choose Content */}
                  <div
                    className={`max-w-5xl mx-auto fade-in ${
                      workflowStep === "content-type" ? "block" : "hidden"
                    }`}
                    data-step="content-type"
                    >
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                          Choose Content Type
                        </h2>
                        <p className="text-sm text-center text-blue-600 mb-4">
                          Select the type of content you want to create and configure basic settings.
                        </p>
                      </div>

                      {/* Content type selection */}
                      <FormField
                        control={form.control}
                        name="articleType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Type</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "blog" || value === "page") {
                                  form.setValue("articleType", value);
                                }
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select content type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="blog">Blog Post</SelectItem>
                                <SelectItem value="page">Page</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Blog ID selection if blog type is selected */}
                      {form.watch("articleType") === "blog" && (
                        <div className="mt-4">
                          <FormField
                            control={form.control}
                            name="blogId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selected Blog</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue("blogId", value, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                      shouldTouch: true,
                                    });
                                  }}
                                  value={field.value || ""}
                                  key={field.value} // Force re-render when value changes
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue 
                                        placeholder={blogsQuery.isLoading ? "Loading blogs..." : "Select blog"}
                                      >
                                        {field.value && blogsQuery.data?.blogs ? 
                                          blogsQuery.data.blogs.find(blog => String(blog.id) === String(field.value))?.title || "Select blog"
                                          : blogsQuery.isLoading ? "Loading blogs..." : "Select blog"
                                        }
                                      </SelectValue>
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {blogsQuery.isLoading ? (
                                      <SelectItem value="loading" disabled>
                                        Loading blogs...
                                      </SelectItem>
                                    ) : blogsQuery.data?.blogs && blogsQuery.data.blogs.length > 0 ? (
                                      blogsQuery.data.blogs.map((blog) => (
                                        <SelectItem key={blog.id} value={String(blog.id)}>
                                          {blog.title}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="no-blogs" disabled>
                                        No blogs available
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Navigation buttons for Step 1 */}
                      <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                        <Button
                          type="button"
                          onClick={() => {
                            // Validate that content type is selected
                            const contentType = form.getValues("articleType");
                            
                            if (!contentType) {
                              toast({
                                title: "Content Type Required",
                                description: "Please select a content type before continuing",
                                variant: "destructive",
                              });
                              return;
                            }

                            // If blog is selected, validate blog selection
                            if (contentType === "blog") {
                              const blogId = form.getValues("blogId");
                              if (!blogId) {
                                toast({
                                  title: "Blog Selection Required",
                                  description: "Please select a blog before continuing",
                                  variant: "destructive",
                                });
                                return;
                              }
                            }

                            // Proceed to Step 2: Choose Products
                            setWorkflowStep("product");
                            scrollToCurrentStep();
                            
                            toast({
                              title: "Step Completed",
                              description: "Now select products to feature in your content",
                            });
                          }}
                        >
                          Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Step 2: Choose Products (formerly Step 1) */}
                    <div
                      className={`max-w-5xl mx-auto fade-in ${
                        workflowStep === "product" ? "block" : "hidden"
                      }`}
                      data-step="product"
                    >
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                        <div className="text-center mb-4">
                          <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            Choose Products
                          </h2>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-blue-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <p className="font-medium mb-1">Products Required</p>
                                  <p className="text-sm">
                                    You must select at least one product to proceed with 
                                    content generation. Products are essential for 
                                    creating relevant, targeted content.
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-base text-gray-600 text-center max-w-2xl mx-auto">
                          Select products to feature in your content. Products are required for content generation.
                        </p>
                      </div>

                      <RelatedProductsSelector
                        products={productsQuery.data?.products || []}
                        selectedProducts={selectedProducts}
                        onProductSelect={(product) => {
                          // Add the product to the selected products if not already there
                          if (
                            !selectedProducts.some((p) => p.id === product.id)
                          ) {
                            const updatedProducts = [
                              ...selectedProducts,
                              product,
                            ];
                            setSelectedProducts(updatedProducts);

                            // Update form value with the IDs
                            const productIds = updatedProducts.map((p) => p.id);
                            form.setValue("productIds", productIds);
                          }
                        }}
                        onProductRemove={(productId) => {
                          // Remove the product from the selected products
                          const updatedProducts = selectedProducts.filter(
                            (p) => p.id !== productId,
                          );
                          setSelectedProducts(updatedProducts);

                          // Update form value with the IDs
                          const productIds = updatedProducts.map((p) => p.id);
                          form.setValue("productIds", productIds);

                          // Show alert and redirect if no products left
                          if (updatedProducts.length === 0) {
                            toast({
                              title: "Product Required",
                              description:
                                "Selecting a product is required to continue. Please choose at least one product.",
                              variant: "destructive",
                            });

                            // Redirect back to product selection step
                            if (workflowStep !== "product") {
                              setWorkflowStep("product");
                              scrollToCurrentStep();
                            }
                          }
                        }}
                        onContinue={() => {
                          if (selectedProducts.length > 0) {
                            setWorkflowStep("related-collections");
                            scrollToCurrentStep();
                          } else {
                            toast({
                              title: "Product Required",
                              description:
                                "Please select at least one product before continuing",
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                    </div>

                    {/* Step 2: Related Collections Selection Section */}
                    <div
                      className={`max-w-5xl mx-auto fade-in ${
                        workflowStep === "related-collections"
                          ? "block"
                          : "hidden"
                      }`}
                      data-step="related-collections"
                    >
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                          Choose Related Collections
                        </h2>
                        <p className="text-base text-gray-600 text-center max-w-2xl mx-auto">
                          Select collections that are related to your content to group products and categories
                        </p>
                      </div>

                      <RelatedCollectionsSelector
                        collections={collectionsQuery.data?.collections || []}
                        selectedCollections={selectedCollections}
                        onCollectionSelect={(collection) => {
                          // Add the collection to the selected collections if not already there
                          if (
                            !selectedCollections.some(
                              (c) => c.id === collection.id,
                            )
                          ) {
                            const updatedCollections = [
                              ...selectedCollections,
                              collection,
                            ];
                            setSelectedCollections(updatedCollections);

                            // Update form value with the IDs
                            const collectionIds = updatedCollections.map(
                              (c) => c.id,
                            );
                            form.setValue("collectionIds", collectionIds);
                          }
                        }}
                        onCollectionRemove={(collectionId) => {
                          // Remove the collection from the selected collections
                          const updatedCollections = selectedCollections.filter(
                            (c) => c.id !== collectionId,
                          );
                          setSelectedCollections(updatedCollections);

                          // Update form value with the IDs
                          const collectionIds = updatedCollections.map(
                            (c) => c.id,
                          );
                          form.setValue("collectionIds", collectionIds);
                        }}
                        onContinue={handleRelatedCollectionsContinue}
                        onBack={handleBackToProducts}
                      />
                    </div>

                    {/* Step 3: Buyer Personas Input Section */}
                    <div
                      className={`max-w-5xl mx-auto fade-in ${
                        workflowStep === "buying-avatars" ? "block" : "hidden"
                      }`}
                      data-step="buying-avatars"
                    >
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                          Define Target Buyer Personas
                        </h2>
                        <p className="text-base text-gray-600 text-center max-w-2xl mx-auto">
                          Describe your target audience in detail. You can type custom descriptions or use the suggestion buttons below.
                        </p>
                      </div>

                      {/* Flexible Buyer Personas Text Input */}
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="buyerPersonas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                Target Audience Description
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Example: homeowners in the United States that are 30+ in age, interested in home improvement and water quality solutions"
                                  className="min-h-[80px] resize-y"
                                  autoFocus={!field.value}
                                />
                              </FormControl>
                              <FormDescription>
                                Provide a detailed description of your target
                                customers. The more specific, the better your
                                content will be tailored.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* AI-Generated Suggestion Buttons */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center">
                              <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                              Suggestions:
                            </h5>
                            {selectedProducts.length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={generateBuyerPersonaSuggestions}
                                disabled={suggestionsLoading}
                                className="h-7 text-xs"
                              >
                                {suggestionsLoading ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regenerate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          {suggestionsLoading ? (
                            <div className="flex items-center justify-center p-4 bg-purple-50 rounded-md border">
                              <Loader2 className="w-5 h-5 mr-2 animate-spin text-purple-500" />
                              <p className="text-sm text-purple-700">
                                Analyzing your selected products to generate
                                personalized buyer personas...
                              </p>
                            </div>
                          ) : buyerPersonaSuggestions.length > 0 ||
                            suggestionsRef.current.length > 0 ? (
                            <div
                              key={`${suggestionKey}-${forceRerender}`}
                              className="flex flex-wrap gap-2"
                            >
                              {console.log(
                                "🎯 RENDERING BUYER PERSONA SUGGESTIONS:",
                              )}
                              {console.log(
                                "🎯 buyerPersonaSuggestions:",
                                buyerPersonaSuggestions,
                              )}
                              {console.log(
                                "🎯 suggestionsRef.current:",
                                suggestionsRef.current,
                              )}
                              {console.log(
                                "🎯 suggestionsGenerated:",
                                suggestionsGenerated,
                              )}
                              {console.log(
                                "🎯 suggestionsLoading:",
                                suggestionsLoading,
                              )}
                              {(buyerPersonaSuggestions.length > 0
                                ? buyerPersonaSuggestions
                                : suggestionsRef.current
                              ).map((suggestion, index) => (
                                <Button
                                  key={index}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs hover:bg-purple-50 hover:border-purple-300"
                                  onClick={() => {
                                    const currentValue =
                                      form.getValues("buyerPersonas") || "";
                                    const newValue = currentValue
                                      ? `${currentValue}, ${suggestion}`
                                      : suggestion;
                                    form.setValue("buyerPersonas", newValue);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          ) : selectedProducts.length === 0 ? (
                            <div className="p-4 bg-amber-50 rounded-md border border-amber-200">
                              <p className="text-sm text-amber-700">
                                <Info className="w-4 h-4 inline mr-1" />
                                Select products in Step 1 to get buyer persona
                                suggestions based on your specific products.
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 bg-gray-50 rounded-md border">
                              <p className="text-sm text-gray-600">
                                Click "Regenerate" to get buyer persona
                                suggestions based on your selected products.
                              </p>
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            {suggestionsGenerated && selectedProducts.length > 0
                              ? "These suggestions are based on your selected products. Click any suggestion to add it to your description."
                              : "You can type your own description or use the suggestion buttons above."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-between">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => setWorkflowStep("related-collections")}
                        >
                          <ChevronLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleBuyerPersonasContinue}
                        >
                          Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Step 4: Keyword Selection Section */}
                    <div
                      className={`max-w-5xl mx-auto fade-in ${
                        workflowStep === "keyword" ? "block" : "hidden"
                      }`}
                      data-step="keyword"
                    >
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                          Choose Keywords
                        </h2>
                        <p className="text-sm text-blue-600 mb-2">
                          Click the button below to select keywords for your
                          content. The following selected items will be used for
                          keyword generation:
                        </p>

                        {/* Display selected products and collections in the keyword step */}
                        {(selectedProducts.length > 0 ||
                          selectedCollections.length > 0) && (
                          <div className="mb-4 p-3 bg-white rounded-md border">
                            {selectedProducts.length > 0 && (
                              <div className="mb-2">
                                <h5 className="text-xs font-medium text-slate-600 mb-1.5">
                                  Selected Products:
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                  {selectedProducts.map((product) => {
                                    // Get image source from images array or direct image property
                                    const imageSrc =
                                      product.images &&
                                      product.images.length > 0
                                        ? product.images[0].src
                                        : product.image || "";

                                    return (
                                      <div
                                        key={product.id}
                                        className="flex items-center gap-2 bg-slate-50 rounded p-1.5 border shadow-sm"
                                      >
                                        {imageSrc ? (
                                          <img
                                            src={imageSrc}
                                            alt={product.title}
                                            className="w-8 h-8 rounded object-contain"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                                            <Search className="w-4 h-4 text-slate-400" />
                                          </div>
                                        )}
                                        <span className="text-xs font-medium max-w-[120px] truncate">
                                          {product.title}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {selectedCollections.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-slate-600 mb-1.5">
                                  Selected Collections:
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                  {selectedCollections.map((collection) => (
                                    <div
                                      key={collection.id}
                                      className="flex items-center gap-2 bg-slate-50 rounded p-1.5 border shadow-sm"
                                    >
                                      {collection.image_url ? (
                                        <img
                                          src={collection.image_url}
                                          alt={collection.title}
                                          className="w-8 h-8 rounded object-contain"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                                          <FileText className="w-4 h-4 text-slate-400" />
                                        </div>
                                      )}
                                      <span className="text-xs font-medium max-w-[120px] truncate">
                                        {collection.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Manual Keyword Entry */}
                        <div className="mt-4 space-y-2">
                          <Label
                            htmlFor="manualKeyword"
                            className="text-sm font-medium text-slate-700"
                          >
                            Add keywords manually
                          </Label>
                          <div className="flex space-x-2">
                            <Input
                              id="manualKeyword"
                              placeholder="Enter a keyword (e.g., 'water filter', 'organic skincare')"
                              value={manualKeyword}
                              onChange={(e) => setManualKeyword(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addManualKeyword();
                                }
                              }}
                              onBlur={() => {
                                // Auto-add keyword when user leaves field if there's content
                                setTimeout(() => {
                                  if (manualKeyword.trim() && !isAddingManualKeyword) {
                                    addManualKeyword();
                                  }
                                }, 100);
                              }}
                              disabled={isAddingManualKeyword}
                              className={cn(
                                "flex-1",
                                manualKeyword.trim() && "border-blue-300 bg-blue-50"
                              )}
                            />
                            <Button
                              onClick={addManualKeyword}
                              disabled={
                                !manualKeyword.trim() || isAddingManualKeyword
                              }
                              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {isAddingManualKeyword ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              {isAddingManualKeyword ? "Adding..." : "Add"}
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Enter specific keywords exactly as you want to target them.
                              {manualKeyword.trim() && (
                                <span className="text-blue-600 font-medium ml-1">
                                  Press Enter or click Add to save!
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {Array.isArray(selectedKeywords) &&
                          selectedKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-2 min-h-[40px] border rounded-md p-2 mb-3">
                              {selectedKeywords.map((keyword, idx) => (
                                <Badge
                                  key={`${keyword?.keyword}-${idx}-${keyword?.isManual ? 'manual' : 'auto'}`}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {/* Clean any trailing numbers that might be search volume concatenated to keyword - but preserve manual keywords exactly as entered */}
                                  {typeof keyword?.keyword === 'string' 
                                    ? (keyword?.isManual ? keyword.keyword : keyword.keyword.replace(/\d+$/, '').trim())
                                    : keyword?.keyword || ""}
                                  {keyword?.isManual && (
                                    <span className="text-xs text-purple-600 ml-1">
                                      (Manual)
                                    </span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          )}

                        <div className="flex items-center justify-center my-4">
                          <div className="border-t border-gray-200 flex-1"></div>
                          <span className="px-3 text-sm text-gray-500">or</span>
                          <div className="border-t border-gray-200 flex-1"></div>
                        </div>

                        <Button
                          onClick={() => {
                            // Check if products are selected before allowing keyword generation
                            if (selectedProducts.length === 0) {
                              toast({
                                title: "Products Required",
                                description:
                                  "Please select at least one product before generating keywords. Keywords are based on your product selection.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setShowKeywordSelector(true);
                          }}
                          size="lg"
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          disabled={selectedProducts.length === 0}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Keywords
                        </Button>
                      </div>

                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWorkflowStep("product")}
                        >
                          Back
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            // Check if products are selected first
                            if (selectedProducts.length === 0) {
                              toast({
                                title: "Products Required",
                                description:
                                  "You must select at least one product to proceed. Content generation requires product information.",
                                variant: "destructive",
                              });
                              setWorkflowStep("product"); // Force back to product selection
                              scrollToCurrentStep();
                              return;
                            }

                            // Then check keywords
                            if (selectedKeywords.length > 0) {
                              setWorkflowStep("title");
                              setShowTitleSelector(true);
                            } else {
                              toast({
                                title: "Keywords Required",
                                description:
                                  "Please select at least one keyword before continuing",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={selectedKeywords.length === 0}
                        >
                          Next
                        </Button>
                      </div>
                    </div>

                    {/* Step 5: Title Selection Section */}
                    <div
                      className={`fade-in ${
                        workflowStep === "title" ? "block" : "hidden"
                      }`}
                      data-step="title"
                    >
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                          Select a Title
                        </h2>
                        <p className="text-sm text-blue-600">
                          Choose from AI-generated title suggestions based on
                          your keywords
                        </p>
                      </div>

                      {form.watch("title") && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                          <h4 className="font-medium">Selected Title:</h4>
                          <p className="text-lg font-semibold">
                            {form.watch("title")}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWorkflowStep("keyword")}
                        >
                          Back
                        </Button>

                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            className="mr-2"
                            onClick={() => setShowTitleSelector(true)}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {form.watch("title")
                              ? "Change Title"
                              : "Select Title"}
                          </Button>

                          <Button
                            type="button"
                            onClick={() => {
                              // Check if products are still selected
                              if (selectedProducts.length === 0) {
                                toast({
                                  title: "Products Required",
                                  description:
                                    "You removed products but they are required for content generation. Please select products first.",
                                  variant: "destructive",
                                });
                                setWorkflowStep("product"); // Force back to product selection
                                scrollToCurrentStep();
                                return;
                              }

                              if (form.watch("title")) {
                                setWorkflowStep("media");
                                scrollToCurrentStep();
                              } else {
                                toast({
                                  title: "Title Required",
                                  description:
                                    "Please select a title before continuing",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={!form.watch("title")}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Step 6: Media Selection Section */}
                    <div
                      className={`max-w-5xl mx-auto fade-in ${
                        workflowStep === "media" ? "block" : "hidden"
                      }`}
                      data-step="media"
                    >
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                          Choose Media
                        </h2>
                        <p className="text-sm text-center text-blue-600">
                          Select compelling visuals to enhance your content and
                          boost engagement
                        </p>
                      </div>

                      <div className="mb-6">
                        <div className="p-4 bg-slate-50 rounded-md mt-2">
                          <div className="mb-4">
                            <h4 className="text-lg font-medium mb-1">
                              Featured Image
                            </h4>
                            <p className="text-xs text-slate-500 mb-3">
                              Use emotionally compelling images with people or
                              animals. Try search terms like "happy woman",
                              "confused customer", "smiling family", etc.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                              <Card className="overflow-hidden">
                                <CardHeader className="p-3 bg-slate-100">
                                  <CardTitle className="text-md font-medium truncate">
                                    Search Free Images
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    Search free stock photos
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3">
                                  <Button
                                    variant="outline"
                                    className="w-full text-white border-green-600"
                                    style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                                    size="sm"
                                    onClick={() => {
                                      setImageSource("unified_search");
                                      setImageSearchQuery(
                                        `happy ${selectedProducts.length > 0 ? selectedProducts[0].title.split(" ")[0] : "customer"}`,
                                      );
                                      setShowImageDialog(true);
                                    }}
                                  >
                                    <Search className="mr-0.5 h-3 w-3" />
                                    <span className="text-xs truncate">
                                      Search Free Images
                                    </span>
                                  </Button>
                                </CardContent>
                              </Card>

                              <Card className="overflow-hidden">
                                <CardHeader className="p-3 bg-slate-100">
                                  <CardTitle className="text-md">
                                    Shopify Images
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    Use images from your store
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3">
                                  <div className="flex flex-col space-y-2">
                                    {/* Only show product images button when a product is selected */}
                                    {selectedProducts.length > 0 && (
                                      <Button
                                        variant="outline"
                                        className="w-full text-white border-green-600"
                                        style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                                        size="sm"
                                        onClick={() => {
                                          setImageSource("product_images");
                                          if (selectedProducts[0]?.id) {
                                            fetchProductImages(
                                              selectedProducts[0].id,
                                            );
                                          } else {
                                            toast({
                                              title: "No product selected",
                                              description:
                                                "Please select a product first",
                                              variant: "destructive",
                                            });
                                          }
                                          setShowImageDialog(true);
                                        }}
                                      >
                                        <ImageIcon className="mr-0.5 h-4 w-4" />
                                        Product Images
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="overflow-hidden">
                                <CardHeader className="p-3 bg-slate-100">
                                  <CardTitle className="text-md">
                                    Upload Image
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    Upload your own images
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3">
                                  <Button
                                    variant="outline"
                                    className="w-full text-white border-green-600"
                                    style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                                    size="sm"
                                    onClick={() => {
                                      setImageSource("upload");
                                      setShowImageDialog(true);
                                    }}
                                  >
                                    <Upload className="mr-0.5 h-4 w-4" />
                                    Upload Image
                                  </Button>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Featured Image Preview */}
                            <div className="space-y-4">
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      🖼️
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-blue-800">
                                    Featured Image
                                  </h4>
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                    Primary
                                  </span>
                                </div>

                                {primaryImages.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="relative group max-w-sm">
                                      <ShopifyImageViewer
                                        src={
                                          primaryImages[0].src?.medium ||
                                          primaryImages[0].url
                                        }
                                        alt={
                                          primaryImages[0].alt ||
                                          "Featured image"
                                        }
                                        className="w-full h-48 object-cover rounded-lg border-2 border-blue-300 shadow-md"
                                      />
                                      <div className="absolute top-2 right-2">
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="icon"
                                          className="h-7 w-7 rounded-full opacity-90 hover:opacity-100 shadow-md"
                                          onClick={() => setPrimaryImages([])}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <div className="absolute bottom-2 left-2">
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          className="text-xs opacity-90 hover:opacity-100"
                                          onClick={() => {
                                            // Replace featured image functionality
                                            setImageTab("primary");
                                            setImageSource("unified_search");
                                            setShowImageDialog(true);
                                          }}
                                        >
                                          Replace Featured
                                        </Button>
                                      </div>
                                    </div>
                                    {primaryImages.length > 1 && (
                                      <p className="text-xs text-blue-600">
                                        Multiple images selected - only the
                                        first will be used as featured
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed border-blue-200">
                                    <ImageIcon className="h-12 w-12 mx-auto text-blue-300 mb-2" />
                                    <p className="text-sm font-medium text-blue-600 mb-1">
                                      No Featured Image Selected
                                    </p>
                                    <p className="text-xs text-blue-500 mb-3">
                                      Choose an emotionally compelling image
                                      that represents your content
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setImageTab("primary");
                                        setImageSource("unified_search");
                                        setShowImageDialog(true);
                                      }}
                                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Select Featured Image
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Secondary Content Preview */}
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">
                                        📷
                                      </span>
                                    </div>
                                    <h4 className="text-sm font-semibold text-green-800">
                                      Secondary Content
                                    </h4>
                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                      {selectedMediaContent.secondaryImages
                                        .length + (youtubeEmbed ? 1 : 0)}{" "}
                                      Selected
                                    </span>
                                  </div>
                                  {(selectedMediaContent.secondaryImages
                                    .length > 0 ||
                                    youtubeEmbed) && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMediaContent((prev) => ({
                                          ...prev,
                                          secondaryImages: [],
                                        }));
                                        setSecondaryImages([]);
                                        setYoutubeEmbed(null);
                                      }}
                                      className="text-xs border-green-300 text-green-600 hover:bg-green-50"
                                    >
                                      Clear All
                                    </Button>
                                  )}
                                </div>

                                {selectedMediaContent.secondaryImages.length >
                                  0 || youtubeEmbed ? (
                                  <div className="space-y-3">
                                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded border">
                                      💡 These images and videos will appear
                                      throughout your content to support the
                                      main topic
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {/* Secondary Images - FIXED: Use selectedMediaContent.secondaryImages to prevent duplication */}
                                      {selectedMediaContent.secondaryImages.map(
                                        (image, index) => (
                                          <div
                                            key={image.id}
                                            className="relative group"
                                          >
                                            <ShopifyImageViewer
                                              src={
                                                image.src?.medium || image.url
                                              }
                                              alt={
                                                image.alt ||
                                                `Secondary image ${index + 1}`
                                              }
                                              className="w-full h-24 object-cover rounded-md border-2 border-green-300 shadow-sm"
                                            />
                                            <div className="absolute top-1 right-1">
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="h-5 w-5 rounded-full opacity-80 hover:opacity-100"
                                                onClick={() => {
                                                  // FIXED: Remove from selectedMediaContent instead of secondaryImages to prevent duplication
                                                  setSelectedMediaContent(
                                                    (prev) => ({
                                                      ...prev,
                                                      secondaryImages:
                                                        prev.secondaryImages.filter(
                                                          (img) =>
                                                            img.id !== image.id,
                                                        ),
                                                    }),
                                                  );
                                                  // Also sync the secondaryImages state
                                                  setSecondaryImages((prev) =>
                                                    prev.filter(
                                                      (img) =>
                                                        img.id !== image.id,
                                                    ),
                                                  );
                                                }}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <div className="absolute bottom-1 left-1">
                                              <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-medium">
                                                #{index + 1}
                                              </span>
                                            </div>
                                            {image.source && (
                                              <div className="absolute top-1 left-1">
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs px-1 py-0.5"
                                                >
                                                  {image.source}
                                                </Badge>
                                              </div>
                                            )}
                                          </div>
                                        ),
                                      )}

                                      {/* YouTube Video - Using youtubeEmbed state instead of selectedMediaContent */}
                                      {youtubeEmbed && (
                                        <div className="relative group">
                                          <div className="w-full h-24 border-2 border-green-300 rounded-md overflow-hidden shadow-sm relative">
                                            {(() => {
                                              // Extract video ID from YouTube URL and construct thumbnail URL
                                              const videoIdMatch =
                                                youtubeEmbed.match(
                                                  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
                                                );
                                              const videoId = videoIdMatch
                                                ? videoIdMatch[1]
                                                : null;
                                              const thumbnailUrl = videoId
                                                ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                                                : null;

                                              return thumbnailUrl ? (
                                                <>
                                                  <img
                                                    src={thumbnailUrl}
                                                    alt="YouTube video thumbnail"
                                                    className="w-full h-full object-cover"
                                                  />
                                                  {/* Play button overlay - only show when thumbnail exists */}
                                                  <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-8 h-8 bg-blue-600 bg-opacity-80 rounded-full flex items-center justify-center shadow-lg">
                                                      <span className="text-white text-xs ml-0.5">
                                                        ▶
                                                      </span>
                                                    </div>
                                                  </div>
                                                </>
                                              ) : (
                                                <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                                                  <div className="text-center">
                                                    <div className="w-8 h-8 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-1">
                                                      <span className="text-white text-xs">
                                                        ▶️
                                                      </span>
                                                    </div>
                                                    <p className="text-xs text-blue-700 font-medium">
                                                      YouTube
                                                    </p>
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>

                                          <div className="absolute top-1 right-1">
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="icon"
                                              className="h-5 w-5 rounded-full opacity-80 hover:opacity-100"
                                              onClick={() =>
                                                setYoutubeEmbed(null)
                                              }
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          <div className="absolute bottom-1 left-1">
                                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium">
                                              Video
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Add more content button */}
                                    <div className="text-center pt-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setImageTab("secondary");
                                          setImageSource("unified_search");
                                          setShowImageDialog(true);
                                        }}
                                        className="border-green-300 text-green-600 hover:bg-green-50"
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add More Content
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed border-green-200">
                                    <ImageIcon className="h-12 w-12 mx-auto text-green-300 mb-2" />
                                    <p className="text-sm font-medium text-green-600 mb-1">
                                      No Secondary Content Selected
                                    </p>
                                    <p className="text-xs text-green-500 mb-3">
                                      Add images and videos to support your main
                                      content
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setImageTab("secondary");
                                        setImageSource("unified_search");
                                        setShowImageDialog(true);
                                      }}
                                      className="border-green-300 text-green-600 hover:bg-green-50"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add Secondary Content
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setWorkflowStep("title");
                            scrollToCurrentStep();
                          }}
                        >
                          Back to Title
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            // Check if products are still selected
                            if (selectedProducts.length === 0) {
                              toast({
                                title: "Products Required",
                                description:
                                  "You removed products but they are required for content generation. Please select products first.",
                                variant: "destructive",
                              });
                              setWorkflowStep("product");
                              scrollToCurrentStep();
                              return;
                            }

                            // Show YouTube video prompt alert if no YouTube video is currently selected
                            if (!youtubeEmbed) {
                              const shouldAddYouTube = window.confirm(
                                "Do you also want to add a YouTube video?\n\nYouTube videos can enhance engagement and provide additional value to your content.",
                              );

                              if (shouldAddYouTube) {
                                // Open the Choose Media Dialog with YouTube tab
                                setImageTab("youtube");
                                setShowImageDialog(true);
                                return; // Don't proceed to next step yet
                              }
                            }

                            // Continue to author selection step
                            setWorkflowStep("author");
                            scrollToCurrentStep();
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Step 7: Author Selection Section */}
                  <div
                    className={`max-w-5xl mx-auto ${
                      workflowStep === "author" ? "block" : "hidden"
                    }`}
                    data-step="author"
                  >
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                        Choose Author
                      </h2>
                      <p className="text-sm text-center text-blue-600">
                        Select an author for this content or create a new one
                      </p>
                    </div>

                    <AuthorSelector
                      selectedAuthorId={selectedAuthorId}
                      onAuthorSelect={handleAuthorSelected}
                    />

                    {/* Gender Field - Moved from Content Style */}
                    <div className="mt-6">
                      <FormField
                        control={form.control}
                        name="contentGender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              key={`contentGender-${formKey}-${field.value}`}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="neutral">Neutral</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose the gender orientation for your content
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAuthorSelectionBack}
                      >
                        Back to Media
                      </Button>

                      <Button
                        type="button"
                        disabled={!selectedAuthorId}
                        onClick={() => {
                          // Move to Style & Formatting step
                          setWorkflowStep("content");
                          scrollToCurrentStep();

                          toast({
                            title: "Author Selected",
                            description:
                              "Now review and customize your style and formatting options.",
                          });
                        }}
                      >
                        Next to Style & Formatting
                      </Button>
                    </div>
                  </div>

                  {/* Step 8: Style and formatting section - Only shown in content step */}
                  <div
                    className={`max-w-5xl mx-auto space-y-4 pt-4 ${workflowStep === "content" ? "block" : "hidden"}`}
                    data-step="content"
                  >
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                        Style & Formatting
                      </h2>
                      <p className="text-sm text-center text-blue-600">
                        Customize how your content will look and feel
                      </p>
                    </div>

                    {/* Content Generation Options */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="articleLength"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Article Length</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                console.log("🔍 Article length changed to:", value);
                                field.onChange(value);
                                setArticleLength(value);
                              }}
                              value={field.value}
                              key={`articleLength-${formKey}-${field.value}`}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select article length" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="short">
                                  Short (~800 Words)
                                </SelectItem>
                                <SelectItem value="medium">
                                  Medium (~1200 Words)
                                </SelectItem>
                                <SelectItem value="long">
                                  Long (~1800 Words)
                                </SelectItem>
                                <SelectItem value="comprehensive">
                                  Comprehensive (~3000 Words)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Determines the detail and depth of the content
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="headingsCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Sections</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              key={`headingsCount-${formKey}-${field.value}`}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Number of H2 headings" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="2">2 Sections</SelectItem>
                                <SelectItem value="3">3 Sections</SelectItem>
                                <SelectItem value="4">4 Sections</SelectItem>
                                <SelectItem value="5">5 Sections</SelectItem>
                                <SelectItem value="6">6 Sections</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Controls how many H2 headings in the article
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Content Style Selector - RESTORED */}
                    <div className="mb-6">
                      <FormLabel className="mb-2 block">
                        Content Style
                      </FormLabel>
                      <ContentStyleSelector
                        key={`content-style-${selectedContentToneId || "empty"}-${formKey}`}
                        initialToneId={selectedContentToneId || ""}
                        onSelectionChange={(toneId, displayName) => {
                          console.log(
                            "ContentStyleSelector selection changed:",
                            { toneId, displayName },
                          );
                          setSelectedContentToneId(toneId);
                          setSelectedContentDisplayName(displayName);
                        }}
                        className="mt-2"
                      />
                      {selectedContentDisplayName && (
                        <div className="text-sm text-blue-600 mt-2 font-medium">
                          Selected: {selectedContentDisplayName}
                        </div>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="writingPerspective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Writing Perspective</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            key={`writingPerspective-${formKey}-${field.value}`}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select perspective" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="first_person_singular">
                                First Person Singular (I, me, my, mine)
                              </SelectItem>
                              <SelectItem value="first_person_plural">
                                First Person Plural (we, us, our, ours)
                              </SelectItem>
                              <SelectItem value="second_person">
                                Second Person (you, your, yours)
                              </SelectItem>
                              <SelectItem value="third_person">
                                Third Person (he, she, it, they)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="toneOfVoice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tone of Voice</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            key={`toneOfVoice-${formKey}-${field.value}`}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="professional">
                                Professional
                              </SelectItem>
                              <SelectItem value="empathetic">
                                Empathetic
                              </SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="excited">Excited</SelectItem>
                              <SelectItem value="formal">Formal</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="humorous">Humorous</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="introType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Introduction Style</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "search_intent"}
                            key={`introType-${formKey}-${field.value}`}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select intro style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="search_intent">
                                Search Intent Focused (Recommended)
                              </SelectItem>
                              <SelectItem value="standard">
                                Standard Introduction
                              </SelectItem>
                              <SelectItem value="none">
                                No Introduction
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="faqType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>FAQ Section</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select FAQ style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                No FAQ Section
                              </SelectItem>
                              <SelectItem value="short">
                                Short FAQ (3-5 Q&A)
                              </SelectItem>
                              <SelectItem value="long">
                                Long FAQ (5-7 Q&A)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="enableTables"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable Tables</FormLabel>
                              <FormDescription>
                                Use comparison tables
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enableLists"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable Lists</FormLabel>
                              <FormDescription>
                                Use bullet points
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enableH3s"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable H3 Headings</FormLabel>
                              <FormDescription>
                                Use sub-headings
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enableCitations"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable Citations</FormLabel>
                              <FormDescription>
                                Add external links
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Products & Collections section - Temporarily commented out to fix display issues
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-500" />
                        Products & Collections
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select products and collections to feature in your content
                      </p>
                      
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="productIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Featured Products</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={productsQuery.data?.products.map(product => ({
                                    label: product.title,
                                    value: product.id
                                  })) || []}
                                  selected={Array.isArray(field.value) ? field.value : []}
                                  onChange={(selected) => {
                                    setSelectedProducts(selected);
                                    field.onChange(selected);
                                    console.log("Products selected:", selected);
                                  }}
                                  placeholder="Select products to feature in content..."
                                />
                              </FormControl>
                              <div className="text-sm text-muted-foreground m-0 mt-1">
                                Products will be mentioned and linked in your content
                                {Array.isArray(field.value) && field.value.length > 0 && (
                                  <div className="font-medium text-foreground mt-1">
                                    {field.value.length} product(s) selected
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="collectionIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Featured Collections</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={collectionsQuery.data?.collections.map(collection => ({
                                    label: collection.title,
                                    value: collection.id
                                  })) || []}
                                  selected={Array.isArray(field.value) ? field.value : []}
                                  onChange={(selected) => {
                                    setSelectedCollections(selected);
                                    field.onChange(selected);
                                    console.log("Collections selected:", selected);
                                  }}
                                  placeholder="Select collections to feature in content..."
                                />
                              </FormControl>
                              <div className="text-sm text-muted-foreground m-0 mt-1">
                                Collections will be mentioned and linked in your content
                                {Array.isArray(field.value) && field.value.length > 0 && (
                                  <div className="font-medium text-foreground mt-1">
                                    {field.value.length} collection(s) selected
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    */}

                  <div className="space-y-4 pt-4">
                    {/* OLD: Removed - ImageSearchDialog moved to bottom */}
                  </div>

                  {/* Sticky Generate Content button fixed to bottom of screen */}
                  <div className="sticky bottom-6 left-0 right-0 mt-8 z-10  mx-auto max-w-5xl  ">
                    <div className="bg-white/90 backdrop-blur-sm  p-4 rounded-lg shadow-lg border border-gray-200">
                      {/* Progress indicator and validation status */}
                      {!isReadyToGenerateContent() && (
                        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-amber-800">
                                Complete Required Steps
                              </p>
                              <p className="text-xs text-amber-700 mt-1">
                                Missing: {getIncompleteSteps().filter(step => step !== "0").join(", ")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image Selection Dialog */}
                      <ImageSearchDialog
                        open={showImageDialog}
                        onOpenChange={setShowImageDialog}
                        onImagesSelected={(images) => {
                          setSelectedImages(images);
                          toast({
                            title: `${images.length} image(s) selected`,
                            description:
                              "Images will be included in your content",
                          });
                        }}
                        initialSelectedImages={selectedImages}
                        selectedKeywords={selectedKeywords.map((k) => ({
                          keyword: k.keyword,
                          isMainKeyword: k === selectedKeywords[0], // First keyword is main
                        }))}
                      />

                      <div className="max-w-5xl mx-auto">
                        <div className="flex gap-3">
                          {/* Generate Content Button */}
                        <Button
                          type="button"
                          className={cn(
                            "flex-1 transition-all duration-200",
                            !isReadyToGenerateContent() && !isGenerating
                              ? "opacity-50 cursor-not-allowed"
                              : "opacity-100",
                          )}
                          disabled={isGenerating || !isReadyToGenerateContent()}
                          onClick={() => {
                            if (isReadyToGenerateContent()) {
                              // Manually trigger form submission first
                              const values = form.getValues();
                              console.log(
                                "Manual form submission triggered with values:",
                                values,
                              );
                              console.log("🔍 BUTTON CLICK - Article length from form.getValues():", values.articleLength);
                              console.log("🔍 BUTTON CLICK - Article length state variable:", articleLength);
                              handleSubmit(values);

                              // Immediately scroll to Content Preview section when Generate button is clicked
                              setTimeout(() => {
                                if (contentPreviewRef.current) {
                                  contentPreviewRef.current.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                  console.log("✅ Immediate scroll to Content Preview on button click");
                                }
                              }, 100);
                            }
                          }}
                          title={
                            !isReadyToGenerateContent()
                              ? `Please complete: ${getIncompleteSteps().join(", ")}`
                              : "Generate content with current settings"
                          }
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating Content...
                            </>
                          ) : isReadyToGenerateContent() ? (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Content
                            </>
                          ) : (
                            <>
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Complete All Steps
                            </>
                          )}
                        </Button>
                        </div>
                      </div>

                      {/* Completion checklist for ready state */}
                      {isReadyToGenerateContent() && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <p className="text-xs text-green-700 font-medium">
                              Ready to generate content
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Content Preview Section - Full Width */}
          {(isGenerating || generatedContent) && (
            <Card className="border-0 shadow-lg mt-8   mx-auto max-w-5xl" ref={contentPreviewRef}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">Content Preview</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Preview of your generated content
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <div className="absolute inset-0 rounded-full bg-blue-100 animate-pulse opacity-20"></div>
                  </div>
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    Creating amazing article for you...
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We are creating something amazing for you
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="animate-pulse">⚡</div>
                    <span>This usually takes 30-60 seconds</span>
                  </div>
                </div>
              ) : generatedContent ? (
                <div className="space-y-6">
                  {/* Article/Page Title Section */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Article Title
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newTitle = prompt(
                            "Edit title:",
                            generatedContent.title || "",
                          );
                          if (newTitle !== null) {
                            setGeneratedContent((prev) => ({
                              ...prev,
                              title: newTitle,
                            }));
                          }
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                      {generatedContent.title || "Untitled"}
                    </h1>
                  </div>

                  {/* Featured Image Section */}
                  {(primaryImages.length > 0 ||
                    selectedMediaContent.primaryImage) && (
                    <div className="border-b border-gray-200 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Featured Image
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImageTab("primary");
                            setImageSource("unified_search");
                            setShowImageDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Change
                        </Button>
                      </div>
                      <div className="relative aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        <img
                          src={
                            primaryImages[0]?.url ||
                            selectedMediaContent.primaryImage?.url ||
                            primaryImages[0]?.src?.medium ||
                            primaryImages[0]?.src?.large
                          }
                          alt={
                            primaryImages[0]?.alt ||
                            selectedMediaContent.primaryImage?.alt ||
                            "Featured image"
                          }
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            // If image fails to load, try alternative sources
                            const target = e.target as HTMLImageElement;
                            const image =
                              primaryImages[0] ||
                              selectedMediaContent.primaryImage;
                            if (
                              image?.src?.large &&
                              target.src !== image.src.large
                            ) {
                              target.src = image.src.large;
                            } else if (
                              image?.src?.small &&
                              target.src !== image.src.small
                            ) {
                              target.src = image.src.small;
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Featured
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This image will appear at the top of your published
                        content
                      </p>
                    </div>
                  )}

                  {/* Reading Time Section */}
                  {generatedContent.content && (
                    <div className="border-b border-gray-200 pb-4">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-blue-900">
                            {calculateReadingTime(generatedContent.content)} min
                            read
                          </div>
                          <div className="text-xs text-blue-700">
                            Based on average reading speed of 225 words per
                            minute
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content Statistics Section */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                      <div className="mb-2 font-medium">Content Statistics:</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>Characters: {((enhancedContentForEditor && enhancedContentForEditor.trim() !== "") ? enhancedContentForEditor : generatedContent.content || "").length}</div>
                        <div>Words: {((enhancedContentForEditor && enhancedContentForEditor.trim() !== "") ? enhancedContentForEditor : generatedContent.content || "").replace(/<[^>]*>/g, "").split(/\s+/).filter(word => word.length > 0).length}</div>
                        <div>Reading time: {calculateReadingTime((enhancedContentForEditor && enhancedContentForEditor.trim() !== "") ? enhancedContentForEditor : generatedContent.content || "")} min</div>
                        <div>Images: {(((enhancedContentForEditor && enhancedContentForEditor.trim() !== "") ? enhancedContentForEditor : generatedContent.content || "").match(/<img[^>]*>/g) || []).length}</div>
                      </div>
                    </div>
                  </div>

                  {/* Shopify-Compatible Content Editor Section */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Content Body
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Copy clean HTML content to clipboard
                            const contentToCopy = (enhancedContentForEditor && enhancedContentForEditor.trim() !== "") 
                              ? enhancedContentForEditor 
                              : generatedContent.content || "";
                            navigator.clipboard.writeText(contentToCopy);
                            toast({
                              title: "Content copied",
                              description:
                                "Raw HTML content copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy HTML
                        </Button>
                      </div>
                    </div>

                    {/* Draggable Resizable Content Editor */}
                    <div 
                      className="w-full border border-gray-200 rounded-lg resize-both overflow-hidden"
                      style={{ 
                        resize: 'both', 
                        minHeight: '400px', 
                        height: '600px',
                        minWidth: '300px',
                        width: '100%',
                        maxHeight: '80vh'
                      }}
                    >
                      <SimpleHTMLEditor
                        content={
                          (enhancedContentForEditor && enhancedContentForEditor.trim() !== "") 
                            ? enhancedContentForEditor 
                            : generatedContent.content || ""
                        }
                        onChange={(newContent) => {
                          console.log(
                            "SimpleHTMLEditor content updated:",
                            newContent.length,
                            "characters",
                          );
                          // Update both the raw content and processed content
                          setGeneratedContent((prev) => ({
                            ...prev,
                            rawContent: newContent,
                            content: newContent, // Use the same content for both
                          }));
                          setEnhancedContentForEditor(newContent);
                          // Trigger immediate real-time preview update
                          setContentUpdateCounter((prev) => prev + 1);
                        }}
                        className="w-full h-full border-0"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Content Tags Section - Only show for blog posts, not pages */}
                  {form.getValues("articleType") === "blog" && (
                    <div className="border-b border-gray-200 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Content Tags
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newTags = prompt(
                              "Edit tags (comma-separated):",
                              (generatedContent.tags || []).join(", "),
                            );
                            if (newTags !== null) {
                              setGeneratedContent((prev) => ({
                                ...prev,
                                tags: newTags
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter((tag) => tag.length > 0),
                              }));
                            }
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(generatedContent.tags || []).map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                        {(!generatedContent.tags ||
                          generatedContent.tags.length === 0) && (
                          <p className="text-sm text-muted-foreground">
                            No tags assigned
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meta Title Section */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Meta Title
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isOptimizingMetaTitle}
                          onClick={async () => {
                            try {
                              setIsOptimizingMetaTitle(true);

                              // Gather context for AI optimization
                              const formData = form.getValues();
                              const currentTitle = generatedContent.title || "";
                              const currentContent =
                                generatedContent.content || "";
                              const keywords = formData.keywords || [];
                              const targetAudience =
                                formData.buyerPersonas || "";
                              const tone =
                                formData.toneOfVoice || "professional";
                              const region = "us"; // Default region

                              console.log(
                                "Triggering AI meta title optimization...",
                              );

                              // Call the AI optimization endpoint for META TITLE ONLY
                              const response = await fetch(
                                "/api/optimize-meta-title",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    title: currentTitle,
                                    content: currentContent,
                                    keywords: keywords,
                                    targetAudience: targetAudience,
                                    tone: tone,
                                    region: region,
                                  }),
                                },
                              );

                              if (!response.ok) {
                                throw new Error(
                                  "Failed to optimize meta title",
                                );
                              }

                              const result = await response.json();

                              if (result.success) {
                                // Update ONLY meta title from AI response
                                setGeneratedContent((prev) => ({
                                  ...prev,
                                  metaTitle: result.metaTitle,
                                }));
                                console.log("AI optimization successful");
                              } else {
                                throw new Error(
                                  result.error || "Optimization failed",
                                );
                              }
                            } catch (error) {
                              console.error("Meta optimization error:", error);
                              // Fallback to simple truncation
                              const originalTitle =
                                generatedContent.title || "";
                              let optimizedTitle = originalTitle;

                              if (originalTitle.length > 60) {
                                const truncated = originalTitle.substring(
                                  0,
                                  57,
                                );
                                const lastSpace = truncated.lastIndexOf(" ");
                                optimizedTitle =
                                  lastSpace > 0
                                    ? truncated.substring(0, lastSpace) + "..."
                                    : truncated + "...";
                              }

                              setGeneratedContent((prev) => ({
                                ...prev,
                                metaTitle: optimizedTitle,
                              }));
                            } finally {
                              setIsOptimizingMetaTitle(false);
                            }
                          }}
                        >
                          {isOptimizingMetaTitle ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-1"></div>
                              Optimizing...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              Auto-Optimize
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          value={
                            generatedContent.metaTitle ||
                            generatedContent.title ||
                            ""
                          }
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 70); // Hard limit at 70 chars
                            setGeneratedContent((prev) => ({
                              ...prev,
                              metaTitle: value,
                            }));
                          }}
                          placeholder={
                            isOptimizingMetaTitle
                              ? "AI is optimizing your meta title..."
                              : "Enter SEO-optimized meta title..."
                          }
                          disabled={isOptimizingMetaTitle}
                          className={`pr-16 ${
                            isOptimizingMetaTitle
                              ? "bg-gray-50"
                              : (
                                    generatedContent.metaTitle ||
                                    generatedContent.title ||
                                    ""
                                  ).length > 60
                                ? "border-red-300 focus:border-red-500"
                                : "border-green-300 focus:border-green-500"
                          }`}
                        />
                        {isOptimizingMetaTitle && (
                          <div className="absolute left-3 top-2.5">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                          </div>
                        )}
                        <div
                          className={`absolute right-3 top-2.5 text-xs font-medium ${
                            (
                              generatedContent.metaTitle ||
                              generatedContent.title ||
                              ""
                            ).length > 60
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {
                            (
                              generatedContent.metaTitle ||
                              generatedContent.title ||
                              ""
                            ).length
                          }
                          /60
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        {(
                          generatedContent.metaTitle ||
                          generatedContent.title ||
                          ""
                        ).length > 60 && (
                          <p className="text-red-600 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Too long for optimal SEO display
                          </p>
                        )}
                        {(
                          generatedContent.metaTitle ||
                          generatedContent.title ||
                          ""
                        ).length >= 50 &&
                          (
                            generatedContent.metaTitle ||
                            generatedContent.title ||
                            ""
                          ).length <= 60 && (
                            <p className="text-green-600 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Perfect length for SEO
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Meta Description Section */}
                  <div className="border-b border-gray-200 pb-4 mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Meta Description
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isOptimizingMetaDescription}
                          onClick={async () => {
                            try {
                              setIsOptimizingMetaDescription(true);

                              // Gather context for AI optimization
                              const formData = form.getValues();
                              const currentTitle = generatedContent.title || "";
                              const currentContent =
                                generatedContent.content || "";
                              const keywords = formData.keywords || [];
                              const targetAudience =
                                formData.buyerPersonas || "";
                              const tone =
                                formData.toneOfVoice || "professional";
                              const region = "us"; // Default region

                              console.log(
                                "Triggering AI meta description optimization...",
                              );

                              // Call the AI optimization endpoint for META DESCRIPTION ONLY
                              const response = await fetch(
                                "/api/optimize-meta-description",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    title: currentTitle,
                                    content: currentContent,
                                    keywords: keywords,
                                    targetAudience: targetAudience,
                                    tone: tone,
                                    region: region,
                                  }),
                                },
                              );

                              if (!response.ok) {
                                throw new Error(
                                  "Failed to optimize meta description",
                                );
                              }

                              const result = await response.json();

                              if (result.success) {
                                // Update ONLY meta description from AI response
                                setGeneratedContent((prev) => ({
                                  ...prev,
                                  metaDescription: result.metaDescription,
                                }));
                                console.log(
                                  "AI meta description optimization successful",
                                );
                              } else {
                                throw new Error(
                                  result.error || "Optimization failed",
                                );
                              }
                            } catch (error) {
                              console.error(
                                "Meta description optimization error:",
                                error,
                              );

                              // Show user that AI optimization failed and they should try again or manually edit
                              toast({
                                title: "AI Optimization Failed",
                                description:
                                  "Unable to optimize meta description with AI. Please try again or edit manually.",
                                variant: "destructive",
                              });

                              // Don't set a poor fallback - let user know they need to handle it manually
                              console.log(
                                "AI meta description optimization failed, user should try again or edit manually",
                              );
                            } finally {
                              setIsOptimizingMetaDescription(false);
                            }
                          }}
                        >
                          {isOptimizingMetaDescription ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-1"></div>
                              Optimizing...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              Auto-Optimize
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <textarea
                          value={generatedContent.metaDescription || ""}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 160); // Hard limit at 160 chars
                            setGeneratedContent((prev) => ({
                              ...prev,
                              metaDescription: value,
                            }));
                          }}
                          placeholder={
                            isOptimizingMetaDescription
                              ? "AI is optimizing your meta description..."
                              : "Enter SEO-optimized meta description..."
                          }
                          disabled={isOptimizingMetaDescription}
                          rows={3}
                          className={`w-full pr-16 resize-none ${
                            isOptimizingMetaDescription
                              ? "bg-gray-50"
                              : (generatedContent.metaDescription || "")
                                    .length > 160
                                ? "border-red-300 focus:border-red-500"
                                : "border-green-300 focus:border-green-500"
                          } rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500`}
                        />
                        {isOptimizingMetaDescription && (
                          <div className="absolute left-3 top-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                          </div>
                        )}
                        <div
                          className={`absolute right-3 top-3 text-xs font-medium ${
                            (generatedContent.metaDescription || "").length >
                            160
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {(generatedContent.metaDescription || "").length}/160
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        {(generatedContent.metaDescription || "").length >
                          160 && (
                          <p className="text-red-600 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Too long for optimal SEO display
                          </p>
                        )}
                        {(generatedContent.metaDescription || "").length <=
                          160 &&
                          (generatedContent.metaDescription || "").length >
                            0 && (
                            <p className="text-green-600 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Perfect length for SEO
                            </p>
                          )}
                        {(generatedContent.metaDescription || "").length <
                          120 &&
                          (generatedContent.metaDescription || "").length >
                            0 && (
                            <p className="text-yellow-600 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Consider adding more detail for better SEO
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Publication Section - Appears right after meta description */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Publication Settings</CardTitle>
                      <CardDescription>
                        Choose how to publish your content
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Publication Status Dropdown */}
                        <div className="space-y-2">
                          <Label htmlFor="publication-status">
                            Publication Status
                          </Label>
                          <Select
                            onValueChange={(
                              value: "draft" | "publish" | "schedule",
                            ) => {
                              setPublicationMethod(value);
                              // Clear scheduling fields if not scheduling
                              if (value !== "schedule") {
                                form.setValue("scheduledPublishDate", "");
                                form.setValue("scheduledPublishTime", "09:30");
                              }
                              // Update form fields for compatibility
                              form.setValue(
                                "postStatus",
                                value === "publish" ? "publish" : "draft",
                              );
                              form.setValue("publicationType", value);
                            }}
                            value={publicationMethod}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Save as Draft" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">
                                Save as Draft
                              </SelectItem>
                              <SelectItem value="publish">
                                Publish Immediately
                              </SelectItem>
                              <SelectItem value="schedule">
                                Schedule Publication
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">
                            Choose whether to publish immediately or save as
                            draft. Use scheduling below to set a future
                            publication date.
                          </p>
                        </div>

                        {/* Scheduling Block - only visible when "Schedule Publication" is selected */}
                        {publicationMethod === "schedule" && (
                          <div className="rounded-md border border-slate-200 p-4 bg-blue-50/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <CalendarCheck className="h-5 w-5 text-blue-600" />
                              <Label className="text-lg font-medium">
                                Set a Future Date/Time
                              </Label>
                            </div>
                            <p className="mb-4 text-sm text-gray-600">
                              Set a future date and time to automatically
                              publish your content.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm">
                                  Publication Date
                                </Label>
                                <Input
                                  type="date"
                                  value={
                                    form.watch("scheduledPublishDate") || ""
                                  }
                                  onChange={(e) =>
                                    form.setValue(
                                      "scheduledPublishDate",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full"
                                  min={new Date().toISOString().split("T")[0]}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">
                                  Publication Time
                                </Label>
                                <Input
                                  type="time"
                                  value={
                                    form.watch("scheduledPublishTime") ||
                                    "09:30"
                                  }
                                  onChange={(e) =>
                                    form.setValue(
                                      "scheduledPublishTime",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Single Proceed Button */}
                        <Button
                          type="button"
                          onClick={() => {
                            if (
                              publicationMethod === "schedule" &&
                              !form.getValues("scheduledPublishDate")
                            ) {
                              toast({
                                title: "Date Required",
                                description:
                                  "Please select a publication date for scheduling.",
                                variant: "destructive",
                              });
                              return;
                            }
                            handlePublishContent(publicationMethod);
                          }}
                          disabled={isPublishing || isGenerating}
                          className="w-full"
                        >
                          {isPublishing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              {publicationMethod === "draft" && (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Proceed (Save as Draft)
                                </>
                              )}
                              {publicationMethod === "publish" && (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Proceed (Publish Immediately)
                                </>
                              )}
                              {publicationMethod === "schedule" && (
                                <>
                                  <CalendarCheck className="mr-2 h-4 w-4" />
                                  Proceed (Schedule Publication)
                                </>
                              )}
                            </>
                          )}
                        </Button>

                        {/* Save Project Button - Always enabled */}
                        <Button
                          variant="outline"
                          onClick={handleSaveProject}
                          disabled={saveProjectMutation.isPending}
                          className="w-full flex items-center gap-2 mt-3"
                        >
                          {saveProjectMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Save as Project
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Legacy Content Editor Section - Hidden for Rich Editing */}
                  <div className="space-y-4" style={{ display: "none" }}>
                    <label className="text-sm font-medium text-gray-700">
                      Content Body
                    </label>

                    {/* Visual Editor Toolbar */}
                    <div className="border border-gray-200 rounded-t-md bg-gray-50 p-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => document.execCommand("bold", false)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 font-bold"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand("italic", false)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 italic"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand("underline", false)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 underline"
                        title="Underline"
                      >
                        U
                      </button>
                      <div className="border-l border-gray-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() =>
                          document.execCommand("formatBlock", false, "h1")
                        }
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        title="Heading 1"
                      >
                        H1
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          document.execCommand("formatBlock", false, "h2")
                        }
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        title="Heading 2"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          document.execCommand("formatBlock", false, "h3")
                        }
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        title="Heading 3"
                      >
                        H3
                      </button>
                      <div className="border-l border-gray-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() =>
                          document.execCommand("insertUnorderedList", false)
                        }
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        title="Bullet List"
                      >
                        • List
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          document.execCommand("insertOrderedList", false)
                        }
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        title="Numbered List"
                      >
                        1. List
                      </button>
                      <div className="border-l border-gray-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            if (file) {
                              await handleImageUpload(file);
                            }
                          };
                          input.click();
                        }}
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        title="Insert Image"
                      >
                        📷 Image
                      </button>
                    </div>

                    {/* HTML-Preserving Content Editor */}
                    <SimpleHTMLEditor
                      key={contentEditorKey}
                      content={generatedContent.content || ""}
                      onChange={(newContent) => {
                        console.log("SimpleHTMLEditor content updated:", {
                          contentLength: newContent?.length || 0,
                          hasImages: newContent.includes("<img"),
                          hasIframes: newContent.includes("<iframe"),
                          hasTOC: newContent.includes("Table of Contents"),
                        });

                        setGeneratedContent((prev) => ({
                          ...prev,
                          content: newContent,
                        }));

                        // Force preview re-render
                        setContentUpdateCounter((prev) => prev + 1);
                      }}
                      className="border-t-0 rounded-t-none max-h-80"
                    />

                    {/* Word Count */}
                    <div className="text-xs text-gray-500 text-right">
                      Words:{" "}
                      {enhancedContentForEditor || generatedContent.content
                        ? (enhancedContentForEditor || generatedContent.content)
                            .replace(/<[^>]*>/g, "")
                            .split(/\s+/)
                            .filter((word) => word.length > 0).length
                        : 0}
                    </div>
                  </div>

                  <div className="hidden">
                    {(() => {
                      // Get content
                      const content = generatedContent.content;
                      if (!content) return <p>No content available</p>;

                      // Get YouTube data if exists
                      const youtubeUrl = form.watch("youtubeUrl");
                      let youtubeVideoId: string | null = null;
                      if (youtubeUrl) {
                        youtubeVideoId =
                          youtubeUrl.match(
                            /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
                          )?.[1] || null;
                      }

                      // Create YouTube embed component
                      const YouTubeEmbed = () => (
                        <div className="my-8 flex justify-center">
                          <iframe
                            width="560"
                            height="315"
                            src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                            title="YouTube video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="rounded-md border border-gray-200"
                          />
                        </div>
                      );

                      // Check if content has YouTube placeholder
                      const hasYoutubePlaceholder = content.includes(
                        "[YOUTUBE_EMBED_PLACEHOLDER]",
                      );

                      // If content has placeholder, split and insert YouTube
                      if (youtubeVideoId && hasYoutubePlaceholder) {
                        const parts = content.split(
                          "[YOUTUBE_EMBED_PLACEHOLDER]",
                        );
                        return (
                          <div className="content-preview prose prose-blue max-w-none">
                            {parts[0] && (
                              <div
                                dangerouslySetInnerHTML={{ __html: parts[0] }}
                              />
                            )}
                            <YouTubeEmbed />
                            {parts[1] && (
                              <div
                                dangerouslySetInnerHTML={{ __html: parts[1] }}
                              />
                            )}
                          </div>
                        );
                      }

                      // Get secondary images, excluding any that match the primary image to prevent duplication
                      const primaryImageId =
                        selectedMediaContent.primaryImage?.id ||
                        primaryImages[0]?.id;
                      const secondaryImages = (
                        generatedContent.secondaryImages || []
                      ).filter((img) => img.id !== primaryImageId);

                      // Check for image tags in content
                      const hasImageTags = content.includes("<img");

                      // If content has no YouTube placeholder but has secondary images or image tags
                      if (secondaryImages.length > 0 || hasImageTags) {
                        // Always consider content as having proper images
                        // This ensures embedded images are always preserved
                        const hasProperImages = true;

                        if (hasProperImages) {
                          // Enhanced processing for all content with images
                          let enhancedContent = content;

                          // Process all <a> tags with embedded images to ensure they display properly and are clickable
                          enhancedContent = enhancedContent.replace(
                            /<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>(\s*)<img([^>]*?)src=["']([^"']+)["']([^>]*?)>(\s*)<\/a>/gi,
                            (
                              match,
                              href,
                              prespace,
                              imgAttr,
                              src,
                              imgAttrEnd,
                              postspace,
                            ) => {
                              // Ensure src is absolute URL
                              let fixedSrc = src;
                              if (!src.startsWith("http")) {
                                fixedSrc = "https://" + src;
                              } else if (src.startsWith("//")) {
                                fixedSrc = "https:" + src;
                              }

                              // Make sure the image is inside an <a> tag and properly styled - preserve 600x600 for secondary images
                              const isSecondaryImage =
                                imgAttr.includes("width: 600px") ||
                                imgAttr.includes("height: 600px");
                              const imageStyle = isSecondaryImage
                                ? "width: 600px; height: 600px; object-fit: cover; margin: 0 auto; display: block; border-radius: 8px; cursor: pointer;"
                                : "max-width: 100%; max-height: 400px; object-fit: contain; margin: 0 auto; display: block; border-radius: 4px; cursor: pointer;";
                              return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; margin: 1.5rem 0;" class="product-link">${prespace}<img${imgAttr}src="${fixedSrc}"${imgAttrEnd} style="${imageStyle}">${postspace}</a>`;
                            },
                          );

                          // Convert standalone images to be wrapped in product links when possible
                          // First find images without surrounding <a> tags
                          const imgRegex =
                            /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi;
                          const matches = Array.from(
                            enhancedContent.matchAll(imgRegex),
                          );

                          // Get products if available
                          const products = selectedProducts || [];

                          // Process each standalone image
                          matches.forEach((match) => {
                            // Skip if the image is already inside an <a> tag
                            const fullMatch = match[0];
                            const beforeMatch = enhancedContent.substring(
                              0,
                              match.index,
                            );
                            const afterMatch = enhancedContent.substring(
                              match.index + fullMatch.length,
                            );

                            // Check if this image is already in an <a> tag
                            const isInLink =
                              beforeMatch.lastIndexOf("<a") >
                                beforeMatch.lastIndexOf("</a>") &&
                              (afterMatch.indexOf("</a>") <
                                afterMatch.indexOf("<a") ||
                                afterMatch.indexOf("<a") === -1);

                            if (!isInLink) {
                              // This is a standalone image, try to wrap it in a product link
                              const imgElement = fullMatch;
                              const imgSrc = match[2];

                              // Normalize the img source for comparison
                              let normalizedImgSrc = imgSrc;
                              // Remove http/https and domain for comparison
                              if (
                                typeof normalizedImgSrc === "string" &&
                                normalizedImgSrc.startsWith("http")
                              ) {
                                try {
                                  // Try to get just the path portion for more flexible matching
                                  const url = new URL(normalizedImgSrc);
                                  normalizedImgSrc = url.pathname;
                                } catch (e) {
                                  // If URL parsing fails, continue with the original
                                  console.log("Failed to parse URL:", imgSrc);
                                }
                              }

                              // Find a matching product if possible - with more flexible matching
                              const matchingProduct = products.find((p) => {
                                if (!p.image) return false;

                                // Try to normalize product image as well
                                let normalizedProductImg = p.image;
                                if (
                                  typeof normalizedProductImg === "string" &&
                                  normalizedProductImg.startsWith("http")
                                ) {
                                  try {
                                    const url = new URL(normalizedProductImg);
                                    normalizedProductImg = url.pathname;
                                  } catch (e) {
                                    // If URL parsing fails, continue with the original
                                  }
                                }

                                // Check if either image includes parts of the other
                                return (
                                  (typeof normalizedProductImg === "string" &&
                                    normalizedProductImg.includes(
                                      normalizedImgSrc,
                                    )) ||
                                  (typeof normalizedImgSrc === "string" &&
                                    normalizedImgSrc.includes(
                                      normalizedProductImg,
                                    ))
                                );
                              });

                              // Style the image regardless of product match - preserve 600x600 for secondary images
                              const isSecondaryImage =
                                imgElement.includes("width: 600px") ||
                                imgElement.includes("height: 600px");
                              const imageStyle = isSecondaryImage
                                ? "width: 600px; height: 600px; object-fit: cover; margin: 0 auto; display: block; border-radius: 8px; cursor: pointer;"
                                : "max-width: 100%; max-height: 400px; object-fit: contain; margin: 0 auto; display: block; border-radius: 4px; cursor: pointer;";
                              const styledImg = imgElement.replace(
                                /<img/,
                                `<img style="${imageStyle}"`,
                              );

                              // Link ALL secondary images to the first selected product, but not featured images
                              const isFeaturedImage = imgElement.includes("featured-image-container");
                              const hasSelectedProduct = products.length > 0;
                              
                              if (isSecondaryImage && !isFeaturedImage && hasSelectedProduct) {
                                // All secondary images link to the first selected product
                                const firstProduct = products[0];
                                const linkedImg = `<a href="${firstProduct.admin_url || "#"}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; margin: 1.5rem 0;" class="product-link">${styledImg}</a>`;
                                enhancedContent = enhancedContent.replace(
                                  imgElement,
                                  linkedImg,
                                );
                              } else {
                                // Featured images and images without products remain unlinked but styled
                                enhancedContent = enhancedContent.replace(
                                  imgElement,
                                  styledImg,
                                );
                              }
                            }
                          });

                          // Then process any remaining standalone images
                          enhancedContent = enhancedContent
                            // Fix relative image URLs to absolute URLs (adding https:// if missing)
                            .replace(
                              /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                              '<img$1src="https://$2"$3>',
                            )
                            // Fix image URLs that might be missing domain (starting with //)
                            .replace(
                              /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                              '<img$1src="https://$3"$4>',
                            );

                          // Wrap standalone images (those not in an <a> tag) with clickable links
                          const imgRegexStandalone =
                            /(?<!<a[^>]*?>)(<img[^>]*?src=["']([^"']+)["'][^>]*?>)(?!<\/a>)/gi;
                          enhancedContent = enhancedContent.replace(
                            imgRegexStandalone,
                            (match, imgTag, imgSrc) => {
                              // Check if this is a secondary image and we have selected products
                              const isSecondaryImage = imgTag.includes("width: 600px") || imgTag.includes("height: 600px");
                              const isFeaturedImage = imgTag.includes("featured-image-container");
                              const hasSelectedProduct = products.length > 0;
                              
                              if (isSecondaryImage && !isFeaturedImage && hasSelectedProduct) {
                                // Link secondary images to the first selected product
                                const firstProduct = products[0];
                                return `<a href="${firstProduct.admin_url || "#"}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; margin: 1.5rem 0;" class="product-link">${imgTag}</a>`;
                              } else {
                                // For featured images or when no products selected, link to image itself
                                return `<a href="${imgSrc}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; margin: 1.5rem 0;" class="image-link">${imgTag}</a>`;
                              }
                            },
                          );

                          // Log for debugging - DO NOT set state here to avoid infinite re-renders
                          console.log(
                            "Content before final processing:",
                            enhancedContent,
                          );

                          // Add styling to all remaining images that don't already have style - preserve 600×600 for secondary images
                          enhancedContent = enhancedContent.replace(
                            /<img((?![^>]*?style=["'][^"']*)[^>]*?)>/gi,
                            (match, imgAttrs) => {
                              const isSecondaryImage =
                                imgAttrs.includes('width="600"') ||
                                imgAttrs.includes('height="600"');
                              const imageStyle = isSecondaryImage
                                ? "width: 600px; height: 600px; object-fit: cover; margin: 1rem auto; display: block; cursor: pointer;"
                                : "max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block; cursor: pointer;";
                              return `<img${imgAttrs} style="${imageStyle}">`;
                            },
                          );

                          // Ensure all images have cursor pointer
                          enhancedContent = enhancedContent.replace(
                            /<img([^>]*?)style=["']([^"']*)["']([^>]*?)>/gi,
                            (match, before, style, after) => {
                              // Add cursor: pointer if it's not already there
                              const updatedStyle = style.includes("cursor:")
                                ? style
                                : style + "; cursor: pointer;";
                              return `<img${before}style="${updatedStyle}"${after}>`;
                            },
                          );

                          // Store enhanced content for potential editor use (but don't set state during render)
                          // The enhanced content is already set in the API response handler

                          // Return the enhanced content with proper image styling
                          return (
                            <div
                              className="content-preview prose prose-blue max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: enhancedContent,
                              }}
                            />
                          );
                        } else {
                          // Remove any img tags without proper src
                          let cleanedContent = content;
                          if (hasImageTags) {
                            cleanedContent = content.replace(
                              /<img[^>]*?(?!src=["'][^"']+["'])[^>]*?>/gi,
                              "",
                            );
                          }

                          // Split into paragraphs
                          const paragraphs = cleanedContent.split(/\n\n+/);
                          const result: React.ReactNode[] = [];
                          let imageIndex = 0;

                          // Process each paragraph, inserting images occasionally
                          paragraphs.forEach((para: string, i: number) => {
                            // Check if paragraph already has image tags
                            const hasImageInParagraph = para.includes("<img");

                            if (para.trim()) {
                              // Process paragraph to ensure proper image handling
                              const processedPara = para
                                // Fix relative image URLs to absolute URLs (adding https:// if missing)
                                .replace(
                                  /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                                  '<img$1src="https://$2"$3>',
                                )
                                // Fix image URLs that might be missing domain (starting with //)
                                .replace(
                                  /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                                  '<img$1src="https://$3"$4>',
                                )
                                // Add styling to all images for proper display
                                .replace(
                                  /<img([^>]*?)>/gi,
                                  '<img$1 style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">',
                                );

                              result.push(
                                <div
                                  key={`p-${i}`}
                                  dangerouslySetInnerHTML={{
                                    __html: processedPara,
                                  }}
                                />,
                              );
                            }

                            // Only insert secondary images if the paragraph doesn't already have images
                            // And do it after every 2-3 paragraphs for optimal spacing
                            if (
                              !hasImageInParagraph &&
                              (i + 1) % 2 === 0 &&
                              imageIndex < secondaryImages.length
                            ) {
                              const image = secondaryImages[imageIndex];

                              // Try to find a matching product for this image
                              let productUrl = image.productUrl || "#";

                              // Check if this image belongs to a selected product
                              const products = selectedProducts || [];
                              if (products.length > 0 && image.url) {
                                const matchingProduct = products.find(
                                  (p) =>
                                    p.image &&
                                    (p.image === image.url ||
                                      image.url?.includes(p.id)),
                                );

                                if (matchingProduct) {
                                  productUrl =
                                    matchingProduct.admin_url || productUrl;
                                }
                              }

                              result.push(
                                <div
                                  key={`img-${i}`}
                                  className="my-6 flex justify-center"
                                >
                                  <a
                                    href={productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="product-link"
                                  >
                                    <img
                                      src={
                                        image.url || (image.src?.medium ?? "")
                                      }
                                      alt={
                                        image.alt ||
                                        `Product image ${imageIndex + 1}`
                                      }
                                      style={{
                                        maxWidth: "100%",
                                        maxHeight: "400px",
                                        cursor: "pointer",
                                        objectFit: "contain",
                                        margin: "1rem auto",
                                        display: "block",
                                        borderRadius: "0.375rem",
                                      }}
                                    />
                                  </a>
                                </div>,
                              );
                              imageIndex++;
                            }

                            // Insert YouTube after first or second paragraph if not already inserted via placeholder
                            if (
                              youtubeVideoId &&
                              !hasYoutubePlaceholder &&
                              (i === 0 || i === 1)
                            ) {
                              result.push(<YouTubeEmbed key="youtube" />);
                              // Prevent multiple inserts
                              youtubeVideoId = null;
                            }
                          });

                          return (
                            <div className="content-preview prose prose-blue max-w-none">
                              {result}
                            </div>
                          );
                        }
                      }

                      // If no secondary images or YouTube placeholder, handle YouTube separately
                      if (youtubeVideoId && !hasYoutubePlaceholder) {
                        return (
                          <div className="content-preview prose prose-blue max-w-none">
                            <div
                              dangerouslySetInnerHTML={{
                                __html: content
                                  .substring(0, content.length / 3)
                                  // Fix relative image URLs to absolute URLs (adding https:// if missing)
                                  .replace(
                                    /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$2"$3>',
                                  )
                                  // Fix image URLs that might be missing domain (starting with //)
                                  .replace(
                                    /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$3"$4>',
                                  )
                                  // Add styling to all images for proper display - preserve 600×600 for secondary images
                                  .replace(
                                    /<img([^>]*?)>/gi,
                                    (match, imgAttrs) => {
                                      const isSecondaryImage =
                                        imgAttrs.includes("width: 600px") ||
                                        imgAttrs.includes("height: 600px");
                                      const imageStyle = isSecondaryImage
                                        ? "width: 600px; height: 600px; object-fit: cover; margin: 1rem auto; display: block;"
                                        : "max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;";
                                      return `<img${imgAttrs} style="${imageStyle}">`;
                                    },
                                  ),
                              }}
                            />
                            <YouTubeEmbed />
                            <div
                              dangerouslySetInnerHTML={{
                                __html: content
                                  .substring(content.length / 3)
                                  // Fix relative image URLs to absolute URLs (adding https:// if missing)
                                  .replace(
                                    /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$2"$3>',
                                  )
                                  // Fix image URLs that might be missing domain (starting with //)
                                  .replace(
                                    /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$3"$4>',
                                  )
                                  // Add styling to all images for proper display - preserve 600×600 for secondary images
                                  .replace(
                                    /<img([^>]*?)>/gi,
                                    (match, imgAttrs) => {
                                      const isSecondaryImage =
                                        imgAttrs.includes("width: 600px") ||
                                        imgAttrs.includes("height: 600px");
                                      const imageStyle = isSecondaryImage
                                        ? "width: 600px; height: 600px; object-fit: cover; margin: 1rem auto; display: block;"
                                        : "max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;";
                                      return `<img${imgAttrs} style="${imageStyle}">`;
                                    },
                                  ),
                              }}
                            />
                          </div>
                        );
                      }

                      // Default: ensure content displays correctly with embedded images
                      const processedContent = content
                        // Fix relative image URLs to absolute URLs (adding https:// if missing)
                        .replace(
                          /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                          '<img$1src="https://$2"$3>',
                        )
                        // Fix image URLs that might be missing domain (starting with //)
                        .replace(
                          /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                          '<img$1src="https://$3"$4>',
                        )
                        // Add styling to all images for proper display - preserve 600×600 for secondary images
                        .replace(/<img([^>]*?)>/gi, (match, imgAttrs) => {
                          const isSecondaryImage =
                            imgAttrs.includes("width: 600px") ||
                            imgAttrs.includes("height: 600px");
                          const imageStyle = isSecondaryImage
                            ? "width: 600px; height: 600px; object-fit: cover; margin: 1rem auto; display: block;"
                            : "max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;";
                          return `<img${imgAttrs} style="${imageStyle}">`;
                        });

                      // Return enhanced content with all embedded images properly displayed
                      return (
                        <div
                          className="content-preview prose prose-blue max-w-none"
                          dangerouslySetInnerHTML={{ __html: processedContent }}
                        />
                      );
                    })()}
                  </div>

                  {(generatedContent.contentUrl ||
                    generatedContent.shopifyUrl) && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url =
                            generatedContent.shopifyUrl ||
                            generatedContent.contentUrl;
                          window.open(url, "_blank");
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View in Shopify
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url =
                            generatedContent.shopifyUrl ||
                            generatedContent.contentUrl;
                          navigator.clipboard.writeText(url);
                          toast({
                            title: "Link copied",
                            description:
                              "Public URL has been copied to clipboard",
                            variant: "default",
                          });
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    Content will appear here after generation.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Fill out the form and click "Generate Content" to create new
                    content.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Keyword Selector Dialog */}
        <Dialog
          open={showKeywordSelector}
          onOpenChange={setShowKeywordSelector}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Keywords</DialogTitle>
              <DialogDescription>
                Generate and choose keywords to optimize your content for SEO.
                Higher search volume keywords typically attract more traffic.
              </DialogDescription>
            </DialogHeader>
            <KeywordSelector
              initialKeywords={selectedKeywords}
              onKeywordsSelected={handleKeywordsSelected}
              onClose={() => setShowKeywordSelector(false)}
              title="Generate Keywords for SEO Optimization"
              productTitle={productTitle}
              selectedProducts={selectedProducts}
              selectedCollections={selectedCollections}
            />
          </DialogContent>
        </Dialog>

        {/* Title Selector Dialog */}
        <Dialog open={showTitleSelector} onOpenChange={setShowTitleSelector}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Choose a Title</DialogTitle>
              <DialogDescription>
                Select a title that incorporates your keywords for better SEO.
              </DialogDescription>
            </DialogHeader>

            <TitleSelector
              open={showTitleSelector}
              onOpenChange={setShowTitleSelector}
              onTitleSelected={handleTitleSelected}
              selectedKeywords={selectedKeywords}
              selectedProducts={selectedProducts}
              productTitle={productTitle}
              targetAudience={form.watch("buyerPersonas")}
              buyerPersona={form.watch("buyerPersonas")}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Image Search Dialog */}
      <Dialog
        open={showImageDialog}
        onOpenChange={(open) => {
          // When dialog closes, always reset the UI to a clean state
          if (!open) {
            // Reset loading state if dialog is closed during a search
            if (isSearchingImages) {
              setIsSearchingImages(false);
            }
          }

          setShowImageDialog(open);
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader className="sticky top-0 bg-white z-10 pb-3 border-b mb-4 flex-shrink-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">Choose Media</DialogTitle>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                  {imageTab === "primary" ? (
                    <>
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">🖼️</span>
                      </div>
                      <span className="text-sm font-medium text-blue-700">
                        Selecting Featured Image
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">📷</span>
                      </div>
                      <span className="text-sm font-medium text-green-700">
                        Selecting Secondary Images
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogDescription className="mt-1">
              {imageTab === "primary" ? (
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-blue-700 text-sm">
                    Choose emotionally compelling images with human subjects to
                    feature at the top of your content
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center mb-2">
                    <Info className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-green-700 text-sm">
                      Select additional product images to appear throughout your
                      article body
                    </span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800 mb-1">
                          Selection Guidelines:
                        </p>
                        <div className="text-xs text-green-700 space-y-1">
                          <p>
                            <strong>Small article:</strong> Select 2–3 images for optimal content flow
                          </p>
                          <p>
                            <strong>Medium article:</strong> Select 3–4 images for good visual balance
                          </p>
                          <p>
                            <strong>Large article:</strong> Select 5+ images for comprehensive visual support
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            {/* Image source tabs */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant={
                  imageSource === "unified_search" ? "default" : "outline"
                }
                onClick={() => {
                  setImageSource("unified_search");
                  if (searchedImages.length === 0 && !imageSearchQuery) {
                    // Set a default search query based on selected tab
                    if (imageTab === "primary") {
                      setImageSearchQuery("happy woman using product");
                    } else {
                      setImageSearchQuery(
                        selectedProducts.length > 0
                          ? `${selectedProducts[0].title} in use`
                          : "product in use",
                      );
                    }
                  }
                }}
                className="flex-1"
              >
                <Search className="mr-0.5 h-4 w-4" />
                Search Images
                <Badge variant="secondary" className="ml-2 text-xs">
                  Pexels + Pixabay
                </Badge>
              </Button>

              <Button
                size="sm"
                variant={
                  imageSource === "product_images" ? "default" : "outline"
                }
                onClick={() => {
                  if (selectedProducts.length === 0) {
                    toast({
                      title: "No products selected",
                      description:
                        "Please select at least one product in Step 2 first.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setImageSource("product_images");
                  // Load selected product images
                  fetchProductAndVariantImages();
                }}
                className="flex-1"
              >
                <Package className="mr-0.5 h-4 w-4" />
                Product Images
              </Button>

              <Button
                size="sm"
                variant={
                  imageSource === "uploaded_images" ? "default" : "outline"
                }
                onClick={() => setImageSource("uploaded_images")}
                className="flex-1"
              >
                <ImageIcon className="mr-0.5 h-4 w-4" />
                Uploaded Images
                {searchedImages.filter((img) => img.source === "uploaded")
                  .length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {
                      searchedImages.filter((img) => img.source === "uploaded")
                        .length
                    }
                  </Badge>
                )}
              </Button>

              <div className="flex-1 flex flex-col gap-1">
                <Button
                  size="sm"
                  variant={imageSource === "upload" ? "default" : "outline"}
                  onClick={() => setImageSource("upload")}
                  className="w-full"
                >
                  <Upload className="mr-0.5 h-4 w-4" />
                  Upload Image
                </Button>
                <Button
                  size="sm"
                  variant={imageSource === "youtube" ? "default" : "outline"}
                  onClick={() => setImageSource("youtube")}
                  className="w-full"
                >
                  <FileText className="mr-0.5 h-4 w-4" />
                  YouTube Video
                </Button>
              </div>
            </div>

            {/* YouTube video embedding section */}
            {imageSource === "youtube" && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-700">
                    Add YouTube videos to embed in your content
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Label htmlFor="youtube-url">YouTube Video URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="youtube-url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="default"
                      disabled={!youtubeUrl.trim()}
                      onClick={() => {
                        // Extract video ID from YouTube URL
                        try {
                          const url = new URL(youtubeUrl);
                          let videoId = "";

                          if (url.hostname === "youtu.be") {
                            videoId = url.pathname.substring(1);
                          } else if (url.hostname.includes("youtube.com")) {
                            videoId = url.searchParams.get("v") || "";
                          }

                          if (videoId) {
                            setYoutubeVideoId(videoId);

                            // CRITICAL FIX: Only set YouTube embed, never add to secondary images
                            // Update both selectedMediaContent and the main youtubeEmbed state
                            setSelectedMediaContent((prev) => ({
                              ...prev,
                              youtubeEmbed: youtubeUrl, // Store the full URL instead of just videoId
                              // CRITICAL: Ensure no YouTube videos are in secondaryImages array
                              secondaryImages: prev.secondaryImages.filter(
                                (img) => img.type !== "youtube",
                              ),
                            }));
                            setYoutubeEmbed(youtubeUrl); // Also update the main state that secondary content uses

                            toast({
                              title: "YouTube Video Added",
                              description:
                                "YouTube video has been added to your content.",
                              variant: "default",
                            });

                            // Clear the input after adding
                            setYoutubeUrl("");
                          } else {
                            toast({
                              title: "Invalid YouTube URL",
                              description:
                                "Couldn't extract video ID from the URL",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Invalid URL",
                            description: "Please enter a valid YouTube URL",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Video
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste a YouTube video URL (like
                    https://www.youtube.com/watch?v=abcXYZ) to embed it in your
                    content.
                  </p>
                </div>

                {youtubeVideoId && (
                  <div className="mt-4 border rounded-md p-4">
                    <h4 className="text-sm font-medium mb-2 text-blue-600">
                      ✅ Video Ready to Add
                    </h4>
                    <div className="bg-muted rounded-md p-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative w-24 h-16 rounded-md overflow-hidden border-2 border-green-500 shadow-sm">
                          <img
                            src={`https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`}
                            alt="YouTube video thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-blue-600 text-white rounded-full p-2 shadow-lg">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M6 4L18 12L6 20V4Z"
                                  fill="currentColor"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            YouTube Video ID: {youtubeVideoId}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Video added successfully - will be embedded in your
                            content
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Unified Selected Images Preview - Single Row Layout - FIXED: Use selectedMediaContent to prevent duplication */}
            {(selectedMediaContent.primaryImage ||
              selectedMediaContent.secondaryImages.length > 0) && (
              <div className="mt-4 mb-4 bg-slate-50 p-3 rounded-md border">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium">
                    Your Selected Images (
                    {(selectedMediaContent.primaryImage ? 1 : 0) +
                      selectedMediaContent.secondaryImages.length}{" "}
                    total)
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // FIXED: Clear selectedMediaContent as primary source and sync other states
                      setSelectedMediaContent({
                        primaryImage: null,
                        secondaryImages: [],
                        youtubeEmbed: null,
                      });
                      // Also clear YouTube video ID state
                      setYoutubeVideoId("");
                      setPrimaryImages([]);
                      setSecondaryImages([]);
                      toast({
                        title: "All images cleared",
                        description: "All selected images have been removed",
                      });
                    }}
                    className="h-7 text-xs"
                  >
                    <Trash className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                </div>

                {/* Single Row Layout for All Images - FIXED: Use selectedMediaContent to prevent duplication */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {/* Featured Image */}
                  {selectedMediaContent.primaryImage && (
                    <div
                      key={`featured-${selectedMediaContent.primaryImage.id}`}
                      className="relative group flex-shrink-0"
                    >
                      <div className="relative w-24 h-24 rounded-md overflow-hidden border-2 border-blue-500 shadow-sm">
                        <ShopifyImageViewer
                          src={selectedMediaContent.primaryImage.url}
                          alt={
                            selectedMediaContent.primaryImage.alt ||
                            "Featured image"
                          }
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0 left-0 bg-blue-600 text-white px-1 py-0.5 text-xs font-medium">
                          Featured
                        </div>
                        {selectedMediaContent.primaryImage.source && (
                          <div className="absolute top-0 right-0">
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0"
                            >
                              {selectedMediaContent.primaryImage.source}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-4 w-4 bg-white shadow-sm"
                          onClick={() => {
                            setSelectedMediaContent((prev) => ({
                              ...prev,
                              primaryImage: null,
                            }));
                            setPrimaryImages([]);
                            toast({
                              title: "Featured image removed",
                              description: "Featured image has been removed",
                            });
                          }}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Secondary Images - FIXED: Use selectedMediaContent.secondaryImages to prevent duplication */}
                  {selectedMediaContent.secondaryImages.map((img, index) => (
                    <div
                      key={`featured-${img.id}`}
                      className="relative group flex-shrink-0"
                    >
                      <div className="relative w-24 h-24 rounded-md overflow-hidden border-2 border-blue-500 shadow-sm">
                        {img.type === "youtube" ? (
                          <div className="w-full h-full relative">
                            <ShopifyImageViewer
                              src={img.url}
                              alt={img.alt || "YouTube video thumbnail"}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-blue-600 text-white rounded-full p-1 shadow-lg opacity-90">
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M6 4L18 12L6 20V4Z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <ShopifyImageViewer
                            src={img.src?.medium || img.url}
                            alt={img.alt || "Featured image"}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-0 left-0 bg-green-600 text-white px-1 py-0.5 text-xs font-medium">
                          #{index + 1}
                        </div>
                        {img.source && (
                          <div className="absolute top-0 right-0">
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0"
                            >
                              {img.source}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-4 w-4 bg-white shadow-sm"
                          onClick={() => {
                            setCurrentImageEdit({
                              id: img.id,
                              alt: img.alt || "",
                            });
                            setIsEditingImage(true);
                          }}
                        >
                          <Pencil className="h-2 w-2" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-4 w-4 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // FIXED: Remove from selectedMediaContent.secondaryImages to prevent duplication
                            setSelectedMediaContent((prev) => ({
                              ...prev,
                              secondaryImages: prev.secondaryImages.filter(
                                (i) => i.id !== img.id,
                              ),
                            }));
                            // Also sync secondaryImages state
                            setSecondaryImages((prev) =>
                              prev.filter((i) => i.id !== img.id),
                            );
                            toast({
                              title: "Secondary image removed",
                              description: "Secondary image has been removed",
                            });
                          }}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Labels Row - Reduced spacing for better UI */}
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {primaryImages.length > 0 && (
                    <div className="w-24 text-center flex-shrink-0">
                      <div className="flex items-center justify-center gap-0.5">
                        <ImageIcon className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-600 font-medium">
                          Featured
                        </span>
                      </div>
                    </div>
                  )}
                  {secondaryImages.map((_, index) => (
                    <div
                      key={`label-${index}`}
                      className="w-20 text-center flex-shrink-0"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <Camera className="h-3 w-3 text-green-600" />
                        <span className="text-green-600 font-medium">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image edit dialog */}
            <Dialog open={isEditingImage} onOpenChange={setIsEditingImage}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Image Details</DialogTitle>
                  <DialogDescription>
                    Add alt text and keywords to optimize your image for SEO
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="image-alt">Alt Text</Label>
                    <Input
                      id="image-alt"
                      placeholder="Describe what's in the image"
                      value={currentImageEdit.alt}
                      onChange={(e) =>
                        setCurrentImageEdit((prev) => ({
                          ...prev,
                          alt: e.target.value,
                        }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Good alt text improves accessibility and SEO
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Generate alt text based on selected keywords
                        const keywordText =
                          selectedKeywords.length > 0
                            ? selectedKeywords.map((k) => k.keyword).join(", ")
                            : "product";

                        setCurrentImageEdit((prev) => ({
                          ...prev,
                          alt: `Image showing ${keywordText}`,
                        }));
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate from Keywords
                    </Button>

                    <Button
                      type="submit"
                      onClick={() => {
                        // Update the image alt text
                        if (imageTab === "primary") {
                          setPrimaryImages((prev) =>
                            prev.map((img) =>
                              img.id === currentImageEdit.id
                                ? { ...img, alt: currentImageEdit.alt }
                                : img,
                            ),
                          );
                        } else {
                          setSecondaryImages((prev) =>
                            prev.map((img) =>
                              img.id === currentImageEdit.id
                                ? { ...img, alt: currentImageEdit.alt }
                                : img,
                            ),
                          );
                        }

                        setIsEditingImage(false);
                        toast({
                          title: "Image updated",
                          description: "Image details have been saved",
                        });
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {imageSource === "unified_search" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search for images (e.g., happy woman, smiling family, confused customer)"
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    disabled={isSearchingImages || !imageSearchQuery.trim()}
                    onClick={async () => {
                      setIsSearchingImages(true);
                      try {
                        // Fetch from both sources using the unified endpoint
                        const response = await fetch(
                          "/api/admin/generate-images",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              query: imageSearchQuery,
                              count: 20,
                              source: "all", // Request from both Pexels and Pixabay
                            }),
                          },
                        );

                        const data = await response.json();
                        if (data.success) {
                          // Convert the response data to PexelsImage format, preserving source info
                          const formattedImages = data.images.map(
                            (img: any) => ({
                              id: img.id,
                              url: img.src?.original || img.url,
                              width: img.width,
                              height: img.height,
                              alt: img.alt || imageSearchQuery,
                              src: img.src || {
                                original: img.url,
                                large: img.url,
                                medium: img.url,
                                small: img.url,
                                thumbnail: img.url,
                              },
                              photographer: img.photographer,
                              photographer_url: img.photographer_url,
                              selected: false,
                              isPrimary: false,
                              source: img.source || "pexels", // Preserve the source from backend
                              type: "image",
                            }),
                          );

                          // Preserve uploaded images and add search results
                          setSearchedImages((prev) => {
                            const uploadedImages = prev.filter(
                              (img) => img.source === "uploaded",
                            );
                            const newSearchResults = formattedImages || [];
                            const combined = [
                              ...uploadedImages,
                              ...newSearchResults,
                            ];
                            console.log(
                              "Preserving uploaded images and adding search results:",
                              {
                                uploadedCount: uploadedImages.length,
                                searchCount: newSearchResults.length,
                                totalCount: combined.length,
                              },
                            );
                            return combined;
                          });

                          // Show search results summary
                          const pexelsCount = formattedImages.filter(
                            (img) => img.source === "pexels",
                          ).length;
                          const pixabayCount = formattedImages.filter(
                            (img) => img.source === "pixabay",
                          ).length;

                          toast({
                            title: "Images Found",
                            description: `Found ${pexelsCount} from Pexels and ${pixabayCount} from Pixabay`,
                            variant: "default",
                            position: "top-right",
                          });
                        } else {
                          toast({
                            title: "Search Failed",
                            description:
                              data.message || "Failed to search for images",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        console.error("Image search error:", error);
                        toast({
                          title: "Search Error",
                          description:
                            "An error occurred while searching for images",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSearchingImages(false);
                      }
                    }}
                  >
                    {isSearchingImages ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    {isSearchingImages ? "Searching..." : "Search"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setImageSearchQuery("happy woman using product")
                    }
                  >
                    Happy woman
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageSearchQuery("satisfied customer")}
                  >
                    Satisfied customer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageSearchQuery("family using product")}
                  >
                    Family
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageSearchQuery("professional man")}
                  >
                    Professional
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setImageSearchQuery(
                        "person enjoying " +
                          (selectedProducts.length > 0
                            ? selectedProducts[0].title
                            : "product"),
                      )
                    }
                  >
                    Enjoying product
                  </Button>
                </div>

                {isSearchingImages ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2">Searching for images...</span>
                  </div>
                ) : (
                  <>
                    {/* Debug info */}
                    {searchedImages.length > 0 && (
                      <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-50 rounded">
                        Showing {searchedImages.length} images (including{" "}
                        {
                          searchedImages.filter(
                            (img) => img.source === "uploaded",
                          ).length
                        }{" "}
                        uploaded)
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-2">
                      {searchedImages && searchedImages.length > 0
                        ? searchedImages.map((image) => {
                            console.log("Rendering image:", image);
                            return (
                              <div
                                key={image.id}
                                className={`relative group rounded-md overflow-hidden border-2 hover:border-blue-400 transition-all ${image.selected ? "border-blue-500 ring-2 ring-blue-300" : "border-transparent"}`}
                              >
                                <ShopifyImageViewer
                                  src={image.src?.medium || image.url}
                                  alt={image.alt || "Stock image"}
                                  className="w-full h-28 md:h-32 object-cover"
                                />

                                {/* Full-size view icon */}
                                <div className="absolute top-1 left-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-6 w-6 bg-white/90 shadow-lg hover:bg-white hover:shadow-xl"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // For Pexels images, use the original size, then fallback to large
                                      const fullSizeUrl =
                                        image.src?.original ||
                                        image.src?.large ||
                                        image.url;
                                      console.log(
                                        "Opening full-size image:",
                                        fullSizeUrl,
                                        "from image object:",
                                        image,
                                      );
                                      window.open(fullSizeUrl, "_blank");
                                    }}
                                    title="View full size"
                                  >
                                    <ZoomIn className="h-3 w-3" />
                                  </Button>
                                </div>


                                {/* Primary/Secondary Selection buttons - always visible on hover */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    className="w-3/4 bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Mark as primary image
                                      const updatedImages = searchedImages.map(
                                        (img) => {
                                          if (img.id === image.id) {
                                            return {
                                              ...img,
                                              selected: true,
                                              isPrimary: true,
                                            };
                                          } else {
                                            // Keep other images selected but not primary
                                            return { ...img, isPrimary: false };
                                          }
                                        },
                                      );
                                      setSearchedImages(updatedImages);

                                      // Remove from secondary images if already present to prevent duplication
                                      setSecondaryImages((prev) =>
                                        prev.filter(
                                          (img) => img.id !== image.id,
                                        ),
                                      );

                                      // Set as the single primary image
                                      setPrimaryImages([
                                        {
                                          ...image,
                                          selected: true,
                                          isPrimary: true,
                                        },
                                      ]);

                                      // Update selectedMediaContent state immediately
                                      setSelectedMediaContent((prev) => ({
                                        ...prev,
                                        primaryImage: {
                                          id: image.id,
                                          url: image.url,
                                          alt: image.alt || "",
                                          width: image.width || 0,
                                          height: image.height || 0,
                                          source: image.source || "pexels",
                                        },
                                      }));

                                      toast({
                                        title: "Primary image selected",
                                        description:
                                          "This image will appear as a featured image at the top of your content",
                                      });
                                    }}
                                  >
                                    <ImageIcon className="h-3 w-3 mr-1" />
                                    Select as Primary
                                  </Button>

                                  <Button
                                    size="sm"
                                    className="w-3/4 text-white border-green-600"
                                    style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                                    onClick={() => {
                                      // Mark as secondary image
                                      const updatedImages = searchedImages.map(
                                        (img) =>
                                          img.id === image.id
                                            ? {
                                                ...img,
                                                selected: true,
                                                isPrimary: false,
                                              }
                                            : img,
                                      );
                                      setSearchedImages(updatedImages);

                                      // Remove from primary if already set as primary
                                      setPrimaryImages((prev) =>
                                        prev.filter(
                                          (img) => img.id !== image.id,
                                        ),
                                      );

                                      // Update selectedMediaContent state immediately with duplicate check
                                      setSelectedMediaContent((prev) => {
                                        const isDuplicate =
                                          prev.secondaryImages.some(
                                            (existing) =>
                                              existing.id === image.id ||
                                              existing.url === image.url,
                                          );

                                        if (isDuplicate) {
                                          console.log(
                                            "🚫 PREVENTING DUPLICATE in search dialog: Image already exists",
                                            image.id,
                                          );
                                          return prev;
                                        }

                                        console.log(
                                          "✅ ADDING UNIQUE SECONDARY IMAGE in search:",
                                          image.id,
                                        );
                                        return {
                                          ...prev,
                                          secondaryImages: [
                                            ...prev.secondaryImages,
                                            {
                                              id: image.id,
                                              url: image.url,
                                              alt: image.alt || "",
                                              width: image.width || 0,
                                              height: image.height || 0,
                                              source: image.source || "pexels",
                                              type: "image", // CRITICAL: Explicitly mark as image, never 'youtube'
                                            },
                                          ],
                                        };
                                      });

                                      // Sync secondaryImages state for UI consistency
                                      setSecondaryImages((prev) => {
                                        const exists = prev.some(
                                          (img) => img.id === image.id,
                                        );
                                        if (!exists) {
                                          return [
                                            ...prev,
                                            {
                                              ...image,
                                              selected: true,
                                              isPrimary: false,
                                            },
                                          ];
                                        }
                                        return prev;
                                      });

                                      toast({
                                        title: "Secondary image selected",
                                        description:
                                          "This image will appear throughout your content body",
                                      });
                                    }}
                                  >
                                    <FileImage className="h-3 w-3 mr-1" />
                                    Select as Secondary
                                  </Button>
                                </div>

                                {/* Selection indicator with clear primary/secondary label */}
                                {image.selected && (
                                  <>
                                    <div
                                      className={`absolute top-1 right-1 ${image.isPrimary ? "bg-blue-500" : "bg-green-500"} text-white p-1 rounded-full`}
                                    >
                                      <Check className="h-4 w-4" />
                                    </div>
                                    <div
                                      className={`absolute top-1 left-1 text-white text-xs px-1.5 py-0.5 rounded-sm ${image.isPrimary ? "bg-blue-500" : "bg-green-500"}`}
                                    >
                                      {image.isPrimary
                                        ? "Primary"
                                        : "Secondary"}
                                    </div>
                                  </>
                                )}

                                {image.photographer && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1 text-white text-xs truncate">
                                    {image.photographer}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        : !isSearchingImages && (
                            <div className="col-span-full text-center py-6">
                              <p className="text-slate-500">
                                No images found. Try searching for something
                                else.
                              </p>
                            </div>
                          )}
                    </div>
                  </>
                )}

                {!isSearchingImages &&
                  searchedImages.length === 0 &&
                  imageSearchQuery && (
                    <div className="text-center py-8">
                      <p className="text-slate-500">
                        No images found for "{imageSearchQuery}"
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Try different keywords or phrases
                      </p>
                    </div>
                  )}
              </div>
            )}

            {imageSource === "product_images" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">
                    Product & Variant Images
                  </h3>
                  {isLoadingMedia ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs text-slate-500">
                        Loading images...
                      </span>
                    </div>
                  ) : (
                    shopifyFiles.length > 0 && (
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-slate-500" />
                        <span className="text-xs text-slate-500">
                          {shopifyFiles.length} images found
                        </span>
                      </div>
                    )
                  )}
                </div>

                {shopifyFiles.length === 0 && !isLoadingMedia && (
                  <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <div className="flex flex-col items-center gap-2 max-w-xs text-center">
                      <Package className="h-8 w-8 text-slate-400" />
                      <h3 className="text-sm font-medium">
                        No product images found
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedProducts.length === 0
                          ? "Select a product in Step 2 first to view its images here."
                          : "The selected products don't have any associated images."}
                      </p>
                      {selectedProducts.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={fetchProductAndVariantImages}
                          className="mt-2"
                        >
                          <RefreshCcw className="h-3 w-3 mr-1" />
                          Refresh
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {shopifyFiles.length > 0 && !isLoadingMedia && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {shopifyFiles.map((image) => {
                        // Check if this image is selected (either as primary or secondary)
                        const isPrimary = selectedImages.some(
                          (img) =>
                            img.id === image.id &&
                            img.selectionType === "primary",
                        );
                        const isSecondary = selectedImages.some(
                          (img) =>
                            img.id === image.id &&
                            img.selectionType === "secondary",
                        );
                        const isSelected = isPrimary || isSecondary;

                        // Determine if this is a product or variant image
                        const isVariant = image.source === "variant_image";

                        return (
                          <div
                            key={image.id}
                            className={cn(
                              "relative rounded-md overflow-hidden border group hover:shadow-md transition-all duration-200",
                              isPrimary
                                ? "border-blue-500 ring-2 ring-blue-200"
                                : isSecondary
                                  ? "border-green-500 ring-2 ring-green-200"
                                  : "border-slate-200",
                            )}
                          >
                            {/* Product/Variant Badge */}
                            <div className="absolute top-2 left-2 z-10">
                              <Badge
                                variant="outline"
                                className="text-xs bg-white/80 backdrop-blur-sm"
                              >
                                {isVariant ? (
                                  <span className="flex items-center gap-1">
                                    <CircleDot className="h-3 w-3 text-purple-500" />
                                    Variant
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Package className="h-3 w-3 text-blue-500" />
                                    Product
                                  </span>
                                )}
                              </Badge>
                            </div>

                            {/* Full-size view icon */}
                            <div className="absolute top-1 left-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-6 w-6 bg-white/90 shadow-lg hover:bg-white hover:shadow-xl"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(image.url, "_blank");
                                }}
                                title="View full size"
                              >
                                <ZoomIn className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Selection Badges */}
                            {isPrimary && (
                              <div className="absolute top-2 right-2 z-10">
                                <Badge className="bg-blue-500 text-white">
                                  Primary
                                </Badge>
                              </div>
                            )}
                            {isSecondary && (
                              <div className="absolute top-2 right-2 z-10">
                                <Badge className="bg-green-500 text-white">
                                  Secondary
                                </Badge>
                              </div>
                            )}

                            {/* Image */}
                            <div className="relative aspect-square bg-slate-100">
                              <ShopifyImageViewer
                                src={image.url}
                                alt={image.alt || "Product image"}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            {/* Product/Variant Info */}
                            <div className="p-2 bg-white">
                              <p className="text-xs font-medium truncate">
                                {image.title || image.alt || "Product image"}
                              </p>
                              {image.product_title && (
                                <p className="text-xs text-slate-500 truncate">
                                  {image.product_title}
                                </p>
                              )}
                              {image.variant_title && (
                                <p className="text-xs text-purple-500 truncate">
                                  {image.variant_title}
                                </p>
                              )}
                            </div>

                            {/* Selection Controls */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={isPrimary ? "default" : "outline"}
                                  className={cn(
                                    "bg-blue-500 hover:bg-blue-600 text-white",
                                    isPrimary
                                      ? "opacity-100"
                                      : "opacity-90 hover:opacity-100",
                                  )}
                                  onClick={() => {
                                    // FIXED: Add duplicate prevention for primary images
                                    setPrimaryImages((prev) => {
                                      // Check if this image is already the primary
                                      const isDuplicate = prev.some(
                                        (existing) =>
                                          existing.id === image.id ||
                                          existing.url === image.url,
                                      );

                                      if (isDuplicate) {
                                        console.log(
                                          "🚫 PREVENTING DUPLICATE PRIMARY: Image already exists",
                                          image.id,
                                        );
                                        return prev;
                                      }

                                      // Create a new array with this image as the primary
                                      return [{ ...image, isPrimary: true }];
                                    });

                                    // Update selectedMediaContent state for primary image
                                    setSelectedMediaContent((prev) => ({
                                      ...prev,
                                      primaryImage: {
                                        id: image.id,
                                        url: image.url,
                                        alt: image.alt || "",
                                        width: image.width || 0,
                                        height: image.height || 0,
                                        source: image.source || "pexels",
                                      },
                                    }));

                                    // CRITICAL: Update form field to trigger synchronization for pages
                                    form.setValue("featuredImage", image.url);

                                    toast({
                                      title: "Primary image selected",
                                      description:
                                        "Image has been set as the primary featured image",
                                    });
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Primary
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isSecondary ? "default" : "outline"}
                                  className={cn(
                                    "text-white border-green-600",
                                    isSecondary
                                      ? "opacity-100"
                                      : "opacity-90 hover:opacity-100",
                                  )}
                                  style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                                  onClick={() => {
                                    // FIXED: Only update selectedMediaContent to prevent duplication - remove setSecondaryImages call
                                    setSelectedMediaContent((prev) => {
                                      const isDuplicate =
                                        prev.secondaryImages.some(
                                          (existing) =>
                                            existing.id === image.id ||
                                            existing.url === image.url,
                                        );

                                      if (isDuplicate) {
                                        console.log(
                                          "🚫 PREVENTING DUPLICATE: Image already exists",
                                          image.id,
                                        );
                                        return prev;
                                      }

                                      console.log(
                                        "✅ ADDING UNIQUE SECONDARY IMAGE:",
                                        image.id,
                                      );
                                      return {
                                        ...prev,
                                        secondaryImages: [
                                          ...prev.secondaryImages,
                                          {
                                            id: image.id,
                                            url: image.url,
                                            alt: image.alt || "",
                                            width: image.width || 0,
                                            height: image.height || 0,
                                            source: image.source || "pexels",
                                          },
                                        ],
                                      };
                                    });

                                    // Also sync the secondaryImages state to match selectedMediaContent
                                    setSecondaryImages((prev) => {
                                      const exists = prev.some(
                                        (img) => img.id === image.id,
                                      );
                                      if (!exists) {
                                        return [
                                          ...prev,
                                          { ...image, isPrimary: false },
                                        ];
                                      }
                                      return prev;
                                    });

                                    toast({
                                      title: "Secondary image added",
                                      description:
                                        "Image has been added to your content images",
                                    });
                                  }}
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Secondary
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {imageSource === "shopify_media" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Shopify Media Library</h3>
                  <div className="flex gap-2">
                    <Select
                      defaultValue="products"
                      onValueChange={(value) => {
                        if (value === "variants") {
                          toast({
                            title: "Showing variant images",
                            description:
                              "Browse and select from all product variants",
                          });

                          // Show product variants
                          if (selectedProducts.length > 0) {
                            // Extract all images from selected products including variants
                            const productImages: PexelsImage[] = [];
                            let uniqueImageUrls = new Set<string>();

                            selectedProducts.forEach((product) => {
                              // Include variant images
                              if (
                                product.variants &&
                                Array.isArray(product.variants)
                              ) {
                                product.variants.forEach(
                                  (variant, variantIndex) => {
                                    if (variant.image) {
                                      const imageUrl =
                                        typeof variant.image === "string"
                                          ? variant.image
                                          : variant.image.src;
                                      if (
                                        imageUrl &&
                                        !uniqueImageUrls.has(imageUrl)
                                      ) {
                                        uniqueImageUrls.add(imageUrl);
                                        productImages.push({
                                          id: `variant-${variant.id}`,
                                          url: imageUrl,
                                          width: 500,
                                          height: 500,
                                          alt: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
                                          src: {
                                            original: imageUrl,
                                            large: imageUrl,
                                            medium: imageUrl,
                                            small: imageUrl,
                                            thumbnail: imageUrl,
                                          },
                                          selected: false,
                                          type: "image",
                                        });
                                      }
                                    }
                                  },
                                );
                              }
                            });

                            setContentFiles(productImages);
                            console.log(
                              `Loaded ${productImages.length} variant images`,
                            );
                          } else {
                            toast({
                              title: "No products selected",
                              description:
                                "Please select products first to view their variants",
                              variant: "destructive",
                            });
                          }
                        } else if (value === "products") {
                          toast({
                            title: "Showing product images",
                            description:
                              "Browse and select from main product images",
                          });

                          if (selectedProducts.length > 0) {
                            // Extract images from selected products
                            const productImages: any[] = [];
                            let uniqueImageUrls = new Set<string>();

                            selectedProducts.forEach((product) => {
                              // Add main product image
                              if (product.image) {
                                const imageUrl =
                                  typeof product.image === "string"
                                    ? product.image
                                    : product.image.src || "";
                                if (
                                  imageUrl &&
                                  !uniqueImageUrls.has(imageUrl)
                                ) {
                                  uniqueImageUrls.add(imageUrl);
                                  productImages.push({
                                    id: `product-${product.id}-main`,
                                    url: imageUrl,
                                    width: 500,
                                    height: 500,
                                    alt: product.title || "Product image",
                                    src: {
                                      original: imageUrl,
                                      large: imageUrl,
                                      medium: imageUrl,
                                      small: imageUrl,
                                      thumbnail: imageUrl,
                                    },
                                    selected: false,
                                    type: "image",
                                  });
                                }
                              }

                              // Add additional product images
                              if (
                                product.images &&
                                Array.isArray(product.images)
                              ) {
                                product.images.forEach((image, index) => {
                                  // Handle different image object structures
                                  const imageSrc =
                                    typeof image === "string"
                                      ? image
                                      : image.src
                                        ? image.src
                                        : "";
                                  const imageId =
                                    typeof image === "string"
                                      ? `img-${index}`
                                      : image.id
                                        ? image.id
                                        : `img-${index}`;

                                  // Skip the main image (already added above) and empty URLs
                                  if (
                                    imageSrc &&
                                    (typeof product.image === "string" ||
                                      imageId !== (product.image?.id || ""))
                                  ) {
                                    if (!uniqueImageUrls.has(imageSrc)) {
                                      uniqueImageUrls.add(imageSrc);
                                      productImages.push({
                                        id: `product-${product.id}-image-${imageId}-${index}`,
                                        url: imageSrc,
                                        width: 500,
                                        height: 500,
                                        alt:
                                          typeof image === "string"
                                            ? `${product.title} - Image ${index + 1}`
                                            : image.alt ||
                                              `${product.title} - Image ${index + 1}`,
                                        src: {
                                          original: imageSrc,
                                          large: imageSrc,
                                          medium: imageSrc,
                                          small: imageSrc,
                                          thumbnail: imageSrc,
                                        },
                                        selected: false,
                                        type: "image",
                                      });
                                    }
                                  }
                                });
                              }
                            });

                            setContentFiles(productImages);
                            console.log(
                              `Loaded ${productImages.length} product images from ${selectedProducts.length} products`,
                            );
                          } else {
                            toast({
                              title: "No products selected",
                              description:
                                "Please select products first to view their images",
                              variant: "destructive",
                            });
                          }
                        } else if (value === "media") {
                          toast({
                            title: "Loading media files",
                            description:
                              "Fetching images from your Shopify store",
                          });

                          // Fetch all media files from Shopify Media Library
                          setIsLoadingContentFiles(true);

                          // Try fetching media files from the API
                          apiRequest({
                            url: "/api/admin/files",
                            method: "GET",
                          })
                            .then((response) => {
                              if (
                                response.success &&
                                response.files &&
                                response.files.length > 0
                              ) {
                                // Convert to standard format
                                const mediaFiles = response.files
                                  .filter((file: any) => file && file.url)
                                  .map((file: any) => ({
                                    id:
                                      file.id ||
                                      `media-${Math.random().toString(36).substring(7)}`,
                                    url: file.url,
                                    width: 500, // Standard width for display
                                    height: 500, // Standard height for display
                                    alt:
                                      file.alt || file.filename || "Media File",
                                    src: {
                                      original: file.url,
                                      large: file.url,
                                      medium: file.url,
                                      small: file.url,
                                      thumbnail: file.url,
                                    },
                                    selected: false,
                                    type: "image",
                                  }));

                                setContentFiles(mediaFiles);
                                console.log(
                                  `Loaded ${mediaFiles.length} files from Shopify Media Library`,
                                );
                              } else {
                                // If no files found, fallback to product images
                                fallbackToProductImages();
                              }
                            })
                            .catch((error) => {
                              console.error(
                                "Error fetching media files:",
                                error,
                              );
                              fallbackToProductImages();
                            })
                            .finally(() => {
                              setIsLoadingContentFiles(false);
                            });

                          // Function to fallback to product images if media library fails
                          function fallbackToProductImages() {
                            console.log("Falling back to product images");

                            if (selectedProducts.length === 0) {
                              toast({
                                title: "No products selected",
                                description:
                                  "Please select products to view their images",
                                variant: "destructive",
                              });
                              setContentFiles([]);
                              return;
                            }

                            // Extract product images
                            const productImages = [];
                            const uniqueUrls = new Set();

                            selectedProducts.forEach((product) => {
                              // Add main product image
                              if (product.image && product.image.src) {
                                if (!uniqueUrls.has(product.image.src)) {
                                  uniqueUrls.add(product.image.src);
                                  productImages.push({
                                    id: `product-${product.id}-main`,
                                    url: product.image.src,
                                    width: 500,
                                    height: 500,
                                    alt: product.title || "Product image",
                                    src: {
                                      original: product.image.src,
                                      large: product.image.src,
                                      medium: product.image.src,
                                      small: product.image.src,
                                      thumbnail: product.image.src,
                                    },
                                    selected: false,
                                    type: "image",
                                  });
                                }
                              }

                              // Add variant images
                              if (
                                product.images &&
                                Array.isArray(product.images)
                              ) {
                                product.images.forEach((image, index) => {
                                  const imageUrl =
                                    typeof image === "string"
                                      ? image
                                      : image.src || "";
                                  if (imageUrl && !uniqueUrls.has(imageUrl)) {
                                    uniqueUrls.add(imageUrl);
                                    productImages.push({
                                      id: `product-${product.id}-image-${index}`,
                                      url: imageUrl,
                                      width: 500,
                                      height: 500,
                                      alt: `${product.title} - Image ${index + 1}`,
                                      src: {
                                        original: imageUrl,
                                        large: imageUrl,
                                        medium: imageUrl,
                                        small: imageUrl,
                                        thumbnail: imageUrl,
                                      },
                                      selected: false,
                                      type: "image",
                                    });
                                  }
                                });
                              }
                            });

                            if (productImages.length > 0) {
                              setContentFiles(productImages);
                              toast({
                                title: "Product images loaded",
                                description: `Showing ${productImages.length} images from your products`,
                              });
                            } else {
                              setContentFiles([]);
                              toast({
                                title: "No images found",
                                description:
                                  "Selected products don't have any images",
                                variant: "destructive",
                              });
                            }
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Image source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="products">
                          Selected Product Images
                        </SelectItem>
                        <SelectItem value="variants">
                          Product Variant Images
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedProducts.length > 0 ? (
                  <>
                    {/* Selected images preview */}
                    {(primaryImages.length > 0 ||
                      secondaryImages.length > 0) && (
                      <div className="mb-4 bg-slate-50 p-3 rounded-md border">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium">
                            Your Selected Images
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPrimaryImages([]);
                              setSecondaryImages([]);
                              toast({
                                title: "Images cleared",
                                description:
                                  "All selected images have been removed",
                              });
                            }}
                            className="h-7 text-xs"
                          >
                            <Trash className="mr-1 h-3 w-3" />
                            Clear All
                          </Button>
                        </div>

                        {primaryImages.length > 0 && (
                          <>
                            <h5 className="text-xs font-medium text-gray-500 mb-1">
                              Featured/Primary Images:
                            </h5>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
                              {primaryImages.map((img, index) => (
                                <div key={img.id} className="relative group">
                                  <div className="relative aspect-square rounded-md overflow-hidden border-2 border-blue-500">
                                    <ShopifyImageViewer
                                      src={img.src?.medium || img.url || ""}
                                      alt={img.alt || "Selected image"}
                                      className="w-full h-full"
                                    />
                                    <div className="absolute top-1 left-1 bg-blue-500 text-white px-1 py-0.5 rounded text-xs">
                                      {index === 0
                                        ? "Featured"
                                        : `Image ${index + 1}`}
                                    </div>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPrimaryImages((prev) =>
                                          prev.filter((i) => i.id !== img.id),
                                        );
                                        toast({
                                          title: "Image removed",
                                          description:
                                            "Primary image has been removed",
                                        });
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {secondaryImages.length > 0 && (
                          <>
                            <h5 className="text-xs font-medium text-gray-500 mb-1">
                              Secondary Content Images:
                            </h5>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                              {secondaryImages.map((img, index) => (
                                <div key={img.id} className="relative group">
                                  <div className="relative aspect-square rounded-md overflow-hidden border-2 border-green-500">
                                    <ShopifyImageViewer
                                      src={img.src?.medium || img.url || ""}
                                      alt={img.alt || "Content image"}
                                      className="w-full h-full"
                                    />
                                    <div className="absolute top-1 left-1 bg-green-500 text-white px-1 py-0.5 rounded text-xs">
                                      Content {index + 1}
                                    </div>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSecondaryImages((prev) =>
                                          prev.filter((i) => i.id !== img.id),
                                        );
                                        toast({
                                          title: "Image removed",
                                          description:
                                            "Content image has been removed",
                                        });
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="max-h-[400px] overflow-y-auto p-2">
                      {shopifyMediaType === "products" && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {selectedProducts.map((product) => {
                            // Get image from product - try multiple sources
                            const productImage =
                              product.image ||
                              (product.images && product.images.length > 0
                                ? product.images[0].src
                                : null);

                            if (!productImage) return null;

                            // Check if this product image has already been added
                            const isAlreadySelected = primaryImages.some(
                              (img) =>
                                img.id === `product-${product.id}` ||
                                img.url === productImage,
                            );

                            return (
                              <div
                                key={product.id}
                                className={`relative group cursor-pointer rounded-md overflow-hidden border-2 hover:border-blue-400 transition-all ${isAlreadySelected ? "border-green-500" : "border-transparent"}`}
                              >
                                <div className="relative aspect-square">
                                  <ShopifyImageViewer
                                    src={productImage}
                                    alt={product.title || "Product image"}
                                    className="w-full h-full bg-white"
                                  />

                                  {/* Full-size view icon */}
                                  <div className="absolute top-1 left-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-6 w-6 bg-white/90 shadow-lg hover:bg-white hover:shadow-xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(productImage, "_blank");
                                      }}
                                      title="View full size"
                                    >
                                      <ZoomIn className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  {isAlreadySelected && (
                                    <div className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded-full">
                                      <Check className="h-4 w-4" />
                                    </div>
                                  )}

                                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        // Skip if already selected
                                        if (isAlreadySelected) {
                                          toast({
                                            title: "Already selected",
                                            description:
                                              "This image is already in your selection",
                                          });
                                          return;
                                        }

                                        // Create a Pexels-compatible image object for the product image
                                        const imageForSelection: PexelsImage = {
                                          id: `product-${product.id}`,
                                          url: productImage || "",
                                          width: 500,
                                          height: 500,
                                          alt: product.title,
                                          src: {
                                            original: productImage || "",
                                            large: productImage || "",
                                            medium: productImage || "",
                                            small: productImage || "",
                                            thumbnail: productImage || "",
                                          },
                                        };

                                        // Add as featured image (first in array)
                                        setPrimaryImages((prev) => [
                                          imageForSelection,
                                          ...prev,
                                        ]);

                                        toast({
                                          title: "Featured image added",
                                          description:
                                            "Product image added as featured image",
                                        });
                                      }}
                                      className="w-4/5 bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      <ImageIcon className="mr-2 h-4 w-4" />
                                      Set as Featured
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        // Create a Pexels-compatible image object for the product image
                                        const imageForSelection: PexelsImage = {
                                          id: `product-${product.id}-secondary`,
                                          url: productImage || "",
                                          width: 500,
                                          height: 500,
                                          alt: product.title,
                                          src: {
                                            original: productImage || "",
                                            large: productImage || "",
                                            medium: productImage || "",
                                            small: productImage || "",
                                            thumbnail: productImage || "",
                                          },
                                        };

                                        // Add to secondary images
                                        setSecondaryImages((prev) => [
                                          ...prev,
                                          imageForSelection,
                                        ]);

                                        toast({
                                          title: "Secondary image added",
                                          description:
                                            "Image added for use in content body",
                                        });
                                      }}
                                      className="w-4/5 text-white border-green-600"
                                      style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                                    >
                                      <LayoutGrid className="mr-2 h-4 w-4" />
                                      Add to Content
                                    </Button>
                                  </div>
                                </div>
                                <div className="bg-black bg-opacity-70 p-2">
                                  <p className="text-white text-xs truncate">
                                    {product.title}
                                  </p>
                                  <div className="flex justify-between items-center mt-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Create a Pexels-compatible image object for the product image
                                        const productImage: PexelsImage = {
                                          id: `product-${product.id}-secondary`,
                                          url: product.image || "",
                                          width: 500,
                                          height: 500,
                                          alt: product.title,
                                          src: {
                                            original: product.image || "",
                                            large: product.image || "",
                                            medium: product.image || "",
                                            small: product.image || "",
                                            thumbnail: product.image || "",
                                          },
                                        };

                                        // Add to secondary images
                                        setSecondaryImages((prev) => [
                                          ...prev,
                                          productImage,
                                        ]);

                                        toast({
                                          title: "Secondary image added",
                                          description:
                                            "Image added for use in content body",
                                        });
                                      }}
                                      className="h-6 px-2 text-white hover:bg-white hover:bg-opacity-20"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      <span className="text-xs">
                                        Add to Content
                                      </span>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {shopifyMediaType === "variants" && (
                        <div className="space-y-6">
                          {selectedProducts.map((product) => {
                            // Skip products with no variants or images
                            if (
                              !product.variants ||
                              product.variants.length === 0
                            ) {
                              return null;
                            }

                            return (
                              <div
                                key={`variants-${product.id}`}
                                className="space-y-2"
                              >
                                <h4 className="text-sm font-medium">
                                  {product.title} Variants
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {product.variants.map((variant) => {
                                    // Skip variants without images
                                    if (!variant.image) return null;

                                    // Check if this variant image has already been added
                                    const isAlreadySelected =
                                      primaryImages.some(
                                        (img) =>
                                          img.id === `variant-${variant.id}` ||
                                          img.url === variant.image,
                                      );

                                    return (
                                      <div
                                        key={variant.id}
                                        className={`relative cursor-pointer rounded-md overflow-hidden border-2 hover:border-blue-400 transition-all ${isAlreadySelected ? "border-green-500" : "border-transparent"}`}
                                      >
                                        <div className="relative aspect-square">
                                          <ShopifyImageViewer
                                            src={variant.image || ""}
                                            alt={
                                              variant.title || "Product variant"
                                            }
                                            className="w-full h-full object-contain bg-white"
                                          />
                                          {isAlreadySelected && (
                                            <div className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded-full">
                                              <Check className="h-4 w-4" />
                                            </div>
                                          )}

                                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
                                            <div className="opacity-0 hover:opacity-100 transition-all flex gap-2">
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                  // Skip if already selected
                                                  if (isAlreadySelected) {
                                                    toast({
                                                      title: "Already selected",
                                                      description:
                                                        "This image is already in your selection",
                                                    });
                                                    return;
                                                  }

                                                  // Create a Pexels-compatible image object for the variant image
                                                  const variantImage: PexelsImage =
                                                    {
                                                      id: `variant-${variant.id}`,
                                                      url: variant.image || "",
                                                      width: 500,
                                                      height: 500,
                                                      alt: `${product.title} - ${variant.title}`,
                                                      src: {
                                                        original:
                                                          variant.image || "",
                                                        large:
                                                          variant.image || "",
                                                        medium:
                                                          variant.image || "",
                                                        small:
                                                          variant.image || "",
                                                        thumbnail:
                                                          variant.image || "",
                                                      },
                                                    };

                                                  // Add as featured image (first in array)
                                                  setPrimaryImages((prev) => [
                                                    variantImage,
                                                    ...prev,
                                                  ]);

                                                  toast({
                                                    title:
                                                      "Featured image added",
                                                    description:
                                                      "Variant image added as featured image",
                                                  });
                                                }}
                                                className="bg-white text-black hover:bg-gray-100"
                                              >
                                                <ImageIcon className="mr-1 h-3 w-3" />
                                                Set as Featured
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="bg-black bg-opacity-70 p-2">
                                          <p className="text-white text-xs truncate">
                                            {variant.title}
                                          </p>
                                          <div className="flex justify-between items-center mt-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                // Create a Pexels-compatible image object for the variant image
                                                const variantImage: PexelsImage =
                                                  {
                                                    id: `variant-${variant.id}-secondary`,
                                                    url: variant.image || "",
                                                    width: 500,
                                                    height: 500,
                                                    alt: `${product.title} - ${variant.title}`,
                                                    src: {
                                                      original:
                                                        variant.image || "",
                                                      large:
                                                        variant.image || "",
                                                      medium:
                                                        variant.image || "",
                                                      small:
                                                        variant.image || "",
                                                      thumbnail:
                                                        variant.image || "",
                                                    },
                                                  };

                                                // Add to secondary images
                                                setSecondaryImages((prev) => [
                                                  ...prev,
                                                  variantImage,
                                                ]);

                                                toast({
                                                  title:
                                                    "Secondary image added",
                                                  description:
                                                    "Image added for use in content body",
                                                });
                                              }}
                                              className="h-6 px-2 text-white hover:bg-white hover:bg-opacity-20"
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              <span className="text-xs">
                                                Add to Content
                                              </span>
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {selectedProducts.every(
                            (p) => !p.variants || p.variants.length === 0,
                          ) && (
                            <div className="text-center py-8">
                              <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                              <p className="text-slate-500 mb-2">
                                No product variants with images found
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShopifyMediaType("products")}
                                className="text-white border-green-600"
                                style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                              >
                                <ArrowLeft className="mr-0.5 h-3 w-3" />
                                Switch to Product Images
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {shopifyMediaType === "media" && (
                        <>
                          {isLoadingContentFiles ? (
                            <div className="flex justify-center items-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                              <span className="ml-2">
                                Loading content files...
                              </span>
                            </div>
                          ) : contentFiles.length > 0 ? (
                            <div>
                              <div className="pb-3 mb-3 border-b border-gray-200">
                                <div className="flex items-center">
                                  <h4 className="text-sm font-medium flex items-center">
                                    <Store className="h-4 w-4 mr-2 text-blue-500" />
                                    Product & Media Images
                                  </h4>
                                  <Badge variant="outline" className="ml-3">
                                    {contentFiles.length} images
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto"
                                    onClick={fetchShopifyFiles}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Refresh
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Select product and media images from your
                                  Shopify store
                                </p>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {contentFiles.map((file) => {
                                  // Check if already selected
                                  const isPrimarySelected = primaryImages.some(
                                    (img) =>
                                      img.id === file.id ||
                                      img.url === file.url,
                                  );
                                  const isSecondarySelected =
                                    secondaryImages.some(
                                      (img) =>
                                        img.id === `${file.id}-secondary` ||
                                        img.url === file.url,
                                    );

                                  let borderClass = "border-gray-200";
                                  if (isPrimarySelected)
                                    borderClass = "border-blue-500";
                                  if (isSecondarySelected)
                                    borderClass = "border-green-500";

                                  return (
                                    <div
                                      key={file.id}
                                      className={`relative rounded-md overflow-hidden border-2 ${borderClass} hover:shadow-md transition-all`}
                                    >
                                      {isPrimarySelected && (
                                        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs z-10 shadow-sm">
                                          Primary
                                        </div>
                                      )}
                                      {isSecondarySelected && (
                                        <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs z-10 shadow-sm">
                                          Secondary
                                        </div>
                                      )}

                                      <div className="relative aspect-square">
                                        <ShopifyImageViewer
                                          src={file.url}
                                          alt={
                                            file.alt ||
                                            file.filename ||
                                            "Shopify image"
                                          }
                                          className="w-full h-full object-contain bg-white"
                                        />

                                        {/* Action buttons overlay */}
                                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-all flex items-center justify-center gap-2 p-3">
                                          <Button
                                            size="sm"
                                            variant={
                                              isPrimarySelected
                                                ? "default"
                                                : "outline"
                                            }
                                            className={cn(
                                              "bg-blue-500 hover:bg-blue-600 text-white",
                                              isPrimarySelected
                                                ? "opacity-100"
                                                : "opacity-90 hover:opacity-100",
                                            )}
                                            onClick={() => {
                                              // Create a Pexels-compatible image object
                                              const imageForSelection: PexelsImage =
                                                {
                                                  id: file.id,
                                                  url: file.url,
                                                  width: 800,
                                                  height: 800,
                                                  alt: file.alt || file.name,
                                                  src: {
                                                    original: file.url,
                                                    large: file.url,
                                                    medium: file.url,
                                                    small: file.url,
                                                    thumbnail: file.url,
                                                  },
                                                };

                                              // Add to primary images (featured)
                                              setPrimaryImages((prev) => [
                                                imageForSelection,
                                                ...prev.filter(
                                                  (img) => img.id !== file.id,
                                                ),
                                              ]);

                                              // If it was in secondary images, remove it from there
                                              if (isSecondarySelected) {
                                                setSecondaryImages((prev) =>
                                                  prev.filter(
                                                    (img) =>
                                                      img.id !==
                                                        `${file.id}-secondary` &&
                                                      img.url !== file.url,
                                                  ),
                                                );
                                              }

                                              toast({
                                                title: "Primary image selected",
                                                description:
                                                  "Image will appear as the featured image",
                                              });
                                            }}
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Primary
                                          </Button>

                                          <Button
                                            size="sm"
                                            variant={
                                              isSecondarySelected
                                                ? "default"
                                                : "outline"
                                            }
                                            className={cn(
                                              "text-white border-green-600",
                                              isSecondarySelected
                                                ? "opacity-100"
                                                : "opacity-90 hover:opacity-100",
                                            )}
                                            style={{backgroundColor: 'hsl(160 100% 25% / 1)'}}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 20% / 1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(160 100% 25% / 1)'}
                                            onClick={() => {
                                              // Create a Pexels-compatible image object
                                              const imageForSelection: PexelsImage =
                                                {
                                                  id: `${file.id}-secondary`,
                                                  url: file.url,
                                                  width: 800,
                                                  height: 800,
                                                  alt:
                                                    file.alt ||
                                                    file.filename ||
                                                    "Media image",
                                                  src: {
                                                    original: file.url,
                                                    large: file.url,
                                                    medium: file.url,
                                                    small: file.url,
                                                    thumbnail: file.url,
                                                  },
                                                };

                                              // Add to secondary images (content)
                                              setSecondaryImages((prev) => [
                                                ...prev,
                                                imageForSelection,
                                              ]);

                                              // Update selectedMediaContent state immediately
                                              setSelectedMediaContent(
                                                (prev) => ({
                                                  ...prev,
                                                  secondaryImages: [
                                                    ...prev.secondaryImages,
                                                    {
                                                      id: imageForSelection.id,
                                                      url: imageForSelection.url,
                                                      alt:
                                                        imageForSelection.alt ||
                                                        "",
                                                      width:
                                                        imageForSelection.width ||
                                                        0,
                                                      height:
                                                        imageForSelection.height ||
                                                        0,
                                                      source:
                                                        imageForSelection.source ||
                                                        "uploaded",
                                                    },
                                                  ],
                                                }),
                                              );

                                              // If it was in primary images, remove it from there
                                              if (isPrimarySelected) {
                                                setPrimaryImages((prev) =>
                                                  prev.filter(
                                                    (img) =>
                                                      img.id !== file.id &&
                                                      img.url !== file.url,
                                                  ),
                                                );
                                              }

                                              toast({
                                                title: "Secondary image added",
                                                description:
                                                  "Image will appear in your content body",
                                              });
                                            }}
                                            disabled={isSecondarySelected}
                                          >
                                            <PlusCircle className="h-4 w-4 mr-1" />
                                            Secondary
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Image name/label */}
                                      <div className="p-2 bg-black bg-opacity-75">
                                        <p className="text-white text-xs truncate">
                                          {file.filename || "Shopify Image"}
                                        </p>
                                        {file.source && (
                                          <p className="text-gray-400 text-xs truncate mt-0.5">
                                            {file.source === "product_image"
                                              ? "Product Image"
                                              : "Media Library"}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <FileImage className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                              <p className="text-gray-500 mb-2">
                                No media files found
                              </p>
                              <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                                Your Shopify Media Library appears to be empty.
                                You can upload images directly in Shopify or
                                select from Product Images instead.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchShopifyFiles}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh Content Files
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 mb-2">
                      No products selected yet
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowImageDialog(false);
                        setWorkflowStep("product");
                      }}
                    >
                      <ArrowLeft className="mr-2 h-3 w-3" />
                      Select Products First
                    </Button>
                  </div>
                )}

                {selectedProducts.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="flex">
                      <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-700 mb-1 font-medium">
                          Image Selection Tips
                        </p>
                        <p className="text-xs text-blue-600">
                          • Use "Set as Featured" for your main product image
                          <br />
                          • Add additional images to the content body with "Add
                          to Content"
                          <br />• For best results, include emotionally
                          compelling images with people using your products
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {imageSource === "upload" && (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center cursor-pointer"
                  onClick={() => {
                    document.getElementById("image-upload")?.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      try {
                        const file = files[0];

                        // Validate file type
                        if (!file.type.startsWith("image/")) {
                          toast({
                            title: "Invalid file type",
                            description:
                              "Please drop an image file (PNG, JPG, GIF, etc.)",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Validate file size (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: "File too large",
                            description:
                              "Please drop an image smaller than 10MB",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Upload to server instead of using blob URL
                        const formData = new FormData();
                        formData.append("image", file);

                        const uploadResponse = await fetch(
                          "/api/upload-image",
                          {
                            method: "POST",
                            body: formData,
                            headers: {
                              "X-Store-ID": currentStore?.id?.toString() || "1",
                            },
                          },
                        );

                        if (!uploadResponse.ok) {
                          throw new Error("Upload failed");
                        }

                        const uploadData = await uploadResponse.json();

                        // Create a Pexels-compatible image object
                        const uploadedImage: PexelsImage = {
                          id: `upload-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
                          url: uploadData.url,
                          width: 600,
                          height: 400,
                          alt: file.name,
                          src: {
                            original: uploadData.url,
                            large: uploadData.url,
                            medium: uploadData.url,
                            small: uploadData.url,
                            thumbnail: uploadData.url,
                          },
                        };

                        // Add to uploaded images array (user will choose primary/secondary)
                        setSearchedImages((prev) => {
                          const updated = [
                            ...prev,
                            { ...uploadedImage, source: "uploaded" },
                          ];
                          console.log(
                            "Updated searchedImages after drag upload:",
                            updated,
                          );
                          return updated;
                        });

                        toast({
                          title: "Image uploaded successfully",
                          description: `${file.name} uploaded to ${uploadData.source === "shopify" ? "Shopify" : "local storage"}. Switch to "Uploaded Images" tab to select it.`,
                        });

                        console.log(
                          "Image dropped and uploaded successfully:",
                          uploadedImage,
                        );
                      } catch (error) {
                        console.error("Drop upload error:", error);
                        toast({
                          title: "Upload failed",
                          description:
                            "There was an error uploading your image. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 mb-4">
                    Drag and drop image files here, or click to select files
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        try {
                          const file = files[0];

                          // Validate file type
                          if (!file.type.startsWith("image/")) {
                            toast({
                              title: "Invalid file type",
                              description:
                                "Please select an image file (PNG, JPG, GIF, etc.)",
                              variant: "destructive",
                            });
                            return;
                          }

                          // Validate file size (max 10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description:
                                "Please select an image smaller than 10MB",
                              variant: "destructive",
                            });
                            return;
                          }

                          // Upload to server instead of using blob URL
                          const formData = new FormData();
                          formData.append("image", file);

                          const uploadResponse = await fetch(
                            "/api/upload-image",
                            {
                              method: "POST",
                              body: formData,
                              headers: {
                                "X-Store-ID":
                                  currentStore?.id?.toString() || "1",
                              },
                            },
                          );

                          if (!uploadResponse.ok) {
                            throw new Error("Upload failed");
                          }

                          const uploadData = await uploadResponse.json();

                          // Create a Pexels-compatible image object
                          const uploadedImage: PexelsImage = {
                            id: `upload-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
                            url: uploadData.url,
                            width: 600,
                            height: 400,
                            alt: file.name,
                            src: {
                              original: uploadData.url,
                              large: uploadData.url,
                              medium: uploadData.url,
                              small: uploadData.url,
                              thumbnail: uploadData.url,
                            },
                          };

                          // Add to uploaded images array (user will choose primary/secondary)
                          setSearchedImages((prev) => {
                            const updated = [
                              ...prev,
                              { ...uploadedImage, source: "uploaded" },
                            ];
                            console.log(
                              "Updated searchedImages after upload:",
                              updated,
                            );
                            return updated;
                          });

                          toast({
                            title: "Image uploaded successfully",
                            description: `${file.name} uploaded to ${uploadData.source === "shopify" ? "Shopify" : "local storage"}. Switch to "Uploaded Images" tab to select it.`,
                          });

                          console.log(
                            "Image uploaded successfully:",
                            uploadedImage,
                          );

                          // Reset the input to allow uploading the same file again
                          e.target.value = "";
                        } catch (error) {
                          console.error("Upload error:", error);
                          toast({
                            title: "Upload failed",
                            description:
                              "There was an error uploading your image. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("image-upload")?.click();
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Image
                  </Button>
                </div>

                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-700 mb-1 font-medium">
                        How to Use Uploaded Images
                      </p>
                      <p className="text-xs text-blue-600 mb-2">
                        1. Images are uploaded to your Shopify store for
                        permanent use in content
                      </p>
                      <p className="text-xs text-blue-600 mb-2">
                        2. After upload, switch to "Uploaded Images" tab to see
                        your images with purple "Uploaded" badges
                      </p>
                      <p className="text-xs text-blue-600">
                        3. Hover over any uploaded image and click "Primary" or
                        "Secondary" to add it to your content
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded Images Display */}
            {imageSource === "uploaded_images" && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-medium">Your Uploaded Images</h3>
                  <Badge variant="secondary" className="text-xs">
                    {
                      searchedImages.filter((img) => img.source === "uploaded")
                        .length
                    }{" "}
                    images
                  </Badge>
                </div>

                {searchedImages.filter((img) => img.source === "uploaded")
                  .length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No uploaded images yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Use the "Upload Image" tab to add your own images
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5 max-h-96 overflow-y-auto">
                    {searchedImages
                      .filter((img) => img.source === "uploaded")
                      .map((image, index) => (
                        <div key={image.id || index} className="relative group">
                          <div className="aspect-square relative overflow-hidden rounded-sm">
                            <img
                              src={image.url}
                              alt={image.alt || "Uploaded image"}
                              className="w-full h-full object-cover"
                            />

                            {/* Uploaded badge */}
                            <div className="absolute top-1 left-1 bg-purple-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                              Uploaded
                            </div>

                            {/* Hover overlay with selection buttons */}
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  // Set as primary image
                                  setSelectedMediaContent((prev) => ({
                                    ...prev,
                                    primaryImage: image,
                                  }));
                                  console.log(
                                    "Set uploaded image as primary:",
                                    image,
                                  );

                                  toast({
                                    title: "Primary image selected",
                                    description: `${image.alt || "Uploaded image"} has been set as the primary image`,
                                  });
                                }}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  // Add to secondary images if not already there
                                  setSelectedMediaContent((prev) => {
                                    const isAlreadySecondary =
                                      prev.secondaryImages.some(
                                        (img) => img.id === image.id,
                                      );
                                    if (isAlreadySecondary) {
                                      toast({
                                        title: "Image already selected",
                                        description:
                                          "This image is already in your secondary images",
                                        variant: "destructive",
                                      });
                                      return prev;
                                    }

                                    const updatedSecondary = [
                                      ...prev.secondaryImages,
                                      image,
                                    ];
                                    console.log(
                                      "Added uploaded image to secondary:",
                                      image,
                                    );

                                    toast({
                                      title: "Secondary image added",
                                      description: `${image.alt || "Uploaded image"} has been added to secondary images`,
                                    });

                                    return {
                                      ...prev,
                                      secondaryImages: updatedSecondary,
                                    };
                                  });
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Secondary
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Open full-size image in new tab
                                  window.open(image.url, "_blank");
                                }}
                                className="text-xs px-2 py-1"
                              >
                                <ZoomIn className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 bg-white border-t pt-4 mt-4 z-20 flex-shrink-0">
            <Button variant="ghost" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>

            <Button
              type="button"
              onClick={() => {
                // Add selected images to the appropriate collection
                const selectedPexelsImages = searchedImages.filter(
                  (img) => img.selected,
                );
                const hasSelectedItems = selectedPexelsImages.length > 0;
                const hasVideos = youtubeVideoId && youtubeVideoId.length > 0;
                const totalSelectedMedia =
                  primaryImages.length + secondaryImages.length;

                if (
                  !hasSelectedItems &&
                  !hasVideos &&
                  totalSelectedMedia === 0
                ) {
                  toast({
                    title: "No Media Selected",
                    description:
                      "Please select at least one image or add a video",
                    variant: "destructive",
                  });
                  return;
                }

                // Process the selected images, maintaining their primary/secondary status
                const primarySelected = selectedPexelsImages.filter(
                  (img) => img.isPrimary,
                );
                const secondarySelected = selectedPexelsImages.filter(
                  (img) => !img.isPrimary,
                );

                // Add to appropriate collections based on their selected status
                if (primarySelected.length > 0) {
                  setPrimaryImages((prev) => [...prev, ...primarySelected]);
                }

                if (secondarySelected.length > 0) {
                  setSecondaryImages((prev) => [...prev, ...secondarySelected]);
                }

                // If no isPrimary flag is set but we're in media step, treat all as primary
                if (
                  primarySelected.length === 0 &&
                  secondarySelected.length === 0 &&
                  hasSelectedItems
                ) {
                  if (workflowStep === "media") {
                    setPrimaryImages((prev) => [
                      ...prev,
                      ...selectedPexelsImages,
                    ]);
                  } else {
                    setSecondaryImages((prev) => [
                      ...prev,
                      ...selectedPexelsImages,
                    ]);
                  }
                }

                // Clear selections and close dialog
                setSearchedImages(
                  searchedImages.map((img) => ({ ...img, selected: false })),
                );
                setShowImageDialog(false);

                const totalItems = hasSelectedItems
                  ? selectedPexelsImages.length
                  : totalSelectedMedia;
                const mediaType =
                  hasVideos && !hasSelectedItems ? "video" : "images";
                const itemText =
                  totalItems === 1 ? mediaType.slice(0, -1) : mediaType;

                toast({
                  title: "Media Added Successfully",
                  description: `Added ${totalItems} ${itemText} to your content`,
                });
              }}
              disabled={
                searchedImages.filter((img) => img.selected).length === 0 &&
                (!youtubeVideoId || youtubeVideoId.length === 0) &&
                primaryImages.length + secondaryImages.length === 0
              }
            >
              Add Selected Media
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Management Dialogs */}
      <ProjectCreationDialog
        isOpen={showCreateProjectDialog}
        onClose={() => setShowCreateProjectDialog(false)}
        onProjectCreated={handleCreateProject}
      />

      <ProjectLoadDialog
        isOpen={showLoadProjectDialog}
        onClose={() => setShowLoadProjectDialog(false)}
        onProjectSelected={handleLoadProject}
      />

      <ProjectSaveDialog
        isOpen={showProjectSaveDialog}
        onClose={() => setShowProjectSaveDialog(false)}
        onProjectSaved={(project) => {
          setCurrentProject(project);
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        }}
        projectData={extractFormStateForSaving()}
        currentProject={currentProject}
      />
    </div>
  );
}
