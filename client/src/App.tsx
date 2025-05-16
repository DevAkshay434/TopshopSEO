import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import BlogPosts from "@/pages/BlogPosts";
import ScheduledPosts from "@/pages/ScheduledPosts";
import ContentTemplates from "@/pages/ContentTemplates";
import SimpleBulkGeneration from "@/pages/SimpleBulkGeneration";
import ShopifyConnection from "@/pages/ShopifyConnection";
import Connect from "@/pages/Connect";
import BillingSettings from "@/pages/BillingSettings";
import AppInstall from "@/pages/AppInstall";
import PartnerInstall from "@/pages/PartnerInstall";
import EmbeddedApp from "@/pages/EmbeddedApp";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import AdminPanel from "@/pages/AdminPanel";
import { useEffect, useState } from "react";

function Router() {
  const [location] = useLocation();
  const [showNavbar, setShowNavbar] = useState(true);
  
  useEffect(() => {
    // Check if the URL has Shopify embedded parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isEmbedded = urlParams.has('shop') && 
                      (urlParams.has('host') || urlParams.get('embedded') === '1');
    
    // Hide navbar if we're in embedded mode
    setShowNavbar(!isEmbedded);
    
    // For embedded apps, add script to handle Shopify admin navigation
    if (isEmbedded) {
      const script = document.createElement('script');
      script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge-api/v3.0.0/app-bridge-api.js';
      script.async = true;
      document.head.appendChild(script);
      
      return () => {
        document.head.removeChild(script);
      };
    }
  }, [location]);
  
  // Check if current URL has embedded params
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.has('shop') && 
                   (urlParams.has('host') || urlParams.get('embedded') === '1');
  
  return (
    <>
      {showNavbar && <Navbar />}
      <main className={`flex-grow ${showNavbar ? 'p-4 sm:p-6' : 'p-0'}`}>
        <Switch>
          {/* If we're at root with embedded params, show EmbeddedApp */}
          <Route path="/">
            {isEmbedded ? <EmbeddedApp /> : <AdminPanel />}
          </Route>
          <Route path="/blog-posts" component={BlogPosts} />
          <Route path="/scheduled-posts" component={ScheduledPosts} />
          <Route path="/content-templates" component={ContentTemplates} />
          <Route path="/simple-bulk-generation" component={SimpleBulkGeneration} />
          <Route path="/shopify-connection" component={ShopifyConnection} />
          <Route path="/connect" component={Connect} />
          <Route path="/billing-settings" component={BillingSettings} />
          <Route path="/billing-callback" component={AdminPanel} />
          <Route path="/embedded" component={EmbeddedApp} />
          <Route path="/dashboard" component={AdminPanel} />
          <Route path="/install" component={AppInstall} />
          <Route path="/partner-install" component={PartnerInstall} />
          <Route path="/shopify/callback" component={AdminPanel} />
          <Route path="/shopify/auth/callback" component={AdminPanel} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route path="/help" component={Help} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/legacy-dashboard" component={Dashboard} />
          
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

// Import Providers
import { ShopifyProvider } from './components/ShopifyProvider';
import { StoreProvider } from './contexts/StoreContext';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShopifyProvider>
        <StoreProvider>
          <div className="min-h-screen flex flex-col">
            <Router />
            <Toaster />
          </div>
        </StoreProvider>
      </ShopifyProvider>
    </QueryClientProvider>
  );
}

export default App;
