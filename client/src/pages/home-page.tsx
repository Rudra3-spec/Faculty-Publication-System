import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import PublicationList from "@/components/publication-list";
import SearchFilter from "@/components/search-filter";
import { Publication } from "@shared/schema";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: publications = [], isLoading } = useQuery<Publication[]>({
    queryKey: searchQuery 
      ? ["/api/publications/search", { q: searchQuery }]
      : ["/api/publications"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Publications Summary Generator</h1>
            <p className="text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SearchFilter 
            onSearch={setSearchQuery}
            placeholder="Search publications by title, author or keywords..."
          />
        </div>

        <PublicationList 
          publications={publications}
          isLoading={isLoading}
          showActions={false}
        />
      </main>
    </div>
  );
}
